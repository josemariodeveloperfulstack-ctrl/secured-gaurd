package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.FineDTO;
import com.z7design.secured_guard.model.Fine;
import com.z7design.secured_guard.model.Vehicle;
import com.z7design.secured_guard.repository.FineRepository;
import com.z7design.secured_guard.repository.VehicleRepository;
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
    public ResponseEntity<FineDTO> createFine(@Valid @RequestBody Fine fine) {
        Vehicle vehicle = vehicleRepository.findById(fine.getVehicle().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Veículo não encontrado"));
        fine.setVehicle(vehicle);
        
        Fine savedFine = fineRepository.save(fine);
        return ResponseEntity.ok(FineDTO.fromEntity(savedFine));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<FineDTO> updateFine(@PathVariable UUID id, @Valid @RequestBody Fine fineDetails) {
        Fine fine = fineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Multa não encontrada com ID: " + id));
        
        fine.setDate(fineDetails.getDate());
        fine.setDescription(fineDetails.getDescription());
        fine.setAmount(fineDetails.getAmount());
        fine.setLocation(fineDetails.getLocation());
        fine.setStatus(fineDetails.getStatus());
        fine.setDueDate(fineDetails.getDueDate());
        fine.setPaymentDate(fineDetails.getPaymentDate());
        
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
} 