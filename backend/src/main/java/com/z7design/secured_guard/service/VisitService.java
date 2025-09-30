package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateVisitDTO;
import com.z7design.secured_guard.dto.VisitDTO;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class VisitService {

    private final VisitRepository visitRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkPostRepository workPostRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    public Page<VisitDTO> findAll(Pageable pageable) {
        log.info("Buscando todas as visitas com paginação");
        try {
            Page<Visit> visits = visitRepository.findAll(pageable);
            log.info("Encontradas {} visitas", visits.getTotalElements());
            return visits.map(this::convertToDTO);
        } catch (Exception e) {
            log.error("Erro ao buscar visitas: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao buscar visitas", e);
        }
    }

    public VisitDTO findById(UUID id) {
        log.info("Buscando visita por ID: {}", id);
        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada com ID: " + id));
        return convertToDTO(visit);
    }

    public Page<VisitDTO> findBySupervisorId(UUID supervisorId, Pageable pageable) {
        log.info("Buscando visitas por supervisor: {}", supervisorId);
        Page<Visit> visits = visitRepository.findBySupervisorId(supervisorId, pageable);
        return visits.map(this::convertToDTO);
    }

    public Page<VisitDTO> findByVisitDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable) {
        log.info("Buscando visitas entre {} e {}", startDate, endDate);
        Page<Visit> visits = visitRepository.findByVisitDateBetween(startDate, endDate, pageable);
        return visits.map(this::convertToDTO);
    }

    public List<VisitDTO> findScheduledVisitsForToday() {
        log.info("Buscando visitas agendadas para hoje");
        List<Visit> visits = visitRepository.findScheduledVisitsForToday();
        return visits.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    public List<VisitDTO> findSupervisorVisitsForToday(UUID supervisorId) {
        log.info("Buscando visitas do supervisor {} para hoje", supervisorId);
        List<Visit> visits = visitRepository.findSupervisorVisitsForToday(supervisorId);
        return visits.stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional
    public VisitDTO create(CreateVisitDTO createVisitDTO, String currentUserEmail) {
        log.info("Criando nova visita para supervisor: {}", createVisitDTO.getSupervisorId());

        // Buscar entidades relacionadas
        Employee supervisor = employeeRepository.findById(createVisitDTO.getSupervisorId())
                .orElseThrow(() -> new RuntimeException("Supervisor não encontrado"));

        WorkPost workPost = workPostRepository.findById(createVisitDTO.getWorkPostId())
                .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));

        Client client = clientRepository.findById(createVisitDTO.getClientId())
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));

        User createdBy = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Criar visita
        Visit visit = Visit.builder()
                .supervisor(supervisor)
                .workPost(workPost)
                .client(client)
                .visitDate(createVisitDTO.getVisitDate())
                .visitTime(createVisitDTO.getVisitTime())
                .description(createVisitDTO.getDescription())
                .observations(createVisitDTO.getObservations())
                .status(createVisitDTO.getStatus())
                .presentEmployees(createVisitDTO.getPresentEmployees() != null ? createVisitDTO.getPresentEmployees() : List.of())
                .attachedFiles(createVisitDTO.getAttachedFiles() != null ? createVisitDTO.getAttachedFiles() : List.of())
                .photos(createVisitDTO.getPhotos() != null ? createVisitDTO.getPhotos() : List.of())
                .latitude(createVisitDTO.getLatitude())
                .longitude(createVisitDTO.getLongitude())
                .locationAddress(createVisitDTO.getLocationAddress())
                .qrCodeScanned(createVisitDTO.getQrCodeScanned())
                .qrCodeVerified(createVisitDTO.getQrCodeVerified() != null ? createVisitDTO.getQrCodeVerified() : false)
                .createdBy(createdBy)
                .build();

        Visit savedVisit = visitRepository.save(visit);
        log.info("Visita criada com sucesso: {}", savedVisit.getId());

        return convertToDTO(savedVisit);
    }

    @Transactional
    public VisitDTO update(UUID id, CreateVisitDTO updateDTO, String currentUserEmail) {
        log.info("Atualizando visita: {}", id);

        Visit visit = visitRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada"));

        User updatedBy = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Atualizar campos
        if (updateDTO.getSupervisorId() != null) {
            Employee supervisor = employeeRepository.findById(updateDTO.getSupervisorId())
                    .orElseThrow(() -> new RuntimeException("Supervisor não encontrado"));
            visit.setSupervisor(supervisor);
        }

        if (updateDTO.getWorkPostId() != null) {
            WorkPost workPost = workPostRepository.findById(updateDTO.getWorkPostId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            visit.setWorkPost(workPost);
        }

        if (updateDTO.getClientId() != null) {
            Client client = clientRepository.findById(updateDTO.getClientId())
                    .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));
            visit.setClient(client);
        }

        if (updateDTO.getVisitDate() != null) {
            visit.setVisitDate(updateDTO.getVisitDate());
        }

        if (updateDTO.getVisitTime() != null) {
            visit.setVisitTime(updateDTO.getVisitTime());
        }

        if (updateDTO.getDescription() != null) {
            visit.setDescription(updateDTO.getDescription());
        }

        if (updateDTO.getObservations() != null) {
            visit.setObservations(updateDTO.getObservations());
        }

        if (updateDTO.getStatus() != null) {
            visit.setStatus(updateDTO.getStatus());
        }

        if (updateDTO.getPresentEmployees() != null) {
            visit.setPresentEmployees(updateDTO.getPresentEmployees());
        }

        if (updateDTO.getAttachedFiles() != null) {
            visit.setAttachedFiles(updateDTO.getAttachedFiles());
        }

        if (updateDTO.getPhotos() != null) {
            visit.setPhotos(updateDTO.getPhotos());
        }

        if (updateDTO.getLatitude() != null) {
            visit.setLatitude(updateDTO.getLatitude());
        }

        if (updateDTO.getLongitude() != null) {
            visit.setLongitude(updateDTO.getLongitude());
        }

        if (updateDTO.getLocationAddress() != null) {
            visit.setLocationAddress(updateDTO.getLocationAddress());
        }

        if (updateDTO.getQrCodeScanned() != null) {
            visit.setQrCodeScanned(updateDTO.getQrCodeScanned());
        }

        if (updateDTO.getQrCodeVerified() != null) {
            visit.setQrCodeVerified(updateDTO.getQrCodeVerified());
        }

        visit.setUpdatedBy(updatedBy);

        Visit savedVisit = visitRepository.save(visit);
        log.info("Visita atualizada com sucesso: {}", savedVisit.getId());

        return convertToDTO(savedVisit);
    }

    @Transactional
    public void delete(UUID id) {
        log.info("Excluindo visita: {}", id);
        
        if (!visitRepository.existsById(id)) {
            throw new RuntimeException("Visita não encontrada");
        }

        visitRepository.deleteById(id);
        log.info("Visita excluída com sucesso: {}", id);
    }

    @Transactional
    public String uploadFile(UUID visitId, MultipartFile file) {
        log.info("Fazendo upload de arquivo para visita: {}", visitId);

        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada"));

        String fileName = fileStorageService.storeFile(file, "visits");
        
        List<String> files = visit.getAttachedFiles();
        if (files == null) {
            files = List.of();
        }
        files.add(fileName);
        visit.setAttachedFiles(files);

        visitRepository.save(visit);
        log.info("Arquivo uploadado com sucesso: {}", fileName);

        return fileName;
    }

    @Transactional
    public String uploadPhoto(UUID visitId, MultipartFile photo) {
        log.info("Fazendo upload de foto para visita: {}", visitId);

        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new RuntimeException("Visita não encontrada"));

        String fileName = fileStorageService.storeFile(photo, "visits/photos");
        
        List<String> photos = visit.getPhotos();
        if (photos == null) {
            photos = List.of();
        }
        photos.add(fileName);
        visit.setPhotos(photos);

        visitRepository.save(visit);
        log.info("Foto uploadada com sucesso: {}", fileName);

        return fileName;
    }

    private VisitDTO convertToDTO(Visit visit) {
        try {
            return VisitDTO.builder()
                    .id(visit.getId())
                    .supervisorId(visit.getSupervisor() != null ? visit.getSupervisor().getId() : null)
                    .supervisorName(visit.getSupervisor() != null ? visit.getSupervisor().getName() : "N/A")
                    .workPostId(visit.getWorkPost() != null ? visit.getWorkPost().getId() : null)
                    .workPostName(visit.getWorkPost() != null ? visit.getWorkPost().getName() : "N/A")
                    .clientId(visit.getClient() != null ? visit.getClient().getId() : null)
                    .clientName(visit.getClient() != null ? visit.getClient().getName() : "N/A")
                    .visitDate(visit.getVisitDate())
                    .visitTime(visit.getVisitTime())
                    .description(visit.getDescription())
                    .observations(visit.getObservations())
                    .status(visit.getStatus())
                    .presentEmployees(List.of()) // Temporariamente vazio
                    .attachedFiles(List.of()) // Temporariamente vazio
                    .photos(List.of()) // Temporariamente vazio
                    .latitude(visit.getLatitude())
                    .longitude(visit.getLongitude())
                    .locationAddress(visit.getLocationAddress())
                    .qrCodeScanned(visit.getQrCodeScanned())
                    .qrCodeVerified(visit.getQrCodeVerified())
                    .createdAt(visit.getCreatedAt())
                    .updatedAt(visit.getUpdatedAt())
                    .createdByName(visit.getCreatedBy() != null ? visit.getCreatedBy().getName() : null)
                    .updatedByName(visit.getUpdatedBy() != null ? visit.getUpdatedBy().getName() : null)
                    .build();
        } catch (Exception e) {
            log.error("Erro ao converter visita {} para DTO: {}", visit.getId(), e.getMessage(), e);
            throw new RuntimeException("Erro ao converter visita para DTO", e);
        }
    }

    public List<String> getPresentEmployeeNames(List<UUID> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            return List.of();
        }
        
        return employeeRepository.findAllById(employeeIds)
                .stream()
                .map(Employee::getName)
                .collect(Collectors.toList());
    }
}