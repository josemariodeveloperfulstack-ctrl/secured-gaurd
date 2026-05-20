package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.visit.VisitEnrichmentDtos.*;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.*;
import com.z7design.secured_guard.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Coordena os artefatos extras gerados durante uma visita do supervisor.
 *
 * <p>O caminho oficial pelo qual a tela mobile da visita registra:
 * <ul>
 *   <li>fotos (multi-upload, com categoria);</li>
 *   <li>problemas reportados pelo funcionário;</li>
 *   <li>inventário rápido de equipamentos/veículos no posto;</li>
 *   <li>entregas de EPI feitas durante a visita.</li>
 * </ul>
 *
 * <p>Cada método é independente e idempotente em escrita (apenas cria).
 * Toda exclusão é cascateada via {@code ON DELETE CASCADE} no banco.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VisitControlEnrichmentService {

    private final VisitControlRepository visitControlRepository;
    private final VisitControlPhotoRepository photoRepository;
    private final VisitControlIssueRepository issueRepository;
    private final VisitControlPostAssetRepository postAssetRepository;
    private final VisitControlEpiDeliveryRepository epiDeliveryRepository;
    private final EmployeeRepository employeeRepository;
    private final VisitFileStorageService fileStorage;

    /* =================================================================== */
    /* Fotos                                                                */
    /* =================================================================== */
    @Transactional
    public PhotoDTO addPhoto(UUID visitId, MultipartFile file, VisitPhotoType type, String caption, UUID uploadedBy) {
        VisitControl visit = requireVisit(visitId);
        String url = fileStorage.storeFile(file);

        VisitControlPhoto photo = new VisitControlPhoto();
        photo.setVisitControl(visit);
        photo.setFileUrl(url);
        photo.setPhotoType(type != null ? type : VisitPhotoType.GENERAL);
        photo.setCaption(caption);
        photo.setTakenAt(LocalDateTime.now());
        photo.setUploadedBy(uploadedBy);

        VisitControlPhoto saved = photoRepository.save(photo);
        log.info("Foto adicionada à visita {} (type={}, file={})", visitId, saved.getPhotoType(), url);
        return PhotoDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PhotoDTO> listPhotos(UUID visitId) {
        return photoRepository.findByVisitControlIdOrderByTakenAtAsc(visitId).stream()
            .map(PhotoDTO::from)
            .toList();
    }

    @Transactional
    public void deletePhoto(UUID visitId, UUID photoId) {
        VisitControlPhoto photo = photoRepository.findById(photoId)
            .orElseThrow(() -> new EntityNotFoundException("Foto não encontrada: " + photoId));
        if (!photo.getVisitControl().getId().equals(visitId)) {
            throw new IllegalArgumentException("Foto não pertence à visita informada.");
        }
        fileStorage.deleteFile(photo.getFileUrl());
        photoRepository.delete(photo);
    }

    /* =================================================================== */
    /* Problemas reportados                                                 */
    /* =================================================================== */
    @Transactional
    public IssueDTO addIssue(UUID visitId, IssueCreateDTO dto) {
        VisitControl visit = requireVisit(visitId);

        VisitControlIssue issue = new VisitControlIssue();
        issue.setVisitControl(visit);
        issue.setCategory(dto.getCategory() != null ? dto.getCategory() : VisitIssueCategory.OTHER);
        issue.setSeverity(dto.getSeverity() != null ? dto.getSeverity() : VisitIssueSeverity.MEDIUM);
        issue.setDescription(dto.getDescription());
        issue.setReportedAt(LocalDateTime.now());

        VisitControlIssue saved = issueRepository.save(issue);
        log.info("Problema reportado na visita {}: severity={}, cat={}", visitId, saved.getSeverity(), saved.getCategory());
        return IssueDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<IssueDTO> listIssues(UUID visitId) {
        return issueRepository.findByVisitControlIdOrderByReportedAtDesc(visitId).stream()
            .map(IssueDTO::from)
            .toList();
    }

    @Transactional
    public IssueDTO resolveIssue(UUID issueId, String resolutionNotes) {
        VisitControlIssue issue = issueRepository.findById(issueId)
            .orElseThrow(() -> new EntityNotFoundException("Problema não encontrado: " + issueId));
        issue.setResolvedAt(LocalDateTime.now());
        issue.setResolutionNotes(resolutionNotes);
        return IssueDTO.from(issueRepository.save(issue));
    }

    /* =================================================================== */
    /* Inventário rápido (equipamentos / veículos no posto)                 */
    /* =================================================================== */
    @Transactional
    public PostAssetDTO addPostAsset(UUID visitId, PostAssetCreateDTO dto) {
        VisitControl visit = requireVisit(visitId);

        VisitControlPostAsset asset = new VisitControlPostAsset();
        asset.setVisitControl(visit);
        asset.setAssetType(dto.getAssetType() != null ? dto.getAssetType() : VisitAssetType.OTHER);
        asset.setReferenceId(dto.getReferenceId());
        asset.setDescription(dto.getDescription());
        asset.setStatus(dto.getStatus() != null ? dto.getStatus() : VisitAssetStatus.PRESENT);
        asset.setNotes(dto.getNotes());

        VisitControlPostAsset saved = postAssetRepository.save(asset);
        return PostAssetDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PostAssetDTO> listPostAssets(UUID visitId) {
        return postAssetRepository.findByVisitControlIdOrderByCreatedAtAsc(visitId).stream()
            .map(PostAssetDTO::from)
            .toList();
    }

    /* =================================================================== */
    /* Entregas de EPI                                                      */
    /* =================================================================== */
    @Transactional
    public EpiDeliveryDTO addEpiDelivery(UUID visitId, EpiDeliveryCreateDTO dto, MultipartFile photo) {
        VisitControl visit = requireVisit(visitId);

        VisitControlEpiDelivery delivery = new VisitControlEpiDelivery();
        delivery.setVisitControl(visit);
        delivery.setEpiItemDescription(dto.getEpiItemDescription());
        delivery.setQuantity(dto.getQuantity() != null ? dto.getQuantity() : 1);
        delivery.setEmployeeConfirmed(Boolean.TRUE.equals(dto.getEmployeeConfirmed()));
        delivery.setNotes(dto.getNotes());
        delivery.setDeliveredAt(LocalDateTime.now());

        if (dto.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(dto.getEmployeeId())
                .orElseThrow(() -> new EntityNotFoundException("Funcionário não encontrado: " + dto.getEmployeeId()));
            delivery.setEmployee(employee);
        } else if (visit.getEmployee() != null) {
            // Por default usa o funcionário identificado na visita
            delivery.setEmployee(visit.getEmployee());
        }

        if (photo != null && !photo.isEmpty()) {
            delivery.setPhotoUrl(fileStorage.storeFile(photo));
        }

        VisitControlEpiDelivery saved = epiDeliveryRepository.save(delivery);
        log.info("Entrega de EPI registrada na visita {}: {} (qtd={})", visitId, saved.getEpiItemDescription(), saved.getQuantity());
        return EpiDeliveryDTO.from(saved);
    }

    @Transactional(readOnly = true)
    public List<EpiDeliveryDTO> listEpiDeliveries(UUID visitId) {
        return epiDeliveryRepository.findByVisitControlIdOrderByDeliveredAtAsc(visitId).stream()
            .map(EpiDeliveryDTO::from)
            .toList();
    }

    /* =================================================================== */
    /* Bundle full                                                          */
    /* =================================================================== */
    @Transactional(readOnly = true)
    public VisitFullDTO getFull(UUID visitId) {
        return VisitFullDTO.builder()
            .visitControlId(visitId)
            .photos(listPhotos(visitId))
            .issues(listIssues(visitId))
            .postAssets(listPostAssets(visitId))
            .epiDeliveries(listEpiDeliveries(visitId))
            .build();
    }

    /* =================================================================== */
    /* Helpers                                                              */
    /* =================================================================== */
    private VisitControl requireVisit(UUID visitId) {
        return visitControlRepository.findById(visitId)
            .orElseThrow(() -> new EntityNotFoundException("Visita não encontrada: " + visitId));
    }
}
