package com.z7design.secured_guard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.dto.visit.VisitEnrichmentDtos.*;
import com.z7design.secured_guard.model.enums.VisitPhotoType;
import com.z7design.secured_guard.service.VisitControlEnrichmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoints para enriquecer uma {@code VisitControl} com:
 *  - fotos (multipart)
 *  - problemas reportados
 *  - inventário rápido (equipamentos/veículos)
 *  - entregas de EPI registradas em campo
 *
 * <p>Todos os endpoints aceitam o role SUPERVISOR (operacional em campo) e
 * roles administrativos. O Gestor Operacional pode marcar problemas como resolvidos.
 */
@Slf4j
@RestController
@RequestMapping("/api/visit-controls/{visitId}")
@RequiredArgsConstructor
@Tag(name = "Visit Control Enrichment", description = "Fotos, problemas, ativos e EPI da visita")
public class VisitControlEnrichmentController {

    private static final String SUPERVISOR_AUTH =
        "hasAnyAuthority('VISITS_CREATE', 'VISITS_WRITE', 'SUPER_ADMIN', 'ADMIN') "
            + "or hasAnyRole('SUPERVISOR', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', "
            + "'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'OPERACIONAL')";

    private static final String READ_AUTH =
        "hasAnyAuthority('VISITS_READ', 'VISITS_WRITE', 'VISITS_CREATE', 'SUPER_ADMIN', 'ADMIN') "
            + "or hasAnyRole('SUPERVISOR', 'SUPER_ADMIN', 'ADMIN', 'GESTOR', "
            + "'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO', 'OPERACIONAL', 'RH')";

    private final VisitControlEnrichmentService service;
    private final ObjectMapper objectMapper;

    /* =================================================================== */
    /* Bundle full                                                          */
    /* =================================================================== */
    @GetMapping("/full")
    @PreAuthorize(READ_AUTH)
    @Operation(summary = "Retorna fotos + problemas + ativos + entregas de EPI de uma visita")
    public ResponseEntity<VisitFullDTO> getFull(@PathVariable UUID visitId) {
        return ResponseEntity.ok(service.getFull(visitId));
    }

    /* =================================================================== */
    /* Fotos                                                                */
    /* =================================================================== */
    @PostMapping(value = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(SUPERVISOR_AUTH)
    @Operation(summary = "Anexa uma foto à visita (multipart)")
    public ResponseEntity<?> addPhoto(
            @PathVariable UUID visitId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "photoType", required = false) String photoType,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "uploadedBy", required = false) UUID uploadedBy) {
        try {
            VisitPhotoType type = photoType != null ? VisitPhotoType.valueOf(photoType) : VisitPhotoType.GENERAL;
            PhotoDTO dto = service.addPhoto(visitId, file, type, caption, uploadedBy);
            return ResponseEntity.ok(dto);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao anexar foto à visita {}", visitId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/photos")
    @PreAuthorize(READ_AUTH)
    public ResponseEntity<List<PhotoDTO>> listPhotos(@PathVariable UUID visitId) {
        return ResponseEntity.ok(service.listPhotos(visitId));
    }

    @DeleteMapping("/photos/{photoId}")
    @PreAuthorize(SUPERVISOR_AUTH)
    public ResponseEntity<?> deletePhoto(@PathVariable UUID visitId, @PathVariable UUID photoId) {
        try {
            service.deletePhoto(visitId, photoId);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /* =================================================================== */
    /* Problemas reportados                                                 */
    /* =================================================================== */
    @PostMapping("/issues")
    @PreAuthorize(SUPERVISOR_AUTH)
    @Operation(summary = "Registra um problema reportado pelo funcionário")
    public ResponseEntity<IssueDTO> addIssue(@PathVariable UUID visitId, @Valid @RequestBody IssueCreateDTO dto) {
        return ResponseEntity.ok(service.addIssue(visitId, dto));
    }

    @GetMapping("/issues")
    @PreAuthorize(READ_AUTH)
    public ResponseEntity<List<IssueDTO>> listIssues(@PathVariable UUID visitId) {
        return ResponseEntity.ok(service.listIssues(visitId));
    }

    @PatchMapping("/issues/{issueId}/resolve")
    @PreAuthorize("hasAnyAuthority('VISITS_WRITE', 'SUPER_ADMIN', 'ADMIN') "
        + "or hasAnyRole('SUPER_ADMIN', 'ADMIN', 'GESTOR_OPERACIONAL', 'GESTAO_SUPERVISAO')")
    @Operation(summary = "Marca um problema da visita como resolvido (apenas Gestor Operacional)")
    public ResponseEntity<IssueDTO> resolveIssue(
            @PathVariable UUID visitId,
            @PathVariable UUID issueId,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("resolutionNotes", null) : null;
        return ResponseEntity.ok(service.resolveIssue(issueId, notes));
    }

    /* =================================================================== */
    /* Inventário rápido                                                    */
    /* =================================================================== */
    @PostMapping("/post-assets")
    @PreAuthorize(SUPERVISOR_AUTH)
    @Operation(summary = "Registra um equipamento/veículo disponível no posto")
    public ResponseEntity<PostAssetDTO> addPostAsset(@PathVariable UUID visitId, @Valid @RequestBody PostAssetCreateDTO dto) {
        return ResponseEntity.ok(service.addPostAsset(visitId, dto));
    }

    @GetMapping("/post-assets")
    @PreAuthorize(READ_AUTH)
    public ResponseEntity<List<PostAssetDTO>> listPostAssets(@PathVariable UUID visitId) {
        return ResponseEntity.ok(service.listPostAssets(visitId));
    }

    /* =================================================================== */
    /* EPI entregue na visita                                               */
    /* =================================================================== */
    @PostMapping(value = "/epi-deliveries", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(SUPERVISOR_AUTH)
    @Operation(summary = "Registra entrega de EPI feita durante a visita")
    public ResponseEntity<?> addEpiDelivery(
            @PathVariable UUID visitId,
            @RequestParam("data") String dataJson,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {
        try {
            EpiDeliveryCreateDTO dto = objectMapper.readValue(dataJson, EpiDeliveryCreateDTO.class);
            EpiDeliveryDTO out = service.addEpiDelivery(visitId, dto, photo);
            return ResponseEntity.ok(out);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Erro ao registrar entrega de EPI na visita {}", visitId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/epi-deliveries")
    @PreAuthorize(READ_AUTH)
    public ResponseEntity<List<EpiDeliveryDTO>> listEpiDeliveries(@PathVariable UUID visitId) {
        return ResponseEntity.ok(service.listEpiDeliveries(visitId));
    }
}
