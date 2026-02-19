package com.z7design.secured_guard.controller;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.z7design.secured_guard.dto.ErrorResponse;
import com.z7design.secured_guard.model.EPIDelivery;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.PersonalProtectiveEquipment;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EPIDeliveryReason;
import com.z7design.secured_guard.repository.EPIDeliveryRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.PersonalProtectiveEquipmentRepository;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.EPIControlPdfService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.Hibernate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/epi-control")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "EPI Control", description = "Endpoints para controle de entrega e devolução de EPIs.")
@SecurityRequirement(name = "bearerAuth")
public class EPIControlController {
    
    private final EPIDeliveryRepository epiDeliveryRepository;
    private final EmployeeRepository employeeRepository;
    private final PersonalProtectiveEquipmentRepository epiRepository;
    private final UserRepository userRepository;
    private final EPIControlPdfService epiControlPdfService;
    
    @Operation(summary = "Busca todos os registros de controle de EPI",
               description = "Retorna uma lista de todos os registros de controle de EPI com filtros opcionais.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Lista de registros de controle de EPI",
                    content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "403", description = "Acesso negado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getEPIControlRecords(
            @RequestParam(required = false) String employeeName,
            @RequestParam(required = false) String employeeFunction,
            @RequestParam(required = false) String deliveryDateFrom,
            @RequestParam(required = false) String deliveryDateTo,
            @RequestParam(required = false) String equipmentName) {
        
        try {
            log.info("Buscando registros de controle de EPI com filtros: employeeName={}, employeeFunction={}, deliveryDateFrom={}, deliveryDateTo={}, equipmentName={}", 
                    employeeName, employeeFunction, deliveryDateFrom, deliveryDateTo, equipmentName);
            
            // Buscar todas as entregas
            List<EPIDelivery> deliveries = epiDeliveryRepository.findAll();
            
            // Aplicar filtros
            if (deliveryDateFrom != null && !deliveryDateFrom.isEmpty()) {
                LocalDate from = LocalDate.parse(deliveryDateFrom);
                deliveries = deliveries.stream()
                    .filter(d -> d.getDeliveryDate() != null && !d.getDeliveryDate().isBefore(from))
                    .collect(Collectors.toList());
            }
            
            if (deliveryDateTo != null && !deliveryDateTo.isEmpty()) {
                LocalDate to = LocalDate.parse(deliveryDateTo);
                deliveries = deliveries.stream()
                    .filter(d -> d.getDeliveryDate() != null && !d.getDeliveryDate().isAfter(to))
                    .collect(Collectors.toList());
            }
            
            // Agrupar por funcionário, data de entrega e nome do EPI
            Map<String, List<EPIDelivery>> grouped = deliveries.stream()
                .collect(Collectors.groupingBy(d -> {
                    Employee emp = d.getEmployee();
                    if (emp == null) return "unknown";
                    Hibernate.initialize(emp);
                    LocalDate deliveryDate = d.getDeliveryDate();
                    PersonalProtectiveEquipment epi = d.getEpi();
                    String epiName = "";
                    if (epi != null) {
                        Hibernate.initialize(epi);
                        epiName = epi.getName() != null ? epi.getName() : "";
                    }
                    return emp.getId().toString() + "_" + 
                           (deliveryDate != null ? deliveryDate.toString() : "no-date") + "_" + 
                           epiName;
                }));
            
            // Converter para formato esperado pelo frontend
            List<Map<String, Object>> records = new ArrayList<>();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            
            for (List<EPIDelivery> deliveryGroup : grouped.values()) {
                if (deliveryGroup.isEmpty()) continue;
                
                EPIDelivery firstDelivery = deliveryGroup.get(0);
                Employee employee = firstDelivery.getEmployee();
                
                if (employee == null) continue;
                Hibernate.initialize(employee);
                
                // Aplicar filtro de nome do funcionário
                if (employeeName != null && !employeeName.isEmpty()) {
                    if (employee.getName() == null || !employee.getName().toLowerCase().contains(employeeName.toLowerCase())) {
                        continue;
                    }
                }
                
                // Aplicar filtro de função
                if (employeeFunction != null && !employeeFunction.isEmpty()) {
                    if (employee.getPosition() != null) {
                        Hibernate.initialize(employee.getPosition());
                    }
                    if (employee.getPosition() == null || employee.getPosition().getName() == null ||
                        !employee.getPosition().getName().toLowerCase().contains(employeeFunction.toLowerCase())) {
                        continue;
                    }
                }
                
                // Obter informações do EPI do primeiro registro (todos do grupo têm o mesmo EPI)
                PersonalProtectiveEquipment epi = firstDelivery.getEpi();
                if (epi == null) continue;
                Hibernate.initialize(epi);
                
                // Aplicar filtro de nome do equipamento
                if (equipmentName != null && !equipmentName.isEmpty()) {
                    if (epi.getName() == null || !epi.getName().toLowerCase().contains(equipmentName.toLowerCase())) {
                        continue;
                    }
                }
                
                // Somar quantidades se houver múltiplas entregas do mesmo EPI na mesma data
                int totalQuantity = deliveryGroup.stream()
                    .mapToInt(d -> d.getQuantity() != null ? d.getQuantity() : 1)
                    .sum();
                
                // Criar equipmentItems com um único item (agrupado por EPI)
                List<Map<String, Object>> equipmentItems = new ArrayList<>();
                Map<String, Object> item = new HashMap<>();
                item.put("id", firstDelivery.getId().toString());
                item.put("equipmentName", epi.getName() != null ? epi.getName() : "");
                item.put("equipmentNumber", epi.getModel() != null ? epi.getModel() : "");
                item.put("ca", epi.getCaNumber() != null ? epi.getCaNumber() : "");
                item.put("quantity", totalQuantity);
                item.put("deliveryDate", firstDelivery.getDeliveryDate() != null ? firstDelivery.getDeliveryDate().format(formatter) : "");
                item.put("replacedDate", null);
                item.put("replacementReason", null);
                item.put("signature", firstDelivery.getEmployeeSignatureUrl() != null ? "Assinado" : "");
                equipmentItems.add(item);
                
                // Criar registro agrupado
                Map<String, Object> record = new HashMap<>();
                record.put("id", firstDelivery.getId().toString());
                record.put("employeeId", employee.getId().toString());
                record.put("employeeName", employee.getName() != null ? employee.getName() : "");
                // Inicializar Position se existir
                if (employee.getPosition() != null) {
                    Hibernate.initialize(employee.getPosition());
                }
                record.put("employeeFunction", employee.getPosition() != null && employee.getPosition().getName() != null 
                    ? employee.getPosition().getName() : "");
                record.put("employeeCpf", employee.getDocument() != null ? employee.getDocument() : "");
                // RG pode estar no campo document ou não estar disponível
                record.put("employeeRg", "");
                record.put("admissionDate", employee.getHireDate() != null ? employee.getHireDate().format(formatter) : "");
                record.put("dismissalDate", employee.getTerminationDate() != null ? employee.getTerminationDate().format(formatter) : null);
                record.put("equipmentItems", equipmentItems);
                record.put("deliveryDate", firstDelivery.getDeliveryDate() != null ? firstDelivery.getDeliveryDate().format(formatter) : "");
                record.put("responsibleDelivery", firstDelivery.getDeliveredByUser() != null ? 
                    (firstDelivery.getDeliveredByUser().getName() != null ? firstDelivery.getDeliveredByUser().getName() : "") : "");
                record.put("signature", firstDelivery.getEmployeeSignatureUrl() != null ? "Assinado" : "");
                record.put("observations", firstDelivery.getNotes() != null ? firstDelivery.getNotes() : "");
                record.put("createdAt", firstDelivery.getCreatedAt() != null ? firstDelivery.getCreatedAt().toString() : "");
                record.put("updatedAt", firstDelivery.getUpdatedAt() != null ? firstDelivery.getUpdatedAt().toString() : "");
                
                records.add(record);
            }
            
            log.info("Retornando {} registros de controle de EPI", records.size());
            return ResponseEntity.ok(records);
            
        } catch (Exception e) {
            log.error("Erro ao buscar registros de controle de EPI", e);
            return ResponseEntity.ok(List.of());
        }
    }
    
