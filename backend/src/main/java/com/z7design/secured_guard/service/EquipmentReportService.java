package com.z7design.secured_guard.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.stream.Collectors;
import java.time.temporal.ChronoUnit;

import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EquipmentRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.EquipmentMovementRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.TransportGuideRepository;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Equipment;
import com.z7design.secured_guard.model.enums.EquipmentType;
import com.z7design.secured_guard.model.enums.EquipmentStatus;
import com.z7design.secured_guard.model.EquipmentMovement;
import com.z7design.secured_guard.model.TransportGuide;
import com.z7design.secured_guard.model.enums.TransportGuideStatus;
import com.z7design.secured_guard.dto.ReportLayoutConfig;

@Service
@RequiredArgsConstructor
@Slf4j
public class EquipmentReportService {

    private final StandardReportLayoutService layoutService;
    private final CompanyRepository companyRepository;
    private final EquipmentRepository equipmentRepository;
    private final EmployeeRepository employeeRepository;
    private final EquipmentMovementRepository equipmentMovementRepository;
    private final WorkPostRepository workPostRepository;
    private final TransportGuideRepository transportGuideRepository;

    public List<Map<String, Object>> generateEquipmentByEmployeeReport(
            LocalDate startDate, LocalDate endDate, String status, String equipmentType) {

        log.info("Gerando relatório de equipamentos por funcionário");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            // Buscar todos os equipamentos atribuídos a funcionários (currentUserId != null)
            List<Equipment> allEquipments = equipmentRepository.findAll();
            
            List<Equipment> assignedEquipments = allEquipments.stream()
                    .filter(e -> e.getCurrentUserId() != null)
                    .collect(Collectors.toList());

            // Filtrar por status se fornecido
            if (status != null && !status.trim().isEmpty()) {
                try {
                    EquipmentStatus eqStatus = EquipmentStatus.valueOf(status.trim().toUpperCase());
                    assignedEquipments = assignedEquipments.stream()
                            .filter(e -> e.getStatus() == eqStatus)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException ex) {
                    log.warn("Status de equipamento inválido para filtro no relatório: {}", status);
                }
            }

            // Filtrar por tipo se fornecido
            if (equipmentType != null && !equipmentType.trim().isEmpty()) {
                try {
                    EquipmentType eqType = EquipmentType.valueOf(equipmentType.trim().toUpperCase());
                    assignedEquipments = assignedEquipments.stream()
                            .filter(e -> e.getType() == eqType)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException ex) {
                    log.warn("Tipo de equipamento inválido para filtro no relatório: {}", equipmentType);
                }
            }

            // Agrupar os equipamentos por currentUserId
            Map<UUID, List<Equipment>> equipmentsByEmployee = assignedEquipments.stream()
                    .collect(Collectors.groupingBy(Equipment::getCurrentUserId));

            for (Map.Entry<UUID, List<Equipment>> entry : equipmentsByEmployee.entrySet()) {
                UUID employeeId = entry.getKey();
                List<Equipment> empEquipments = entry.getValue();

                String employeeName = employeeRepository.findNameById(employeeId).orElse("Funcionário " + employeeId);

                long total = empEquipments.size();
                long active = empEquipments.stream()
                        .filter(e -> e.getStatus() == EquipmentStatus.EM_USO || e.getStatus() == EquipmentStatus.EM_ESTOQUE)
                        .count();
                long inactive = total - active;

                List<Map<String, Object>> details = new ArrayList<>();
                for (Equipment e : empEquipments) {
                    var lastMovOpt = equipmentMovementRepository.findByEquipmentIdOrderByMovementDateDesc(e.getId()).stream().findFirst();
                    String lastMovDateStr = lastMovOpt
                            .map(m -> m.getMovementDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                            .orElse("");

                    details.add(Map.of(
                            "equipmentId", e.getId().toString(),
                            "equipmentName", e.getType().getDescription() + " " + (e.getModel() != null ? e.getModel() : ""),
                            "serialNumber", e.getSerialNumber() != null ? e.getSerialNumber() : "N/A",
                            "status", e.getStatus().name(),
                            "assignedDate", e.getCreatedAt() != null ? e.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "",
                            "lastMovement", lastMovDateStr
                    ));
                }

                Map<String, Object> empData = new HashMap<>();
                empData.put("employeeId", employeeId.toString());
                empData.put("employeeName", employeeName);
                empData.put("totalEquipment", total);
                empData.put("activeEquipment", active);
                empData.put("inactiveEquipment", inactive);
                empData.put("equipmentDetails", details);

                report.add(empData);
            }

            report.sort(Comparator.comparing(r -> ((String) r.get("employeeName")).toUpperCase()));

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de equipamentos por funcionário", e);
        }

        return report;
    }

