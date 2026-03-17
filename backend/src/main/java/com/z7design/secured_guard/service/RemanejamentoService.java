package com.z7design.secured_guard.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.z7design.secured_guard.dto.RemanejamentoDTO;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.EmployeeChangeCategory;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RemanejamentoRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.dto.ReportLayoutConfig;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
public class RemanejamentoService {
    @Autowired
    private RemanejamentoRepository remanejamentoRepository;

    @Autowired
    private RemanejamentoHistoricoService historicoService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    @Autowired
    private UnitRepository unitRepository;

    @Autowired
    private StandardReportLayoutService layoutService;

    @Autowired
    private CompanyRepository companyRepository;

    @Autowired
    private EmployeeChangeHistoryService employeeChangeHistoryService;

    /**
     * Cria um novo remanejamento e registra no histórico
     */
    public Remanejamento create(Remanejamento remanejamento, User usuarioQueExecutou, String motivoAlteracao) {
        Remanejamento saved = remanejamentoRepository.save(remanejamento);

        if (saved.getEmployee() != null) {
            String desc = buildRemanejamentoDesc(saved);
            employeeChangeHistoryService.recordChange(saved.getEmployee().getId(), EmployeeChangeCategory.REMANEJAMENTO,
                    "remanejamento", "Remanejamento", null, desc, usuarioQueExecutou != null ? usuarioQueExecutou.getId() : null);
        }

        // Registrar no histórico
        historicoService.registrarAcao(
                saved,
                AcaoHistorico.CRIACAO,
                usuarioQueExecutou,
                motivoAlteracao != null ? motivoAlteracao : "Criação de remanejamento");

        return saved;
    }

    /**
     * Atualiza um remanejamento existente e registra no histórico
     */
    public Remanejamento update(UUID id, Remanejamento remanejamento, User usuarioQueExecutou, String motivoAlteracao) {
        // Buscar dados anteriores para comparação
        Optional<Remanejamento> existingOpt = remanejamentoRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Remanejamento não encontrado");
        }

        Remanejamento existing = existingOpt.get();
        remanejamento.setId(id);
        Remanejamento updated = remanejamentoRepository.save(remanejamento);

        if (updated.getEmployee() != null) {
            String oldDesc = buildRemanejamentoDesc(existing);
            String newDesc = buildRemanejamentoDesc(updated);
            employeeChangeHistoryService.recordChange(updated.getEmployee().getId(), EmployeeChangeCategory.REMANEJAMENTO,
                    "remanejamento", "Remanejamento", oldDesc, newDesc, usuarioQueExecutou != null ? usuarioQueExecutou.getId() : null);
        }

        // Registrar no histórico com dados anteriores
        historicoService.registrarAcao(
                updated,
                AcaoHistorico.EDICAO,
                usuarioQueExecutou,
                motivoAlteracao != null ? motivoAlteracao : "Edição de remanejamento",
                existing,
                null // IP será capturado pelo controller
        );

