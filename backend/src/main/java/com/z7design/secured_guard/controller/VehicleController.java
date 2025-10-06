package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.VehicleDTO;
import com.z7design.secured_guard.model.Vehicle;
import com.z7design.secured_guard.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Veículos", description = "API para gerenciamento de veículos da frota")
public class VehicleController {
    
    private final VehicleService vehicleService;
    
    @GetMapping
    @Operation(summary = "Listar todos os veículos", description = "Retorna uma lista de todos os veículos")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Veículos listados com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<List<VehicleDTO>> getAllVehicles() {
        log.debug("Buscando todos os veículos");
        try {
            List<VehicleDTO> vehicles = vehicleService.getAllVehicles();
            log.debug("Retornando {} veículos", vehicles.size());
            return ResponseEntity.ok(vehicles);
        } catch (Exception e) {
            log.error("Erro ao buscar veículos: ", e);
            throw new RuntimeException("Erro interno do servidor. Tente novamente mais tarde.");
        }
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar veículo por ID", description = "Retorna um veículo específico pelo ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Veículo encontrado"),
            @ApiResponse(responseCode = "404", description = "Veículo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<VehicleDTO> getVehicleById(@PathVariable UUID id) {
        log.debug("Buscando veículo por ID: {}", id);
        VehicleDTO vehicle = vehicleService.getVehicleById(id);
        return ResponseEntity.ok(vehicle);
    }
    
    @GetMapping("/plate/{plate}")
    @Operation(summary = "Buscar veículo por placa", description = "Retorna um veículo específico pela placa")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Veículo encontrado"),
            @ApiResponse(responseCode = "404", description = "Veículo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<VehicleDTO> getVehicleByPlate(@PathVariable String plate) {
        log.debug("Buscando veículo por placa: {}", plate);
        Optional<VehicleDTO> vehicle = vehicleService.getVehicleByPlate(plate);
        if (vehicle.isPresent()) {
            return ResponseEntity.ok(vehicle.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Buscar veículos por status", description = "Retorna veículos filtrados por status")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Veículos encontrados"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<VehicleDTO>> getVehiclesByStatus(@PathVariable Vehicle.VehicleStatus status) {
        log.debug("Buscando veículos por status: {}", status);
        List<VehicleDTO> vehicles = vehicleService.getVehiclesByStatus(status);
        return ResponseEntity.ok(vehicles);
    }
    
    @GetMapping("/search")
    @Operation(summary = "Buscar veículos", description = "Busca veículos por placa, modelo ou marca")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Veículos encontrados"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<VehicleDTO>> searchVehicles(@RequestParam String searchTerm) {
        log.debug("Buscando veículos com termo: {}", searchTerm);
        List<VehicleDTO> vehicles = vehicleService.searchVehicles(searchTerm);
        return ResponseEntity.ok(vehicles);
    }
    
    @PostMapping
    @PreAuthorize("hasAnyAuthority('FLEET_WRITE', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Criar novo veículo", description = "Cria um novo veículo na frota")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Veículo criado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<VehicleDTO> createVehicle(@Valid @RequestBody VehicleDTO vehicleDTO) {
        log.debug("Criando novo veículo: {}", vehicleDTO.getPlate());
        VehicleDTO createdVehicle = vehicleService.createVehicle(vehicleDTO);
        return ResponseEntity.status(201).body(createdVehicle);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('FLEET_WRITE', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Atualizar veículo", description = "Atualiza os dados de um veículo existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Veículo atualizado com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Veículo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<VehicleDTO> updateVehicle(@PathVariable UUID id, @Valid @RequestBody VehicleDTO vehicleDTO) {
        log.debug("Atualizando veículo ID: {}", id);
        VehicleDTO updatedVehicle = vehicleService.updateVehicle(id, vehicleDTO);
        return ResponseEntity.ok(updatedVehicle);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('FLEET_WRITE', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Excluir veículo", description = "Exclui um veículo da frota")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Veículo excluído com sucesso"),
            @ApiResponse(responseCode = "404", description = "Veículo não encontrado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> deleteVehicle(@PathVariable UUID id) {
        log.debug("Excluindo veículo ID: {}", id);
        vehicleService.deleteVehicle(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/count")
    @Operation(summary = "Contar veículos", description = "Retorna o número total de veículos")
    public ResponseEntity<Object> getCount() {
        try {
            log.debug("Contando veículos");
            long count = vehicleService.count();
            log.debug("Total de veículos: {}", count);
            return ResponseEntity.ok(java.util.Map.of("count", count, "message", "Contagem realizada com sucesso"));
        } catch (Exception e) {
            log.error("Erro ao contar veículos: ", e);
            return ResponseEntity.status(500).body(java.util.Map.of("error", e.getMessage()));
        }
    }
}
