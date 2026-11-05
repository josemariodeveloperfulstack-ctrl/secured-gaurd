package com.z7design.secured_guard.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Exclusão definitiva de funcionário demitido sem violação de integridade referencial (409 Conflict).
 *
 * 1) Purge explícito em ordem correta de integridade para todas as tabelas dependentes conhecidas.
 * 2) Varredura dinâmica via pg_catalog.pg_constraint (PostgreSQL) para capturar vínculos adicionais.
 * 3) Deleção definitiva do funcionário na tabela employees.
 */
@Service
@Slf4j
public class EmployeeHardDeleteService {

    private static final String EMPLOYEES_TABLE = "employees";
    private static final int MAX_DEPTH = 6;

    private static final String PG_FK_QUERY = """
            SELECT child_cls.relname AS child_table,
                   child_att.attname AS child_column,
                   parent_cls.relname AS parent_table,
                   parent_att.attname AS parent_column,
                   NOT child_att.attnotnull AS is_nullable
            FROM pg_catalog.pg_constraint c
            JOIN pg_catalog.pg_class child_cls ON child_cls.oid = c.conrelid
            JOIN pg_catalog.pg_namespace child_ns ON child_ns.oid = child_cls.relnamespace
            JOIN pg_catalog.pg_class parent_cls ON parent_cls.oid = c.confrelid
            JOIN pg_catalog.pg_attribute child_att ON child_att.attrelid = child_cls.oid AND child_att.attnum = c.conkey[1]
            JOIN pg_catalog.pg_attribute parent_att ON parent_att.attrelid = parent_cls.oid AND parent_att.attnum = c.confkey[1]
            WHERE c.contype = 'f'
              AND parent_cls.relname = ?
              AND child_ns.nspname NOT IN ('pg_catalog', 'information_schema')
            """;

    private static final String INFO_SCHEMA_FK_QUERY = """
            SELECT kcu.table_name   AS child_table,
                   kcu.column_name  AS child_column,
                   ccu.column_name  AS parent_column,
                   c.is_nullable    AS is_nullable
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                 ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                 ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
            JOIN information_schema.columns c
                 ON c.table_schema = kcu.table_schema AND c.table_name = kcu.table_name
                AND c.column_name = kcu.column_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_name = ?
            """;

    private final JdbcTemplate jdbcTemplate;

    public EmployeeHardDeleteService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void purgeAndDelete(UUID employeeId) {
        log.info("Iniciando exclusão definitiva e desvinculação completa do funcionário {}", employeeId);

        // 1. Purge determinístico das tabelas conhecidas do sistema
        purgeExplicitDependencies(employeeId);

        // 2. Varredura dinâmica de FKs via catálogo (evita 409 em novas tabelas ou migrações)
        try {
            purgeReferences(EMPLOYEES_TABLE, "id = ?", employeeId, 0, new HashSet<>());
        } catch (Exception e) {
            log.warn("Aviso durante varredura dinâmica de FKs para funcionário {}: {}", employeeId, e.getMessage());
        }

        // 3. Exclusão definitiva do registro do funcionário
        int deleted = jdbcTemplate.update("DELETE FROM " + EMPLOYEES_TABLE + " WHERE id = ?", employeeId);
        log.info("🗑️ Funcionário {} excluído definitivamente ({} linha)", employeeId, deleted);
    }