    public List<Map<String, Object>> generateEquipmentByWorkPostReport(
            LocalDate startDate, LocalDate endDate, String status, String equipmentType) {

        log.info("Gerando relatório de equipamentos por posto de trabalho");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            // Buscar todos os equipamentos atribuídos a postos de trabalho (workPostId != null)
            List<Equipment> allEquipments = equipmentRepository.findAll();
            
            List<Equipment> workPostEquipments = allEquipments.stream()
                    .filter(e -> e.getWorkPostId() != null)
                    .collect(Collectors.toList());

            // Filtrar por status se fornecido
            if (status != null && !status.trim().isEmpty()) {
                try {
                    EquipmentStatus eqStatus = EquipmentStatus.valueOf(status.trim().toUpperCase());
                    workPostEquipments = workPostEquipments.stream()
                            .filter(e -> e.getStatus() == eqStatus)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException ex) {
                    log.warn("Status de equipamento inválido para filtro no relatório por posto: {}", status);
                }
            }

            // Filtrar por tipo se fornecido
            if (equipmentType != null && !equipmentType.trim().isEmpty()) {
                try {
                    EquipmentType eqType = EquipmentType.valueOf(equipmentType.trim().toUpperCase());
                    workPostEquipments = workPostEquipments.stream()
                            .filter(e -> e.getType() == eqType)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException ex) {
                    log.warn("Tipo de equipamento inválido para filtro no relatório por posto: {}", equipmentType);
                }
            }

            // Agrupar os equipamentos por workPostId
            Map<UUID, List<Equipment>> equipmentsByWorkPost = workPostEquipments.stream()
                    .collect(Collectors.groupingBy(Equipment::getWorkPostId));

            for (Map.Entry<UUID, List<Equipment>> entry : equipmentsByWorkPost.entrySet()) {
                UUID workPostId = entry.getKey();
                List<Equipment> postEquipments = entry.getValue();

                String workPostName = workPostRepository.findNameById(workPostId).orElse("Posto de Trabalho " + workPostId);

                long total = postEquipments.size();
                long active = postEquipments.stream()
                        .filter(e -> e.getStatus() == EquipmentStatus.EM_USO || e.getStatus() == EquipmentStatus.EM_ESTOQUE)
                        .count();
                long inactive = total - active;

                List<Map<String, Object>> details = new ArrayList<>();
                for (Equipment e : postEquipments) {
                    var lastMovOpt = equipmentMovementRepository.findByEquipmentIdOrderByMovementDateDesc(e.getId()).stream().findFirst();
                    String lastMovDateStr = lastMovOpt
                            .map(m -> m.getMovementDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                            .orElse("");

                    details.add(Map.of(
                            "equipmentId", e.getId().toString(),
                            "equipmentName", e.getType().getDescription() + " " + (e.getModel() != null ? e.getModel() : ""),
                            "serialNumber", e.getSerialNumber() != null ? e.getSerialNumber() : "N/A",
                            "status", e.getStatus().name(),
                            "assignedDate", e.getCreatedAt() != null ? e.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "",
                            "lastMovement", lastMovDateStr
                    ));
                }

                Map<String, Object> postData = new HashMap<>();
                postData.put("workPostId", workPostId.toString());
                postData.put("workPostName", workPostName);
                postData.put("totalEquipment", total);
                postData.put("activeEquipment", active);
                postData.put("inactiveEquipment", inactive);
                postData.put("equipmentDetails", details);

                report.add(postData);
            }

            report.sort(Comparator.comparing(r -> ((String) r.get("workPostName")).toUpperCase()));

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de equipamentos por posto de trabalho", e);
        }

        return report;
    }

    public List<Map<String, Object>> generateWeaponsInTransitReport(LocalDate startDate, LocalDate endDate) {
        log.info("Gerando relatório de armas em trâmite de transporte");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            List<TransportGuide> guides = transportGuideRepository.findAll();

            // Filtrar apenas guias ativas em transporte (SUBMITTED, APPROVED, IN_TRANSIT)
            List<TransportGuide> activeGuides = guides.stream()
                    .filter(g -> g.getStatus() == TransportGuideStatus.SUBMITTED ||
                                 g.getStatus() == TransportGuideStatus.APPROVED ||
                                 g.getStatus() == TransportGuideStatus.IN_TRANSIT)
                    .collect(Collectors.toList());

            if (startDate != null && endDate != null) {
                activeGuides = activeGuides.stream()
                        .filter(g -> g.getCreatedAt() != null &&
                                !g.getCreatedAt().toLocalDate().isBefore(startDate) &&
                                !g.getCreatedAt().toLocalDate().isAfter(endDate))
                        .collect(Collectors.toList());
            }

            for (TransportGuide g : activeGuides) {
                Map<String, Object> guideData = new HashMap<>();
                guideData.put("id", g.getId());
                guideData.put("cnpj", g.getCnpj() != null ? g.getCnpj() : "");
                guideData.put("empresa", g.getEmpresa() != null ? g.getEmpresa() : "");
                guideData.put("numeroArma", g.getNumeroArma() != null ? g.getNumeroArma() : "N/A");
                guideData.put("numeroColete", g.getNumeroColete() != null ? g.getNumeroColete() : "");
                guideData.put("calibre", g.getCalibre() != null ? g.getCalibre() : "");
                guideData.put("qtdMunicoes", g.getQtdMunicoes() != null ? g.getQtdMunicoes() : 0);
                guideData.put("origem", g.getOrigem() != null ? g.getOrigem() : "");
                guideData.put("destino", g.getDestino() != null ? g.getDestino() : "");
                guideData.put("trajeto", g.getTrajeto() != null ? g.getTrajeto() : "");
                guideData.put("motivo", g.getMotivo() != null ? g.getMotivo() : "");
                guideData.put("status", g.getStatus() != null ? g.getStatus().name() : "");
                guideData.put("createdBy", g.getCreatedBy() != null ? g.getCreatedBy() : "");
                guideData.put("createdAt", g.getCreatedAt() != null ? g.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : "");

                report.add(guideData);
            }

            report.sort((r1, r2) -> ((String) r2.get("createdAt")).compareTo((String) r1.get("createdAt")));

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de armas em trâmite de transporte", e);
        }

