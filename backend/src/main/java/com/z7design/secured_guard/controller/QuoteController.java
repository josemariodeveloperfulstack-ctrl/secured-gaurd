package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.QuoteDTO;
import com.z7design.secured_guard.model.Quote;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.QuoteStatus;
import com.z7design.secured_guard.service.QuoteCommercialPdfService;
import com.z7design.secured_guard.service.QuoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/quotes")
@RequiredArgsConstructor
@Tag(name = "Quotes", description = "Endpoints para gerenciamento de Cotações")
public class QuoteController {

    private final QuoteService quoteService;
    private final QuoteCommercialPdfService quoteCommercialPdfService;

    @GetMapping
    @Operation(summary = "Listar todos os orçamentos", description = "Retorna uma lista paginada de todos os orçamentos")
    public ResponseEntity<Page<QuoteDTO>> getAllQuotes(Pageable pageable) {
        Page<Quote> quotes = quoteService.findAll(pageable);
        Page<QuoteDTO> quoteDTOs = quoteService.convertToDTOPage(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/all")
    @Operation(summary = "Listar todos os orçamentos sem paginação", description = "Retorna uma lista completa de todos os orçamentos")
    public ResponseEntity<List<QuoteDTO>> getAllQuotesList() {
        List<Quote> quotes = quoteService.findAll();
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar orçamento por ID", description = "Retorna um orçamento específico pelo ID")
    public ResponseEntity<QuoteDTO> getQuoteById(@PathVariable String id) {
        Quote quote = quoteService.findById(UUID.fromString(id));
        QuoteDTO quoteDTO = quoteService.convertToDTO(quote);
        return ResponseEntity.ok(quoteDTO);
    }

    @GetMapping("/{id}/pdf")
    @Operation(summary = "Gerar PDF do orçamento", description = "Gera PDF do orçamento com opção de incluir serviços")
    public ResponseEntity<byte[]> generateQuotePdf(@PathVariable String id,
            @RequestParam(value = "includeServices", defaultValue = "false") boolean includeServices) {
        byte[] pdf = quoteCommercialPdfService.generatePdf(UUID.fromString(id), includeServices);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "orcamento-" + id + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @PostMapping
    @Operation(summary = "Criar novo orçamento", description = "Cria um novo orçamento no sistema")
    public ResponseEntity<QuoteDTO> createQuote(@RequestBody QuoteDTO quoteDTO) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User currentUser = (User) authentication.getPrincipal();
        UUID currentUserId = currentUser.getId();

        Quote createdQuote = quoteService.create(quoteDTO, currentUserId);
        QuoteDTO createdDTO = quoteService.convertToDTO(createdQuote);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdDTO);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar orçamento", description = "Atualiza um orçamento existente")
    public ResponseEntity<QuoteDTO> updateQuote(@PathVariable String id, @RequestBody QuoteDTO quoteDTO) {
        quoteService.update(UUID.fromString(id), quoteDTO);
        return ResponseEntity.ok(quoteService.getQuoteDTOById(UUID.fromString(id)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status do orçamento", description = "Atualiza apenas o status de um orçamento")
    public ResponseEntity<QuoteDTO> updateQuoteStatus(@PathVariable String id,
            @RequestBody Map<String, String> statusUpdate) {
        String status = statusUpdate.get("status");
        Quote updated = quoteService.updateStatus(UUID.fromString(id), status);
        QuoteDTO updatedDTO = quoteService.convertToDTO(updated);
        return ResponseEntity.ok(updatedDTO);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir orçamento", description = "Exclui um orçamento do sistema")
    public ResponseEntity<Void> deleteQuote(@PathVariable String id) {
        quoteService.delete(UUID.fromString(id));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/bulk")
    @Operation(summary = "Excluir orçamentos em massa", description = "Exclui múltiplos orçamentos do sistema")
    public ResponseEntity<Void> deleteQuotesBulk(@RequestBody List<UUID> ids) {
        quoteService.deleteBulk(ids);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    @Operation(summary = "Excluir todos os orçamentos", description = "Exclui todos os orçamentos do sistema")
    public ResponseEntity<Void> deleteAllQuotes() {
        quoteService.deleteAll();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar orçamentos por status", description = "Retorna orçamentos filtrados por status")
    public ResponseEntity<List<QuoteDTO>> getQuotesByStatus(@PathVariable String status) {
        QuoteStatus quoteStatus = QuoteStatus.valueOf(status.toUpperCase());
        List<Quote> quotes = quoteService.findByStatus(quoteStatus);
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/client/{clientId}")
    @Operation(summary = "Buscar orçamentos por cliente", description = "Retorna orçamentos de um cliente específico")
    public ResponseEntity<List<QuoteDTO>> getQuotesByClient(@PathVariable String clientId) {
        List<Quote> quotes = quoteService.findByClient(UUID.fromString(clientId));
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/lead/{leadId}")
    @Operation(summary = "Buscar orçamentos por lead", description = "Retorna orçamentos de um lead específico")
    public ResponseEntity<List<QuoteDTO>> getQuotesByLead(@PathVariable String leadId) {
        List<Quote> quotes = quoteService.findByLead(UUID.fromString(leadId));
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/assigned/{userId}")
    @Operation(summary = "Buscar orçamentos por responsável", description = "Retorna orçamentos atribuídos a um usuário específico")
    public ResponseEntity<List<QuoteDTO>> getQuotesByAssignedTo(@PathVariable String userId) {
        List<Quote> quotes = quoteService.findByAssignedTo(UUID.fromString(userId));
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/created/{userId}")
    @Operation(summary = "Buscar orçamentos por criador", description = "Retorna orçamentos criados por um usuário específico")
    public ResponseEntity<List<QuoteDTO>> getQuotesByCreatedBy(@PathVariable String userId) {
        List<Quote> quotes = quoteService.findByCreatedBy(UUID.fromString(userId));
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/expired")
    @Operation(summary = "Buscar orçamentos expirados", description = "Retorna orçamentos que já expiraram")
    public ResponseEntity<List<QuoteDTO>> getExpiredQuotes() {
        List<Quote> quotes = quoteService.findExpiredQuotes();
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/expiring-soon/{days}")
    @Operation(summary = "Buscar orçamentos expirando em breve", description = "Retorna orçamentos que expiram nos próximos X dias")
    public ResponseEntity<List<QuoteDTO>> getQuotesExpiringSoon(@PathVariable int days) {
        List<Quote> quotes = quoteService.findQuotesExpiringSoon(days);
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/search")
    @Operation(summary = "Buscar orçamentos", description = "Busca orçamentos por termo de pesquisa")
    public ResponseEntity<List<QuoteDTO>> searchQuotes(@RequestParam("term") String term) {
        List<Quote> quotes = quoteService.searchQuotes(term);
        List<QuoteDTO> quoteDTOs = quoteService.convertToDTOList(quotes);
        return ResponseEntity.ok(quoteDTOs);
    }

    @GetMapping("/stats/count-by-status")
    @Operation(summary = "Estatísticas por status", description = "Retorna contagem de orçamentos por status")
    public ResponseEntity<Map<String, Long>> getCountByStatus() {
        Map<String, Long> stats = Map.of(
                "DRAFT", quoteService.countByStatus(QuoteStatus.DRAFT),
                "SENT", quoteService.countByStatus(QuoteStatus.SENT),
                "UNDER_REVIEW", quoteService.countByStatus(QuoteStatus.UNDER_REVIEW),
                "APPROVED", quoteService.countByStatus(QuoteStatus.APPROVED),
                "REJECTED", quoteService.countByStatus(QuoteStatus.REJECTED),
                "EXPIRED", quoteService.countByStatus(QuoteStatus.EXPIRED),
                "CONVERTED", quoteService.countByStatus(QuoteStatus.CONVERTED));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/total-value-by-status")
    @Operation(summary = "Valor total por status", description = "Retorna valor total dos orçamentos por status")
    public ResponseEntity<Map<String, BigDecimal>> getTotalValueByStatus() {
        Map<String, BigDecimal> stats = Map.of(
                "DRAFT", quoteService.getTotalValueByStatus(QuoteStatus.DRAFT),
                "SENT", quoteService.getTotalValueByStatus(QuoteStatus.SENT),
                "UNDER_REVIEW", quoteService.getTotalValueByStatus(QuoteStatus.UNDER_REVIEW),
                "APPROVED", quoteService.getTotalValueByStatus(QuoteStatus.APPROVED),
                "REJECTED", quoteService.getTotalValueByStatus(QuoteStatus.REJECTED),
                "EXPIRED", quoteService.getTotalValueByStatus(QuoteStatus.EXPIRED),
                "CONVERTED", quoteService.getTotalValueByStatus(QuoteStatus.CONVERTED));
        return ResponseEntity.ok(stats);
    }
}