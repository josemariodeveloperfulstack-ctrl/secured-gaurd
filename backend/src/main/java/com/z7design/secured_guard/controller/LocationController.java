package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.LocationDTO;
import com.z7design.secured_guard.service.LocationService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Localizações", description = "API para gerenciamento de localizações")
public class LocationController {
    
    private final LocationService locationService;
    
    @GetMapping
    @Operation(summary = "Listar todas as localizações", description = "Retorna uma lista de todas as localizações")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Localizações listadas com sucesso"),
            @ApiResponse(responseCode = "403", description = "Acesso negado"),
            @ApiResponse(responseCode = "500", description = "Erro interno do servidor")
    })
    public ResponseEntity<List<LocationDTO>> getAllLocations() {
        log.debug("Buscando todas as localizações");
        try {
            List<LocationDTO> locations = locationService.getAllLocations();
            log.debug("Retornando {} localizações", locations.size());
            return ResponseEntity.ok(locations);
        } catch (Exception e) {
            log.error("Erro ao buscar localizações: ", e);
            throw new RuntimeException("Erro interno do servidor. Tente novamente mais tarde.");
        }
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Buscar localização por ID", description = "Retorna uma localização específica pelo ID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Localização encontrada"),
            @ApiResponse(responseCode = "404", description = "Localização não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<LocationDTO> getLocationById(@PathVariable UUID id) {
        log.debug("Buscando localização por ID: {}", id);
        LocationDTO location = locationService.getLocationById(id);
        return ResponseEntity.ok(location);
    }
    
    @GetMapping("/unit/{unitId}")
    @Operation(summary = "Buscar localizações por unidade", description = "Retorna localizações de uma unidade específica")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Localizações encontradas"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<List<LocationDTO>> getLocationsByUnitId(@PathVariable UUID unitId) {
        log.debug("Buscando localizações por unidade ID: {}", unitId);
        List<LocationDTO> locations = locationService.getLocationsByUnitId(unitId);
        return ResponseEntity.ok(locations);
    }
    
    @PostMapping
    @PreAuthorize("hasAnyAuthority('HR_WRITE', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Criar nova localização", description = "Cria uma nova localização no sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Localização criada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<LocationDTO> createLocation(@Valid @RequestBody LocationDTO locationDTO) {
        log.debug("Criando nova localização: {}", locationDTO.getName());
        LocationDTO createdLocation = locationService.createLocation(locationDTO);
        return ResponseEntity.status(201).body(createdLocation);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_WRITE', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Atualizar localização", description = "Atualiza os dados de uma localização existente")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Localização atualizada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos"),
            @ApiResponse(responseCode = "404", description = "Localização não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<LocationDTO> updateLocation(@PathVariable UUID id, @Valid @RequestBody LocationDTO locationDTO) {
        log.debug("Atualizando localização ID: {}", id);
        LocationDTO updatedLocation = locationService.updateLocation(id, locationDTO);
        return ResponseEntity.ok(updatedLocation);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('HR_WRITE', 'ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Excluir localização", description = "Exclui uma localização do sistema")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Localização excluída com sucesso"),
            @ApiResponse(responseCode = "404", description = "Localização não encontrada"),
            @ApiResponse(responseCode = "403", description = "Acesso negado")
    })
    public ResponseEntity<Void> deleteLocation(@PathVariable UUID id) {
        log.debug("Excluindo localização ID: {}", id);
        locationService.deleteLocation(id);
        return ResponseEntity.noContent().build();
    }
}