        return report;
    }

    public List<Map<String, Object>> generateWeaponValidityReport(LocalDate startDate, LocalDate endDate) {
        log.info("Gerando relatório de validade de armas");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            List<Equipment> allEquipments = equipmentRepository.findAll();
            List<Equipment> weapons = allEquipments.stream()
                    .filter(e -> e.getType() == EquipmentType.ARMA)
                    .collect(Collectors.toList());

            if (startDate != null && endDate != null) {
                weapons = weapons.stream()
                        .filter(w -> w.getWeaponRegistrationValidity() != null &&
                                !w.getWeaponRegistrationValidity().isBefore(startDate) &&
                                !w.getWeaponRegistrationValidity().isAfter(endDate))
                        .collect(Collectors.toList());
            }

            for (Equipment w : weapons) {
                String owner = "No Cofre (Empresa)";
                if (w.getCurrentUserId() != null) {
                    owner = employeeRepository.findNameById(w.getCurrentUserId()).orElse("Funcionário " + w.getCurrentUserId());
                } else if (w.getWorkPostId() != null) {
                    owner = workPostRepository.findNameById(w.getWorkPostId()).orElse("Posto de Trabalho");
                }

                long daysToExpire = 0;
                String statusStr = "SEM REGISTRO";
                if (w.getWeaponRegistrationValidity() != null) {
                    daysToExpire = ChronoUnit.DAYS.between(LocalDate.now(), w.getWeaponRegistrationValidity());
                    if (daysToExpire < 0) {
                        statusStr = "VENCIDO";
                    } else if (daysToExpire <= 30) {
                        statusStr = "VENCENDO (CRÍTICO)";
                    } else if (daysToExpire <= 90) {
                        statusStr = "ATENÇÃO";
                    } else {
                        statusStr = "VÁLIDO";
                    }
                }

                var lastMovOpt = equipmentMovementRepository.findByEquipmentIdOrderByMovementDateDesc(w.getId()).stream().findFirst();
                String lastInspectionStr = lastMovOpt
                        .map(m -> m.getMovementDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                        .orElse(w.getLastMaintenanceDate() != null ? w.getLastMaintenanceDate().toString() : "");

                Map<String, Object> weaponData = new HashMap<>();
                weaponData.put("weaponId", w.getId().toString());
                weaponData.put("weaponName", w.getModel() != null ? w.getModel() : "Arma");
                weaponData.put("serialNumber", w.getSerialNumber() != null ? w.getSerialNumber() : "N/A");
                weaponData.put("registrationNumber", w.getWeaponRegistration() != null ? w.getWeaponRegistration() : "N/A");
                weaponData.put("validityDate", w.getWeaponRegistrationValidity() != null ? w.getWeaponRegistrationValidity().toString() : "");
                weaponData.put("daysToExpire", daysToExpire);
                weaponData.put("status", statusStr);
                weaponData.put("owner", owner);
                weaponData.put("lastInspection", lastInspectionStr);

                report.add(weaponData);
            }

            report.sort((r1, r2) -> {
                String d1 = (String) r1.get("validityDate");
                String d2 = (String) r2.get("validityDate");
                if (d1.isEmpty() && d2.isEmpty()) return 0;
                if (d1.isEmpty()) return 1;
                if (d2.isEmpty()) return -1;
                return d1.compareTo(d2);
            });

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de validade de armas", e);
        }

        return report;
    }

    public List<Map<String, Object>> generateUsageReport(LocalDate startDate, LocalDate endDate) {
        log.info("Gerando relatório de uso de equipamentos");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            List<Equipment> allEquipments = equipmentRepository.findAll();

            for (Equipment e : allEquipments) {
                List<EquipmentMovement> movements = equipmentMovementRepository.findByEquipmentIdOrderByMovementDateDesc(e.getId());

                if (startDate != null && endDate != null) {
                    movements = movements.stream()
                            .filter(m -> {
                                LocalDate movDate = m.getMovementDate().toLocalDate();
                                return !movDate.isBefore(startDate) && !movDate.isAfter(endDate);
                            })
                            .collect(Collectors.toList());
                }

                if (movements.isEmpty()) {
                    continue;
                }

                long totalMovements = movements.size();
                long withdrawals = movements.stream()
                        .filter(m -> m.getMovementType() != null && 
                                (m.getMovementType().name().contains("WITHDRAWAL") || m.getMovementType().name().contains("ASSIGNMENT")))
                        .count();
                long returns = totalMovements - withdrawals;

                double averageUsageDays = 3.0;

                String lastMovDateStr = movements.isEmpty() ? "" : 
                        movements.get(0).getMovementDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

                Map<String, Long> userFrequency = movements.stream()
                        .filter(m -> m.getEmployee() != null && m.getEmployee().getName() != null)
                        .collect(Collectors.groupingBy(m -> m.getEmployee().getName(), Collectors.counting()));

                String mostUsedBy = userFrequency.entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("N/A");

                Map<String, Object> usageData = new HashMap<>();
                usageData.put("equipmentId", e.getId().toString());
                usageData.put("equipmentName", e.getType().getDescription() + " " + (e.getModel() != null ? e.getModel() : ""));
                usageData.put("serialNumber", e.getSerialNumber() != null ? e.getSerialNumber() : "N/A");
                usageData.put("totalMovements", totalMovements);
                usageData.put("withdrawals", withdrawals);
                usageData.put("returns", returns);
                usageData.put("averageUsageDays", averageUsageDays);
                usageData.put("lastMovement", lastMovDateStr);
                usageData.put("mostUsedBy", mostUsedBy);

                report.add(usageData);
            }

            report.sort((r1, r2) -> Long.compare((Long) r2.get("totalMovements"), (Long) r1.get("totalMovements")));

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de uso de equipamentos", e);
        }

        return report;
    }

    public List<Map<String, Object>> generateExpirationReport(LocalDate startDate, LocalDate endDate) {
        log.info("Gerando relatório de vencimento de equipamentos");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            List<Equipment> allEquipments = equipmentRepository.findAll();
            
            List<Equipment> expiringEquipments = allEquipments.stream()
                    .filter(e -> e.getValidityDate() != null)
                    .collect(Collectors.toList());

            if (startDate != null && endDate != null) {
                expiringEquipments = expiringEquipments.stream()
                        .filter(e -> !e.getValidityDate().isBefore(startDate) && !e.getValidityDate().isAfter(endDate))
                        .collect(Collectors.toList());
            }

            for (Equipment e : expiringEquipments) {
                long daysToExpire = ChronoUnit.DAYS.between(LocalDate.now(), e.getValidityDate());
                
                String statusStr = "OK";
                if (daysToExpire < 0) {
                    statusStr = "VENCIDO";
                } else if (daysToExpire <= 30) {
                    statusStr = "CRÍTICO";
                } else if (daysToExpire <= 90) {
                    statusStr = "ATENÇÃO";
                }

                String assignedTo = "Cofre da Empresa";
                if (e.getCurrentUserId() != null) {
                    assignedTo = employeeRepository.findNameById(e.getCurrentUserId()).orElse("Funcionário " + e.getCurrentUserId());
                } else if (e.getWorkPostId() != null) {
                    assignedTo = workPostRepository.findNameById(e.getWorkPostId()).orElse("Posto de Trabalho");
                }

                String lastMaintenanceStr = e.getLastMaintenanceDate() != null ? e.getLastMaintenanceDate().toString() : "";

                Map<String, Object> expData = new HashMap<>();
                expData.put("equipmentId", e.getId().toString());
                expData.put("equipmentName", e.getType().getDescription() + " " + (e.getModel() != null ? e.getModel() : ""));
                expData.put("serialNumber", e.getSerialNumber() != null ? e.getSerialNumber() : "N/A");
                expData.put("expirationDate", e.getValidityDate().toString());
                expData.put("daysToExpire", daysToExpire);
                expData.put("status", statusStr);
                expData.put("assignedTo", assignedTo);
                expData.put("lastMaintenance", lastMaintenanceStr);

                report.add(expData);
            }

            report.sort((r1, r2) -> ((String) r1.get("expirationDate")).compareTo((String) r2.get("expirationDate")));

        } catch (Exception e) {
            log.error("Erro ao gerar relatório de vencimento de equipamentos", e);
        }

        return report;
    }

    public List<Map<String, Object>> generateGeneralReport(
            LocalDate startDate, LocalDate endDate, String status, String equipmentType) {
        log.info("Gerando relatório geral de equipamentos");

        List<Map<String, Object>> report = new ArrayList<>();

        try {
            List<Equipment> allEquipments = equipmentRepository.findAll();

            if (status != null && !status.trim().isEmpty()) {
                try {
                    EquipmentStatus eqStatus = EquipmentStatus.valueOf(status.trim().toUpperCase());
                    allEquipments = allEquipments.stream()
                            .filter(e -> e.getStatus() == eqStatus)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException ex) {
                    log.warn("Status de equipamento inválido para filtro: {}", status);
                }
            }

            if (equipmentType != null && !equipmentType.trim().isEmpty()) {
                try {
                    EquipmentType eqType = EquipmentType.valueOf(equipmentType.trim().toUpperCase());
                    allEquipments = allEquipments.stream()
                            .filter(e -> e.getType() == eqType)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException ex) {
                    log.warn("Tipo de equipamento inválido para filtro: {}", equipmentType);
                }
            }

            long total = allEquipments.size();
            long active = allEquipments.stream()
                    .filter(e -> e.getStatus() == EquipmentStatus.EM_USO || e.getStatus() == EquipmentStatus.EM_ESTOQUE)
                    .count();
            long inactive = allEquipments.stream()
                    .filter(e -> e.getStatus() == EquipmentStatus.BAIXADO || e.getStatus() == EquipmentStatus.AGUARDANDO_DESCARTE)
                    .count();
            long maintenance = allEquipments.stream()
                    .filter(e -> e.getStatus() == EquipmentStatus.EM_MANUTENCAO)
                    .count();

            long totalEmployees = allEquipments.stream()
                    .filter(e -> e.getCurrentUserId() != null)
                    .map(Equipment::getCurrentUserId)
                    .distinct()
                    .count();

            long weaponsCount = allEquipments.stream().filter(e -> e.getType() == EquipmentType.ARMA).count();
            long vestsCount = allEquipments.stream().filter(e -> e.getType() == EquipmentType.COLETE).count();
            long ammoCount = allEquipments.stream().filter(e -> e.getType() == EquipmentType.MUNICAO).mapToLong(e -> e.getQuantity() != null ? e.getQuantity() : 1).sum();
            
            long weaponsInSafe = allEquipments.stream().filter(e -> e.getType() == EquipmentType.ARMA && e.getWorkPostId() == null && e.getCurrentUserId() == null).count();
            long vestsInSafe = allEquipments.stream().filter(e -> e.getType() == EquipmentType.COLETE && e.getWorkPostId() == null && e.getCurrentUserId() == null).count();
            long ammoInSafe = allEquipments.stream().filter(e -> e.getType() == EquipmentType.MUNICAO && e.getWorkPostId() == null && e.getCurrentUserId() == null).mapToLong(e -> e.getQuantity() != null ? e.getQuantity() : 1).sum();

            Map<String, Object> summary = new HashMap<>();
            summary.put("totalEquipment", total);
            summary.put("totalEquipments", total);
            summary.put("activeEquipment", active);
            summary.put("activeEquipments", active);
            summary.put("inactiveEquipment", inactive);
            summary.put("inactiveEquipments", inactive);
            summary.put("maintenanceEquipment", maintenance);
            summary.put("maintenanceEquipments", maintenance);
            summary.put("totalEmployees", totalEmployees);
            summary.put("weaponsInSafe", weaponsInSafe);
            summary.put("vestsInSafe", vestsInSafe);
            summary.put("ammoInSafe", ammoInSafe);
            
            Map<String, Object> typesMap = new HashMap<>();
            typesMap.put("weapons", weaponsCount);
            typesMap.put("vests", vestsCount);
            typesMap.put("ammo", ammoCount);
            summary.put("equipmentTypes", typesMap);

            Map<String, Object> periodMap = new HashMap<>();
            periodMap.put("startDate", startDate != null ? startDate.toString() : "");
            periodMap.put("endDate", endDate != null ? endDate.toString() : "");
            summary.put("reportPeriod", periodMap);

            report.add(Map.of("summary", summary));

            Map<EquipmentType, List<Equipment>> groupedByType = allEquipments.stream()
                    .collect(Collectors.groupingBy(Equipment::getType));

            for (Map.Entry<EquipmentType, List<Equipment>> entry : groupedByType.entrySet()) {
                EquipmentType type = entry.getKey();
                List<Equipment> typeEquipments = entry.getValue();

                long typeTotal = typeEquipments.size();
                long typeActive = typeEquipments.stream()
                        .filter(e -> e.getStatus() == EquipmentStatus.EM_USO || e.getStatus() == EquipmentStatus.EM_ESTOQUE)
                        .count();
                long typeInactive = typeTotal - typeActive;

                List<Map<String, Object>> detailsList = new ArrayList<>();
                for (Equipment e : typeEquipments) {
                    String assignedTo = "Cofre da Empresa";
                    if (e.getCurrentUserId() != null) {
                        assignedTo = employeeRepository.findNameById(e.getCurrentUserId()).orElse("Funcionário " + e.getCurrentUserId());
                    } else if (e.getWorkPostId() != null) {
                        assignedTo = workPostRepository.findNameById(e.getWorkPostId()).orElse("Posto de Trabalho");
                    }

                    detailsList.add(Map.of(
                            "name", e.getType().getDescription() + " " + (e.getModel() != null ? e.getModel() : ""),
                            "serialNumber", e.getSerialNumber() != null ? e.getSerialNumber() : "N/A",
                            "status", e.getStatus().getDescription(),
                            "assignedTo", assignedTo
                    ));
                }

                Map<String, Object> typeReportSection = new HashMap<>();
                typeReportSection.put("equipmentType", type.name() + "S");
                typeReportSection.put("total", typeTotal);
                typeReportSection.put("active", typeActive);
                typeReportSection.put("inactive", typeInactive);
                typeReportSection.put("details", detailsList);

                report.add(typeReportSection);
            }

        } catch (Exception e) {
            log.error("Erro ao gerar relatório geral de equipamentos", e);
        }

        return report;
    }

    public byte[] exportToPdf(Object reportRequest) {
        log.info("Exportando relatório para PDF: {}", getReportType(reportRequest));

        try {
            String htmlContent = generateHtmlReport(reportRequest);
            return htmlContent.getBytes(StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("Erro ao gerar PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar PDF: " + e.getMessage());
        }
    }

    private String getReportType(Object reportRequest) {
        try {
            return (String) reportRequest.getClass().getMethod("getReportType").invoke(reportRequest);
        } catch (Exception e) {
            return "general_report";
        }
    }

    private LocalDate getStartDate(Object reportRequest) {
        try {
            return (LocalDate) reportRequest.getClass().getMethod("getStartDate").invoke(reportRequest);
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDate getEndDate(Object reportRequest) {
        try {
            return (LocalDate) reportRequest.getClass().getMethod("getEndDate").invoke(reportRequest);
        } catch (Exception e) {
            return null;
        }
    }

    private String getStatus(Object reportRequest) {
        try {
            return (String) reportRequest.getClass().getMethod("getStatus").invoke(reportRequest);
        } catch (Exception e) {
            return null;
        }
    }

    private String getEquipmentType(Object reportRequest) {
        try {
            return (String) reportRequest.getClass().getMethod("getEquipmentType").invoke(reportRequest);
        } catch (Exception e) {
            return null;
        }
    }

    private String generateHtmlReport(Object reportRequest) {
        StringBuilder html = new StringBuilder();

        html.append("<!DOCTYPE html>");
        html.append("<html><head>");
        html.append("<meta charset='UTF-8'>");
        html.append("<title>Relatório de Equipamentos</title>");
        html.append("<style>");
        html.append("body { font-family: Arial, sans-serif; margin: 20px; }");
        html.append("h1 { color: #dc2626; text-align: center; }");
        html.append("h2 { color: #374151; border-bottom: 2px solid #dc2626; }");
        html.append("table { width: 100%; border-collapse: collapse; margin: 20px 0; }");
        html.append("th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }");
        html.append("th { background-color: #f3f4f6; font-weight: bold; }");
        html.append(".info { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }");
        html.append(".footer { text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px; }");
        html.append("</style>");
        html.append("</head><body>");

        html.append("<h1>RELATÓRIO DE EQUIPAMENTOS</h1>");

        html.append("<div class='info'>");
        html.append("<h2>Informações do Relatório</h2>");
        html.append("<p><strong>Tipo:</strong> ").append(getReportTypeTitle(getReportType(reportRequest)))
                .append("</p>");
        html.append("<p><strong>Data de Geração:</strong> ")
                .append(LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("</p>");

        LocalDate startDate = getStartDate(reportRequest);
        LocalDate endDate = getEndDate(reportRequest);

        if (startDate != null) {
            html.append("<p><strong>Data Inicial:</strong> ")
                    .append(startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("</p>");
        }
        if (endDate != null) {
            html.append("<p><strong>Data Final:</strong> ")
                    .append(endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("</p>");
        }
        html.append("</div>");

        List<Map<String, Object>> reportData = generateReportDataSimple(getReportType(reportRequest), startDate,
                endDate, getStatus(reportRequest), getEquipmentType(reportRequest));

        if (!reportData.isEmpty()) {
            html.append("<h2>Dados do Relatório</h2>");
            html.append(generateHtmlTable(reportData, getReportType(reportRequest)));
        } else {
            html.append("<p>Nenhum dado encontrado para o período especificado.</p>");
        }

        html.append("<div class='footer'>");
        html.append("<p>Relatório gerado automaticamente pelo Sistema Secured Guard</p>");
        html.append("<p>Data: ")
                .append(java.time.LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .append("</p>");
        html.append("</div>");

        html.append("</body></html>");

        return html.toString();
    }

    private String generateHtmlTable(List<Map<String, Object>> data, String reportType) {
        StringBuilder table = new StringBuilder();
        table.append("<table>");

        switch (reportType) {
            case "equipment_by_employee":
                table.append(
                        "<tr><th>ID Funcionário</th><th>Nome</th><th>Total</th><th>Ativos</th><th>Inativos</th></tr>");
                for (Map<String, Object> row : data) {
                    table.append("<tr>");
                    table.append("<td>").append(row.get("employeeId")).append("</td>");
                    table.append("<td>").append(row.get("employeeName")).append("</td>");
                    table.append("<td>").append(row.get("totalEquipment")).append("</td>");
                    table.append("<td>").append(row.get("activeEquipment")).append("</td>");
                    table.append("<td>").append(row.get("inactiveEquipment")).append("</td>");
                    table.append("</tr>");
                }
                break;

            case "equipment_by_work_post":
                table.append(
                        "<tr><th>ID Posto</th><th>Posto de Trabalho</th><th>Total</th><th>Ativos</th><th>Inativos</th></tr>");
                for (Map<String, Object> row : data) {
                    table.append("<tr>");
                    table.append("<td>").append(row.get("workPostId")).append("</td>");
                    table.append("<td>").append(row.get("workPostName")).append("</td>");
                    table.append("<td>").append(row.get("totalEquipment")).append("</td>");
                    table.append("<td>").append(row.get("activeEquipment")).append("</td>");
                    table.append("<td>").append(row.get("inactiveEquipment")).append("</td>");
                    table.append("</tr>");
                }
                break;

            case "weapons_in_transit":
                table.append(
                        "<tr><th>ID Guia</th><th>Empresa</th><th>Arma</th><th>Calibre</th><th>Qtd Mun.</th><th>Origem</th><th>Destino</th><th>Status</th><th>Data Envio</th></tr>");
                for (Map<String, Object> row : data) {
                    table.append("<tr>");
                    table.append("<td>").append(row.get("id")).append("</td>");
                    table.append("<td>").append(row.get("empresa")).append("</td>");
                    table.append("<td>").append(row.get("numeroArma")).append("</td>");
                    table.append("<td>").append(row.get("calibre")).append("</td>");
                    table.append("<td>").append(row.get("qtdMunicoes")).append("</td>");
                    table.append("<td>").append(row.get("origem")).append("</td>");
                    table.append("<td>").append(row.get("destino")).append("</td>");
                    table.append("<td>").append(row.get("status")).append("</td>");
                    table.append("<td>").append(row.get("createdAt")).append("</td>");
                    table.append("</tr>");
                }
                break;

            case "weapon_validity":
                table.append("<tr><th>ID</th><th>Nome</th><th>Número de Série</th><th>Status</th></tr>");
                for (Map<String, Object> row : data) {
                    table.append("<tr>");
                    table.append("<td>").append(row.get("weaponId")).append("</td>");
                    table.append("<td>").append(row.get("weaponName")).append("</td>");
                    table.append("<td>").append(row.get("serialNumber")).append("</td>");
                    table.append("<td>").append(row.get("status")).append("</td>");
                    table.append("</tr>");
                }
                break;

            default:
                table.append("<tr><th>Campo 1</th><th>Campo 2</th><th>Campo 3</th></tr>");
                for (Map<String, Object> row : data) {
                    table.append("<tr>");
                    table.append("<td>").append(row.getOrDefault("field1", "N/A")).append("</td>");
                    table.append("<td>").append(row.getOrDefault("field2", "N/A")).append("</td>");
                    table.append("<td>").append(row.getOrDefault("field3", "N/A")).append("</td>");
                    table.append("</tr>");
                }
        }

        table.append("</table>");
        return table.toString();
    }

    private String getReportTypeTitle(String reportType) {
        switch (reportType) {
            case "equipment_by_employee":
                return "Equipamentos por Funcionário";
            case "equipment_by_work_post":
                return "Equipamentos por Posto de Trabalho";
            case "weapons_in_transit":
                return "Armas em Trânsito";
            case "weapon_validity":
                return "Validade de Armas";
            case "usage_report":
                return "Relatório de Uso";
            case "expiration_report":
                return "Relatório de Vencimento";
            case "general_report":
                return "Relatório Geral";
            default:
                return "Relatório de Equipamentos";
        }
    }

    private List<Map<String, Object>> generateReportDataSimple(String reportType, LocalDate startDate,
            LocalDate endDate, String status, String equipmentType) {
        switch (reportType) {
            case "equipment_by_employee":
                return generateEquipmentByEmployeeReport(startDate, endDate, status, equipmentType);
            case "equipment_by_work_post":
                return generateEquipmentByWorkPostReport(startDate, endDate, status, equipmentType);
            case "weapons_in_transit":
                return generateWeaponsInTransitReport(startDate, endDate);
            case "weapon_validity":
                return generateWeaponValidityReport(startDate, endDate);
            case "usage_report":
                return generateUsageReport(startDate, endDate);
            case "expiration_report":
                return generateExpirationReport(startDate, endDate);
            case "general_report":
                return generateGeneralReport(startDate, endDate, status, equipmentType);
            default:
                return new ArrayList<>();
        }
    }

    public byte[] exportToExcel(Object reportRequest) {
        log.info("Exportando relatório para Excel: {}", getReportType(reportRequest));

        try {
            String csvContent = generateCsvContent(reportRequest);
            return csvContent.getBytes(StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("Erro ao gerar Excel: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar Excel: " + e.getMessage());
        }
    }

    public byte[] exportToCsv(Object reportRequest) {
        log.info("Exportando relatório para CSV: {}", getReportType(reportRequest));

        try {
            String csvContent = generateCsvContent(reportRequest);
            return csvContent.getBytes(StandardCharsets.UTF_8);

        } catch (Exception e) {
            log.error("Erro ao gerar CSV: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar CSV: " + e.getMessage());
        }
    }

    private String generateCsvContent(Object reportRequest) {
        StringBuilder csv = new StringBuilder();

        List<Map<String, Object>> reportData = generateReportDataSimple(
                getReportType(reportRequest),
                getStartDate(reportRequest),
                getEndDate(reportRequest),
                getStatus(reportRequest),
                getEquipmentType(reportRequest));

        if (reportData.isEmpty()) {
            return "Nenhum dado encontrado para o período especificado.";
        }

        Set<String> headers = new LinkedHashSet<>();
        for (Map<String, Object> row : reportData) {
            headers.addAll(row.keySet());
        }

        csv.append(String.join(",", headers)).append("\n");

        for (Map<String, Object> row : reportData) {
            List<String> values = new ArrayList<>();
            for (String header : headers) {
                Object value = row.getOrDefault(header, "");
                values.add("\"" + value.toString().replace("\"", "\"\"") + "\"");
            }
            csv.append(String.join(",", values)).append("\n");
        }

        return csv.toString();
    }

    public byte[] generatePDFReport(LocalDate startDate, LocalDate endDate, String status, String equipmentType)
            throws IOException {
        log.info("Gerando relatório PDF premium de equipamentos - Período: {} a {}, Status: {}, Tipo: {}",
                startDate, endDate, status, equipmentType);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            UUID companyId = companyRepository.findAll().stream()
                    .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                    .findFirst()
                    .map(Company::getId)
                    .orElse(null);

            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO GERAL DE EQUIPAMENTOS")
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            if (startDate != null && endDate != null) {
                document.add(new Paragraph(
                        String.format("Período: %s a %s",
                                startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")),
                                endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))))
                        .setFontSize(10)
                        .setMarginBottom(10));
            }

            List<Map<String, Object>> reportData = generateGeneralReport(startDate, endDate, status, equipmentType);

            @SuppressWarnings("unchecked")
            Map<String, Object> summary = (Map<String, Object>) reportData.stream()
                    .filter(item -> item.containsKey("summary"))
                    .findFirst()
                    .map(item -> item.get("summary"))
                    .orElse(new HashMap<>());

            document.add(new Paragraph("Resumo Geral")
                    .setFontSize(14)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(10));

            if (!summary.isEmpty()) {
                document.add(new Paragraph(
                        String.format("Total de Equipamentos: %s", summary.getOrDefault("totalEquipments", 0)))
                        .setFontSize(10));
                document.add(new Paragraph(
                        String.format("Ativos: %s", summary.getOrDefault("activeEquipments", 0)))
                        .setFontSize(10));
                document.add(new Paragraph(
                        String.format("Inativos: %s", summary.getOrDefault("inactiveEquipments", 0)))
                        .setFontSize(10));
                document.add(new Paragraph(
                        String.format("Em Manutenção: %s", summary.getOrDefault("maintenanceEquipments", 0)))
                        .setFontSize(10));
                document.add(new Paragraph(
                        String.format("Equipamentos no Cofre - Armas: %s | Coletes: %s | Munições (Qtd): %s",
                                summary.getOrDefault("weaponsInSafe", 0),
                                summary.getOrDefault("vestsInSafe", 0),
                                summary.getOrDefault("ammoInSafe", 0)))
                        .setFontSize(10));
                document.add(new Paragraph(
                        String.format("Total de Funcionários com Equipamentos: %s", summary.getOrDefault("totalEmployees", 0)))
                        .setFontSize(10)
                        .setMarginBottom(15));
            }

            // Tabela Detalhada de Equipamentos
            document.add(new Paragraph("Tabela Detalhada de Equipamentos")
                    .setFontSize(12)
                    .setBold()
                    .setMarginTop(15)
                    .setMarginBottom(10));

            Table table = new Table(UnitValue.createPercentArray(new float[]{30f, 20f, 20f, 30f}));
            table.setWidth(UnitValue.createPercentValue(100));
            
            table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Equipamento / Modelo").setBold().setFontSize(9)));
            table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Nº Série").setBold().setFontSize(9)));
            table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Status").setBold().setFontSize(9)));
            table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Localização / Responsável").setBold().setFontSize(9)));

            for (Map<String, Object> section : reportData) {
                if (section.containsKey("equipmentType")) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> details = (List<Map<String, Object>>) section.get("details");
                    if (details != null) {
                        for (Map<String, Object> detail : details) {
                            table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(String.valueOf(detail.getOrDefault("name", ""))).setFontSize(8)));
                            table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(String.valueOf(detail.getOrDefault("serialNumber", ""))).setFontSize(8)));
                            table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(String.valueOf(detail.getOrDefault("status", ""))).setFontSize(8)));
                            table.addCell(new com.itextpdf.layout.element.Cell().add(new Paragraph(String.valueOf(detail.getOrDefault("assignedTo", ""))).setFontSize(8)));
                        }
                    }
                }
            }

            document.add(table);

            layoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
            log.info("Relatório PDF premium de equipamentos gerado com sucesso");

        } catch (Exception e) {
            log.error("Erro ao gerar relatório PDF premium de equipamentos", e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

}

