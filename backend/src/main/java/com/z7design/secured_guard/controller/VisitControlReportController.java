package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.VisitControlReportDTO;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.VisitControlStatus;
import com.z7design.secured_guard.repository.UserRepository;
import com.z7design.secured_guard.service.VisitControlReportService;
import com.z7design.secured_guard.service.VisitControlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/visit-control-reports")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Relatórios de Visitas", description = "Gerenciamento de relatórios de visitas salvos")
public class VisitControlReportController {

    private final VisitControlReportService reportService;
    private final VisitControlService visitControlService;
    private final UserRepository userRepository;

    @GetMapping
    @Operation(summary = "Listar todos os relatórios", description = "Retorna lista de todos os relatórios gerados")
    public ResponseEntity<List<VisitControlReportDTO>> getAllReports() {
        List<VisitControlReportDTO> reports = reportService.getAllReports();
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/my-reports")
    @Operation(summary = "Listar meus relatórios", description = "Retorna lista de relatórios do usuário logado")
    public ResponseEntity<List<VisitControlReportDTO>> getMyReports() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = null;
        if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            // Aqui você precisaria buscar o ID do usuário baseado no username
            // Por enquanto, retorna todos
        }
        List<VisitControlReportDTO> reports = reportService.getAllReports();
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar relatório por ID", description = "Retorna detalhes de um relatório específico")
    public ResponseEntity<VisitControlReportDTO> getReportById(@PathVariable UUID id) {
        Optional<VisitControlReportDTO> report = reportService.getReportById(id);
        return report.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


    @GetMapping("/{id}/download")
    @Operation(summary = "Download do relatório", description = "Faz download do arquivo PDF do relatório")
    public ResponseEntity<Resource> downloadReport(@PathVariable UUID id) {
        try {
            log.info("Tentando fazer download do relatório: {}", id);
            Resource resource = reportService.getReportFile(id);
            VisitControlReportDTO report = reportService.getReportById(id)
                    .orElseThrow(() -> new RuntimeException("Relatório não encontrado"));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", report.getFileName());
            // Headers para visualização (CORS já configurado no SecurityConfig)
            headers.set("X-Frame-Options", "SAMEORIGIN");
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.set("Pragma", "no-cache");
            headers.set("Expires", "0");

            log.info("Retornando PDF do relatório: {}", report.getFileName());
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao fazer download do relatório: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{id}/view")
    @Operation(summary = "Visualizar relatório", description = "Visualiza o arquivo PDF do relatório no navegador")
    public ResponseEntity<Resource> viewReport(@PathVariable UUID id) {
        try {
            log.info("Tentando visualizar relatório: {}", id);
            Resource resource = reportService.getReportFile(id);
            VisitControlReportDTO report = reportService.getReportById(id)
                    .orElseThrow(() -> new RuntimeException("Relatório não encontrado"));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", report.getFileName());
            // Headers para visualização (CORS já configurado no SecurityConfig)
            headers.set("X-Frame-Options", "SAMEORIGIN");
            headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.set("Pragma", "no-cache");
            headers.set("Expires", "0");

            log.info("Retornando PDF do relatório para visualização: {}", report.getFileName());
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(resource);
        } catch (Exception e) {
            log.error("Erro ao visualizar relatório: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/generate")
    @Operation(summary = "Gerar e salvar relatório", description = "Gera um novo relatório PDF e salva no sistema")
    public ResponseEntity<VisitControlReportDTO> generateAndSaveReport(
            @RequestParam(required = false) UUID workPostId,
            @RequestParam(required = false) VisitControlStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            UUID createdBy = null;
            
            // Buscar o usuário atual pelo username
            if (auth != null && auth.isAuthenticated()) {
                String username = auth.getName();
                Optional<User> currentUser = userRepository.findByUsername(username);
                if (currentUser.isPresent()) {
                    createdBy = currentUser.get().getId();
                    log.info("Relatório será criado pelo usuário: {} ({})", username, createdBy);
                } else {
                    log.warn("Usuário não encontrado no banco de dados: {}", username);
                }
            } else {
                log.warn("Nenhum usuário autenticado encontrado");
            }

            VisitControlReportDTO report = visitControlService.generateAndSavePDFReport(
                    workPostId, status, startDate, endDate, createdBy);
            return ResponseEntity.status(HttpStatus.CREATED).body(report);
        } catch (Exception e) {
            log.error("Erro ao gerar e salvar relatório: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir relatório", description = "Exclui um relatório e seu arquivo PDF")
    public ResponseEntity<Void> deleteReport(@PathVariable UUID id) {
        try {
            reportService.deleteReport(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Erro ao excluir relatório: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

