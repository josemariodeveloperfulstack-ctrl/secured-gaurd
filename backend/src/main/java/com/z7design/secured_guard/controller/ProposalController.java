package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.ProposalDTO;
import com.z7design.secured_guard.dto.PropostaSimulacaoRequest;
import com.z7design.secured_guard.model.Proposal;
import com.z7design.secured_guard.model.enums.ProposalStatus;
import com.z7design.secured_guard.service.ProposalCommercialPdfService;
import com.z7design.secured_guard.service.ProposalReportService;
import com.z7design.secured_guard.service.ProposalService;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import com.z7design.secured_guard.model.User;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/proposals")
@Tag(name = "Propostas", description = "API para gestão de propostas comerciais")
public class ProposalController {

    @Autowired
    private ProposalService proposalService;

    @Autowired
    private ProposalReportService proposalReportService;

    @Autowired
    private ProposalCommercialPdfService proposalCommercialPdfService;

    @GetMapping
    @Operation(summary = "Listar todas as propostas", description = "Retorna uma lista paginada de todas as propostas")
    public ResponseEntity<Page<ProposalDTO>> getAllProposals(Pageable pageable) {
        Page<ProposalDTO> proposals = proposalService.findAll(pageable);
        return ResponseEntity.ok(proposals);
    }