    /**
     * Remove ou desvincula de forma determinística todas as dependências conhecidas do funcionário.
     */
    private void purgeExplicitDependencies(UUID empId) {
        // --- 1. Desvinculação de referências opcionais (supervisores, testemunhas, coberturas, responsáveis) ---
        safeUpdate("UPDATE activity_reports SET supervisor_id = NULL WHERE supervisor_id = ?", empId);
        safeUpdate("UPDATE accident_records SET witness_id = NULL WHERE witness_id = ?", empId);
        safeUpdate("UPDATE absences SET coverage_employee_id = NULL WHERE coverage_employee_id = ?", empId);
        safeUpdate("UPDATE remanejamentos SET coverage_employee_id = NULL WHERE coverage_employee_id = ?", empId);
        safeUpdate("UPDATE rondas SET supervisor_id = NULL WHERE supervisor_id = ?", empId);
        safeUpdate("UPDATE rondas SET responsavel_id = NULL WHERE responsavel_id = ?", empId);
        safeUpdate("UPDATE supervisor_visits SET supervisor_id = NULL WHERE supervisor_id = ?", empId);
        safeUpdate("UPDATE supervisor_visits SET checked_employee_id = NULL WHERE checked_employee_id = ?", empId);
        safeUpdate("UPDATE vacations SET coverage_employee_id = NULL WHERE coverage_employee_id = ?", empId);
        safeUpdate("UPDATE vacation_coverages SET substitute_employee_id = NULL WHERE substitute_employee_id = ?", empId);
        safeUpdate("UPDATE vehicles SET responsible_employee_id = NULL WHERE responsible_employee_id = ?", empId);
        safeUpdate("UPDATE visit_controls SET supervisor_id = NULL WHERE supervisor_id = ?", empId);
        safeUpdate("UPDATE visit_controls SET employee_id = NULL WHERE employee_id = ?", empId);
        safeUpdate("UPDATE visit_schedules SET supervisor_id = NULL WHERE supervisor_id = ?", empId);
        safeUpdate("UPDATE equipment SET current_user_id = NULL WHERE current_user_id = ?", empId);
        safeUpdate("UPDATE equipment_movements SET authorized_by_id = NULL WHERE authorized_by_id = ?", empId);
        safeUpdate("UPDATE equipment_movements SET employee_id = NULL WHERE employee_id = ?", empId);
        safeUpdate("UPDATE stock_movements SET employee_id = NULL WHERE employee_id = ?", empId);
        safeUpdate("UPDATE operational_occurrences SET substitute_id = NULL WHERE substitute_id = ?", empId);
        safeUpdate("UPDATE epi_delivery_forms SET responsible_employee_id = NULL WHERE responsible_employee_id = ?", empId);
        safeUpdate("UPDATE patrimonial_assets SET responsible_employee_id = NULL WHERE responsible_employee_id = ?", empId);

        // --- 2. Exclusão em cascata de registros vinculados estritamente ao funcionário ---
        // EPIs e Fichas de Entrega
        safeUpdate("DELETE FROM epi_delivery_form_items WHERE delivery_form_id IN (SELECT id FROM epi_delivery_forms WHERE employee_id = ?)", empId);
        safeUpdate("DELETE FROM epi_delivery_forms WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM epi_deliveries WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM epis WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM visit_control_epi_deliveries WHERE employee_id = ?", empId);

        // Ponto / Escalas / Jornadas
        safeUpdate("DELETE FROM time_records WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM ponto_raw WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM work_schedules WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM scale_histories WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM employee_schedules WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM overtimes WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM bank_hours WHERE employee_id = ?", empId);

        // Vínculos, Riscos, Certificações e Biometria Facial
        safeUpdate("DELETE FROM employee_employment_periods WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM employee_certifications WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM employee_risks WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM employee_faces WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM facial_embeddings WHERE supervisor_id = ?", empId);
        safeUpdate("DELETE FROM facial_recognition_logs WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM facial_login_attempts WHERE supervisor_id = ?", empId);

        // Dependentes e Documentos
        safeUpdate("DELETE FROM dependents WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM documents WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM medical_documents WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM medical_exams WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM documentos_gerados WHERE funcionario_id = ?", empId);
        safeUpdate("DELETE FROM unified_documents WHERE employee_id = ?", empId);

        // Folha / Holerites / Benefícios
        safeUpdate("DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE employee_id = ?)", empId);
        safeUpdate("DELETE FROM payroll_closures WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM payrolls WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM benefits WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM performance_evaluations WHERE employee_id = ?", empId);

        // Requisições, Acidentes, CIPA, Operacional
        safeUpdate("DELETE FROM stock_requisition_lines WHERE requisition_id IN (SELECT id FROM stock_requisitions WHERE employee_id = ?)", empId);
        safeUpdate("DELETE FROM stock_requisitions WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM accident_records WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM near_miss_records WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM cipa_members WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM sst_alerts WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM training_participations WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM specific_activities WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM occurrences WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM operational_occurrences WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM shift_change_forms WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM work_post_assignments WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM remanejamento_historico WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM remanejamentos WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM vacations WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM leaves WHERE employee_id = ?", empId);
        safeUpdate("DELETE FROM absences WHERE employee_id = ?", empId);

        // Termos / Consentimentos vinculados ao usuário do funcionário
        safeUpdate("DELETE FROM user_terms_consents WHERE user_id IN (SELECT user_id FROM employees WHERE id = ?)", empId);
        safeUpdate("DELETE FROM user_consents WHERE user_id IN (SELECT user_id FROM employees WHERE id = ?)", empId);
    }

