package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.FineDTO;
import com.z7design.secured_guard.model.Fine;
import com.z7design.secured_guard.model.Vehicle;
import com.z7design.secured_guard.model.Driver;
import com.z7design.secured_guard.repository.FineRepository;
import com.z7design.secured_guard.repository.VehicleRepository;
import com.z7design.secured_guard.repository.DriverRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/fines")
@RequiredArgsConstructor
public class FineController {
    
    private final FineRepository fineRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    
    @GetMapping
    public ResponseEntity<List<FineDTO>> getAllFines() {
        List<Fine> fines = fineRepository.findAll();
        List<FineDTO> fineDTOs = fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(fineDTOs);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<FineDTO> getFineById(@PathVariable UUID id) {
        Fine fine = fineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Multa não encontrada com ID: " + id));
        return ResponseEntity.ok(FineDTO.fromEntity(fine));
    }
    
    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<List<FineDTO>> getFinesByVehicle(@PathVariable UUID vehicleId) {
        List<Fine> fines = fineRepository.findByVehicleId(vehicleId);
        List<FineDTO> fineDTOs = fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(fineDTOs);
    }
    
    @GetMapping("/status/{status}")
    public ResponseEntity<List<FineDTO>> getFinesByStatus(@PathVariable Fine.FineStatus status) {
        List<Fine> fines = fineRepository.findByStatus(status);
        List<FineDTO> fineDTOs = fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(fineDTOs);
    }
    
    @GetMapping("/vehicle/{vehicleId}/status/{status}")
    public ResponseEntity<List<FineDTO>> getFinesByVehicleAndStatus(
            @PathVariable UUID vehicleId,
            @PathVariable Fine.FineStatus status) {
        List<Fine> fines = fineRepository.findByVehicleIdAndStatus(vehicleId, status);
        List<FineDTO> fineDTOs = fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(fineDTOs);
    }
    
    @PostMapping
    public ResponseEntity<FineDTO> createFine(@Valid @RequestBody FineDTO fineDTO) {
        Vehicle vehicle = vehicleRepository.findById(fineDTO.getVehicleId())
                .orElseThrow(() -> new ResourceNotFoundException("Veículo não encontrado"));
        
        Fine fine = new Fine();
        fine.setVehicle(vehicle);
        
        // Definir motorista se fornecido
        if (fineDTO.getDriverId() != null) {
            Driver driver = driverRepository.findById(fineDTO.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Motorista não encontrado"));
            fine.setDriver(driver);
        }
        
        fine.setDate(fineDTO.getDate());
        fine.setDescription(fineDTO.getDescription());
        fine.setAmount(fineDTO.getAmount());
        fine.setLocation(fineDTO.getLocation());
        fine.setStatus(fineDTO.getStatus());
        fine.setDueDate(fineDTO.getDueDate());
        fine.setPaymentDate(fineDTO.getPaymentDate());
        
        Fine savedFine = fineRepository.save(fine);
        return ResponseEntity.ok(FineDTO.fromEntity(savedFine));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<FineDTO> updateFine(@PathVariable UUID id, @Valid @RequestBody FineDTO fineDTO) {
        Fine fine = fineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Multa não encontrada com ID: " + id));
        
        // Atualizar veículo se necessário
        if (fineDTO.getVehicleId() != null && !fineDTO.getVehicleId().equals(fine.getVehicle().getId())) {
            Vehicle vehicle = vehicleRepository.findById(fineDTO.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Veículo não encontrado"));
            fine.setVehicle(vehicle);
        }
        
        // Atualizar motorista se fornecido
        if (fineDTO.getDriverId() != null) {
            Driver driver = driverRepository.findById(fineDTO.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Motorista não encontrado"));
            fine.setDriver(driver);
        } else {
            fine.setDriver(null); // Remover motorista se não fornecido
        }
        
        fine.setDate(fineDTO.getDate());
        fine.setDescription(fineDTO.getDescription());
        fine.setAmount(fineDTO.getAmount());
        fine.setLocation(fineDTO.getLocation());
        fine.setStatus(fineDTO.getStatus());
        fine.setDueDate(fineDTO.getDueDate());
        fine.setPaymentDate(fineDTO.getPaymentDate());
        
        Fine updatedFine = fineRepository.save(fine);
        return ResponseEntity.ok(FineDTO.fromEntity(updatedFine));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFine(@PathVariable UUID id) {
        if (!fineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Multa não encontrada com ID: " + id);
        }
        fineRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/drivers")
    public ResponseEntity<List<Driver>> getDrivers() {
        List<Driver> drivers = driverRepository.findAll();
        return ResponseEntity.ok(drivers);
    }
} 