    @Operation(summary = "Busca registro de controle de EPI por ID",
               description = "Retorna um registro específico de controle de EPI.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Registro encontrado",
                    content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Registro não encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<Object> getEPIControlRecord(@PathVariable String id) {
        // TODO: Implementar lógica real quando necessário
        return ResponseEntity.notFound().build();
    }
    
    @Operation(summary = "Cria novo registro de controle de EPI",
               description = "Cria um novo registro de controle de EPI.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Registro criado com sucesso",
                    content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "400", description = "Dados inválidos",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping
    public ResponseEntity<Map<String, Object>> createEPIControlRecord(@RequestBody Map<String, Object> data) {
        try {
            log.info("Criando registro de controle de EPI: {}", data);
            
            // Extrair dados do request
            String employeeId = (String) data.get("employeeId");
            String deliveryDateStr = (String) data.get("deliveryDate");
            String responsibleDelivery = (String) data.get("responsibleDelivery");
            String signature = (String) data.get("signature");
            String observations = (String) data.get("observations");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> equipmentItems = (List<Map<String, Object>>) data.get("equipmentItems");
            
            if (employeeId == null || equipmentItems == null || equipmentItems.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Dados inválidos: employeeId e equipmentItems são obrigatórios"));
            }
            
            // Buscar funcionário
            Employee employee = employeeRepository.findById(UUID.fromString(employeeId))
                .orElseThrow(() -> new IllegalArgumentException("Funcionário não encontrado"));
            
            // Buscar usuário responsável pela entrega (se fornecido)
            User deliveredByUser = null;
            if (responsibleDelivery != null && !responsibleDelivery.isEmpty()) {
                // Tentar buscar por nome
                List<User> users = userRepository.findAll().stream()
                    .filter(u -> u.getName() != null && u.getName().equals(responsibleDelivery))
                    .collect(Collectors.toList());
                if (!users.isEmpty()) {
                    deliveredByUser = users.get(0);
                }
            }
            
            // Parse da data de entrega
            LocalDate deliveryDate = deliveryDateStr != null ? LocalDate.parse(deliveryDateStr) : LocalDate.now();
            
            // Criar entregas para cada item de equipamento
            List<EPIDelivery> createdDeliveries = new ArrayList<>();
            for (Map<String, Object> item : equipmentItems) {
                String equipmentName = (String) item.get("equipmentName");
                Integer quantity = item.get("quantity") != null ? 
                    (item.get("quantity") instanceof Integer ? (Integer) item.get("quantity") : 
                     Integer.parseInt(item.get("quantity").toString())) : 1;
                
                if (equipmentName == null || equipmentName.isEmpty()) {
                    continue;
                }
                
                // Buscar EPI pelo nome
                List<PersonalProtectiveEquipment> epis = epiRepository.findByNameContainingIgnoreCase(equipmentName);
                if (epis.isEmpty()) {
                    log.warn("EPI não encontrado: {}", equipmentName);
                    continue;
                }
                
                PersonalProtectiveEquipment epi = epis.get(0);
                
                // Criar entrega
                EPIDelivery delivery = new EPIDelivery();
                delivery.setEmployee(employee);
                delivery.setEpi(epi);
                delivery.setDeliveryDate(deliveryDate);
                delivery.setQuantity(quantity);
                delivery.setDeliveryReason(EPIDeliveryReason.ADMISSAO); // Default
                delivery.setDeliveredByUser(deliveredByUser);
                delivery.setReceivedByEmployee(signature != null && !signature.isEmpty());
                delivery.setNotes(observations);
                
                EPIDelivery savedDelivery = epiDeliveryRepository.save(delivery);
                createdDeliveries.add(savedDelivery);
            }
            
            if (createdDeliveries.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Nenhuma entrega foi criada. Verifique os nomes dos equipamentos."));
            }
            
            // Retornar o primeiro registro criado (formato esperado pelo frontend)
            EPIDelivery firstDelivery = createdDeliveries.get(0);
            Map<String, Object> response = convertToRecordFormat(firstDelivery, createdDeliveries);
            
            log.info("Registro de controle de EPI criado com sucesso: {} entregas", createdDeliveries.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Erro ao criar registro de controle de EPI", e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Erro ao criar registro: " + e.getMessage()));
        }
    }
    
    private Map<String, Object> convertToRecordFormat(EPIDelivery firstDelivery, List<EPIDelivery> allDeliveries) {
        Employee employee = firstDelivery.getEmployee();
        Hibernate.initialize(employee);
        if (employee.getPosition() != null) {
            Hibernate.initialize(employee.getPosition());
        }
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        List<Map<String, Object>> equipmentItems = new ArrayList<>();
        
        for (EPIDelivery delivery : allDeliveries) {
            PersonalProtectiveEquipment epi = delivery.getEpi();
            Hibernate.initialize(epi);
            
            Map<String, Object> item = new HashMap<>();
            item.put("id", delivery.getId().toString());
            item.put("equipmentName", epi.getName() != null ? epi.getName() : "");
            item.put("equipmentNumber", epi.getModel() != null ? epi.getModel() : "");
            item.put("ca", epi.getCaNumber() != null ? epi.getCaNumber() : "");
            item.put("quantity", delivery.getQuantity() != null ? delivery.getQuantity() : 1);
            item.put("deliveryDate", delivery.getDeliveryDate() != null ? delivery.getDeliveryDate().format(formatter) : "");
            item.put("replacedDate", null);
            item.put("replacementReason", null);
            item.put("signature", delivery.getEmployeeSignatureUrl() != null ? "Assinado" : "");
            equipmentItems.add(item);
        }
        
        Map<String, Object> record = new HashMap<>();
        record.put("id", firstDelivery.getId().toString());
        record.put("employeeId", employee.getId().toString());
        record.put("employeeName", employee.getName() != null ? employee.getName() : "");
        record.put("employeeFunction", employee.getPosition() != null && employee.getPosition().getName() != null 
            ? employee.getPosition().getName() : "");
        record.put("employeeCpf", employee.getDocument() != null ? employee.getDocument() : "");
        record.put("employeeRg", "");
        record.put("admissionDate", employee.getHireDate() != null ? employee.getHireDate().format(formatter) : "");
        record.put("dismissalDate", employee.getTerminationDate() != null ? employee.getTerminationDate().format(formatter) : null);
        record.put("equipmentItems", equipmentItems);
        record.put("deliveryDate", firstDelivery.getDeliveryDate() != null ? firstDelivery.getDeliveryDate().format(formatter) : "");
        record.put("responsibleDelivery", firstDelivery.getDeliveredByUser() != null ? 
            (firstDelivery.getDeliveredByUser().getName() != null ? firstDelivery.getDeliveredByUser().getName() : "") : "");
        record.put("signature", firstDelivery.getEmployeeSignatureUrl() != null ? "Assinado" : "");
        record.put("observations", firstDelivery.getNotes() != null ? firstDelivery.getNotes() : "");
        record.put("createdAt", firstDelivery.getCreatedAt() != null ? firstDelivery.getCreatedAt().toString() : "");
        record.put("updatedAt", firstDelivery.getUpdatedAt() != null ? firstDelivery.getUpdatedAt().toString() : "");
        
        return record;
    }
    
    @Operation(summary = "Atualiza registro de controle de EPI",
               description = "Atualiza um registro existente de controle de EPI.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Registro atualizado com sucesso",
                    content = @Content(mediaType = "application/json")),
            @ApiResponse(responseCode = "404", description = "Registro não encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/{id}")
    public ResponseEntity<Object> updateEPIControlRecord(@PathVariable String id, @RequestBody Object data) {
        // TODO: Implementar lógica real quando necessário
        return ResponseEntity.ok().build();
    }
    
    @Operation(summary = "Exclui registro de controle de EPI",
               description = "Exclui um registro de controle de EPI.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Registro excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Registro não encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEPIControlRecord(@PathVariable String id) {
        try {
            log.info("Deletando registro de controle de EPI: {}", id);
            
            UUID deliveryId = UUID.fromString(id);
            if (epiDeliveryRepository.existsById(deliveryId)) {
                epiDeliveryRepository.deleteById(deliveryId);
                log.info("Registro de controle de EPI deletado com sucesso: {}", id);
                return ResponseEntity.noContent().build();
            } else {
                log.warn("Registro de controle de EPI não encontrado: {}", id);
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Erro ao deletar registro de controle de EPI", e);
            return ResponseEntity.notFound().build();
        }
    }
    
    @Operation(summary = "Busca estatísticas de controle de EPI",
               description = "Retorna estatísticas gerais do controle de EPI.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Estatísticas encontradas",
                    content = @Content(mediaType = "application/json"))
    })
    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getEPIControlStats() {
        try {
            log.info("Buscando estatísticas de controle de EPI");
            
            List<EPIDelivery> allDeliveries = epiDeliveryRepository.findAll();
            
            // Contar funcionários únicos
            Set<UUID> employeeIds = allDeliveries.stream()
                .map(d -> {
                    Employee emp = d.getEmployee();
                    if (emp != null) {
                        Hibernate.initialize(emp);
                        return emp.getId();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
            
            // Contar funcionários ativos e demitidos
            long activeEmployees = 0;
            long dismissedEmployees = 0;
            long totalEquipmentItems = 0;
            
            for (UUID empId : employeeIds) {
                Employee emp = employeeRepository.findById(empId).orElse(null);
                if (emp != null) {
                    Hibernate.initialize(emp);
                    if (emp.getStatus() != null && 
                        (emp.getStatus().toString().equals("ACTIVE") || emp.getStatus().toString().equals("ATIVO"))) {
                        activeEmployees++;
                    } else {
                        dismissedEmployees++;
                    }
                }
            }
            
            // Contar itens de equipamento
            for (EPIDelivery delivery : allDeliveries) {
                totalEquipmentItems += delivery.getQuantity() != null ? delivery.getQuantity() : 1;
            }
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalRecords", allDeliveries.size());
            stats.put("activeEmployees", activeEmployees);
            stats.put("dismissedEmployees", dismissedEmployees);
            stats.put("totalEquipmentItems", totalEquipmentItems);
            stats.put("pendingReplacements", 0); // TODO: Implementar lógica de reposições pendentes
            stats.put("expiredEquipment", 0); // TODO: Implementar lógica de equipamentos expirados
            
            log.info("Estatísticas calculadas: {}", stats);
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            log.error("Erro ao buscar estatísticas de controle de EPI", e);
            Map<String, Object> defaultStats = new HashMap<>();
            defaultStats.put("totalRecords", 0);
            defaultStats.put("activeEmployees", 0);
            defaultStats.put("dismissedEmployees", 0);
            defaultStats.put("totalEquipmentItems", 0);
            defaultStats.put("pendingReplacements", 0);
            defaultStats.put("expiredEquipment", 0);
            return ResponseEntity.ok(defaultStats);
        }
    }
    
    @Operation(summary = "Gera relatório PDF de controle de EPI",
               description = "Gera um relatório PDF para um registro específico usando o layout padrão.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "404", description = "Registro não encontrado",
                    content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping(value = "/{id}/report", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateEPIControlReport(@PathVariable String id) {
        try {
            UUID deliveryId = UUID.fromString(id);
            byte[] pdf = epiControlPdfService.generateEPIControlPdf(deliveryId);
            String fileName = "recibo-epi-" + id + ".pdf";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .body(pdf);
        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF de controle de EPI: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }
    
    @Operation(summary = "Gera relatório PDF em lote",
               description = "Gera um relatório PDF para múltiplos registros com filtros.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Relatório gerado com sucesso",
                    content = @Content(mediaType = "application/pdf"))
    })
    @GetMapping("/report/bulk")
    public ResponseEntity<Object> generateEPIControlBulkReport(
            @RequestParam(required = false) String employeeName,
            @RequestParam(required = false) String employeeFunction,
            @RequestParam(required = false) String deliveryDateFrom,
            @RequestParam(required = false) String deliveryDateTo,
            @RequestParam(required = false) String equipmentName) {
        
        // TODO: Implementar geração de PDF em lote quando necessário
        return ResponseEntity.notFound().build();
    }
}
