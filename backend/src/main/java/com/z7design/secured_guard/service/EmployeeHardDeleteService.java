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
 * Exclusão definitiva de funcionário demitido.
 *
 * Descobre dinamicamente (catálogo do PostgreSQL) todas as foreign keys que apontam para
 * {@code employees} e trata cada vínculo antes de remover o cadastro:
 * - coluna anulável  -> desvincula (SET NULL), preservando o registro de outros módulos;
 * - coluna obrigatória -> remove os registros filhos (recursivamente, com seus próprios filhos).
 *
 * Evita o 409 (violação de integridade) ao excluir demitidos com histórico (EPI, ponto, escalas etc.).
 */
@Service
@Slf4j
public class EmployeeHardDeleteService {

    private static final String EMPLOYEES_TABLE = "employees";
    private static final int MAX_DEPTH = 6;

    private static final String FK_QUERY = """
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
              AND tc.table_schema = current_schema()
              AND ccu.table_name = ?
            """;

    private final JdbcTemplate jdbcTemplate;

    public EmployeeHardDeleteService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void purgeAndDelete(UUID employeeId) {
        purgeReferences(EMPLOYEES_TABLE, "id = ?", employeeId, 0, new HashSet<>());
        int deleted = jdbcTemplate.update("DELETE FROM " + EMPLOYEES_TABLE + " WHERE id = ?", employeeId);
        log.info("🗑️ Funcionário {} excluído definitivamente ({} linha)", employeeId, deleted);
    }

    /**
     * Trata todos os registros que referenciam as linhas de {@code parentTable} selecionadas por
     * {@code parentWhere}.
     */
    private void purgeReferences(String parentTable, String parentWhere, UUID param,
            int depth, Set<String> path) {
        if (depth > MAX_DEPTH || !path.add(parentTable)) {
            return;
        }
        try {
            List<Map<String, Object>> fks = jdbcTemplate.queryForList(FK_QUERY, parentTable);
            for (Map<String, Object> fk : fks) {
                String childTable = quoteIdent((String) fk.get("child_table"));
                String childColumn = quoteIdent((String) fk.get("child_column"));
                String parentColumn = quoteIdent((String) fk.get("parent_column"));
                boolean nullable = "YES".equalsIgnoreCase(String.valueOf(fk.get("is_nullable")));

                String subquery = "SELECT " + parentColumn + " FROM " + quoteIdent(parentTable) + " WHERE " + parentWhere;
                String childWhere = childColumn + " IN (" + subquery + ")";

                if (nullable) {
                    int n = jdbcTemplate.update(
                            "UPDATE " + childTable + " SET " + childColumn + " = NULL WHERE " + childWhere, param);
                    if (n > 0) {
                        log.debug("Desvinculados {} registro(s) de {}.{}", n, childTable, childColumn);
                    }
                } else {
                    String rawChild = (String) fk.get("child_table");
                    purgeReferences(rawChild, childWhere, param, depth + 1, path);
                    int n = jdbcTemplate.update("DELETE FROM " + childTable + " WHERE " + childWhere, param);
                    if (n > 0) {
                        log.debug("Removidos {} registro(s) de {}", n, childTable);
                    }
                }
            }
        } finally {
            path.remove(parentTable);
        }
    }

    private static String quoteIdent(String ident) {
        return "\"" + ident.replace("\"", "\"\"") + "\"";
    }
}
