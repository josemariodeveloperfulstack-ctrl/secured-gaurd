package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.dto.SimpleEmployeeDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.service.EmployeeService;
import com.z7design.secured_guard.service.EmployeeRecordPdfService;
import com.z7design.secured_guard.service.EmployeeHistoryPdfService;
import com.z7design.secured_guard.service.EmployeeChangeHistoryService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.z7design.secured_guard.service.EmployeeExcelImportService;
import com.z7design.secured_guard.service.EmployeeImportService;

import com.z7design.secured_guard.dto.EmployeeChangeHistoryDTO;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;

import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Tag(name = "Funcionários", description = "Endpoints para gestão de funcionários")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeRecordPdfService employeeRecordPdfService;
    private final EmployeeHistoryPdfService employeeHistoryPdfService;
    private final EmployeeExcelImportService employeeExcelImportService;
    private final EmployeeImportService employeeImportService;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;

    @GetMapping("/count")
    @Operation(summary = "Contar funcionários", description = "Retorna o número total de funcionários")
    public ResponseEntity<Object> getCount() {
        try {
            System.out.println("🔍 EmployeeController.getCount - Testando acesso ao banco");
            long count = employeeService.count();
            System.out.println("✅ EmployeeController.getCount - Encontrados " + count + " funcionários");
            return ResponseEntity.ok(java.util.Map.of("count", count, "message", "Acesso ao banco funcionando"));
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getCount - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/stats")
    @Operation(summary = "Estatísticas de funcionários", description = "Retorna totais por status. Use companyId para filtrar por empresa.")
    public ResponseEntity<Map<String, Long>> getStats(
            @RequestParam(required = false) UUID companyId) {
        Map<String, Long> stats = employeeService.getStatsByCompany(companyId);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/status/test")
    @Operation(summary = "Teste simples de status", description = "Endpoint de teste para verificar funcionamento")
    public ResponseEntity<Object> testStatus() {
        try {
            System.out.println("🔍 EmployeeController.testStatus - Testando endpoint");
            return ResponseEntity
                    .ok(java.util.Map.of("message", "Endpoint funcionando", "timestamp", System.currentTimeMillis()));
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.testStatus - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/simple")
    @Operation(summary = "Listar funcionários simples", description = "Retorna uma lista simples de funcionários sem conversão DTO")
    public ResponseEntity<Object> getAllSimple() {
        try {
            System.out.println("🔍 EmployeeController.getAllSimple - Buscando dados básicos");

            List<Employee> employees = employeeService.findAll();
            System.out.println("🔍 Encontrados " + employees.size() + " funcionários no banco");

            if (employees.isEmpty()) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }

            // Retornar apenas dados básicos sem conversão DTO
            List<java.util.Map<String, Object>> simpleEmployees = new java.util.ArrayList<>();
            for (Employee employee : employees) {
                java.util.Map<String, Object> simple = new java.util.HashMap<>();
                simple.put("id", employee.getId());
                simple.put("name", employee.getName());
                simple.put("email", employee.getEmail());
                simple.put("phone", employee.getPhone());
                simple.put("status", employee.getStatus() != null ? employee.getStatus().name() : null);
                simple.put("createdAt", employee.getCreatedAt());
                simpleEmployees.add(simple);
            }

            System.out.println("✅ EmployeeController.getAllSimple - Retornando " + simpleEmployees.size()
                    + " funcionários simples");
            return ResponseEntity.ok(simpleEmployees);

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getAllSimple - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/test")
    @Operation(summary = "Teste básico", description = "Teste básico de acesso ao banco")
    public ResponseEntity<Object> testBasic() {
        try {
            System.out.println("🔍 EmployeeController.testBasic - Teste básico");

            // Teste 1: Contar funcionários
            long count = employeeService.count();
            System.out.println("✅ Contagem: " + count);

            // Teste 2: Buscar apenas os IDs sem carregar relacionamentos
            try {
                List<Employee> employees = employeeService.findAll();
                System.out.println("✅ Busca findAll executada com sucesso");

                if (!employees.isEmpty()) {
                    Employee first = employees.get(0);
                    System.out.println("✅ Primeiro funcionário: " + first.getName());

                    java.util.Map<String, Object> result = new java.util.HashMap<>();
                    result.put("count", count);
                    result.put("firstEmployee", first.getName());
                    result.put("firstEmployeeId", first.getId());
                    result.put("totalFound", employees.size());
                    return ResponseEntity.ok(result);
                } else {
                    return ResponseEntity
                            .ok(java.util.Map.of("count", count, "message", "Nenhum funcionário encontrado"));
                }
            } catch (Exception findAllError) {
                System.err.println("❌ Erro no findAll: " + findAllError.getMessage());
                findAllError.printStackTrace();

                // Retornar apenas a contagem se o findAll falhar
                return ResponseEntity.ok(java.util.Map.of(
                        "count", count,
                        "findAllError", findAllError.getMessage(),
                        "message", "Contagem funcionou, mas findAll falhou"));
            }

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.testBasic - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/ids")
    @Operation(summary = "Listar apenas IDs", description = "Retorna apenas os IDs dos funcionários")
    public ResponseEntity<Object> getEmployeeIds() {
        try {
            System.out.println("🔍 EmployeeController.getEmployeeIds - Buscando apenas IDs");

            // Usar query nativa para buscar apenas IDs
            List<UUID> employeeIds = employeeService.findAllIds();
            System.out.println("✅ Encontrados " + employeeIds.size() + " IDs de funcionários");

            return ResponseEntity.ok(java.util.Map.of(
                    "count", employeeIds.size(),
                    "ids", employeeIds));

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getEmployeeIds - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/by-id/{id}")
    @Operation(summary = "Buscar funcionário por ID individual", description = "Busca um funcionário específico por ID")
    public ResponseEntity<Object> getEmployeeById(@PathVariable UUID id) {
        try {
            System.out.println("🔍 EmployeeController.getEmployeeById - Buscando funcionário ID: " + id);

            Employee employee = employeeService.findById(id);
            if (employee != null) {
                System.out.println("✅ Funcionário encontrado: " + employee.getName());

                // Retornar dados básicos sem conversão DTO
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("id", employee.getId());
                result.put("name", employee.getName());
                result.put("email", employee.getEmail());
                result.put("phone", employee.getPhone());
                result.put("status", employee.getStatus() != null ? employee.getStatus().name() : null);
                result.put("createdAt", employee.getCreatedAt());

                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.notFound().build();
            }

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getEmployeeById - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/basic")
    @Operation(summary = "Listar dados básicos", description = "Retorna dados básicos dos funcionários usando query nativa")
    public ResponseEntity<Object> getBasicData() {
        try {
            System.out.println("🔍 EmployeeController.getBasicData - Buscando dados básicos");

            List<Object[]> data = employeeService.findBasicData();
            System.out.println("✅ Encontrados " + data.size() + " registros básicos");

            List<java.util.Map<String, Object>> employees = new java.util.ArrayList<>();
            for (Object[] row : data) {
                java.util.Map<String, Object> employee = new java.util.HashMap<>();
                employee.put("id", row[0]);
                employee.put("name", row[1]);
                employee.put("email", row[11]); // email está na posição 11 na query completa
                employee.put("phone", row[10]); // phone está na posição 10
                employee.put("status", row[7]); // status está na posição 7
                employee.put("createdAt", row[17]); // created_at está na posição 17

                // Adicionar position, unit, company, workPost e department
                if (safeAt(row, 19) != null || safeAt(row, 28) != null) {
                    java.util.Map<String, Object> position = new java.util.HashMap<>();
                    if (safeAt(row, 19) != null) position.put("name", safeAt(row, 19));
                    if (safeAt(row, 28) != null) position.put("id", safeAt(row, 28));
                    employee.put("position", position);
                }

                if (safeAt(row, 20) != null || safeAt(row, 25) != null) {
                    java.util.Map<String, Object> unit = new java.util.HashMap<>();
                    if (safeAt(row, 20) != null) unit.put("name", safeAt(row, 20));
                    if (safeAt(row, 25) != null) unit.put("id", safeAt(row, 25));
                    employee.put("unit", unit);
                }

                if (safeAt(row, 21) != null || safeAt(row, 26) != null) {
                    java.util.Map<String, Object> company = new java.util.HashMap<>();
                    if (safeAt(row, 21) != null) company.put("sigla", safeAt(row, 21));
                    if (safeAt(row, 26) != null) company.put("id", safeAt(row, 26));
                    employee.put("company", company);
                }

                if (safeAt(row, 22) != null) {
                    employee.put("userId", safeAt(row, 22));
                }

                putWorkPostIfPresent(employee, row);

                if (safeAt(row, 24) != null || safeAt(row, 29) != null) {
                    java.util.Map<String, Object> department = new java.util.HashMap<>();
                    if (safeAt(row, 24) != null) department.put("name", safeAt(row, 24));
                    if (safeAt(row, 29) != null) department.put("id", safeAt(row, 29));
                    employee.put("department", department);
                }

                employees.add(employee);
            }

            return ResponseEntity.ok(java.util.Map.of(
                    "count", employees.size(),
                    "employees", employees));

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getBasicData - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    @Operation(summary = "Listar todos os funcionários", description = "Retorna uma lista de todos os funcionários com opção de busca por nome ou CPF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAll(@RequestParam(required = false) String searchTerm) {
        try {
            System.out.println(
                    "🔍 EmployeeController.getAll - Usando query nativa para evitar problemas de relacionamentos");
            System.out.println("🔍 EmployeeController.getAll - searchTerm: " + searchTerm);

            // Se houver searchTerm, usar busca por nome ou documento
            List<Object[]> data;
            if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                System.out.println("🔍 EmployeeController.getAll - Buscando por termo: " + searchTerm);
                data = employeeService.findBasicDataBySearchTerm(searchTerm.trim());
            } else {
                data = employeeService.findBasicData();
            }
            System.out.println("🔍 Encontrados " + data.size() + " funcionários no banco");

            if (data.isEmpty()) {
                System.out.println("⚠️ Lista de funcionários vazia");
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }

            // Converter para Map simples
            List<java.util.Map<String, Object>> employees = new java.util.ArrayList<>();
            for (Object[] row : data) {
                try {
                    java.util.Map<String, Object> employee = new java.util.HashMap<>();
                    employee.put("id", row[0]);
                    employee.put("name", row[1]);
                    employee.put("document", row[2]);
                    employee.put("birthDate", row[3]);
                    employee.put("registrationNumber", row[4]);
                    employee.put("hireDate", row[5]);
                    employee.put("terminationDate", row[6]);
                    employee.put("status", row[7]);
                    employee.put("notes", row[8]);
                    employee.put("address", row[9]);
                    employee.put("phone", row[10]);
                    employee.put("email", row[11]);
                    employee.put("cnhNumber", row[12]);
                    employee.put("ctps", row[13]);
                    employee.put("cbo", row[14]);
                    employee.put("pis", row[15]);
                    employee.put("salario", row[16]);
                    employee.put("createdAt", row[17]);
                    employee.put("updatedAt", row[18]);
                    employee.put("escalaTrabalho", safeAt(row, 30));
                    employee.put("horarioTrabalho", safeAt(row, 31));
                    if (safeAt(row, 32) != null) {
                        employee.put("dataRescisao", safeAt(row, 32));
                    }

                    // Adicionar position e unit (novas colunas da query)
                    if (safeAt(row, 19) != null || safeAt(row, 28) != null) {
                        java.util.Map<String, Object> position = new java.util.HashMap<>();
                        if (safeAt(row, 19) != null) position.put("name", safeAt(row, 19)); // position_name
                        if (safeAt(row, 28) != null) position.put("id", safeAt(row, 28)); // position_id
                        employee.put("position", position);
                    }

                    if (safeAt(row, 20) != null || safeAt(row, 25) != null) {
                        java.util.Map<String, Object> unit = new java.util.HashMap<>();
                        if (safeAt(row, 20) != null) unit.put("name", safeAt(row, 20)); // unit_name
                        if (safeAt(row, 25) != null) unit.put("id", safeAt(row, 25)); // unit_id
                        employee.put("unit", unit);
                    }

                    // Adicionar company (sigla) se existir (index 21 e 26)
                    if (safeAt(row, 21) != null || safeAt(row, 26) != null) {
                        java.util.Map<String, Object> company = new java.util.HashMap<>();
                        if (safeAt(row, 21) != null) company.put("sigla", safeAt(row, 21)); // company_sigla
                        if (safeAt(row, 26) != null) company.put("id", safeAt(row, 26)); // company_id
                        employee.put("company", company);
                    }

                    // Adicionar userId se existir (index 22)
                    if (safeAt(row, 22) != null) {
                        employee.put("userId", safeAt(row, 22));
                    }

                    putWorkPostIfPresent(employee, row);

                    // Adicionar department se existir (index 24 ou 29)
                    if (safeAt(row, 24) != null || safeAt(row, 29) != null) {
                        java.util.Map<String, Object> department = new java.util.HashMap<>();
                        if (safeAt(row, 24) != null) department.put("name", safeAt(row, 24)); // department_name
                        if (safeAt(row, 29) != null) department.put("id", safeAt(row, 29)); // department_id
                        employee.put("department", department);
                    }

                    employees.add(employee);
                } catch (Exception dtoError) {
                    System.err.println("❌ Erro ao converter funcionário: " + dtoError.getMessage());
                    dtoError.printStackTrace();
                    // Continua com os outros funcionários
                }
            }

            System.out.println("✅ EmployeeController.getAll - Retornando " + employees.size() + " funcionários");
            return ResponseEntity.ok(employees);

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getAll - Erro geral: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Collections.emptyList());
        }
    }

    @GetMapping("/paged")
    @Operation(summary = "Listar funcionários (paginado)", description = "Retorna uma lista paginada de funcionários com opção de busca por nome ou CPF")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista paginada de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAllPaged(@RequestParam(required = false) String searchTerm,
            @RequestParam(required = false) java.util.UUID companyId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "500") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir) {
        try {
            int safePage = Math.max(page, 0);
            int safeSize = Math.min(Math.max(size, 1), 500);
            String statusFilter = (status != null && !status.trim().isEmpty() && !"all".equalsIgnoreCase(status.trim())) ? status.trim().toUpperCase() : null;
            String sortByParam = (sortBy != null && !sortBy.trim().isEmpty()) ? sortBy.trim() : null;
            String sortDirParam = (sortDir != null && sortDir.trim().equalsIgnoreCase("desc")) ? "desc" : "asc";
            System.out.println("🔍 EmployeeController.getAllPaged - page=" + safePage + " size=" + safeSize
                    + " searchTerm=" + searchTerm + " companyId=" + companyId + " status=" + statusFilter
                    + " sortBy=" + sortByParam + " sortDir=" + sortDirParam);

            List<Object[]> data;
            if (searchTerm != null && !searchTerm.trim().isEmpty()) {
                data = employeeService.findBasicDataBySearchTermPaged(searchTerm.trim(), safePage, safeSize, companyId,
                        statusFilter, sortByParam, sortDirParam);
            } else {
                data = employeeService.findBasicDataPaged(safePage, safeSize, companyId, statusFilter, sortByParam,
                        sortDirParam);
            }
            System.out.println(
                    "🔍 EmployeeController.getAllPaged - Encontrados " + data.size() + " funcionários no banco");

            if (data.isEmpty()) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }

            List<java.util.Map<String, Object>> employees = new java.util.ArrayList<>();
            java.util.Set<UUID> seenIds = new java.util.HashSet<>();
            for (Object[] row : data) {
                Object idObj = safeAt(row, 0);
                if (idObj == null) continue;
                UUID rowId = idObj instanceof UUID ? (UUID) idObj : UUID.fromString(idObj.toString());
                if (!seenIds.add(rowId)) continue; // evita duplicados (mesmo funcionário em mais de uma linha)
                java.util.Map<String, Object> employee = new java.util.HashMap<>();
                employee.put("id", idObj);
                employee.put("name", safeAt(row, 1));
                employee.put("document", safeAt(row, 2));
                employee.put("birthDate", safeAt(row, 3));
                employee.put("registrationNumber", safeAt(row, 4));
                employee.put("hireDate", safeAt(row, 5));
                employee.put("terminationDate", safeAt(row, 6));
                employee.put("status", safeAt(row, 7));
                employee.put("notes", safeAt(row, 8));
                employee.put("address", safeAt(row, 9));
                employee.put("phone", safeAt(row, 10));
                employee.put("email", safeAt(row, 11));
                employee.put("cnhNumber", safeAt(row, 12));
                employee.put("ctps", safeAt(row, 13));
                employee.put("cbo", safeAt(row, 14));
                employee.put("pis", safeAt(row, 15));
                employee.put("salario", safeAt(row, 16));
                employee.put("createdAt", safeAt(row, 17));
                employee.put("updatedAt", safeAt(row, 18));
                employee.put("escalaTrabalho", safeAt(row, 30));
                employee.put("horarioTrabalho", safeAt(row, 31));
                if (safeAt(row, 32) != null) {
                    employee.put("dataRescisao", safeAt(row, 32));
                }

                if (safeAt(row, 19) != null || safeAt(row, 28) != null) {
                    java.util.Map<String, Object> position = new java.util.HashMap<>();
                    if (safeAt(row, 19) != null) position.put("name", safeAt(row, 19));
                    if (safeAt(row, 28) != null) position.put("id", safeAt(row, 28));
                    employee.put("position", position);
                }
                if (safeAt(row, 20) != null || safeAt(row, 25) != null) {
                    java.util.Map<String, Object> unit = new java.util.HashMap<>();
                    if (safeAt(row, 20) != null) unit.put("name", safeAt(row, 20));
                    if (safeAt(row, 25) != null) unit.put("id", safeAt(row, 25));
                    employee.put("unit", unit);
                }
                if (safeAt(row, 21) != null || safeAt(row, 26) != null) {
                    java.util.Map<String, Object> company = new java.util.HashMap<>();
                    if (safeAt(row, 21) != null) company.put("sigla", safeAt(row, 21));
                    if (safeAt(row, 26) != null) company.put("id", safeAt(row, 26));
                    employee.put("company", company);
                }
                if (safeAt(row, 22) != null) employee.put("userId", safeAt(row, 22));
                putWorkPostIfPresent(employee, row);
                if (safeAt(row, 24) != null || safeAt(row, 29) != null) {
                    java.util.Map<String, Object> department = new java.util.HashMap<>();
                    if (safeAt(row, 24) != null) department.put("name", safeAt(row, 24));
                    if (safeAt(row, 29) != null) department.put("id", safeAt(row, 29));
                    employee.put("department", department);
                }
                employees.add(employee);
            }

            System.out.println("✅ EmployeeController.getAllPaged - Retornando " + employees.size()
                    + " funcionários (página " + safePage + ")");
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getAllPaged - Erro geral: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Collections.emptyList());
        }
    }

    @GetMapping("/birthdays")
    @Operation(summary = "Aniversariantes do mês", description = "Lista funcionários com data de nascimento no mês informado (ordenado por dia e nome)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista retornada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Mês inválido")
    })
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getBirthdaysByMonth(
            @RequestParam int month,
            @RequestParam(defaultValue = "true") boolean onlyActive,
            @RequestParam(required = false) Integer referenceYear,
            @RequestParam(required = false) UUID companyId) {
        try {
            if (month < 1 || month > 12) {
                return ResponseEntity.badRequest().body(Map.of("error", "Parâmetro month deve ser entre 1 e 12"));
            }
            int year = referenceYear != null ? referenceYear : java.time.Year.now().getValue();
            List<Object[]> data = employeeService.findBasicDataByBirthMonth(month, onlyActive, companyId);
            List<Map<String, Object>> employees = new ArrayList<>();
            for (Object[] row : data) {
                Map<String, Object> employee = mapBasicRowToEmployeeMap(row);
                Object bd = employee.get("birthDate");
                LocalDate birth = toLocalDate(bd);
                if (birth != null) {
                    employee.put("birthDayOfMonth", birth.getDayOfMonth());
                    employee.put("ageTurning", year - birth.getYear());
                }
                employees.add(employee);
            }
            Map<String, Object> body = new HashMap<>();
            body.put("month", month);
            body.put("referenceYear", year);
            body.put("count", employees.size());
            body.put("employees", employees);
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getBirthdaysByMonth - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Converte uma linha da query nativa {@code findBasicData*} no mesmo formato de {@link #getAll(String)}.
     */
    private static Map<String, Object> mapBasicRowToEmployeeMap(Object[] row) {
        Map<String, Object> employee = new HashMap<>();
        employee.put("id", row[0]);
        employee.put("name", row[1]);
        employee.put("document", row[2]);
        employee.put("birthDate", row[3]);
        employee.put("registrationNumber", row[4]);
        employee.put("hireDate", row[5]);
        employee.put("terminationDate", row[6]);
        employee.put("status", row[7]);
        employee.put("notes", row[8]);
        employee.put("address", row[9]);
        employee.put("phone", row[10]);
        employee.put("email", row[11]);
        employee.put("cnhNumber", row[12]);
        employee.put("ctps", row[13]);
        employee.put("cbo", row[14]);
        employee.put("pis", row[15]);
        employee.put("salario", row[16]);
        employee.put("createdAt", row[17]);
        employee.put("updatedAt", row[18]);
        if (safeAt(row, 19) != null || safeAt(row, 28) != null) {
            Map<String, Object> position = new HashMap<>();
            if (safeAt(row, 19) != null) position.put("name", safeAt(row, 19));
            if (safeAt(row, 28) != null) position.put("id", safeAt(row, 28));
            employee.put("position", position);
        }
        if (safeAt(row, 20) != null || safeAt(row, 25) != null) {
            Map<String, Object> unit = new HashMap<>();
            if (safeAt(row, 20) != null) unit.put("name", safeAt(row, 20));
            if (safeAt(row, 25) != null) unit.put("id", safeAt(row, 25));
            employee.put("unit", unit);
        }
        if (safeAt(row, 21) != null || safeAt(row, 26) != null) {
            Map<String, Object> company = new HashMap<>();
            if (safeAt(row, 21) != null) company.put("sigla", safeAt(row, 21));
            if (safeAt(row, 26) != null) company.put("id", safeAt(row, 26));
            employee.put("company", company);
        }
        if (safeAt(row, 22) != null) {
            employee.put("userId", safeAt(row, 22));
        }
        putWorkPostIfPresent(employee, row);
        if (safeAt(row, 24) != null || safeAt(row, 29) != null) {
            Map<String, Object> department = new HashMap<>();
            if (safeAt(row, 24) != null) department.put("name", safeAt(row, 24));
            if (safeAt(row, 29) != null) department.put("id", safeAt(row, 29));
            employee.put("department", department);
        }
        if (safeAt(row, 30) != null) {
            employee.put("escalaTrabalho", safeAt(row, 30));
        }
        if (safeAt(row, 31) != null) {
            employee.put("horarioTrabalho", safeAt(row, 31));
        }
        if (safeAt(row, 32) != null) {
            employee.put("dataRescisao", safeAt(row, 32));
        }
        return employee;
    }

    private static LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof java.sql.Date d) {
            return d.toLocalDate();
        }
        if (value instanceof java.util.Date d) {
            return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        if (value instanceof Instant i) {
            return i.atZone(ZoneId.systemDefault()).toLocalDate();
        }
        if (value instanceof LocalDate ld) {
            return ld;
        }
        if (value instanceof java.time.LocalDateTime ldt) {
            return ldt.toLocalDate();
        }
        return null;
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar funcionário por ID", description = "Retorna um funcionário específico pelo seu ID com todos os relacionamentos")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Funcionário encontrado"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getById(@PathVariable String id) {
        try {
            System.out.println("🔍 EmployeeController.getById - Buscando funcionário ID: " + id);

            // Converter String para UUID
            UUID employeeId;
            try {
                employeeId = UUID.fromString(id);
            } catch (IllegalArgumentException e) {
                System.err.println("❌ ID inválido: " + id);
                return ResponseEntity.badRequest().body(java.util.Map.of("error", "ID inválido: " + id));
            }

            // Buscar funcionário completo com relacionamentos usando findById e toDTO
            Employee employee = employeeService.findById(employeeId);
            System.out.println("✅ Funcionário encontrado: " + employee.getName());

            // Converter para DTO que inclui todos os relacionamentos (user, position, unit,
            // etc)
            EmployeeDTO dto = employeeService.toDTO(employee);

            System.out
                    .println("✅ DTO convertido - User ID: " + (dto.getUser() != null ? dto.getUser().getId() : "null"));
            System.out.println("✅ DTO convertido - Position ID: "
                    + (dto.getPosition() != null ? dto.getPosition().getId() : "null"));
            System.out
                    .println("✅ DTO convertido - Unit ID: " + (dto.getUnit() != null ? dto.getUnit().getId() : "null"));

            return ResponseEntity.ok(dto);

        } catch (com.z7design.secured_guard.exception.ResourceNotFoundException e) {
            System.err.println("❌ Funcionário não encontrado: " + id);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getById - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/email/{email}")
    @Operation(summary = "Buscar funcionário por email", description = "Retorna um funcionário específico pelo email")
    public ResponseEntity<EmployeeDTO> getByEmail(@PathVariable String email) {
        Employee employee = employeeService.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
        return ResponseEntity.ok(employeeService.toDTO(employee));
    }

    @PostMapping
    @Operation(summary = "Criar novo funcionário", description = "Cria um novo funcionário no sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Funcionário criado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<EmployeeDTO> create(@Valid @RequestBody EmployeeDTO employeeDTO) {
        EmployeeDTO createdEmployee = employeeService.create(employeeDTO);
        return ResponseEntity.status(201).body(createdEmployee);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar funcionário", description = "Atualiza os dados de um funcionário existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Funcionário atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<EmployeeDTO> update(@PathVariable String id, @Valid @RequestBody EmployeeDTO employeeDTO) {
        UUID changedByUserId = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            changedByUserId = ((User) auth.getPrincipal()).getId();
        }
        EmployeeDTO updatedEmployee = employeeService.update(UUID.fromString(id), employeeDTO, changedByUserId);
        return ResponseEntity.ok(updatedEmployee);
    }

    @GetMapping("/{id}/change-history")
    @PreAuthorize("hasAnyAuthority('EMPLOYEE_HISTORY_READ', 'OPERACIONAL', 'ROLE_OPERACIONAL', 'GESTOR_OPERACIONAL', 'ROLE_GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'ROLE_GESTAO_SUPERVISAO', 'EMPLOYEES_READ', 'EMPLOYEES_WRITE')")
    @Operation(summary = "Histórico de mudanças do funcionário", description = "Lista paginada de alterações de dados do funcionário")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Sem permissão EMPLOYEE_HISTORY_READ"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado")
    })
    public ResponseEntity<Page<EmployeeChangeHistoryDTO>> getChangeHistory(
            @PathVariable String id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID changedByUserId) {
        UUID employeeId = UUID.fromString(id);
        employeeService.findById(employeeId); // 404 se não existir
        Pageable pageable = PageRequest.of(page, size);
        Instant from = dateFrom != null && !dateFrom.isBlank() ? Instant.parse(dateFrom) : null;
        Instant to = dateTo != null && !dateTo.isBlank() ? Instant.parse(dateTo) : null;
        EmployeeChangeCategory cat = null;
        if (category != null && !category.isBlank()) {
            try {
                cat = EmployeeChangeCategory.valueOf(category.toUpperCase());
            } catch (IllegalArgumentException ignored) { }
        }
        Page<EmployeeChangeHistoryDTO> result = employeeChangeHistoryService.findByEmployeeId(employeeId, from, to, cat, changedByUserId, pageable);
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir funcionário", description = "Exclui um funcionário do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Funcionário excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> delete(@PathVariable String id) {
        employeeService.delete(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status do funcionário", description = "Atualiza apenas o status de um funcionário")
    public ResponseEntity<EmployeeDTO> updateStatus(@PathVariable String id, @RequestParam String status) {
        return ResponseEntity
                .ok(employeeService.update(UUID.fromString(id), EmployeeDTO.builder().status(status).build(), null));
    }

    @PostMapping("/bulk-status")
    @Operation(summary = "Atualizar status de múltiplos funcionários", description = "Atualiza o status de vários funcionários em lote")
    public ResponseEntity<Void> bulkUpdateStatus(@RequestBody Map<String, Object> request) {
        List<String> ids = (List<String>) request.get("ids");
        String status = (String) request.get("status");
        List<UUID> uuids = ids.stream().map(UUID::fromString).toList();
        employeeService.bulkUpdateStatus(uuids, status);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-terminate")
    @Operation(summary = "Demitir múltiplos funcionários", description = "Demite vários funcionários em lote")
    public ResponseEntity<Void> bulkTerminate(@RequestBody Map<String, Object> request) {
        List<String> ids = (List<String>) request.get("ids");
        String terminationDateStr = (String) request.get("terminationDate");
        java.time.LocalDate terminationDate = terminationDateStr != null ? java.time.LocalDate.parse(terminationDateStr)
                : java.time.LocalDate.now();
        List<UUID> uuids = ids.stream().map(UUID::fromString).toList();
        employeeService.bulkTerminate(uuids, terminationDate);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk-delete")
    @Operation(summary = "Excluir múltiplos funcionários", description = "Exclui vários funcionários em lote. Apenas funcionários demitidos podem ser excluídos.")
    public ResponseEntity<Void> bulkDelete(@RequestBody Map<String, Object> request) {
        List<String> ids = (List<String>) request.get("ids");
        List<UUID> uuids = ids.stream().map(UUID::fromString).toList();
        employeeService.bulkDelete(uuids);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/export-full")
    @Operation(summary = "Exportar dados completos", description = "Retorna os dados completos de uma lista de funcionários")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<EmployeeDTO>> getFullDataForExport(@RequestBody Map<String, List<String>> request) {
        try {
            List<String> ids = request.get("ids");
            if (ids == null || ids.isEmpty()) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
            List<UUID> uuids = ids.stream().map(UUID::fromString).toList();
            List<EmployeeDTO> dtos = employeeService.findAllByIdsAsDTOs(uuids);
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getFullDataForExport - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Listar funcionários por status", description = "Retorna uma lista de funcionários filtrados por status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Status inválido"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<EmployeeDTO>> getByStatus(@PathVariable String status) {
        try {
            System.out.println("[DEBUG] EmployeeController.getByStatus - Status recebido: " + status);
            com.z7design.secured_guard.model.enums.EmploymentStatus employmentStatus = com.z7design.secured_guard.model.enums.EmploymentStatus
                    .valueOf(status.toUpperCase());
            System.out.println("[DEBUG] EmployeeController.getByStatus - Status convertido: " + employmentStatus);
            List<Employee> employees = employeeService.findByStatus(employmentStatus);
            System.out
                    .println("[DEBUG] EmployeeController.getByStatus - Funcionários encontrados: " + employees.size());
            // Converter um por um para identificar qual está causando problema
            List<EmployeeDTO> dtos = new ArrayList<>();
            for (int i = 0; i < employees.size(); i++) {
                Employee employee = employees.get(i);
                try {
                    System.out.println("[DEBUG] Convertendo funcionário " + (i + 1) + "/" + employees.size() + ": "
                            + employee.getName());

                    // Teste básico - apenas dados essenciais
                    EmployeeDTO dto = new EmployeeDTO();
                    dto.setId(employee.getId());
                    dto.setName(employee.getName());
                    dto.setEmail(employee.getEmail());
                    dto.setStatus(employee.getStatus() != null ? employee.getStatus().name() : null);
                    dto.setCreatedAt(employee.getCreatedAt());
                    dto.setUpdatedAt(employee.getUpdatedAt());

                    dtos.add(dto);
                    System.out.println("[DEBUG] Funcionário " + (i + 1) + " convertido com sucesso");

                } catch (Exception ex) {
                    System.err.println("[ERROR] Erro ao converter funcionário " + (i + 1) + " (" + employee.getName()
                            + "): " + ex.getMessage());
                    ex.printStackTrace();
                    // Continuar com os outros funcionários
                }
            }

            System.out.println("[DEBUG] EmployeeController.getByStatus - DTOs criados: " + dtos.size());
            return ResponseEntity.ok(dtos);
        } catch (IllegalArgumentException e) {
            System.err.println("[ERROR] EmployeeController.getByStatus - Status inválido: " + status);
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.getByStatus - Erro geral: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/search/name")
    @Operation(summary = "Buscar funcionários por nome", description = "Retorna funcionários cujo nome contenha o termo informado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Termo de busca inválido"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<EmployeeDTO>> searchByName(@RequestParam String name) {
        try {
            System.out.println("[DEBUG] EmployeeController.searchByName - Nome recebido: " + name);
            List<Employee> employees = employeeService.findByNameContaining(name);
            System.out
                    .println("[DEBUG] EmployeeController.searchByName - Funcionários encontrados: " + employees.size());
            List<EmployeeDTO> dtos = employees.stream().map(employeeService::toDTO)
                    .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.searchByName - Erro: " + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários por nome: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar funcionários por nome ou documento", description = "Retorna funcionários cujo nome ou documento contenha o termo informado")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Termo de busca inválido"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<EmployeeDTO>> searchByNameOrDocument(@RequestParam String q) {
        try {
            System.out.println("[DEBUG] EmployeeController.searchByNameOrDocument - Termo recebido: " + q);
            List<Employee> employees = employeeService.findByNameOrDocumentContaining(q);
            System.out.println("[DEBUG] EmployeeController.searchByNameOrDocument - Funcionários encontrados: "
                    + employees.size());
            List<EmployeeDTO> dtos = employees.stream().map(employeeService::toDTO)
                    .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.searchByNameOrDocument - Erro: " + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários: " + e.getMessage());
        }
    }

    @GetMapping("/search/simple")
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'EMPLOYEES_CREATE', 'EMPLOYEES_DELETE', 'SUPER_ADMIN', 'ADMIN', 'HR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_HR', 'HR_READ') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'OPERACIONAL', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'RH', 'DEPARTAMENTO_PESSOAL', 'ESTOQUE', 'ALMOXARIFADO', 'RECURSOS_HUMANOS', 'GERENTE')")
    @Operation(summary = "Buscar funcionários simplificados", description = "Retorna dados simplificados de funcionários para seleção em formulários")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários simplificados retornada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Termo de busca inválido"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<SimpleEmployeeDTO>> searchSimple(@RequestParam String q) {
        try {
            System.out.println("[DEBUG] EmployeeController.searchSimple - Termo recebido: " + q);
            List<SimpleEmployeeDTO> employees = employeeService.findSimpleEmployeesByNameOrDocument(q);
            System.out
                    .println("[DEBUG] EmployeeController.searchSimple - Funcionários encontrados: " + employees.size());
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.searchSimple - Erro: " + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários: " + e.getMessage());
        }
    }

    @GetMapping("/search/cpf/{cpf}")
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'EMPLOYEES_CREATE', 'EMPLOYEES_DELETE', 'SUPER_ADMIN', 'ADMIN', 'HR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_HR', 'HR_READ')")
    @Operation(summary = "Buscar funcionário por CPF exato", description = "Busca funcionário por CPF normalizado (remove caracteres não numéricos)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Funcionário encontrado"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<EmployeeDTO> findByCpfExact(@PathVariable String cpf) {
        try {
            System.out.println("[DEBUG] EmployeeController.findByCpfExact - CPF recebido: " + cpf);

            java.util.Optional<Employee> employeeOpt = employeeService.findByCpfExact(cpf);

            if (employeeOpt.isPresent()) {
                EmployeeDTO dto = employeeService.toDTO(employeeOpt.get());
                System.out.println(
                        "[DEBUG] EmployeeController.findByCpfExact - Funcionário encontrado: " + dto.getName());
                return ResponseEntity.ok(dto);
            } else {
                System.out.println(
                        "[DEBUG] EmployeeController.findByCpfExact - Funcionário não encontrado para CPF: " + cpf);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.findByCpfExact - Erro: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao buscar funcionário por CPF: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/generate-history-pdf")
    @Operation(summary = "Gerar PDF do histórico completo do funcionário", description = "Gera e retorna o PDF com postos, alterações, ASO e treinamentos")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "PDF gerado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar PDF")
    })
    public ResponseEntity<byte[]> generateEmployeeHistoryPdf(@PathVariable String id) {
        try {
            UUID employeeId = UUID.fromString(id);
            byte[] pdf = employeeHistoryPdfService.generateEmployeeHistoryPdf(employeeId);
            String fileName = "historico-funcionario-" + id + ".pdf";
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                    .body(pdf);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.generateEmployeeHistoryPdf - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/generate-record-pdf")
    @Operation(summary = "Gerar PDF da ficha de registro do funcionário", description = "Gera e retorna o PDF da ficha de registro do funcionário")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "PDF gerado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar PDF")
    })
    public ResponseEntity<byte[]> generateEmployeeRecordPdf(@PathVariable String id) {
        try {
            System.out.println("[DEBUG] EmployeeController.generateEmployeeRecordPdf - ID: " + id);

            UUID employeeId = UUID.fromString(id);
            byte[] pdf = employeeRecordPdfService.generateEmployeeRecordPdf(employeeId);

            String fileName = "ficha-registro-funcionario-" + id + ".pdf";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE, "application/pdf")
                    .body(pdf);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.generateEmployeeRecordPdf - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}/generate-record-excel")
    @Operation(summary = "Gerar Excel da ficha de registro do funcionário", description = "Gera e retorna o Excel da ficha de registro do funcionário")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Excel gerado com sucesso"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "500", description = "Erro ao gerar Excel")
    })
    public ResponseEntity<byte[]> generateEmployeeRecordExcel(@PathVariable String id) {
        try {
            System.out.println("[DEBUG] EmployeeController.generateEmployeeRecordExcel - ID: " + id);

            UUID employeeId = UUID.fromString(id);
            byte[] excel = employeeRecordPdfService.generateEmployeeRecordExcel(employeeId);

            String fileName = "ficha-registro-funcionario-" + id + ".xlsx";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileName + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(excel);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.generateEmployeeRecordExcel - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 📥 Importar funcionários de planilha Excel
     */
    @PostMapping("/import/excel")
    @Operation(summary = "Importar funcionários do Excel", description = "Importa funcionários de uma planilha Excel. A planilha deve conter uma coluna 'CNPJ Empresa' e os dados dos funcionários.")
    @PreAuthorize("hasAnyAuthority('RH_FUNCIONARIOS_CREATE', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> importEmployeesFromExcel(@RequestParam("file") MultipartFile file) {
        try {
            System.out.println(
                    "📥 EmployeeController.importEmployeesFromExcel - Arquivo recebido: " + file.getOriginalFilename());

            if (file.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Arquivo vazio");
                return ResponseEntity.badRequest().body(response);
            }

            // Processar importação
            EmployeeExcelImportService.ImportResult result = employeeExcelImportService.importEmployees(file);

            Map<String, Object> response = new HashMap<>();
            response.put("success", result.isSuccess());
            response.put("created", result.getCreated());
            response.put("updated", result.getUpdated());
            response.put("errors", result.getErrors());
            response.put("warnings", result.getWarnings());
            response.put("message", result.getSummary());

            System.out.println(
                    "✅ EmployeeController.importEmployeesFromExcel - Importação concluída: " + result.getSummary());

            if (result.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest().body(response);
            }

        } catch (Exception e) {
            System.err.println("❌ EmployeeController.importEmployeesFromExcel - Erro: " + e.getMessage());
            e.printStackTrace();

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erro ao processar importação: " + e.getMessage());
            errorResponse.put("errors", List.of(e.getMessage()));

            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * 📥 Importar funcionários da planilha Promover Vigilância Patrimonial
     */
    @PostMapping("/import/promover")
    @Operation(summary = "Importar planilha Promover", description = "Importa funcionários da planilha XLSX da Promover (CNPJ 43576260000112). Upsert por CPF. Cria Departamento/Cargo automaticamente se não existir.")
    @PreAuthorize("hasAnyAuthority('RH_FUNCIONARIOS_CREATE', 'SUPER_ADMIN', 'ROLE_SUPER_ADMIN', 'ADMIN', 'ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> importFromPromoverPlanilha(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "cnpj", required = false) String cnpj) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Arquivo vazio"));
            }

            EmployeeImportService.ImportResult result = employeeImportService.importar(file, cnpj);

            Map<String, Object> response = new HashMap<>();
            response.put("success", result.erros() == 0);
            response.put("total", result.total());
            response.put("criados", result.criados());
            response.put("atualizados", result.atualizados());
            response.put("erros", result.erros());
            response.put("mensagens", result.mensagens());
            response.put("message", String.format(
                    "Importação concluída: %d total | %d criados | %d atualizados | %d erros",
                    result.total(), result.criados(), result.atualizados(), result.erros()));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ importFromPromoverPlanilha - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Erro ao processar importação: " + e.getMessage()));
        }
    }

    private static Object safeAt(Object[] row, int i) {
        return (row != null && i >= 0 && i < row.length) ? row[i] : null;
    }

    /**
     * Monta {@code workPost} a partir da linha da query nativa (índices 23 = nome do join, 27 = id em employees).
     * Quando {@code work_post_id} está preenchido mas o registro foi removido de {@code work_posts},
     * o JOIN não traz nome — enviamos rótulo explícito para o frontend não tratar como "posto inválido" sem contexto.
     */
    private static void putWorkPostIfPresent(java.util.Map<String, Object> employee, Object[] row) {
        Object wpName = safeAt(row, 23);
        Object wpId = safeAt(row, 27);
        if (wpName == null && wpId == null) {
            return;
        }
        java.util.Map<String, Object> workPost = new java.util.HashMap<>();
        if (wpId != null) {
            workPost.put("id", wpId);
        }
        if (wpName != null) {
            workPost.put("name", wpName);
        } else {
            // wpName == null e ainda entramos aqui ⇒ wpId != null (senão teríamos retornado no início)
            workPost.put("name", "Posto removido ou inexistente (atualize o cadastro)");
            workPost.put("orphanWorkPost", Boolean.TRUE);
        }
        employee.put("workPost", workPost);
    }
}
