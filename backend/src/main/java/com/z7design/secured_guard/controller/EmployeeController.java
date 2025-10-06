package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.dto.SimpleEmployeeDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.service.EmployeeService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Tag(name = "Funcionários", description = "Endpoints para gestão de funcionários")
public class EmployeeController {
    
    private final EmployeeService employeeService;
    
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
            
            System.out.println("✅ EmployeeController.getAllSimple - Retornando " + simpleEmployees.size() + " funcionários simples");
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
                    return ResponseEntity.ok(java.util.Map.of("count", count, "message", "Nenhum funcionário encontrado"));
                }
            } catch (Exception findAllError) {
                System.err.println("❌ Erro no findAll: " + findAllError.getMessage());
                findAllError.printStackTrace();
                
                // Retornar apenas a contagem se o findAll falhar
                return ResponseEntity.ok(java.util.Map.of(
                    "count", count, 
                    "findAllError", findAllError.getMessage(),
                    "message", "Contagem funcionou, mas findAll falhou"
                ));
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
                "ids", employeeIds
            ));
            
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
                employee.put("email", row[2]);
                employee.put("phone", row[3]);
                employee.put("status", row[4]);
                employee.put("createdAt", row[5]);
                employees.add(employee);
            }
            
            return ResponseEntity.ok(java.util.Map.of(
                "count", employees.size(),
                "employees", employees
            ));
            
        } catch (Exception e) {
            System.err.println("❌ EmployeeController.getBasicData - Erro: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    @Operation(summary = "Listar todos os funcionários", description = "Retorna uma lista de todos os funcionários")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de funcionários retornada com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getAll() {
        try {
            System.out.println("🔍 EmployeeController.getAll - Usando query nativa para evitar problemas de relacionamentos");
            
            // Usar query nativa para buscar dados básicos
            List<Object[]> data = employeeService.findBasicData();
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
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar funcionário por ID", description = "Retorna um funcionário específico pelo seu ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Funcionário encontrado"),
            @ApiResponse(responseCode = "404", description = "Funcionário não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Object> getById(@PathVariable String id) {
        try {
            System.out.println("🔍 EmployeeController.getById - Buscando funcionário ID: " + id);
            
            // Usar query nativa para buscar dados básicos
            List<Object[]> data = employeeService.findBasicData();
            System.out.println("🔍 Encontrados " + data.size() + " funcionários no banco");
            
            // Procurar o funcionário pelo ID
            Object[] employeeData = null;
            for (Object[] row : data) {
                if (row[0] != null && row[0].toString().equals(id)) {
                    employeeData = row;
                    break;
                }
            }
            
            if (employeeData != null) {
                System.out.println("✅ Funcionário encontrado: " + employeeData[1]);
                
                // Retornar dados básicos
                java.util.Map<String, Object> result = new java.util.HashMap<>();
                result.put("id", employeeData[0]);
                result.put("name", employeeData[1]);
                result.put("document", employeeData[2]);
                result.put("birthDate", employeeData[3]);
                result.put("registrationNumber", employeeData[4]);
                result.put("hireDate", employeeData[5]);
                result.put("terminationDate", employeeData[6]);
                result.put("status", employeeData[7]);
                result.put("notes", employeeData[8]);
                result.put("address", employeeData[9]);
                result.put("phone", employeeData[10]);
                result.put("email", employeeData[11]);
                result.put("cnhNumber", employeeData[12]);
                result.put("ctps", employeeData[13]);
                result.put("cbo", employeeData[14]);
                result.put("pis", employeeData[15]);
                result.put("salario", employeeData[16]);
                result.put("createdAt", employeeData[17]);
                result.put("updatedAt", employeeData[18]);
                
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.notFound().build();
            }
            
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
        EmployeeDTO updatedEmployee = employeeService.update(UUID.fromString(id), employeeDTO);
        return ResponseEntity.ok(updatedEmployee);
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
    
    @PutMapping("/{id}/status")
    @Operation(summary = "Atualizar status do funcionário", description = "Atualiza apenas o status de um funcionário")
    public ResponseEntity<Employee> updateStatus(@PathVariable String id, @RequestParam String status) {
        try {
            com.z7design.secured_guard.model.enums.EmploymentStatus employmentStatus = 
                com.z7design.secured_guard.model.enums.EmploymentStatus.valueOf(status.toUpperCase());
            Employee employee = employeeService.updateStatus(UUID.fromString(id), employmentStatus);
            return ResponseEntity.ok(employee);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Status inválido: " + status);
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
            com.z7design.secured_guard.model.enums.EmploymentStatus employmentStatus = 
                com.z7design.secured_guard.model.enums.EmploymentStatus.valueOf(status.toUpperCase());
            System.out.println("[DEBUG] EmployeeController.getByStatus - Status convertido: " + employmentStatus);
            List<Employee> employees = employeeService.findByStatus(employmentStatus);
            System.out.println("[DEBUG] EmployeeController.getByStatus - Funcionários encontrados: " + employees.size());
            List<EmployeeDTO> dtos = employees.stream().map(employeeService::toDTO).collect(java.util.stream.Collectors.toList());
            System.out.println("[DEBUG] EmployeeController.getByStatus - DTOs criados: " + dtos.size());
            return ResponseEntity.ok(dtos);
        } catch (IllegalArgumentException e) {
            System.err.println("[ERROR] EmployeeController.getByStatus - Status inválido: " + status);
            throw new IllegalArgumentException("Status inválido: " + status);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.getByStatus - Erro geral: " + e.getMessage());
            e.printStackTrace();
            throw e;
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
            System.out.println("[DEBUG] EmployeeController.searchByName - Funcionários encontrados: " + employees.size());
            List<EmployeeDTO> dtos = employees.stream().map(employeeService::toDTO).collect(java.util.stream.Collectors.toList());
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
            System.out.println("[DEBUG] EmployeeController.searchByNameOrDocument - Funcionários encontrados: " + employees.size());
            List<EmployeeDTO> dtos = employees.stream().map(employeeService::toDTO).collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.searchByNameOrDocument - Erro: " + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários: " + e.getMessage());
        }
    }
    
    @GetMapping("/search/simple")
    @PreAuthorize("hasAnyAuthority('EMPLOYEES_READ', 'EMPLOYEES_WRITE', 'EMPLOYEES_CREATE', 'EMPLOYEES_DELETE', 'SUPER_ADMIN', 'ADMIN', 'HR', 'ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_HR', 'HR_READ')")
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
            System.out.println("[DEBUG] EmployeeController.searchSimple - Funcionários encontrados: " + employees.size());
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            System.err.println("[ERROR] EmployeeController.searchSimple - Erro: " + e.getMessage());
            throw new RuntimeException("Erro ao buscar funcionários: " + e.getMessage());
        }
    }
} 