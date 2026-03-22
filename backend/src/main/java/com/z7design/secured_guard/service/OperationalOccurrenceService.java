package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateOccurrenceDTO;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.OperationalOccurrence;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.OperationalOccurrenceRepository;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OperationalOccurrenceService {
    
    private final OperationalOccurrenceRepository occurrenceRepository;
    private final EmployeeRepository employeeRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final ExcelReportLayoutService excelReportLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeChangeHistoryService employeeChangeHistoryService;

    
    /**
     * Criar nova ocorrência operacional a partir de DTO
     */
    public OperationalOccurrence createFromDTO(CreateOccurrenceDTO dto) {
        log.info("Criando nova ocorrência a partir de DTO para funcionário: {}", dto.getEmployeeId());
        
        // Validar funcionário
        Employee employee = employeeRepository.findById(dto.getEmployeeId())
            .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
        
        // Validar número de advertência se fornecido
        if (dto.getWarningNumber() != null && 
            occurrenceRepository.existsByWarningNumber(dto.getWarningNumber())) {
            throw new BusinessException("Número de advertência já existe");
        }
        
        // Converter tipo
        OperationalOccurrence.OccurrenceType type;
        try {
            type = OperationalOccurrence.OccurrenceType.valueOf(dto.getType().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Tipo de ocorrência inválido: " + dto.getType());
        }
        
        // Converter status (se não fornecido, usar PENDENTE)
        OperationalOccurrence.OccurrenceStatus status = OperationalOccurrence.OccurrenceStatus.PENDENTE;
        if (dto.getStatus() != null && !dto.getStatus().isEmpty()) {
            try {
                status = OperationalOccurrence.OccurrenceStatus.valueOf(dto.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Status inválido: {}, usando PENDENTE", dto.getStatus());
            }
        }
        
        // Converter prioridade (se não fornecido, usar MEDIA)
        OperationalOccurrence.OccurrencePriority priority = OperationalOccurrence.OccurrencePriority.MEDIA;
        if (dto.getPriority() != null && !dto.getPriority().isEmpty()) {
            try {
                priority = OperationalOccurrence.OccurrencePriority.valueOf(dto.getPriority().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Prioridade inválida: {}, usando MEDIA", dto.getPriority());
            }
        }
        
        // Converter data
        LocalDateTime date = dto.getDateAsLocalDateTime();
        
        // Criar ocorrência
        OperationalOccurrence occurrence = OperationalOccurrence.builder()
            .type(type)
            .title(dto.getTitle())
            .description(dto.getDescription())
            .employee(employee)
            .location(dto.getLocation())
            .status(status)
            .priority(priority)
            .date(date)
            .responsible(dto.getResponsible())
            .warningNumber(dto.getWarningNumber())
            .substitute(dto.getSubstituteId() != null ? employeeRepository.findById(dto.getSubstituteId()).orElse(null) : null)
            .originalStartTime(dto.getOriginalStartTime())
            .originalEndTime(dto.getOriginalEndTime())
            .substituteStartTime(dto.getSubstituteStartTime())
            .substituteEndTime(dto.getSubstituteEndTime())
            .totalHours(dto.getTotalHours())
            .category(dto.getCategory() != null ? dto.getCategory() : "INCIDENT")
            .build();

        
        OperationalOccurrence savedOccurrence = occurrenceRepository.save(occurrence);
        log.info("Ocorrência criada com sucesso: {}", savedOccurrence.getId());

        recordOccurrenceToEmployeeHistory(savedOccurrence, null);
        
        return savedOccurrence;
    }
    
    /**
     * Criar nova ocorrência operacional
     */
    public OperationalOccurrence createOccurrence(OperationalOccurrence occurrence) {
        log.info("Criando nova ocorrência para funcionário: {}", occurrence.getEmployee().getId());
        
        // Validar funcionário
        Employee employee = employeeRepository.findById(occurrence.getEmployee().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
        
        // Validar número de advertência se fornecido
        if (occurrence.getWarningNumber() != null && 
            occurrenceRepository.existsByWarningNumber(occurrence.getWarningNumber())) {
            throw new BusinessException("Número de advertência já existe");
        }
        
        // Definir status inicial
        occurrence.setStatus(OperationalOccurrence.OccurrenceStatus.PENDENTE);
        occurrence.setEmployee(employee);
        occurrence.setDate(LocalDateTime.now());
        
        OperationalOccurrence savedOccurrence = occurrenceRepository.save(occurrence);
        log.info("Ocorrência criada com sucesso: {}", savedOccurrence.getId());

        recordOccurrenceToEmployeeHistory(savedOccurrence, null);
        
        return savedOccurrence;
    }
    
    /**
     * Atualizar ocorrência existente
     */
    public OperationalOccurrence updateOccurrence(UUID id, OperationalOccurrence occurrenceDetails) {
        log.info("Atualizando ocorrência: {}", id);
        
        OperationalOccurrence existingOccurrence = occurrenceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ocorrência não encontrada"));
        
        // Validar funcionário se foi alterado
        if (occurrenceDetails.getEmployee() != null && 
            !occurrenceDetails.getEmployee().getId().equals(existingOccurrence.getEmployee().getId())) {
            Employee employee = employeeRepository.findById(occurrenceDetails.getEmployee().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Funcionário não encontrado"));
            existingOccurrence.setEmployee(employee);
        }
        
        // Validar número de advertência se foi alterado
        if (occurrenceDetails.getWarningNumber() != null && 
            !occurrenceDetails.getWarningNumber().equals(existingOccurrence.getWarningNumber()) &&
            occurrenceRepository.existsByWarningNumber(occurrenceDetails.getWarningNumber())) {
            throw new BusinessException("Número de advertência já existe");
        }
        
        // Atualizar campos
        if (occurrenceDetails.getType() != null) {
            existingOccurrence.setType(occurrenceDetails.getType());
        }
        if (occurrenceDetails.getTitle() != null) {
            existingOccurrence.setTitle(occurrenceDetails.getTitle());
        }
        if (occurrenceDetails.getDescription() != null) {
            existingOccurrence.setDescription(occurrenceDetails.getDescription());
        }
        if (occurrenceDetails.getLocation() != null) {
            existingOccurrence.setLocation(occurrenceDetails.getLocation());
        }
        if (occurrenceDetails.getStatus() != null) {
            existingOccurrence.setStatus(occurrenceDetails.getStatus());
        }
        if (occurrenceDetails.getPriority() != null) {
            existingOccurrence.setPriority(occurrenceDetails.getPriority());
        }
        if (occurrenceDetails.getResponsible() != null) {
            existingOccurrence.setResponsible(occurrenceDetails.getResponsible());
        }
        if (occurrenceDetails.getWarningNumber() != null) {
            existingOccurrence.setWarningNumber(occurrenceDetails.getWarningNumber());
        }
        
        existingOccurrence.setUpdatedAt(LocalDateTime.now());
        
        OperationalOccurrence updatedOccurrence = occurrenceRepository.save(existingOccurrence);
        log.info("Ocorrência atualizada com sucesso: {}", updatedOccurrence.getId());

        recordOccurrenceToEmployeeHistory(updatedOccurrence, existingOccurrence);
        
        return updatedOccurrence;
    }

    private void recordOccurrenceToEmployeeHistory(OperationalOccurrence occ, OperationalOccurrence oldOcc) {
        if (occ.getEmployee() == null) return;
        EmployeeChangeCategory cat = (occ.getType() == OperationalOccurrence.OccurrenceType.DISCIPLINAR || occ.getWarningNumber() != null)
                ? EmployeeChangeCategory.ADVERTENCIA : EmployeeChangeCategory.OCORRENCIA;
        String desc = String.format("%s - %s%s", occ.getType(), occ.getTitle(),
                occ.getWarningNumber() != null ? " (Advertência nº " + occ.getWarningNumber() + ")" : "");
        String oldDesc = oldOcc != null ? String.format("%s - %s", oldOcc.getType(), oldOcc.getTitle()) : null;
        employeeChangeHistoryService.recordChange(occ.getEmployee().getId(), cat, "ocorrencia_operacional",
                cat == EmployeeChangeCategory.ADVERTENCIA ? "Advertência" : "Ocorrência", oldDesc, desc, getCurrentUserId());
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User) {
            return ((User) auth.getPrincipal()).getId();
        }
        return null;
    }
    
    /**
     * Buscar ocorrência por ID
     */
    @Transactional(readOnly = true)
    public OperationalOccurrence getOccurrenceById(UUID id) {
        return occurrenceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Ocorrência não encontrada"));
    }
    
    /**
     * Listar todas as ocorrências
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getAllOccurrences() {
        try {
            return occurrenceRepository.findAllWithRelationships();
        } catch (Exception e) {
            log.error("❌ Erro ao buscar todas as ocorrências", e);
            // Fallback para findAll() sem relações se houver erro
            log.warn("⚠️ Tentando buscar ocorrências sem relações carregadas");
            return occurrenceRepository.findAll();
        }
    }
    
    /**
     * Buscar ocorrências por funcionário
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByEmployee(UUID employeeId) {
        return occurrenceRepository.findByEmployeeIdOrderByDateDesc(employeeId);
    }
    
    /**
     * Buscar ocorrências por tipo
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByType(OperationalOccurrence.OccurrenceType type) {
        return occurrenceRepository.findByTypeOrderByDateDesc(type);
    }
    
    /**
     * Buscar ocorrências por status
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByStatus(OperationalOccurrence.OccurrenceStatus status) {
        return occurrenceRepository.findByStatusOrderByDateDesc(status);
    }
    
    /**
     * Buscar ocorrências por prioridade
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByPriority(OperationalOccurrence.OccurrencePriority priority) {
        return occurrenceRepository.findByPriorityOrderByDateDesc(priority);
    }
    
    /**
     * Buscar ocorrências por período
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByPeriod(LocalDateTime startDate, LocalDateTime endDate) {
        return occurrenceRepository.findByDateBetweenOrderByDateDesc(startDate, endDate);
    }
    
    /**
     * Buscar ocorrências pendentes
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getPendingOccurrences() {
        return occurrenceRepository.findByStatusOrderByPriorityDescDateAsc(OperationalOccurrence.OccurrenceStatus.PENDENTE);
    }
    
    /**
     * Buscar ocorrências não resolvidas por funcionário
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getUnresolvedOccurrencesByEmployee(UUID employeeId) {
        return occurrenceRepository.findUnresolvedByEmployee(employeeId);
    }
    
    /**
     * Buscar ocorrências por responsável
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByResponsible(String responsible) {
        return occurrenceRepository.findByResponsibleOrderByDateDesc(responsible);
    }
    
    /**
     * Buscar ocorrências por local
     */
    @Transactional(readOnly = true)
    public List<OperationalOccurrence> getOccurrencesByLocation(String location) {
        return occurrenceRepository.findByLocationContainingIgnoreCaseOrderByDateDesc(location);
    }
    
    /**
     * Buscar ocorrência por número de advertência
     */
    @Transactional(readOnly = true)
    public OperationalOccurrence getOccurrenceByWarningNumber(Integer warningNumber) {
        return occurrenceRepository.findByWarningNumber(warningNumber);
    }
    
    /**
     * Atualizar status da ocorrência
     */
    public OperationalOccurrence updateOccurrenceStatus(UUID id, OperationalOccurrence.OccurrenceStatus newStatus) {
        log.info("Atualizando status da ocorrência: {} para {}", id, newStatus);
        
        OperationalOccurrence occurrence = getOccurrenceById(id);
        
        // Validar transição de status
        if (occurrence.getStatus() == OperationalOccurrence.OccurrenceStatus.CONCLUIDO) {
            throw new BusinessException("Não é possível alterar o status de uma ocorrência já concluída");
        }
        
        occurrence.setStatus(newStatus);
        occurrence.setUpdatedAt(LocalDateTime.now());
        
        OperationalOccurrence updatedOccurrence = occurrenceRepository.save(occurrence);
        log.info("Status da ocorrência atualizado com sucesso: {}", updatedOccurrence.getId());
        
        return updatedOccurrence;
    }
    
    /**
     * Atualizar prioridade da ocorrência
     */
    public OperationalOccurrence updateOccurrencePriority(UUID id, OperationalOccurrence.OccurrencePriority newPriority) {
        log.info("Atualizando prioridade da ocorrência: {} para {}", id, newPriority);
        
        OperationalOccurrence occurrence = getOccurrenceById(id);
        occurrence.setPriority(newPriority);
        occurrence.setUpdatedAt(LocalDateTime.now());
        
        OperationalOccurrence updatedOccurrence = occurrenceRepository.save(occurrence);
        log.info("Prioridade da ocorrência atualizada com sucesso: {}", updatedOccurrence.getId());
        
        return updatedOccurrence;
    }
    
    /**
     * Deletar ocorrência
     */
    public void deleteOccurrence(UUID id) {
        log.info("Deletando ocorrência: {}", id);
        
        OperationalOccurrence occurrence = getOccurrenceById(id);
        
        if (occurrence.getStatus() == OperationalOccurrence.OccurrenceStatus.CONCLUIDO) {
            throw new BusinessException("Não é possível deletar uma ocorrência já concluída");
        }
        
        occurrenceRepository.delete(occurrence);
        log.info("Ocorrência deletada com sucesso: {}", id);
    }
    
    /**
     * Contar ocorrências por funcionário e período
     */
    @Transactional(readOnly = true)
    public long countOccurrencesByEmployeeAndPeriod(UUID employeeId, LocalDateTime startDate, LocalDateTime endDate) {
        return occurrenceRepository.countByEmployeeAndPeriod(employeeId, startDate, endDate);
    }
    
    /**
     * Contar ocorrências por tipo e período
     */
    @Transactional(readOnly = true)
    public long countOccurrencesByTypeAndPeriod(OperationalOccurrence.OccurrenceType type, 
                                               LocalDateTime startDate, LocalDateTime endDate) {
        return occurrenceRepository.countByTypeAndPeriod(type, startDate, endDate);
    }
    
    /**
     * Gerar próximo número de advertência
     */
    @Transactional(readOnly = true)
    public Integer generateNextWarningNumber() {
        // Buscar o maior número de advertência existente
        List<OperationalOccurrence> occurrences = occurrenceRepository.findAll();
        return occurrences.stream()
            .mapToInt(o -> o.getWarningNumber() != null ? o.getWarningNumber() : 0)
            .max()
            .orElse(0) + 1;
    }
    
    /**
     * Converter OperationalOccurrence para OccurrenceResponseDTO
     */
    public com.z7design.secured_guard.dto.OccurrenceResponseDTO convertToResponseDTO(OperationalOccurrence occurrence) {
        try {
            if (occurrence == null) {
                log.error("❌ Tentativa de converter OperationalOccurrence nula para DTO");
                throw new IllegalArgumentException("OperationalOccurrence não pode ser nula");
            }
            
            // Acessar employee de forma segura
            String employeeId = null;
            String employeeName = null;
            try {
                if (occurrence.getEmployee() != null) {
                    employeeId = occurrence.getEmployee().getId().toString();
                    employeeName = occurrence.getEmployee().getName();
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao acessar employee da ocorrência {}: {}", occurrence.getId(), e.getMessage());
            }
            
            return com.z7design.secured_guard.dto.OccurrenceResponseDTO.builder()
                .id(occurrence.getId())
                .type(occurrence.getType() != null ? occurrence.getType().name() : null)
                .title(occurrence.getTitle())
                .description(occurrence.getDescription())
                .employeeId(employeeId)
                .employeeName(employeeName)
                .location(occurrence.getLocation())
                .status(occurrence.getStatus() != null ? occurrence.getStatus().name() : null)
                .priority(occurrence.getPriority() != null ? occurrence.getPriority().name() : null)
                .date(occurrence.getDate())
                .responsible(occurrence.getResponsible())
                .warningNumber(occurrence.getWarningNumber())
                .createdAt(occurrence.getCreatedAt())
                .createdAt(occurrence.getCreatedAt())
                .updatedAt(occurrence.getUpdatedAt())
                .substituteId(occurrence.getSubstitute() != null ? occurrence.getSubstitute().getId() : null)
                .substituteName(occurrence.getSubstitute() != null ? occurrence.getSubstitute().getName() : null)
                .originalStartTime(occurrence.getOriginalStartTime())
                .originalEndTime(occurrence.getOriginalEndTime())
                .substituteStartTime(occurrence.getSubstituteStartTime())
                .substituteEndTime(occurrence.getSubstituteEndTime())
                .totalHours(occurrence.getTotalHours())
                .category(occurrence.getCategory())
                .build();

        } catch (Exception e) {
            log.error("❌ Erro ao converter OperationalOccurrence para DTO - ID: {}", occurrence != null ? occurrence.getId() : "null", e);
            throw new RuntimeException("Erro ao converter OperationalOccurrence para DTO: " + e.getMessage(), e);
        }
    }

    /**
     * Gerar relatório PDF de ocorrências com filtros
     */
    @Transactional(readOnly = true)
    public byte[] generatePDFReport(UUID employeeId, OperationalOccurrence.OccurrenceType type,
                                   OperationalOccurrence.OccurrenceStatus status,
                                   OperationalOccurrence.OccurrencePriority priority,
                                   LocalDate startDate, LocalDate endDate,
                                   String responsible, String location) throws IOException {
        log.info("Gerando relatório PDF de ocorrências - EmployeeId: {}, Type: {}, Status: {}, Priority: {}, " +
                "StartDate: {}, EndDate: {}, Responsible: {}, Location: {}",
                employeeId, type, status, priority, startDate, endDate, responsible, location);

        // Buscar todas as ocorrências
        List<OperationalOccurrence> allOccurrences = occurrenceRepository.findAll();

        // Aplicar filtros
        List<OperationalOccurrence> filteredOccurrences = allOccurrences.stream()
                .filter(o -> employeeId == null || (o.getEmployee() != null && o.getEmployee().getId().equals(employeeId)))
                .filter(o -> type == null || o.getType().equals(type))
                .filter(o -> status == null || o.getStatus().equals(status))
                .filter(o -> priority == null || o.getPriority().equals(priority))
                .filter(o -> startDate == null || !o.getDate().toLocalDate().isBefore(startDate))
                .filter(o -> endDate == null || !o.getDate().toLocalDate().isAfter(endDate))
                .filter(o -> responsible == null || responsible.isEmpty() || 
                        (o.getResponsible() != null && o.getResponsible().toLowerCase().contains(responsible.toLowerCase())))
                .filter(o -> location == null || location.isEmpty() || 
                        (o.getLocation() != null && o.getLocation().toLowerCase().contains(location.toLowerCase())))
                .collect(Collectors.toList());

        log.info("Total de ocorrências encontradas para o relatório: {}", filteredOccurrences.size());

        // Determinar companyId
        UUID companyId = resolveCompanyId(filteredOccurrences);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        StandardReportLayoutService.DocumentWithPdf docWithPdf = null;
        
        try {
            PdfWriter writer = new PdfWriter(baos);
            
            // Criar documento com layout padrão
            ReportLayoutConfig layoutConfig = ReportLayoutConfig.builder()
                .companyId(companyId)
                .reportTitle("RELATÓRIO DE OCORRÊNCIAS")
                .topMargin(120f)
                .bottomMargin(80f)
                .leftMargin(50f)
                .rightMargin(50f)
                .build();
            
            docWithPdf = standardReportLayoutService.createDocumentWithLayout(writer, layoutConfig);
            Document document = docWithPdf.getDocument();

            // Informações do relatório
            Paragraph reportInfo = new Paragraph("Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10);
            document.add(reportInfo);

            // Filtros aplicados
            if (employeeId != null || type != null || status != null || priority != null || 
                startDate != null || endDate != null || (responsible != null && !responsible.isEmpty()) || 
                (location != null && !location.isEmpty())) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);

                if (employeeId != null) {
                    employeeRepository.findById(employeeId).ifPresent(emp ->
                            document.add(new Paragraph("Funcionário: " + emp.getName()).setFontSize(10).setMarginBottom(2)));
                }
                if (type != null) {
                    document.add(new Paragraph("Tipo: " + getTypeLabel(type)).setFontSize(10).setMarginBottom(2));
                }
                if (status != null) {
                    document.add(new Paragraph("Status: " + getStatusLabel(status)).setFontSize(10).setMarginBottom(2));
                }
                if (priority != null) {
                    document.add(new Paragraph("Prioridade: " + getPriorityLabel(priority)).setFontSize(10).setMarginBottom(2));
                }
                if (startDate != null) {
                    document.add(new Paragraph("Data Início: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10).setMarginBottom(2));
                }
                if (endDate != null) {
                    document.add(new Paragraph("Data Fim: " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10).setMarginBottom(2));
                }
                if (responsible != null && !responsible.isEmpty()) {
                    document.add(new Paragraph("Responsável: " + responsible).setFontSize(10).setMarginBottom(2));
                }
                if (location != null && !location.isEmpty()) {
                    document.add(new Paragraph("Local: " + location).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Estatísticas
            long pendentes = filteredOccurrences.stream().filter(o -> o.getStatus() == OperationalOccurrence.OccurrenceStatus.PENDENTE).count();
            long emAndamento = filteredOccurrences.stream().filter(o -> o.getStatus() == OperationalOccurrence.OccurrenceStatus.EM_ANDAMENTO).count();
            long resolvidas = filteredOccurrences.stream().filter(o -> o.getStatus() == OperationalOccurrence.OccurrenceStatus.RESOLVIDO).count();
            long concluidas = filteredOccurrences.stream().filter(o -> o.getStatus() == OperationalOccurrence.OccurrenceStatus.CONCLUIDO).count();

            Paragraph stats = new Paragraph(String.format(
                    "Total de ocorrências: %d | Pendentes: %d | Em Andamento: %d | Resolvidas: %d | Concluídas: %d",
                    filteredOccurrences.size(), pendentes, emAndamento, resolvidas, concluidas))
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(stats);

            // Tabela de ocorrências
            if (filteredOccurrences.isEmpty()) {
                document.add(new Paragraph("Nenhuma ocorrência encontrada com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20));
            } else {
                Table table = new Table(UnitValue.createPercentArray(new float[]{2f, 1.5f, 2f, 1.5f, 1.5f, 1.5f, 1.5f, 1.5f}))
                        .useAllAvailableWidth()
                        .setMarginBottom(20);

                table.addHeaderCell(createHeaderCell("Funcionário"));
                table.addHeaderCell(createHeaderCell("Tipo"));
                table.addHeaderCell(createHeaderCell("Título"));
                table.addHeaderCell(createHeaderCell("Status"));
                table.addHeaderCell(createHeaderCell("Prioridade"));
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Responsável"));
                table.addHeaderCell(createHeaderCell("Local"));

                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

                for (OperationalOccurrence occurrence : filteredOccurrences) {
                    table.addCell(createCell(occurrence.getEmployee() != null ? occurrence.getEmployee().getName() : ""));
                    table.addCell(createCell(getTypeLabel(occurrence.getType())));
                    table.addCell(createCell(occurrence.getTitle() != null ? occurrence.getTitle() : ""));
                    table.addCell(createCell(getStatusLabel(occurrence.getStatus())));
                    table.addCell(createCell(getPriorityLabel(occurrence.getPriority())));
                    table.addCell(createCell(occurrence.getDate() != null ? occurrence.getDate().format(dateFormatter) : ""));
                    table.addCell(createCell(occurrence.getResponsible() != null ? occurrence.getResponsible() : ""));
                    table.addCell(createCell(occurrence.getLocation() != null ? occurrence.getLocation() : ""));
                }

                document.add(table);
            }

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de ocorrências: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de ocorrências gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private UUID resolveCompanyId(List<OperationalOccurrence> occurrences) {
        // Tentar encontrar companyId a partir das ocorrências
        for (OperationalOccurrence occurrence : occurrences) {
            if (occurrence.getEmployee() != null && occurrence.getEmployee().getCompany() != null) {
                return occurrence.getEmployee().getCompany().getId();
            }
        }
        
        // Fallback: usar primeira empresa ativa
        List<Company> activeCompanies = companyRepository.findByStatus(CompanyStatus.ACTIVE);
        if (activeCompanies != null && !activeCompanies.isEmpty()) {
            return activeCompanies.get(0).getId();
        }
        
        // Último recurso: usar qualquer empresa
        List<Company> allCompanies = companyRepository.findAll();
        if (allCompanies != null && !allCompanies.isEmpty()) {
            return allCompanies.get(0).getId();
        }
        
        throw new RuntimeException("Não foi possível determinar a empresa para o relatório.");
    }

    private String getTypeLabel(OperationalOccurrence.OccurrenceType type) {
        if (type == null) return "";
        switch (type) {
            case SEGURANCA: return "Segurança";
            case DISCIPLINAR: return "Disciplinar";
            case EQUIPAMENTO: return "Equipamento";
            case INCIDENTE: return "Incidente";
            case MANUTENCAO: return "Manutenção";
            case FALTA: return "Falta";
            case TROCA: return "Troca de Plantão";
            case HE: return "Hora Extra";
            case FREE_LANCE: return "Free Lance";
            case PEDIDO_DEMISSAO: return "Pedido de Demissão";
            case FALTA_EFETIVO: return "Falta de Efetivo";
            case SOLICITACAO_CLIENTE: return "Solicitação do Cliente";
            case OUTROS: return "Outros";
            default: return type.name();

        }
    }

    private String getStatusLabel(OperationalOccurrence.OccurrenceStatus status) {
        if (status == null) return "";
        switch (status) {
            case PENDENTE: return "Pendente";
            case EM_ANDAMENTO: return "Em Andamento";
            case RESOLVIDO: return "Resolvido";
            case CONCLUIDO: return "Concluído";
            default: return status.name();
        }
    }

    private String getPriorityLabel(OperationalOccurrence.OccurrencePriority priority) {
        if (priority == null) return "";
        switch (priority) {
            case BAIXA: return "Baixa";
            case MEDIA: return "Média";
            case ALTA: return "Alta";
            default: return priority.name();
        }
    }

    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY)
                .setPadding(5);
    }

    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setPadding(5);
    }

    /**
     * Gerar Mapa de Ocorrências em Excel (Período 26-25)
     */
    @Transactional(readOnly = true)
    public byte[] generateOperationalMapExcel(LocalDate startDate, LocalDate endDate) throws IOException {
        log.info("Gerando Mapa de Ocorrências Excel - Período: {} a {}", startDate, endDate);

        // Buscar ocorrências no período (usando LocalDateTime start/end)
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);
        
        List<OperationalOccurrence> occurrences = occurrenceRepository.findByDateBetweenOrderByDateDesc(startDateTime, endDateTime);
        
        // Determinar empresa
        UUID companyId = resolveCompanyId(occurrences);
        Company company = companyRepository.findById(companyId).orElse(null);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Mapa de Ocorrências");
            
            // Adicionar cabeçalho
            int currentRow = excelReportLayoutService.addHeader(sheet, workbook, companyId, "MAPA DE OCORRÊNCIAS OPERACIONAIS", 9);
            
            // Estilo do cabeçalho da tabela
            CellStyle headerStyle = excelReportLayoutService.createHeaderStyle(workbook);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            
            // Criar linha de cabeçalho
            Row headerRow = sheet.createRow(currentRow++);
            String[] columns = {"DATA", "POSTO", "CLIENTE", "HORÁRIO ORIGINAL", "EFETIVO", "OCORRÊNCIA", "SUBSTITUTO", "HORÁRIO SUBSTITUTO", "TOTAL", "OBSERVAÇÃO"};
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Estilos de dados
            CellStyle dataStyle = excelReportLayoutService.createValueStyle(workbook);
            CellStyle dateStyle = workbook.createCellStyle();
            dateStyle.cloneStyleFrom(dataStyle);
            CreationHelper createHelper = workbook.getCreationHelper();
            dateStyle.setDataFormat(createHelper.createDataFormat().getFormat("dd/MM/yyyy"));
            
            // Preencher dados
            for (OperationalOccurrence occ : occurrences) {
                Row row = sheet.createRow(currentRow++);
                
                // DATA
                Cell dateCell = row.createCell(0);
                if (occ.getDate() != null) {
                    dateCell.setCellValue(java.sql.Timestamp.valueOf(occ.getDate()));
                }
                dateCell.setCellStyle(dateStyle);
                
                // POSTO
                Cell postCell = row.createCell(1);
                postCell.setCellValue(occ.getLocation() != null ? occ.getLocation() : "");
                postCell.setCellStyle(dataStyle);
                
                // CLIENTE
                String cliente = "";
                if (occ.getEmployee() != null && occ.getEmployee().getWorkPost() != null && occ.getEmployee().getWorkPost().getClient() != null) {
                    cliente = occ.getEmployee().getWorkPost().getClient().getName();
                }
                Cell clientCell = row.createCell(2);
                clientCell.setCellValue(cliente);
                clientCell.setCellStyle(dataStyle);
                
                // HORÁRIO ORIGINAL
                String originalTime = "";
                if (occ.getOriginalStartTime() != null || occ.getOriginalEndTime() != null) {
                    originalTime = (occ.getOriginalStartTime() != null ? occ.getOriginalStartTime() : "??") + " - " + 
                                   (occ.getOriginalEndTime() != null ? occ.getOriginalEndTime() : "??");
                }
                Cell origTimeCell = row.createCell(3);
                origTimeCell.setCellValue(originalTime);
                origTimeCell.setCellStyle(dataStyle);
                
                // EFETIVO
                Cell empCell = row.createCell(4);
                empCell.setCellValue(occ.getEmployee() != null ? occ.getEmployee().getName() : "");
                empCell.setCellStyle(dataStyle);
                
                // OCORRÊNCIA
                Cell typeCell = row.createCell(5);
                typeCell.setCellValue(getTypeLabel(occ.getType()));
                typeCell.setCellStyle(dataStyle);
                
                // SUBSTITUTO
                Cell subCell = row.createCell(6);
                subCell.setCellValue(occ.getSubstitute() != null ? occ.getSubstitute().getName() : "");
                subCell.setCellStyle(dataStyle);
                
                // HORÁRIO SUBSTITUTO
                String substituteTime = "";
                if (occ.getSubstituteStartTime() != null || occ.getSubstituteEndTime() != null) {
                    substituteTime = (occ.getSubstituteStartTime() != null ? occ.getSubstituteStartTime() : "??") + " - " + 
                                     (occ.getSubstituteEndTime() != null ? occ.getSubstituteEndTime() : "??");
                }
                Cell subTimeCell = row.createCell(7);
                subTimeCell.setCellValue(substituteTime);
                subTimeCell.setCellStyle(dataStyle);
                
                // TOTAL
                Cell totalCell = row.createCell(8);
                if (occ.getTotalHours() != null) {
                    totalCell.setCellValue(occ.getTotalHours());
                }
                totalCell.setCellStyle(dataStyle);
                
                // OBSERVAÇÃO
                Cell descCell = row.createCell(9);
                descCell.setCellValue(occ.getDescription() != null ? occ.getDescription() : "");
                descCell.setCellStyle(dataStyle);
            }
            
            // Auto-ajustar colunas
            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }
            
            // Adicionar rodapé
            excelReportLayoutService.addFooter(sheet, workbook, company, 9);
            
            workbook.write(baos);
            return baos.toByteArray();
        }
    }
}

