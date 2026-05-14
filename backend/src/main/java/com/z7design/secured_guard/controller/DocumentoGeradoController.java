package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.DocumentoGerado;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.service.DocumentoGeradoService;
import com.z7design.secured_guard.service.AuthenticationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documentos-gerados")
@CrossOrigin(origins = "*")
public class DocumentoGeradoController {
    
    private final DocumentoGeradoService documentoGeradoService;
    private final AuthenticationService authenticationService;
    
    public DocumentoGeradoController(DocumentoGeradoService documentoGeradoService,
                                    AuthenticationService authenticationService) {
        this.documentoGeradoService = documentoGeradoService;
        this.authenticationService = authenticationService;
    }
    
    /**
     * Lista todos os documentos gerados com paginação
     */
    @GetMapping
    @PreAuthorize("hasAuthority('EMPLOYEES_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<Page<DocumentoGerado>> listarTodos(Pageable pageable) {
        Page<DocumentoGerado> documentos = documentoGeradoService.listarComPaginacao(pageable);
        return ResponseEntity.ok(documentos);
    }
    
    /**
     * Busca documento por ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('EMPLOYEES_READ') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<DocumentoGerado> buscarPorId(@PathVariable UUID id) {
        try {
            DocumentoGerado documento = documentoGeradoService.buscarPorId(id);
            return ResponseEntity.ok(documento);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Lista documentos por funcionário
     */
    @GetMapping("/funcionario/{funcionarioId}")
    public ResponseEntity<List<DocumentoGerado>> listarPorFuncionario(@PathVariable UUID funcionarioId) {
        try {
            List<DocumentoGerado> documentos = documentoGeradoService.listarPorFuncionario(funcionarioId);
            return ResponseEntity.ok(documentos);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Lista documentos gerados do usuário logado (Dashboard do Colaborador).
     * Não exige permissão de RH: cada colaborador vê apenas seus próprios documentos.
     */
    @GetMapping("/meus")
    public ResponseEntity<List<DocumentoGerado>> listarMeus() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            User usuarioAtual = authenticationService.getCurrentUser(authentication);
            if (usuarioAtual == null) {
                return ResponseEntity.ok(List.of());
            }
            List<DocumentoGerado> documentos = documentoGeradoService.listarPorUserId(usuarioAtual.getId());
            return ResponseEntity.ok(documentos);
        } catch (RuntimeException e) {
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * Lista documentos de um funcionário filtrados por tipo/categoria.
     */
    @GetMapping("/funcionario/{funcionarioId}/tipo/{tipo}")
    public ResponseEntity<List<DocumentoGerado>> listarPorFuncionarioETipo(
            @PathVariable UUID funcionarioId,
            @PathVariable TipoDocumentoGerado tipo) {
        try {
            List<DocumentoGerado> documentos = documentoGeradoService.listarPorFuncionarioETipo(funcionarioId, tipo);
            return ResponseEntity.ok(documentos);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Lista documentos por modelo
     */
    @GetMapping("/modelo/{modeloId}")
    public ResponseEntity<List<DocumentoGerado>> listarPorModelo(@PathVariable UUID modeloId) {
        try {
            List<DocumentoGerado> documentos = documentoGeradoService.listarPorModelo(modeloId);
            return ResponseEntity.ok(documentos);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Lista documentos por status
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<DocumentoGerado>> listarPorStatus(@PathVariable DocumentoGerado.StatusDocumento status) {
        List<DocumentoGerado> documentos = documentoGeradoService.listarPorStatus(status);
        return ResponseEntity.ok(documentos);
    }
    
    /**
     * Lista documentos pendentes
     */
    @GetMapping("/pendentes")
    public ResponseEntity<List<DocumentoGerado>> listarPendentes() {
        List<DocumentoGerado> documentos = documentoGeradoService.listarPendentes();
        return ResponseEntity.ok(documentos);
    }
    
    /**
     * Lista documentos vencidos
     */
    @GetMapping("/vencidos")
    public ResponseEntity<List<DocumentoGerado>> listarVencidos() {
        List<DocumentoGerado> documentos = documentoGeradoService.listarVencidos();
        return ResponseEntity.ok(documentos);
    }
    
    /**
     * Lista documentos que vencem em breve
     */
    @GetMapping("/vencendo-em-breve")
    public ResponseEntity<List<DocumentoGerado>> listarVencendoEmBreve(@RequestParam(defaultValue = "7") int dias) {
        List<DocumentoGerado> documentos = documentoGeradoService.listarVencendoEmBreve(dias);
        return ResponseEntity.ok(documentos);
    }
    
    /**
     * Gera um novo documento
     */
    @PostMapping("/gerar")
    @PreAuthorize("hasAuthority('EMPLOYEES_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<DocumentoGerado> gerarDocumento(@RequestBody Map<String, Object> request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User usuarioAtual = authenticationService.getCurrentUser(authentication);
            
            UUID modeloId = UUID.fromString((String) request.get("modeloId"));
            UUID funcionarioId = UUID.fromString((String) request.get("funcionarioId"));
            
            @SuppressWarnings("unchecked")
            Map<String, Object> dadosPreenchidos = (Map<String, Object>) request.get("dadosPreenchidos");
            
            DocumentoGerado documento = documentoGeradoService.gerarDocumento(
                modeloId, funcionarioId, dadosPreenchidos, usuarioAtual);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(documento);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Assina um documento
     */
    @PostMapping("/{id}/assinar")
    public ResponseEntity<DocumentoGerado> assinarDocumento(@PathVariable UUID id, 
                                                           HttpServletRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User usuarioAtual = authenticationService.getCurrentUser(authentication);
            String ipAddress = getClientIpAddress(request);
            DocumentoGerado documento = documentoGeradoService.assinarDocumento(id, usuarioAtual, ipAddress);
            return ResponseEntity.ok(documento);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Obtém o IP do cliente considerando proxies e load balancers
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            // X-Forwarded-For pode conter múltiplos IPs separados por vírgula
            // O primeiro IP é geralmente o IP original do cliente
            String[] ips = xForwardedFor.split(",");
            return ips[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    /**
     * Cancela um documento
     */
    @PostMapping("/{id}/cancelar")
    public ResponseEntity<DocumentoGerado> cancelarDocumento(@PathVariable UUID id) {
        try {
            DocumentoGerado documento = documentoGeradoService.cancelarDocumento(id);
            return ResponseEntity.ok(documento);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Define data de vencimento para um documento
     */
    @PutMapping("/{id}/vencimento")
    public ResponseEntity<DocumentoGerado> definirVencimento(@PathVariable UUID id, 
                                                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dataVencimento) {
        try {
            DocumentoGerado documento = documentoGeradoService.definirVencimento(id, dataVencimento);
            return ResponseEntity.ok(documento);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Atualiza status de documentos vencidos
     */
    @PostMapping("/atualizar-status-vencidos")
    public ResponseEntity<Void> atualizarStatusVencidos() {
        documentoGeradoService.atualizarStatusVencidos();
        return ResponseEntity.ok().build();
    }
    
    /**
     * Obtém estatísticas dos documentos
     */
    @GetMapping("/estatisticas")
    public ResponseEntity<Map<String, Object>> obterEstatisticas() {
        Map<String, Object> estatisticas = documentoGeradoService.obterEstatisticas();
        return ResponseEntity.ok(estatisticas);
    }
    
    /**
     * Lista documentos criados em um período
     */
    @GetMapping("/periodo")
    public ResponseEntity<List<DocumentoGerado>> listarPorPeriodo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dataFim) {
        
        List<DocumentoGerado> documentos = documentoGeradoService.listarPorStatus(DocumentoGerado.StatusDocumento.PENDENTE);
        // Filtrar por período se necessário
        return ResponseEntity.ok(documentos);
    }
    
    /**
     * Lista documentos por funcionário com paginação
     */
    @GetMapping("/funcionario/{funcionarioId}/paginated")
    public ResponseEntity<Page<DocumentoGerado>> listarPorFuncionarioComPaginacao(
            @PathVariable UUID funcionarioId, Pageable pageable) {
        // TODO: implementar paginação real (por enquanto, retorna página vazia)
        return ResponseEntity.ok(Page.empty());
    }
    
    /**
     * Lista documentos por modelo com paginação
     */
    @GetMapping("/modelo/{modeloId}/paginated")
    public ResponseEntity<Page<DocumentoGerado>> listarPorModeloComPaginacao(
            @PathVariable UUID modeloId, Pageable pageable) {
        // TODO: implementar paginação real (por enquanto, retorna página vazia)
        return ResponseEntity.ok(Page.empty());
    }
    
    /**
     * Busca documentos por funcionário e modelo
     */
    @GetMapping("/funcionario/{funcionarioId}/modelo/{modeloId}")
    public ResponseEntity<List<DocumentoGerado>> buscarPorFuncionarioEModelo(
            @PathVariable UUID funcionarioId, @PathVariable UUID modeloId) {
        try {
            List<DocumentoGerado> documentos = documentoGeradoService.listarPorFuncionario(funcionarioId);
            // Filtrar por modelo se necessário
            return ResponseEntity.ok(documentos);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Download do arquivo gerado
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadArquivo(@PathVariable UUID id) {
        try {
            DocumentoGerado documento = documentoGeradoService.buscarPorId(id);
            
            if (documento.getArquivoGerado() == null) {
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", documento.getNomeArquivoGerado());
            headers.setContentLength(documento.getArquivoGerado().length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(documento.getArquivoGerado());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Visualizar documento inline no navegador
     */
    @GetMapping("/{id}/view")
    public ResponseEntity<byte[]> visualizarDocumento(@PathVariable UUID id) {
        try {
            DocumentoGerado documento = documentoGeradoService.buscarPorId(id);
            
            if (documento.getArquivoGerado() == null) {
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", documento.getNomeArquivoGerado());
            headers.setContentLength(documento.getArquivoGerado().length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(documento.getArquivoGerado());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    /**
     * Visualizar conteúdo do documento
     */
    @GetMapping("/{id}/conteudo")
    public ResponseEntity<Map<String, String>> visualizarConteudo(@PathVariable UUID id) {
        try {
            DocumentoGerado documento = documentoGeradoService.buscarPorId(id);
            return ResponseEntity.ok(Map.of("conteudo", documento.getConteudoFinal()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Exclui um documento gerado por ID (ação irreversível). */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('EMPLOYEES_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<Void> excluirDocumento(@PathVariable UUID id) {
        try {
            documentoGeradoService.excluirPorId(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /** Exclui TODOS os documentos gerados de um funcionário (ação irreversível). */
    @DeleteMapping("/funcionario/{funcionarioId}")
    @PreAuthorize("hasAuthority('EMPLOYEES_WRITE') or hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> excluirPorFuncionario(@PathVariable UUID funcionarioId) {
        int deleted = documentoGeradoService.excluirPorFuncionario(funcionarioId);
        return ResponseEntity.ok(Map.of("deleted", deleted));
    }
}
