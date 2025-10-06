package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.LocationDTO;
import com.z7design.secured_guard.model.Location;
import com.z7design.secured_guard.repository.LocationRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {
    
    private final LocationRepository locationRepository;
    private final UnitRepository unitRepository;
    
    @Transactional(readOnly = true)
    public List<LocationDTO> getAllLocations() {
        log.debug("Buscando todas as localizações");
        try {
            List<Location> locations = locationRepository.findAll();
            log.debug("Encontradas {} localizações", locations.size());
            return locations.stream()
                    .map(LocationDTO::fromEntity)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar localizações: ", e);
            throw new RuntimeException("Erro ao buscar localizações: " + e.getMessage(), e);
        }
    }
    
    @Transactional(readOnly = true)
    public LocationDTO getLocationById(UUID id) {
        log.debug("Buscando localização por ID: {}", id);
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Localização não encontrada com ID: " + id));
        return LocationDTO.fromEntity(location);
    }
    
    @Transactional(readOnly = true)
    public List<LocationDTO> getLocationsByUnitId(UUID unitId) {
        log.debug("Buscando localizações por unidade ID: {}", unitId);
        try {
            List<Location> locations = locationRepository.findByUnitId(unitId);
            log.debug("Encontradas {} localizações para a unidade {}", locations.size(), unitId);
            return locations.stream()
                    .map(LocationDTO::fromEntity)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar localizações por unidade: ", e);
            throw new RuntimeException("Erro ao buscar localizações por unidade: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    public LocationDTO createLocation(LocationDTO locationDTO) {
        log.debug("Criando nova localização: {}", locationDTO.getName());
        try {
            // Validar se a unidade existe
            if (locationDTO.getUnit() != null && locationDTO.getUnit().getId() != null) {
                unitRepository.findById(locationDTO.getUnit().getId())
                        .orElseThrow(() -> new RuntimeException("Unidade não encontrada com ID: " + locationDTO.getUnit().getId()));
            }
            
            Location location = locationDTO.toEntity();
            Location savedLocation = locationRepository.save(location);
            log.debug("Localização criada com sucesso: {}", savedLocation.getId());
            return LocationDTO.fromEntity(savedLocation);
        } catch (Exception e) {
            log.error("Erro ao criar localização: ", e);
            throw new RuntimeException("Erro ao criar localização: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    public LocationDTO updateLocation(UUID id, LocationDTO locationDTO) {
        log.debug("Atualizando localização ID: {}", id);
        try {
            Location existingLocation = locationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Localização não encontrada com ID: " + id));
            
            // Validar se a unidade existe
            if (locationDTO.getUnit() != null && locationDTO.getUnit().getId() != null) {
                unitRepository.findById(locationDTO.getUnit().getId())
                        .orElseThrow(() -> new RuntimeException("Unidade não encontrada com ID: " + locationDTO.getUnit().getId()));
            }
            
            // Atualizar campos
            existingLocation.setName(locationDTO.getName());
            existingLocation.setDescription(locationDTO.getDescription());
            existingLocation.setAddress(locationDTO.getAddress());
            if (locationDTO.getUnit() != null) {
                existingLocation.setUnit(locationDTO.getUnit().toEntity());
            }
            
            Location savedLocation = locationRepository.save(existingLocation);
            log.debug("Localização atualizada com sucesso: {}", savedLocation.getId());
            return LocationDTO.fromEntity(savedLocation);
        } catch (Exception e) {
            log.error("Erro ao atualizar localização: ", e);
            throw new RuntimeException("Erro ao atualizar localização: " + e.getMessage(), e);
        }
    }
    
    @Transactional
    public void deleteLocation(UUID id) {
        log.debug("Excluindo localização ID: {}", id);
        try {
            Location location = locationRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Localização não encontrada com ID: " + id));
            
            locationRepository.delete(location);
            log.debug("Localização excluída com sucesso: {}", id);
        } catch (Exception e) {
            log.error("Erro ao excluir localização: ", e);
            throw new RuntimeException("Erro ao excluir localização: " + e.getMessage(), e);
        }
    }
}
