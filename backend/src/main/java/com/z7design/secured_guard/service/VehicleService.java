package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.VehicleDTO;
import com.z7design.secured_guard.model.Vehicle;
import com.z7design.secured_guard.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleService {
    
    private final VehicleRepository vehicleRepository;
    
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicles", key = "'all'")
    public List<VehicleDTO> getAllVehicles() {
        log.debug("Buscando todos os veículos");
        try {
            List<Vehicle> vehicles = vehicleRepository.findAll();
            log.debug("Encontrados {} veículos", vehicles.size());
            return vehicles.stream()
                    .map(VehicleDTO::fromEntity)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar veículos: ", e);
            throw new RuntimeException("Erro ao buscar veículos: " + e.getMessage(), e);
        }
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicles", key = "#id")
    public VehicleDTO getVehicleById(UUID id) {
        log.debug("Buscando veículo por ID: {}", id);
        Vehicle vehicle = vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Veículo não encontrado com ID: " + id));
        return VehicleDTO.fromEntity(vehicle);
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicles", key = "#plate")
    public Optional<VehicleDTO> getVehicleByPlate(String plate) {
        log.debug("Buscando veículo por placa: {}", plate);
        Optional<Vehicle> vehicle = vehicleRepository.findByPlate(plate);
        return vehicle.map(VehicleDTO::fromEntity);
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicles-by-status", key = "#status")
    public List<VehicleDTO> getVehiclesByStatus(Vehicle.VehicleStatus status) {
        log.debug("Buscando veículos por status: {}", status);
        try {
            List<Vehicle> vehicles = vehicleRepository.findByStatus(status);
            log.debug("Encontrados {} veículos com status {}", vehicles.size(), status);
            return vehicles.stream()
                    .map(VehicleDTO::fromEntity)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar veículos por status: ", e);
            throw new RuntimeException("Erro ao buscar veículos por status: " + e.getMessage(), e);
        }
    }
    
    @Transactional(readOnly = true)
    @Cacheable(value = "vehicles", key = "'search-' + #searchTerm")
    public List<VehicleDTO> searchVehicles(String searchTerm) {
        log.debug("Buscando veículos com termo: {}", searchTerm);
        try {
            List<Vehicle> vehicles = vehicleRepository.findBySearchTerm(searchTerm);
            log.debug("Encontrados {} veículos para o termo '{}'", vehicles.size(), searchTerm);
            return vehicles.stream()
                    .map(VehicleDTO::fromEntity)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar veículos: ", e);
            throw new RuntimeException("Erro ao buscar veículos: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    @CacheEvict(value = { "vehicles", "vehicles-by-status" }, allEntries = true)
    public VehicleDTO createVehicle(VehicleDTO vehicleDTO) {
        log.debug("Criando novo veículo: {}", vehicleDTO.getPlate());
        try {
            // Validar se a placa já existe
            if (vehicleRepository.existsByPlate(vehicleDTO.getPlate())) {
                throw new RuntimeException("Já existe um veículo com a placa: " + vehicleDTO.getPlate());
            }
            
            Vehicle vehicle = vehicleDTO.toEntity();
            Vehicle savedVehicle = vehicleRepository.save(vehicle);
            log.debug("Veículo criado com sucesso: {}", savedVehicle.getId());
            return VehicleDTO.fromEntity(savedVehicle);
        } catch (Exception e) {
            log.error("Erro ao criar veículo: ", e);
            throw new RuntimeException("Erro ao criar veículo: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    @CacheEvict(value = { "vehicles", "vehicles-by-status" }, allEntries = true)
    public VehicleDTO updateVehicle(UUID id, VehicleDTO vehicleDTO) {
        log.debug("Atualizando veículo ID: {}", id);
        try {
            Vehicle existingVehicle = vehicleRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Veículo não encontrado com ID: " + id));
            
            // Validar se a placa já existe em outro veículo
            if (!existingVehicle.getPlate().equals(vehicleDTO.getPlate()) && 
                vehicleRepository.existsByPlate(vehicleDTO.getPlate())) {
                throw new RuntimeException("Já existe um veículo com a placa: " + vehicleDTO.getPlate());
            }
            
            // Atualizar campos
            existingVehicle.setPlate(vehicleDTO.getPlate());
            existingVehicle.setModel(vehicleDTO.getModel());
            existingVehicle.setBrand(vehicleDTO.getBrand());
            existingVehicle.setYear(vehicleDTO.getYear());
            existingVehicle.setColor(vehicleDTO.getColor());
            existingVehicle.setStatus(vehicleDTO.getStatus());
            existingVehicle.setFuelType(vehicleDTO.getFuelType());
            existingVehicle.setCapacity(vehicleDTO.getCapacity());
            existingVehicle.setCurrentMileage(vehicleDTO.getCurrentMileage());
            existingVehicle.setInitialMileage(vehicleDTO.getInitialMileage());
            existingVehicle.setAssignedDriver(vehicleDTO.getAssignedDriver());
            existingVehicle.setResponsibleEmployeeId(vehicleDTO.getResponsibleEmployeeId());
            existingVehicle.setDepartment(vehicleDTO.getDepartment());
            existingVehicle.setLocation(vehicleDTO.getLocation());
            existingVehicle.setAcquisitionDate(vehicleDTO.getAcquisitionDate());
            existingVehicle.setAcquisitionValue(vehicleDTO.getAcquisitionValue());
            existingVehicle.setAverageConsumption(vehicleDTO.getAverageConsumption());
            existingVehicle.setAverageCostPerKm(vehicleDTO.getAverageCostPerKm());
            existingVehicle.setLastMaintenanceDate(vehicleDTO.getLastMaintenanceDate());
            existingVehicle.setNextMaintenanceDate(vehicleDTO.getNextMaintenanceDate());
            existingVehicle.setInsuranceExpiryDate(vehicleDTO.getInsuranceExpiryDate());
            existingVehicle.setDocumentationExpiryDate(vehicleDTO.getDocumentationExpiryDate());
            existingVehicle.setNotes(vehicleDTO.getNotes());
            existingVehicle.setPhotos(vehicleDTO.getPhotos());
            
            Vehicle savedVehicle = vehicleRepository.save(existingVehicle);
            log.debug("Veículo atualizado com sucesso: {}", savedVehicle.getId());
            return VehicleDTO.fromEntity(savedVehicle);
        } catch (Exception e) {
            log.error("Erro ao atualizar veículo: ", e);
            throw new RuntimeException("Erro ao atualizar veículo: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    @CacheEvict(value = { "vehicles", "vehicles-by-status" }, allEntries = true)
    public void deleteVehicle(UUID id) {
        log.debug("Excluindo veículo ID: {}", id);
        try {
            Vehicle vehicle = vehicleRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Veículo não encontrado com ID: " + id));
            
            vehicleRepository.delete(vehicle);
            log.debug("Veículo excluído com sucesso: {}", id);
        } catch (Exception e) {
            log.error("Erro ao excluir veículo: ", e);
            throw new RuntimeException("Erro ao excluir veículo: " + e.getMessage(), e);
        }
    }
    
    @Transactional(readOnly = true)
    public long count() {
        return vehicleRepository.count();
    }
}
