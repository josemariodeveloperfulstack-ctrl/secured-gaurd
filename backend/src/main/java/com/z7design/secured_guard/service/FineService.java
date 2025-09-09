package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.FineDTO;
import com.z7design.secured_guard.dto.FineReportDTO;
import com.z7design.secured_guard.model.Fine;
import com.z7design.secured_guard.model.Vehicle;
import com.z7design.secured_guard.model.Driver;
import com.z7design.secured_guard.repository.FineRepository;
import com.z7design.secured_guard.repository.VehicleRepository;
import com.z7design.secured_guard.repository.DriverRepository;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FineService {
    
    private final FineRepository fineRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverRepository driverRepository;
    private final JasperReportService jasperReportService;
    
    public List<FineDTO> getAllFines() {
        log.info("Buscando todas as multas");
        List<Fine> fines = fineRepository.findAll();
        return fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public FineDTO getFineById(UUID id) {
        log.info("Buscando multa com ID: {}", id);
        Fine fine = fineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Multa não encontrada com ID: " + id));
        return FineDTO.fromEntity(fine);
    }
    
    public List<FineDTO> getFinesByVehicle(UUID vehicleId) {
        log.info("Buscando multas do veículo: {}", vehicleId);
        List<Fine> fines = fineRepository.findByVehicleId(vehicleId);
        return fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public List<FineDTO> getFinesByStatus(Fine.FineStatus status) {
        log.info("Buscando multas com status: {}", status);
        List<Fine> fines = fineRepository.findByStatus(status);
        return fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public List<FineDTO> getFinesByVehicleAndStatus(UUID vehicleId, Fine.FineStatus status) {
        log.info("Buscando multas do veículo {} com status: {}", vehicleId, status);
        List<Fine> fines = fineRepository.findByVehicleIdAndStatus(vehicleId, status);
        return fines.stream()
                .map(FineDTO::fromEntity)
                .collect(Collectors.toList());
    }
    
    public FineDTO createFine(FineDTO fineDTO) {
        log.info("Criando nova multa para veículo: {}", fineDTO.getVehicleId());
        
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
        log.info("Multa criada com sucesso: {}", savedFine.getId());
        return FineDTO.fromEntity(savedFine);
    }
    
    public FineDTO updateFine(UUID id, FineDTO fineDTO) {
        log.info("Atualizando multa: {}", id);
        
        Fine fine = fineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Multa não encontrada com ID: " + id));
        
        // Atualizar veículo se fornecido
        if (fineDTO.getVehicleId() != null) {
            Vehicle vehicle = vehicleRepository.findById(fineDTO.getVehicleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Veículo não encontrado"));
            fine.setVehicle(vehicle);
        }
        
        // Atualizar motorista se fornecido
        if (fineDTO.getDriverId() != null) {
            Driver driver = driverRepository.findById(fineDTO.getDriverId())
                    .orElseThrow(() -> new ResourceNotFoundException("Motorista não encontrado"));
            fine.setDriver(driver);
        } else if (fineDTO.getDriverId() == null) {
            fine.setDriver(null);
        }
        
        fine.setDate(fineDTO.getDate());
        fine.setDescription(fineDTO.getDescription());
        fine.setAmount(fineDTO.getAmount());
        fine.setLocation(fineDTO.getLocation());
        fine.setStatus(fineDTO.getStatus());
        fine.setDueDate(fineDTO.getDueDate());
        fine.setPaymentDate(fineDTO.getPaymentDate());
        
        Fine savedFine = fineRepository.save(fine);
        log.info("Multa atualizada com sucesso: {}", savedFine.getId());
        return FineDTO.fromEntity(savedFine);
    }
    
    public void deleteFine(UUID id) {
        log.info("Deletando multa: {}", id);
        
        if (!fineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Multa não encontrada com ID: " + id);
        }
        
        fineRepository.deleteById(id);
        log.info("Multa deletada com sucesso: {}", id);
    }
    
    // ===== RELATÓRIOS =====
    
    public List<FineReportDTO> getFinesForReport(LocalDate startDate, 
                                                LocalDate endDate, 
                                                String vehicleFilter, 
                                                String driverFilter, 
                                                String statusFilter,
                                                BigDecimal amountMin,
                                                BigDecimal amountMax,
                                                List<String> selectedIds) {
        log.info("Buscando multas para relatório - Período: {} a {}, Veículo: {}, Motorista: {}, Status: {}, Valor: {} a {}, IDs: {}", 
                startDate, endDate, vehicleFilter, driverFilter, statusFilter, amountMin, amountMax, selectedIds);
        
        List<Fine> fines = fineRepository.findAll();
        log.info("Encontradas {} multas no banco de dados", fines.size());
        
        // Aplicar filtros
        List<FineReportDTO> result = fines.stream()
                .filter(fine -> startDate == null || !fine.getDate().isBefore(startDate))
                .filter(fine -> endDate == null || !fine.getDate().isAfter(endDate))
                .filter(fine -> vehicleFilter == null || vehicleFilter.isEmpty() || 
                        fine.getVehicle().getPlate().toLowerCase().contains(vehicleFilter.toLowerCase()))
                .filter(fine -> driverFilter == null || driverFilter.isEmpty() || 
                        (fine.getDriver() != null && fine.getDriver().getName().toLowerCase().contains(driverFilter.toLowerCase())))
                .filter(fine -> statusFilter == null || statusFilter.isEmpty() || statusFilter.equals("ALL") || 
                        fine.getStatus().toString().equals(statusFilter))
                .filter(fine -> amountMin == null || fine.getAmount().compareTo(amountMin) >= 0)
                .filter(fine -> amountMax == null || fine.getAmount().compareTo(amountMax) <= 0)
                .filter(fine -> selectedIds == null || selectedIds.isEmpty() || 
                        selectedIds.contains(fine.getId().toString()))
                .map(this::convertToReportDTO)
                .collect(Collectors.toList());
        
        log.info("Convertidas {} multas para DTO de relatório", result.size());
        return result;
    }
    
    public byte[] generateFineReportPDF(LocalDate startDate, 
                                       LocalDate endDate, 
                                       String vehicleFilter, 
                                       String driverFilter, 
                                       String statusFilter,
                                       BigDecimal amountMin,
                                       BigDecimal amountMax,
                                       List<String> selectedIds) throws Exception {
        log.info("Gerando relatório PDF de multas");
        
        List<FineReportDTO> fines = getFinesForReport(startDate, endDate, vehicleFilter, driverFilter, statusFilter, amountMin, amountMax, selectedIds);
        return jasperReportService.generateFineReportPDF(fines, startDate, endDate, vehicleFilter, driverFilter, statusFilter);
    }
    
    public byte[] generateFineReportExcel(LocalDate startDate, 
                                         LocalDate endDate, 
                                         String vehicleFilter, 
                                         String driverFilter, 
                                         String statusFilter,
                                         BigDecimal amountMin,
                                         BigDecimal amountMax,
                                         List<String> selectedIds) throws Exception {
        log.info("Gerando relatório Excel de multas");
        
        List<FineReportDTO> fines = getFinesForReport(startDate, endDate, vehicleFilter, driverFilter, statusFilter, amountMin, amountMax, selectedIds);
        return jasperReportService.generateFineReportExcel(fines, startDate, endDate, vehicleFilter, driverFilter, statusFilter);
    }
    
    private FineReportDTO convertToReportDTO(Fine fine) {
        return FineReportDTO.fromEntity(fine);
    }
    
}
