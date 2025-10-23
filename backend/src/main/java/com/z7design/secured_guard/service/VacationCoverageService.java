package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.VacationCoverage;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.repository.VacationCoverageRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.Optional;

@Service
@Transactional
public class VacationCoverageService {

    @Autowired
    private VacationCoverageRepository vacationCoverageRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private WorkPostRepository workPostRepository;

    public List<VacationCoverage> getAllVacationCoverages() {
        return vacationCoverageRepository.findAll();
    }

    public Optional<VacationCoverage> getVacationCoverageById(UUID id) {
        return vacationCoverageRepository.findById(id);
    }

    public List<VacationCoverage> getVacationCoveragesByEmployee(UUID employeeId) {
        // Busca por employee via entidade Vacation (employee em Vacation)
        return vacationCoverageRepository.findByVacationEmployeeId(employeeId);
    }

    public List<VacationCoverage> getVacationCoveragesBySubstitute(UUID substituteEmployeeId) {
        return vacationCoverageRepository.findBySubstituteEmployeeId(substituteEmployeeId);
    }

    public List<VacationCoverage> getVacationCoveragesByStatus(VacationCoverage.CoverageStatus status) {
        return vacationCoverageRepository.findByStatus(status);
    }

    public List<VacationCoverage> getVacationCoveragesByDateRange(LocalDate startDate, LocalDate endDate) {
        return vacationCoverageRepository.findByDateRange(startDate, endDate);
    }

    public VacationCoverage createVacationCoverage(VacationCoverage vacationCoverage) {
        // Validar se o funcionário existe
        // Employee está em Vacation
        Employee employee = employeeRepository.findById(vacationCoverage.getVacation().getEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Funcionário não encontrado"));

        // Validar se o substituto existe (se fornecido)
        if (vacationCoverage.getSubstituteEmployee() != null) {
            Employee substitute = employeeRepository.findById(vacationCoverage.getSubstituteEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário substituto não encontrado"));
            vacationCoverage.setSubstituteEmployee(substitute);
        }

        // Validar se o local existe (se fornecido)
        if (vacationCoverage.getLocation() != null) {
            WorkPost location = workPostRepository.findById(vacationCoverage.getLocation().getId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            vacationCoverage.setLocation(location);
        }

        // garantir coerência do vacation vinculado ao employee
        vacationCoverage.getVacation().setEmployee(employee);
        vacationCoverage.setCreatedAt(java.time.LocalDateTime.now());
        vacationCoverage.setUpdatedAt(java.time.LocalDateTime.now());

        return vacationCoverageRepository.save(vacationCoverage);
    }

    public VacationCoverage updateVacationCoverage(UUID id, VacationCoverage updatedVacationCoverage) {
        VacationCoverage existingCoverage = vacationCoverageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cobertura de férias não encontrada"));

        // Atualizar campos permitidos
        existingCoverage.setCoverageStartDate(updatedVacationCoverage.getCoverageStartDate());
        existingCoverage.setCoverageEndDate(updatedVacationCoverage.getCoverageEndDate());
        existingCoverage.setStatus(updatedVacationCoverage.getStatus());
        existingCoverage.setShift(updatedVacationCoverage.getShift());
        existingCoverage.setObservations(updatedVacationCoverage.getObservations());
        existingCoverage.setUpdatedAt(java.time.LocalDateTime.now());

        // Validar e atualizar substituto se fornecido
        if (updatedVacationCoverage.getSubstituteEmployee() != null) {
            Employee substitute = employeeRepository.findById(updatedVacationCoverage.getSubstituteEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Funcionário substituto não encontrado"));
            existingCoverage.setSubstituteEmployee(substitute);
        }

        // Validar e atualizar local se fornecido
        if (updatedVacationCoverage.getLocation() != null) {
            WorkPost location = workPostRepository.findById(updatedVacationCoverage.getLocation().getId())
                    .orElseThrow(() -> new RuntimeException("Posto de trabalho não encontrado"));
            existingCoverage.setLocation(location);
        }

        return vacationCoverageRepository.save(existingCoverage);
    }

    public void deleteVacationCoverage(UUID id) {
        if (!vacationCoverageRepository.existsById(id)) {
            throw new RuntimeException("Cobertura de férias não encontrada");
        }
        vacationCoverageRepository.deleteById(id);
    }

    public VacationCoverage updateStatus(UUID id, VacationCoverage.CoverageStatus status) {
        VacationCoverage coverage = vacationCoverageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cobertura de férias não encontrada"));
        
        coverage.setStatus(status);
        coverage.setUpdatedAt(java.time.LocalDateTime.now());
        
        return vacationCoverageRepository.save(coverage);
    }

    public List<VacationCoverage> getVacationCoveragesNeedingAttention() {
        LocalDate today = LocalDate.now();
        LocalDate nextWeek = today.plusWeeks(1);
        
        return vacationCoverageRepository.findByDateRange(today, nextWeek).stream()
                .filter(coverage -> coverage.getStatus() == VacationCoverage.CoverageStatus.PENDING ||
                                  coverage.getStatus() == VacationCoverage.CoverageStatus.NO_COVERAGE)
                .toList();
    }
}
