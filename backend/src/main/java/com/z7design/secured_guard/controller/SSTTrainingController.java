package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.SSTTrainingDTO;
import com.z7design.secured_guard.dto.CreateSSTTrainingDTO;
import com.z7design.secured_guard.model.SSTTraining;
import com.z7design.secured_guard.model.TrainingParticipation;
import com.z7design.secured_guard.service.SSTTrainingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Controller para gerenciamento de treinamentos SST
 */
@RestController
@RequestMapping("/api/sst/trainings")
@RequiredArgsConstructor
@Tag(name = "SST Treinamentos", description = "API para gerenciamento de treinamentos SST")
public class SSTTrainingController {

    private final SSTTrainingService trainingService;

    // ========== TREINAMENTOS ==========

    @GetMapping
    @Operation(summary = "Listar treinamentos", description = "Retorna todos os treinamentos cadastrados")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTTraining>> getAllTrainings() {
        List<SSTTraining> trainings = trainingService.getAllTrainings();
        return ResponseEntity.ok(trainings);
    }

    @GetMapping("/with-stats")
    @Operation(summary = "Listar treinamentos com estatísticas", description = "Retorna todos os treinamentos com informações agregadas (participantes, certificados vencendo, etc.)")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTTrainingDTO>> getAllTrainingsWithStats() {
        List<SSTTrainingDTO> trainings = trainingService.getAllTrainingsWithStats();
        return ResponseEntity.ok(trainings);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar treinamento por ID", description = "Retorna um treinamento específico")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTTraining> getTrainingById(@PathVariable UUID id) {
        SSTTraining training = trainingService.getTrainingById(id);
        if (training == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(training);
    }

    @GetMapping("/{id}/with-stats")
    @Operation(summary = "Buscar treinamento por ID com estatísticas", description = "Retorna um treinamento específico com informações agregadas")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTTrainingDTO> getTrainingWithStatsById(@PathVariable UUID id) {
        SSTTrainingDTO training = trainingService.getTrainingWithStatsById(id);
        if (training == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(training);
    }

    @GetMapping("/active")
    @Operation(summary = "Listar treinamentos ativos", description = "Retorna todos os treinamentos ativos")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<SSTTraining>> getActiveTrainings() {
        List<SSTTraining> trainings = trainingService.getActiveTrainings();
        return ResponseEntity.ok(trainings);
    }

    @PostMapping
    @Operation(summary = "Criar treinamento", description = "Cria um novo treinamento")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTTraining> createTraining(@RequestBody SSTTraining training) {
        SSTTraining created = trainingService.createTraining(training);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/create")
    @Operation(summary = "Criar treinamento a partir de DTO", description = "Cria um novo treinamento a partir de DTO")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTTraining> createTrainingFromDTO(@RequestBody CreateSSTTrainingDTO dto) {
        SSTTraining created = trainingService.createTrainingFromDTO(dto);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar treinamento", description = "Atualiza um treinamento existente")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTTraining> updateTraining(@PathVariable UUID id, @RequestBody SSTTraining training) {
        SSTTraining updated = trainingService.updateTraining(id, training);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/update")
    @Operation(summary = "Atualizar treinamento a partir de DTO", description = "Atualiza um treinamento existente a partir de DTO")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<SSTTraining> updateTrainingFromDTO(@PathVariable UUID id,
            @RequestBody CreateSSTTrainingDTO dto) {
        SSTTraining existing = trainingService.getTrainingById(id);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setTrainingType(dto.getTrainingType());
        existing.setDurationHours(dto.getDurationHours());
        existing.setValidityMonths(dto.getValidityMonths());
        existing.setIsMandatory(dto.getIsMandatory() != null ? dto.getIsMandatory() : true);
        existing.setProvider(dto.getProvider());
        existing.setIsActive(dto.getIsActive() != null ? dto.getIsActive() : true);
        existing.setRequiredForRisks(dto.getRequiredForRisks());

        SSTTraining updated = trainingService.updateTraining(id, existing);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir treinamento", description = "Exclui um treinamento")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> deleteTraining(@PathVariable UUID id) {
        trainingService.deleteTraining(id);
        return ResponseEntity.noContent().build();
    }

    // ========== PARTICIPAÇÕES EM TREINAMENTOS ==========

    @GetMapping("/participations")
    @Operation(summary = "Listar participações", description = "Retorna todas as participações em treinamentos")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<TrainingParticipation>> getAllParticipations() {
        List<TrainingParticipation> participations = trainingService.getAllParticipations();
        return ResponseEntity.ok(participations);
    }

    @GetMapping("/participations/{id}")
    @Operation(summary = "Buscar participação por ID", description = "Retorna uma participação específica")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<TrainingParticipation> getParticipationById(@PathVariable UUID id) {
        TrainingParticipation participation = trainingService.getParticipationById(id);
        if (participation == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(participation);
    }

    @GetMapping("/participations/employee/{employeeId}")
    @Operation(summary = "Listar participações por funcionário", description = "Retorna participações de um funcionário específico")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<TrainingParticipation>> getParticipationsByEmployee(@PathVariable UUID employeeId) {
        List<TrainingParticipation> participations = trainingService.getParticipationsByEmployee(employeeId);
        return ResponseEntity.ok(participations);
    }

    @GetMapping("/participations/training/{trainingId}")
    @Operation(summary = "Listar participações por treinamento", description = "Retorna participações de um treinamento específico")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<TrainingParticipation>> getParticipationsByTraining(@PathVariable UUID trainingId) {
        List<TrainingParticipation> participations = trainingService.getParticipationsByTraining(trainingId);
        return ResponseEntity.ok(participations);
    }

    @PostMapping("/participations")
    @Operation(summary = "Criar participação", description = "Cria uma nova participação em treinamento")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<TrainingParticipation> createParticipation(@RequestBody TrainingParticipation participation) {
        TrainingParticipation created = trainingService.createParticipation(participation);
        return ResponseEntity.ok(created);
    }

    @PutMapping("/participations/{id}")
    @Operation(summary = "Atualizar participação", description = "Atualiza uma participação existente")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<TrainingParticipation> updateParticipation(@PathVariable UUID id,
            @RequestBody TrainingParticipation participation) {
        TrainingParticipation updated = trainingService.updateParticipation(id, participation);
        if (updated == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/participations/{id}")
    @Operation(summary = "Excluir participação", description = "Exclui uma participação")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<Void> deleteParticipation(@PathVariable UUID id) {
        trainingService.deleteParticipation(id);
        return ResponseEntity.noContent().build();
    }

    // ========== TREINAMENTOS VENCIDOS/PRÓXIMOS DO VENCIMENTO ==========

    @GetMapping("/expired")
    @Operation(summary = "Listar treinamentos vencidos", description = "Retorna treinamentos que estão vencidos")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<TrainingParticipation>> getExpiredTrainings() {
        List<TrainingParticipation> participations = trainingService.getExpiredTrainings();
        return ResponseEntity.ok(participations);
    }

    @GetMapping("/expiring")
    @Operation(summary = "Listar treinamentos próximos do vencimento", description = "Retorna treinamentos que estão próximos do vencimento")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<List<TrainingParticipation>> getExpiringTrainings(
            @RequestParam(value = "daysAhead", defaultValue = "30") int daysAhead) {
        List<TrainingParticipation> participations = trainingService.getExpiringTrainings(daysAhead);
        return ResponseEntity.ok(participations);
    }

    // ========== AGENDAMENTO AUTOMÁTICO ==========

    @PostMapping("/schedule/{trainingId}/employee/{employeeId}")
    @Operation(summary = "Agendar treinamento", description = "Agenda automaticamente um treinamento para um funcionário")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<TrainingParticipation> scheduleTraining(
            @PathVariable UUID trainingId,
            @PathVariable UUID employeeId,
            @RequestParam("scheduledDate") LocalDate scheduledDate) {
        TrainingParticipation participation = trainingService.scheduleTraining(trainingId, employeeId, scheduledDate);
        return ResponseEntity.ok(participation);
    }

    @PostMapping("/complete/{participationId}")
    @Operation(summary = "Completar treinamento", description = "Marca um treinamento como completo")
    @PreAuthorize("hasAnyAuthority('ROLE_RH', 'ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_DEPARTAMENTO_PESSOAL')")
    public ResponseEntity<TrainingParticipation> completeTraining(
            @PathVariable UUID participationId,
            @RequestParam("completionDate") LocalDate completionDate,
            @RequestParam(value = "certificateUrl", required = false) String certificateUrl) {
        TrainingParticipation participation = trainingService.completeTraining(participationId, completionDate,
                certificateUrl);
        return ResponseEntity.ok(participation);
    }
}