    private void safeUpdate(String sql, UUID param) {
        try {
            jdbcTemplate.update(sql, param);
        } catch (Exception e) {
            log.debug("SafeUpdate informativo: {} - {}", sql, e.getMessage());
        }
    }

    /**
     * Trata dinamicamente todos os registros que referenciam as linhas de {@code parentTable}.
     */
    private void purgeReferences(String parentTable, String parentWhere, UUID param,
            int depth, Set<String> path) {
        if (depth > MAX_DEPTH || !path.add(parentTable)) {
            return;
        }
        try {
            List<Map<String, Object>> fks = queryForeignKeys(parentTable);
            for (Map<String, Object> fk : fks) {
                String childTable = quoteIdent((String) fk.get("child_table"));
                String childColumn = quoteIdent((String) fk.get("child_column"));
                String parentColumn = quoteIdent((String) fk.get("parent_column"));
                boolean nullable = isNullable(fk.get("is_nullable"));

                String subquery = "SELECT " + parentColumn + " FROM " + quoteIdent(parentTable) + " WHERE " + parentWhere;
                String childWhere = childColumn + " IN (" + subquery + ")";

                if (nullable) {
                    try {
                        int n = jdbcTemplate.update(
                                "UPDATE " + childTable + " SET " + childColumn + " = NULL WHERE " + childWhere, param);
                        if (n > 0) {
                            log.debug("Desvinculados {} registro(s) de {}.{}", n, childTable, childColumn);
                        }
                    } catch (Exception e) {
                        log.debug("Não foi possível anular {}.{}: {}", childTable, childColumn, e.getMessage());
                    }
                } else {
                    String rawChild = (String) fk.get("child_table");
                    purgeReferences(rawChild, childWhere, param, depth + 1, path);
                    try {
                        int n = jdbcTemplate.update("DELETE FROM " + childTable + " WHERE " + childWhere, param);
                        if (n > 0) {
                            log.debug("Removidos {} registro(s) de {}", n, childTable);
                        }
                    } catch (Exception e) {
                        log.debug("Não foi possível excluir registros em {}: {}", childTable, e.getMessage());
                    }
                }
            }
        } finally {
            path.remove(parentTable);
        }
    }

    private List<Map<String, Object>> queryForeignKeys(String parentTable) {
        try {
            List<Map<String, Object>> list = jdbcTemplate.queryForList(PG_FK_QUERY, parentTable);
            if (!list.isEmpty()) {
                return list;
            }
        } catch (Exception e) {
            log.debug("pg_catalog query falhou, tentando fallback information_schema: {}", e.getMessage());
        }
        try {
            return jdbcTemplate.queryForList(INFO_SCHEMA_FK_QUERY, parentTable);
        } catch (Exception e) {
            log.debug("information_schema fallback falhou: {}", e.getMessage());
            return List.of();
        }
    }

    private boolean isNullable(Object val) {
        if (val == null) return false;
        if (val instanceof Boolean b) return b;
        return "YES".equalsIgnoreCase(String.valueOf(val)) || "TRUE".equalsIgnoreCase(String.valueOf(val));
    }

    private static String quoteIdent(String ident) {
        return "\"" + ident.replace("\"", "\"\"") + "\"";
    }
}