    @GetMapping("/all")
    @Operation(summary = "Listar todas as propostas sem paginação", description = "Retorna uma lista completa de todas as propostas")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<ProposalDTO>> getAllProposalsList() {
        try {
            List<ProposalDTO> proposals = proposalService.findAll();
            return ResponseEntity.ok(proposals);
        } catch (Exception e) {
            System.err.println("❌ Erro ao carregar propostas: " + e.getMessage());
            e.printStackTrace();
            // Retornar lista vazia ao invés de body vazio para evitar erro no frontend
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar proposta por ID", description = "Retorna uma proposta específica pelo ID com todos os campos preenchidos")
    public ResponseEntity<ProposalDTO> getProposalById(@PathVariable String id) {
        return ResponseEntity.ok(proposalService.getProposalDTOById(UUID.fromString(id)));
    }

    @GetMapping("/{id}/pdf")
    @Operation(summary = "Gerar PDF da proposta comercial", description = "Gera PDF da proposta usando o layout padronizado")
    @PreAuthorize("hasAnyAuthority('PROPOSALS_READ', 'PROPOSALS_WRITE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<byte[]> generateProposalPdf(@PathVariable String id) {
        byte[] pdf = proposalCommercialPdfService.generatePdf(UUID.fromString(id));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "proposta-comercial-" + id + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @PostMapping("/pdf/from-simulation")
    @Operation(summary = "Gerar PDF da simulação", description = "Gera PDF da proposta de acordo a partir dos dados da simulação (layout padronizado)")
    @PreAuthorize("hasAnyAuthority('PROPOSALS_READ', 'PROPOSALS_WRITE') or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR', 'COMERCIAL', 'GESTOR_COMERCIAL', 'ASSISTENTE_COMERCIAL')")
    public ResponseEntity<byte[]> generatePdfFromSimulation(@RequestBody PropostaSimulacaoRequest request) {
        byte[] pdf = proposalCommercialPdfService.generatePdfFromSimulation(request);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "proposta-comercial-acordo.pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @PostMapping
    @Operation(summary = "Criar nova proposta", description = "Cria uma nova proposta no sistema")
    public ResponseEntity<ProposalDTO> createProposal(@RequestBody ProposalDTO proposalDTO) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User currentUser = (User) authentication.getPrincipal();
        UUID currentUserId = currentUser.getId();

        Proposal createdProposal = proposalService.create(proposalDTO, currentUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(proposalService.mapToDTO(createdProposal));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar proposta", description = "Atualiza uma proposta existente")
    public ResponseEntity<ProposalDTO> updateProposal(@PathVariable String id, @RequestBody ProposalDTO proposalDTO) {
        proposalService.update(UUID.fromString(id), proposalDTO);
        return ResponseEntity.ok(proposalService.getProposalDTOById(UUID.fromString(id)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status da proposta", description = "Atualiza apenas o status de uma proposta")
    public ResponseEntity<ProposalDTO> updateProposalStatus(@PathVariable String id,
            @RequestBody Map<String, String> statusUpdate) {
        String status = statusUpdate.get("status");
        Proposal updated = proposalService.updateStatus(UUID.fromString(id), status);
        return ResponseEntity.ok(proposalService.mapToDTO(updated));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir proposta", description = "Exclui uma proposta do sistema")
    public ResponseEntity<Void> deleteProposal(@PathVariable String id) {
        proposalService.delete(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar propostas por status", description = "Retorna propostas filtradas por status")
    public ResponseEntity<List<ProposalDTO>> getProposalsByStatus(@PathVariable String status) {
        ProposalStatus proposalStatus = ProposalStatus.valueOf(status.toUpperCase());
        List<Proposal> proposals = proposalService.findByStatus(proposalStatus);
        return ResponseEntity.ok(proposals.stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/client/{clientId}")
    @Operation(summary = "Buscar propostas por cliente", description = "Retorna propostas de um cliente específico")
    public ResponseEntity<List<ProposalDTO>> getProposalsByClient(@PathVariable String clientId) {
        return ResponseEntity.ok(proposalService.findByClient(UUID.fromString(clientId))
                .stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/lead/{leadId}")
    @Operation(summary = "Buscar propostas por lead", description = "Retorna propostas de um lead específico")
    public ResponseEntity<List<ProposalDTO>> getProposalsByLead(@PathVariable String leadId) {
        return ResponseEntity.ok(proposalService.findByLead(UUID.fromString(leadId))
                .stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/assigned/{userId}")
    @Operation(summary = "Buscar propostas por responsável", description = "Retorna propostas atribuídas a um usuário específico")
    public ResponseEntity<List<ProposalDTO>> getProposalsByAssignedTo(@PathVariable String userId) {
        return ResponseEntity.ok(proposalService.findByAssignedTo(UUID.fromString(userId))
                .stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/created/{userId}")
    @Operation(summary = "Buscar propostas por criador", description = "Retorna propostas criadas por um usuário específico")
    public ResponseEntity<List<ProposalDTO>> getProposalsByCreatedBy(@PathVariable String userId) {
        return ResponseEntity.ok(proposalService.findByCreatedBy(UUID.fromString(userId))
                .stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/expired")
    @Operation(summary = "Buscar propostas expiradas", description = "Retorna propostas que já expiraram")
    public ResponseEntity<List<ProposalDTO>> getExpiredProposals() {
        List<Proposal> proposals = proposalService.findExpiredProposals();
        return ResponseEntity.ok(proposals.stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/expiring-soon/{days}")
    @Operation(summary = "Buscar propostas expirando em breve", description = "Retorna propostas que expiram nos próximos X dias")
    public ResponseEntity<List<ProposalDTO>> getProposalsExpiringSoon(@PathVariable int days) {
        List<Proposal> proposals = proposalService.findProposalsExpiringSoon(days);
        return ResponseEntity.ok(proposals.stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar propostas", description = "Busca propostas por termo de pesquisa")
    public ResponseEntity<List<ProposalDTO>> searchProposals(@RequestParam String term) {
        List<Proposal> proposals = proposalService.searchProposals(term);
        return ResponseEntity.ok(proposals.stream().map(proposalService::mapToDTO).toList());
    }

    @GetMapping("/stats/count-by-status")
    @Operation(summary = "Estatísticas por status", description = "Retorna contagem de propostas por status")
    public ResponseEntity<Map<String, Long>> getCountByStatus() {
        Map<String, Long> stats = Map.of(
                "DRAFT", proposalService.countByStatus(ProposalStatus.DRAFT),
                "SENT", proposalService.countByStatus(ProposalStatus.SENT),
                "UNDER_REVIEW", proposalService.countByStatus(ProposalStatus.UNDER_REVIEW),
                "APPROVED", proposalService.countByStatus(ProposalStatus.APPROVED),
                "REJECTED", proposalService.countByStatus(ProposalStatus.REJECTED),
                "EXPIRED", proposalService.countByStatus(ProposalStatus.EXPIRED),
                "CONVERTED", proposalService.countByStatus(ProposalStatus.CONVERTED));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/total-value-by-status")
    @Operation(summary = "Valor total por status", description = "Retorna valor total das propostas por status")
    public ResponseEntity<Map<String, BigDecimal>> getTotalValueByStatus() {
        Map<String, BigDecimal> stats = Map.of(
                "DRAFT", proposalService.getTotalValueByStatus(ProposalStatus.DRAFT),
                "SENT", proposalService.getTotalValueByStatus(ProposalStatus.SENT),
                "UNDER_REVIEW", proposalService.getTotalValueByStatus(ProposalStatus.UNDER_REVIEW),
                "APPROVED", proposalService.getTotalValueByStatus(ProposalStatus.APPROVED),
                "REJECTED", proposalService.getTotalValueByStatus(ProposalStatus.REJECTED),
                "EXPIRED", proposalService.getTotalValueByStatus(ProposalStatus.EXPIRED),
                "CONVERTED", proposalService.getTotalValueByStatus(ProposalStatus.CONVERTED));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/reports/pdf")
    @Operation(summary = "Gerar relatório PDF de propostas", description = "Gera relatório PDF com filtros opcionais")
    public ResponseEntity<byte[]> generateReportPdf(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String clientName,
            @RequestParam(required = false) String searchTerm) {
        byte[] pdf = proposalReportService.generateProposalPdfReport(status, clientName, searchTerm);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "relatorio-propostas.pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @GetMapping("/reports/excel")
    @Operation(summary = "Gerar relatório Excel de propostas", description = "Gera relatório Excel (CSV) com filtros opcionais")
    public ResponseEntity<byte[]> generateReportExcel(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String clientName,
            @RequestParam(required = false) String searchTerm) {
        byte[] excel = proposalReportService.generateProposalExcelReport(status, clientName, searchTerm);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "relatorio-propostas.csv");
        return ResponseEntity.ok().headers(headers).body(excel);
    }
}