        return updated;
    }

    /**
     * Exclui um remanejamento e registra no histórico
     */
    public void delete(UUID id, User usuarioQueExecutou, String motivoAlteracao) {
        Optional<Remanejamento> existingOpt = remanejamentoRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Remanejamento não encontrado");
        }

        Remanejamento existing = existingOpt.get();

        // Registrar no histórico antes de deletar
        historicoService.registrarAcao(
                existing,
                AcaoHistorico.EXCLUSAO,
                usuarioQueExecutou,
                motivoAlteracao != null ? motivoAlteracao : "Exclusão de remanejamento");

        remanejamentoRepository.deleteById(id);
    }

    /**
     * Métodos de consulta (não modificam dados, não registram histórico)
     */
    public Optional<Remanejamento> findById(UUID id) {
        return remanejamentoRepository.findById(id);
    }

    public List<Remanejamento> findAll() {
        return remanejamentoRepository.findAll();
    }

    public List<Remanejamento> findByEmployeeId(UUID employeeId) {
        return remanejamentoRepository.findByEmployeeId(employeeId);
    }

    private String buildRemanejamentoDesc(Remanejamento r) {
        String orig = r.getOriginWorkstation() != null ? r.getOriginWorkstation().getName() : r.getOrigem();
        String dest = r.getDestinationWorkstation() != null ? r.getDestinationWorkstation().getName() : r.getDestino();
        return String.format("%s: %s → %s em %s", r.getTipo(), stripWPPrefix(orig), stripWPPrefix(dest), r.getDataRemanejamento());
    }

    /** Remove o prefixo "WP" do nome do posto para exibição (RH, Depto Pessoal, histórico). */
    private String stripWPPrefix(String name) {
        if (name == null || name.trim().isEmpty()) return "-";
        return name.replaceFirst("(?i)^WP\\s*-?\\s*", "").trim();
    }

    /**
     * Métodos de conveniência para compatibilidade com código existente
     */
    public Remanejamento create(Remanejamento remanejamento) {
        // Usar um usuário padrão ou null para compatibilidade
        return create(remanejamento, null, "Criação automática");
    }

    public Remanejamento update(UUID id, Remanejamento remanejamento) {
        // Usar um usuário padrão ou null para compatibilidade
        return update(id, remanejamento, null, "Edição automática");
    }

    public void delete(UUID id) {
        // Usar um usuário padrão ou null para compatibilidade
        delete(id, null, "Exclusão automática");
    }

    // ============== MÉTODOS COM DTO ==============

    public RemanejamentoDTO createFromDTO(RemanejamentoDTO dto, User usuarioQueExecutou, String motivoAlteracao) {
        Remanejamento remanejamento = new Remanejamento();
        mapDTOToEntity(dto, remanejamento);

        Remanejamento saved = remanejamentoRepository.save(remanejamento);

        // Atualizar o posto atual do funcionário para o posto de destino e registrar no histórico do funcionário
        if (saved.getEmployee() != null) {
            String desc = buildRemanejamentoDesc(saved);
            employeeChangeHistoryService.recordChange(saved.getEmployee().getId(), EmployeeChangeCategory.REMANEJAMENTO,
                    "remanejamento", "Remanejamento", null, desc, usuarioQueExecutou != null ? usuarioQueExecutou.getId() : null);

            // Atualizar posto de trabalho do funcionário para o destino (qualquer posto do sistema)
            if (dto.getDestinationWorkstationId() != null) {
                WorkPost destWorkPost = workPostRepository.findById(dto.getDestinationWorkstationId()).orElse(null);
                if (destWorkPost != null) {
                    Employee employee = saved.getEmployee();
                    String oldPosto = employee.getWorkPost() != null ? employee.getWorkPost().getName() : null;
                    String newPosto = destWorkPost.getName();
                    employee.setWorkPost(destWorkPost);
                    employeeRepository.save(employee);
                    employeeChangeHistoryService.recordChange(employee.getId(), EmployeeChangeCategory.POSTO_TRABALHO,
                            "workPost", "Posto de trabalho", stripWPPrefix(oldPosto), stripWPPrefix(newPosto),
                            usuarioQueExecutou != null ? usuarioQueExecutou.getId() : null);
                }
            }
        }

        // Registrar no histórico de remanejamentos
        historicoService.registrarAcao(
                saved,
                AcaoHistorico.CRIACAO,
                usuarioQueExecutou,
                motivoAlteracao != null ? motivoAlteracao : "Criação de remanejamento");

        return convertToDTO(saved);
    }

    public RemanejamentoDTO updateFromDTO(UUID id, RemanejamentoDTO dto, User usuarioQueExecutou,
            String motivoAlteracao) {
        Optional<Remanejamento> existingOpt = remanejamentoRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Remanejamento não encontrado");
        }

        Remanejamento existing = existingOpt.get();
        String oldDesc = buildRemanejamentoDesc(existing);
        mapDTOToEntity(dto, existing);
        existing.setId(id);

        Remanejamento updated = remanejamentoRepository.save(existing);
        String newDesc = buildRemanejamentoDesc(updated);

        // Registrar remanejamento e atualizar posto no histórico do funcionário (RH, DPE, Operacional)
        if (updated.getEmployee() != null) {
            employeeChangeHistoryService.recordChange(updated.getEmployee().getId(), EmployeeChangeCategory.REMANEJAMENTO,
                    "remanejamento", "Remanejamento", oldDesc, newDesc, usuarioQueExecutou != null ? usuarioQueExecutou.getId() : null);

            // Atualizar posto de trabalho do funcionário para o destino (qualquer posto do sistema)
            if (dto.getDestinationWorkstationId() != null) {
                WorkPost destWorkPost = workPostRepository.findById(dto.getDestinationWorkstationId()).orElse(null);
                if (destWorkPost != null) {
                    Employee employee = updated.getEmployee();
                    String oldPosto = employee.getWorkPost() != null ? employee.getWorkPost().getName() : null;
                    String newPosto = destWorkPost.getName();
                    employee.setWorkPost(destWorkPost);
                    employeeRepository.save(employee);
                    employeeChangeHistoryService.recordChange(employee.getId(), EmployeeChangeCategory.POSTO_TRABALHO,
                            "workPost", "Posto de trabalho", stripWPPrefix(oldPosto), stripWPPrefix(newPosto),
                            usuarioQueExecutou != null ? usuarioQueExecutou.getId() : null);
                }
            }
        }

        // Registrar no histórico de remanejamentos
        historicoService.registrarAcao(
                updated,
                AcaoHistorico.EDICAO,
                usuarioQueExecutou,
                motivoAlteracao != null ? motivoAlteracao : "Edição de remanejamento");

        return convertToDTO(updated);
    }

    public List<RemanejamentoDTO> findAllAsDTO() {
        // Usar método com JOIN FETCH para garantir que o employee seja carregado
        return remanejamentoRepository.findAllWithEmployee().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Optional<RemanejamentoDTO> findByIdAsDTO(UUID id) {
        return remanejamentoRepository.findByIdWithRelations(id)
                .map(this::convertToDTO);
    }

    public List<RemanejamentoDTO> findByEmployeeIdAsDTO(UUID employeeId) {
        return remanejamentoRepository.findByEmployeeIdWithRelations(employeeId).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private void mapDTOToEntity(RemanejamentoDTO dto, Remanejamento entity) {
        if (dto.getEmployeeId() == null) {
            throw new RuntimeException("ID do funcionário é obrigatório");
        }

        Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado com ID: " + dto.getEmployeeId()));
        entity.setEmployee(employee);

        if (dto.getTipo() == null) {
            throw new RuntimeException("Tipo de remanejamento é obrigatório");
        }
        entity.setTipo(dto.getTipo());

        entity.setOrigem(dto.getOrigem() != null ? dto.getOrigem() : "");
        entity.setDestino(dto.getDestino() != null ? dto.getDestino() : "");

        // Aceitar tanto dataRemanejamento quanto remanejamentoDate (compatibilidade com
        // frontend)
        if (dto.getDataRemanejamento() != null) {
            entity.setDataRemanejamento(dto.getDataRemanejamento());
        } else if (dto.getRemanejamentoDate() != null) {
            entity.setDataRemanejamento(dto.getRemanejamentoDate());
        } else {
            throw new RuntimeException("Data do remanejamento é obrigatória");
        }

        // Aceitar tanto observacao quanto notes (compatibilidade com frontend)
        if (dto.getObservacao() != null) {
            entity.setObservacao(dto.getObservacao());
        } else if (dto.getNotes() != null) {
            entity.setObservacao(dto.getNotes());
        } else {
            entity.setObservacao(null);
        }

        // Mapear postos de trabalho
        if (dto.getOriginWorkstationId() != null) {
            WorkPost originWorkstation = workPostRepository.findById(dto.getOriginWorkstationId())
                    .orElse(null);
            entity.setOriginWorkstation(originWorkstation);
        } else {
            entity.setOriginWorkstation(null);
        }

        if (dto.getDestinationWorkstationId() != null) {
            WorkPost destinationWorkstation = workPostRepository.findById(dto.getDestinationWorkstationId())
                    .orElse(null);
            entity.setDestinationWorkstation(destinationWorkstation);
        } else {
            entity.setDestinationWorkstation(null);
        }
    }

    private RemanejamentoDTO convertToDTO(Remanejamento entity) {
        RemanejamentoDTO dto = new RemanejamentoDTO();
        dto.setId(entity.getId());

        // Forçar inicialização do employee (LAZY loading)
        if (entity.getEmployee() != null) {
            try {
                org.hibernate.Hibernate.initialize(entity.getEmployee());
                dto.setEmployeeId(entity.getEmployee().getId());
                dto.setEmployeeName(entity.getEmployee().getName());
            } catch (Exception e) {
                System.err.println("[WARNING] Erro ao carregar employee: " + e.getMessage());
                dto.setEmployeeId(null);
                dto.setEmployeeName(null);
            }
        }

        dto.setTipo(entity.getTipo());

        // Resolver origem: SEMPRE preferir nome do WorkPost quando existir (evita exibir UUID na lista)
        String origemVal = null;
        if (entity.getOriginWorkstation() != null) {
            try {
                org.hibernate.Hibernate.initialize(entity.getOriginWorkstation());
                origemVal = entity.getOriginWorkstation().getName();
            } catch (Exception e) {
                log.debug("Erro ao obter nome do posto de origem: {}", e.getMessage());
            }
        }
        if (origemVal == null || origemVal.trim().isEmpty()) {
            origemVal = entity.getOrigem();
            if (origemVal != null && !origemVal.trim().isEmpty()) {
                origemVal = resolveUnitName(origemVal);
            }
        }
        dto.setOrigem(origemVal != null && !origemVal.trim().isEmpty() ? stripWPPrefix(origemVal) : "");

        // Resolver destino: SEMPRE preferir nome do WorkPost quando existir (evita exibir UUID na lista)
        String destinoVal = null;
        if (entity.getDestinationWorkstation() != null) {
            try {
                org.hibernate.Hibernate.initialize(entity.getDestinationWorkstation());
                destinoVal = entity.getDestinationWorkstation().getName();
            } catch (Exception e) {
                log.debug("Erro ao obter nome do posto de destino: {}", e.getMessage());
            }
        }
        if (destinoVal == null || destinoVal.trim().isEmpty()) {
            destinoVal = entity.getDestino();
            if (destinoVal != null && !destinoVal.trim().isEmpty()) {
                destinoVal = resolveUnitName(destinoVal);
            }
        }
        dto.setDestino(destinoVal != null && !destinoVal.trim().isEmpty() ? stripWPPrefix(destinoVal) : "");

        dto.setDataRemanejamento(entity.getDataRemanejamento());
        dto.setObservacao(entity.getObservacao());

        // Mapear postos de trabalho
        try {
            if (entity.getOriginWorkstation() != null) {
                // Se já foi carregado via JOIN FETCH, não precisa de initialize
                dto.setOriginWorkstationId(entity.getOriginWorkstation().getId());
                log.debug("OriginWorkstation ID mapeado: {}", entity.getOriginWorkstation().getId());
            } else {
                dto.setOriginWorkstationId(null);
                log.debug("OriginWorkstation é null");
            }
        } catch (Exception e) {
            log.warn("Erro ao mapear originWorkstation: " + e.getMessage());
            dto.setOriginWorkstationId(null);
        }

        try {
            if (entity.getDestinationWorkstation() != null) {
                // Se já foi carregado via JOIN FETCH, não precisa de initialize
                dto.setDestinationWorkstationId(entity.getDestinationWorkstation().getId());
                log.debug("DestinationWorkstation ID mapeado: {}", entity.getDestinationWorkstation().getId());
            } else {
                dto.setDestinationWorkstationId(null);
                log.debug("DestinationWorkstation é null");
            }
        } catch (Exception e) {
            log.warn("Erro ao mapear destinationWorkstation: " + e.getMessage());
            dto.setDestinationWorkstationId(null);
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public byte[] generatePDFReport(UUID employeeId, RemanejamentoTipo tipo, String origem, String destino,
            UUID workPostId, UUID companyId, Integer lastDays, LocalDate startDate, LocalDate endDate) throws IOException {
        // Se lastDays informado, calcular período
        LocalDate effectiveStart = startDate;
        LocalDate effectiveEnd = endDate;
        if (lastDays != null && lastDays > 0) {
            effectiveEnd = LocalDate.now();
            effectiveStart = effectiveEnd.minusDays(lastDays);
        }
        log.info(
                "Gerando relatório PDF de remanejamentos - EmployeeId: {}, Tipo: {}, WorkPostId: {}, CompanyId: {}, LastDays: {}, StartDate: {}, EndDate: {}",
                employeeId, tipo, workPostId, companyId, lastDays, effectiveStart, effectiveEnd);

        List<Remanejamento> remanejamentos = getRemanejamentosFiltered(employeeId, tipo, origem, destino, workPostId, companyId, effectiveStart, effectiveEnd);
        log.info("Total de remanejamentos encontrados para o relatório: {}", remanejamentos.size());

        // Determinar companyId para o cabeçalho do relatório
        UUID reportCompanyId = resolveCompanyId(remanejamentos, employeeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            // Configurar layout premium
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE REMANEJAMENTOS")
                    .companyId(reportCompanyId)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer,
                    config);
            Document document = docWithPdf.getDocument();

            // Filtros aplicados
            if (employeeId != null || tipo != null || workPostId != null || companyId != null || lastDays != null || effectiveStart != null || effectiveEnd != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);

                if (employeeId != null && !remanejamentos.isEmpty()) {
                    String employeeName = remanejamentos.stream()
                            .filter(r -> r.getEmployee() != null && r.getEmployee().getId().equals(employeeId))
                            .map(r -> r.getEmployee().getName())
                            .findFirst().orElse("ID: " + employeeId);
                    document.add(new Paragraph("Funcionário: " + employeeName).setFontSize(10).setMarginBottom(2));
                }
                if (tipo != null) {
                    document.add(new Paragraph("Tipo: " + getTipoLabel(tipo)).setFontSize(10).setMarginBottom(2));
                }
                if (workPostId != null) {
                    String workPostName = workPostRepository.findById(workPostId)
                            .map(wp -> wp.getPostCode() != null ? wp.getPostCode() + " - " + stripWPPrefix(wp.getName()) : stripWPPrefix(wp.getName()))
                            .orElse("ID: " + workPostId);
                    document.add(new Paragraph("Setor de Trabalho: " + workPostName).setFontSize(10).setMarginBottom(2));
                }
                if (companyId != null) {
                    String companyName = companyRepository.findById(companyId)
                            .map(c -> c.getName() != null ? c.getName() : c.getSigla())
                            .orElse("ID: " + companyId);
                    document.add(new Paragraph("Empresa: " + companyName).setFontSize(10).setMarginBottom(2));
                }
                if (lastDays != null && lastDays > 0) {
                    document.add(new Paragraph("Últimos: " + lastDays + " dias").setFontSize(10).setMarginBottom(2));
                }
                if (effectiveStart != null && effectiveEnd != null) {
                    document.add(
                            new Paragraph("Período: " + effectiveStart.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                                    " a " + effectiveEnd.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10)
                                    .setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Total de remanejamentos
            Paragraph totalInfo = new Paragraph("Total de remanejamentos: " + remanejamentos.size())
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(totalInfo);

            // Tabela de remanejamentos
            if (remanejamentos.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhum remanejamento encontrado com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(new float[] { 3, 2, 3, 3, 2, 3 }).useAllAvailableWidth();

                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Funcionário"));
                table.addHeaderCell(createHeaderCell("Tipo"));
                table.addHeaderCell(createHeaderCell("Posto de Origem"));
                table.addHeaderCell(createHeaderCell("Posto de Destino"));
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Observação"));

                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Remanejamento remanejamento : remanejamentos) {
                    table.addCell(createCell(
                            remanejamento.getEmployee() != null ? remanejamento.getEmployee().getName() : ""));
                    table.addCell(
                            createCell(remanejamento.getTipo() != null ? getTipoLabel(remanejamento.getTipo()) : ""));

                    // Posto de Origem (sem prefixo WP)
                    String postoOrigem = "-";
                    try {
                        if (remanejamento.getOriginWorkstation() != null) {
                            WorkPost originPost = remanejamento.getOriginWorkstation();
                            String code = originPost.getPostCode();
                            String name = originPost.getName();
                            postoOrigem = (code != null && !code.matches("(?i)^WP.*") ? code + " - " : "") +
                                    stripWPPrefix(name != null ? name : "");
                        }
                    } catch (Exception e) {
                        log.debug("Erro ao carregar posto de origem: {}", e.getMessage());
                    }
                    table.addCell(createCell(postoOrigem));

                    // Posto de Destino (sem prefixo WP)
                    String postoDestino = "-";
                    try {
                        if (remanejamento.getDestinationWorkstation() != null) {
                            WorkPost destinationPost = remanejamento.getDestinationWorkstation();
                            String code = destinationPost.getPostCode();
                            String name = destinationPost.getName();
                            postoDestino = (code != null && !code.matches("(?i)^WP.*") ? code + " - " : "") +
                                    stripWPPrefix(name != null ? name : "");
                        }
                    } catch (Exception e) {
                        log.debug("Erro ao carregar posto de destino: {}", e.getMessage());
                    }
                    table.addCell(createCell(postoDestino));

                    table.addCell(createCell(remanejamento.getDataRemanejamento() != null
                            ? remanejamento.getDataRemanejamento().format(dateFormatter)
                            : ""));

                    // Observação (truncar se muito longa)
                    String obs = remanejamento.getObservacao() != null ? remanejamento.getObservacao() : "";
                    if (obs.length() > 50) {
                        obs = obs.substring(0, 47) + "...";
                    }
                    table.addCell(createCell(obs));
                }

                document.add(table);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de remanejamentos: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de remanejamentos gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private List<Remanejamento> getRemanejamentosFiltered(UUID employeeId, RemanejamentoTipo tipo, String origem,
            String destino, UUID workPostId, UUID companyId, LocalDate startDate, LocalDate endDate) {
        log.debug("Aplicando filtros - employeeId: {}, tipo: {}, workPostId: {}, companyId: {}, startDate: {}, endDate: {}",
                employeeId, tipo, workPostId, companyId, startDate, endDate);

        try {
            List<Remanejamento> remanejamentos = (companyId != null)
                    ? remanejamentoRepository.findAllWithEmployeeAndCompany()
                    : remanejamentoRepository.findAllWithEmployee();

            // Aplicar filtros
            if (employeeId != null) {
                remanejamentos = remanejamentos.stream()
                        .filter(r -> r.getEmployee() != null && r.getEmployee().getId().equals(employeeId))
                        .collect(Collectors.toList());
            }

            if (tipo != null) {
                remanejamentos = remanejamentos.stream()
                        .filter(r -> r.getTipo() == tipo)
                        .collect(Collectors.toList());
            }

            // Filtro por Setor de Trabalho (origem OU destino)
            if (workPostId != null) {
                remanejamentos = remanejamentos.stream()
                        .filter(r -> {
                            boolean matchOrigin = r.getOriginWorkstation() != null && r.getOriginWorkstation().getId().equals(workPostId);
                            boolean matchDest = r.getDestinationWorkstation() != null && r.getDestinationWorkstation().getId().equals(workPostId);
                            return matchOrigin || matchDest;
                        })
                        .collect(Collectors.toList());
            }

            // Filtro por Empresa (via funcionário)
            if (companyId != null) {
                remanejamentos = remanejamentos.stream()
                        .filter(r -> r.getEmployee() != null && r.getEmployee().getCompany() != null
                                && r.getEmployee().getCompany().getId().equals(companyId))
                        .collect(Collectors.toList());
            }

            if (startDate != null) {
                remanejamentos = remanejamentos.stream()
                        .filter(r -> r.getDataRemanejamento() != null && !r.getDataRemanejamento().isBefore(startDate))
                        .collect(Collectors.toList());
            }

            if (endDate != null) {
                remanejamentos = remanejamentos.stream()
                        .filter(r -> r.getDataRemanejamento() != null && !r.getDataRemanejamento().isAfter(endDate))
                        .collect(Collectors.toList());
            }

            log.info("Filtros aplicados. {} remanejamentos encontrados", remanejamentos.size());
            return remanejamentos;

        } catch (Exception e) {
            log.error("Erro ao aplicar filtros nos remanejamentos", e);
            throw new RuntimeException("Erro ao buscar remanejamentos: " + e.getMessage(), e);
        }
    }

    private String getTipoLabel(RemanejamentoTipo tipo) {
        if (tipo == null)
            return "";
        switch (tipo) {
            case TRANSFERENCIA_UNIDADE:
                return "Transferência de Unidade";
            case TRANSFERENCIA_POSTO_TRABALHO:
                return "Transferência de Posto de Trabalho";
            case TROCA_FUNCAO:
                return "Troca de Função";
            case PROMOCAO:
                return "Promoção";
            case COBRIR_FERIAS:
                return "Cobrir Férias";
            case COBRIR_FALTA:
                return "Cobrir Falta";
            case PLANTAO:
                return "Plantão";
            case OUTROS:
                return "Outros";
            default:
                return tipo.toString();
        }
    }

    private com.itextpdf.layout.element.Cell createHeaderCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text).setBold().setFontSize(9))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }

    private com.itextpdf.layout.element.Cell createCell(String text) {
        return new com.itextpdf.layout.element.Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(8))
                .setTextAlignment(TextAlignment.LEFT);
    }

    /**
     * Resolve o nome da unidade a partir de um valor que pode ser UUID ou nome
     * direto
     */
    private String resolveUnitName(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "";
        }

        try {
            UUID unitUUID = UUID.fromString(value);
            Optional<Unit> unit = unitRepository.findById(unitUUID);
            if (unit.isPresent()) {
                return unit.get().getName();
            }
        } catch (IllegalArgumentException e) {
            // Não é UUID, retornar valor original (pode ser nome direto)
        }

        return value;
    }

    private UUID resolveCompanyId(List<Remanejamento> remanejamentos, UUID employeeId) {
        if (employeeId != null) {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee != null && employee.getCompany() != null) {
                return employee.getCompany().getId();
            }
        }
        if (!remanejamentos.isEmpty()) {
            for (Remanejamento r : remanejamentos) {
                if (r.getEmployee() != null && r.getEmployee().getCompany() != null) {
                    return r.getEmployee().getCompany().getId();
                }
            }
        }

        // Fallback for company resolution
        return companyRepository.findAll().stream()
                .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                .findFirst()
                .map(Company::getId)
                .orElse(null);
    }
}
