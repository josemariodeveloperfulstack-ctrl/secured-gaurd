package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.model.FiscalInvoice;
import com.z7design.secured_guard.service.FiscalInvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fiscal/invoices")
@RequiredArgsConstructor
@Tag(name = "Módulo Fiscal", description = "Importação e download de notas fiscais (PDF/XML)")
public class FiscalInvoiceController {

    private final FiscalInvoiceService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Importar nota fiscal (um arquivo: PDF ou XML)")
    @PreAuthorize("hasAnyAuthority('FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<FiscalInvoice> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("clientName") String clientName,
            @RequestParam("periodMonth") Integer periodMonth,
            @RequestParam("periodYear") Integer periodYear,
            Authentication auth) throws IOException {
        String username = auth != null ? auth.getName() : null;
        FiscalInvoice created = service.upload(file, clientName, periodMonth, periodYear, username);
        return ResponseEntity.ok(created);
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Analisar nota fiscal PDF em tempo real para preenchimento dos campos")
    @PreAuthorize("hasAnyAuthority('FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<com.z7design.secured_guard.dto.FiscalInvoiceAnalysisDTO> analyze(
            @RequestParam("file") MultipartFile file) throws IOException {
        com.z7design.secured_guard.dto.FiscalInvoiceAnalysisDTO analysis = service.analyzePdf(file);
        return ResponseEntity.ok(analysis);
    }


    @PostMapping(value = "/upload-pair", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Importar nota fiscal PDF e XML em conjunto (valida se o CNPJ é o mesmo em ambos)")
    @PreAuthorize("hasAnyAuthority('FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<List<FiscalInvoice>> uploadPdfAndXml(
            @RequestParam("filePdf") MultipartFile filePdf,
            @RequestParam("fileXml") MultipartFile fileXml,
            @RequestParam("periodMonth") Integer periodMonth,
            @RequestParam("periodYear") Integer periodYear,
            Authentication auth) throws IOException {
        String username = auth != null ? auth.getName() : null;
        List<FiscalInvoice> created = service.uploadPdfAndXml(filePdf, fileXml, periodMonth, periodYear, username);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    @Operation(summary = "Listar notas fiscais com filtros e paginação")
    @PreAuthorize("hasAnyAuthority('FISCAL_READ','FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Page<FiscalInvoice>> list(
            @Parameter(description = "Ano do período") @RequestParam(value = "periodYear", required = false) Integer periodYear,
            @Parameter(description = "Mês do período (1-12)") @RequestParam(value = "periodMonth", required = false) Integer periodMonth,
            @Parameter(description = "Nome do cliente (parcial)") @RequestParam(value = "clientName", required = false) String clientName,
            @Parameter(description = "Tipo: PDF ou XML") @RequestParam(value = "fileType", required = false) String fileType,
            Pageable pageable) {
        return ResponseEntity.ok(service.findByFilters(periodYear, periodMonth, clientName, fileType, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obter nota fiscal por ID")
    @PreAuthorize("hasAnyAuthority('FISCAL_READ','FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<FiscalInvoice> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download do arquivo da nota fiscal")
    @PreAuthorize("hasAnyAuthority('FISCAL_READ','FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Resource> download(@PathVariable UUID id) throws IOException {
        FiscalInvoice inv = service.findById(id);
        Path path = service.getFilePath(inv);
        Resource resource = new UrlResource(path.toUri());
        String filename = inv.getFileNameOriginal() != null ? inv.getFileNameOriginal()
                : "nota." + inv.getFileType().toLowerCase();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @GetMapping("/download-zip")
    @Operation(summary = "Download em ZIP (agrupado por período, cliente ou tipo)")
    @PreAuthorize("hasAnyAuthority('FISCAL_READ','FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<byte[]> downloadZip(
            @Parameter(description = "Agrupar por: PERIOD, CLIENT, TYPE") @RequestParam(value = "groupBy", defaultValue = "PERIOD") String groupBy,
            @RequestParam(value = "periodYear", required = false) Integer periodYear,
            @RequestParam(value = "periodMonth", required = false) Integer periodMonth,
            @RequestParam(value = "clientName", required = false) String clientName,
            @RequestParam(value = "fileType", required = false) String fileType) throws IOException {
        byte[] zip = service.buildZipDownload(groupBy, periodYear, periodMonth, clientName, fileType);
        if (zip.length == 0) {
            return ResponseEntity.noContent().build();
        }
        String filename = "notas-fiscais.zip";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zip);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir nota fiscal")
    @PreAuthorize("hasAnyAuthority('FISCAL_WRITE','ROLE_SUPER_ADMIN','ROLE_ADMIN','ROLE_FINANCEIRO')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
