package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ScheduleDTO;
import com.z7design.secured_guard.dto.EmployeeScheduleDTO;
import com.z7design.secured_guard.dto.CreateScheduleDTO;
import com.z7design.secured_guard.model.Schedule;
import com.z7design.secured_guard.model.EmployeeSchedule;
import com.z7design.secured_guard.model.Location;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.WorkPost;
import com.z7design.secured_guard.model.Position;
import com.z7design.secured_guard.model.Route;
import com.z7design.secured_guard.model.Patrol;
import com.z7design.secured_guard.repository.ScheduleRepository;
import com.z7design.secured_guard.repository.EmployeeScheduleRepository;
import com.z7design.secured_guard.repository.LocationRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.PositionRepository;
import com.z7design.secured_guard.repository.RouteRepository;
import com.z7design.secured_guard.repository.PatrolRepository;
import com.z7design.secured_guard.repository.UnitRepository;
import com.z7design.secured_guard.model.Unit;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final EmployeeScheduleRepository employeeScheduleRepository;
    private final LocationRepository locationRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkPostRepository workPostRepository;
    private final PositionRepository positionRepository;
    private final RouteRepository routeRepository;
    private final PatrolRepository patrolRepository;
    private final UnitRepository unitRepository;

    @Transactional
    public Schedule create(Schedule schedule) {
        return scheduleRepository.save(schedule);
    }

    @Transactional
    public Schedule createFromDTO(CreateScheduleDTO dto) {
        try {
            // Buscar Employee
            Employee employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(() -> new EntityNotFoundException("Employee not found with ID: " + dto.getEmployeeId()));
            
            Location location = null;
            WorkPost workPost = null;
            
            // Estratégia 0: Tentar buscar WorkPost pelo workPostId fornecido
            if (dto.getWorkPostId() != null) {
                workPost = workPostRepository.findById(dto.getWorkPostId()).orElse(null);
            }
            
            // Estratégia 0.5: Se locationId foi fornecido mas não é uma Location válida,
            // tentar usar como workPostId (o frontend pode estar enviando workPostId como locationId)
            if (location == null && dto.getLocationId() != null && workPost == null) {
                // Tentar buscar Location primeiro
                location = locationRepository.findById(dto.getLocationId()).orElse(null);
                
                // Se não encontrou Location, tentar usar como workPostId
                if (location == null) {
                    workPost = workPostRepository.findById(dto.getLocationId()).orElse(null);
                    if (workPost != null) {
                        // Se encontrou WorkPost usando locationId, limpar locationId para evitar confusão
                        // e usar workPostId corretamente
                    }
                }
            }
            
            // Estratégia 1: Se workPost foi encontrado (por workPostId ou locationId), priorizar busca baseada no WorkPost
            if (workPost != null) {
                // Tentar buscar Location pelo locationId fornecido (se fornecido e válido)
                if (dto.getLocationId() != null) {
                    location = locationRepository.findById(dto.getLocationId())
                            .orElse(null);
                }
                
                // Estratégia 2: Se não encontrou pelo ID, buscar Location pelo nome do WorkPost
                if (location == null) {
                    List<Location> allLocations = locationRepository.findAll();
                    for (Location loc : allLocations) {
                        if (loc.getName() != null && loc.getName().equals(workPost.getName())) {
                            location = loc;
                            break;
                        }
                    }
                }
                
                // Estratégia 3: Se não encontrou pelo nome, buscar Location do Unit do Client do WorkPost
                if (location == null && workPost.getClient() != null) {
                    // Buscar Units associados ao Client do WorkPost
                    List<Unit> units = unitRepository.findByClientId(workPost.getClient().getId());
                    
                    // Para cada Unit, buscar Locations
                    for (Unit unit : units) {
                        List<Location> unitLocations = locationRepository.findByUnitId(unit.getId());
                        if (!unitLocations.isEmpty()) {
                            // Usar a primeira Location encontrada do Unit
                            location = unitLocations.get(0);
                            break;
                        }
                    }
                }
                
                // Estratégia 4: Se ainda não encontrou, criar uma Location automaticamente baseada no WorkPost
                if (location == null && workPost.getClient() != null) {
                    // Buscar o primeiro Unit do Client para associar a Location
                    List<Unit> units = unitRepository.findByClientId(workPost.getClient().getId());
                    Unit unit = units.isEmpty() ? null : units.get(0);
                    
                    // Se o Client não tem Units, criar uma Unit padrão automaticamente
                    if (unit == null) {
                        String unitName = workPost.getClient().getName() != null 
                                ? "Unidade Principal - " + workPost.getClient().getName()
                                : "Unidade Principal";
                        String unitAddress = (workPost.getAddress() != null && !workPost.getAddress().trim().isEmpty()) 
                                ? workPost.getAddress() 
                                : "Endereço não informado";
                        
                        unit = Unit.builder()
                                .name(unitName)
                                .description("Unidade criada automaticamente para o Cliente: " + 
                                        (workPost.getClient().getName() != null ? workPost.getClient().getName() : "Sem nome"))
                                .address(unitAddress)
                                .client(workPost.getClient())
                                .active(true)
                                .build();
                        unit = unitRepository.save(unit);
                    }
                    
                    if (unit != null) {
                        // Verificar se já existe uma Location com o mesmo nome e Unit (evitar duplicatas)
                        List<Location> existingLocations = locationRepository.findByUnitId(unit.getId());
                        for (Location loc : existingLocations) {
                            if (loc.getName() != null && loc.getName().equals(workPost.getName())) {
                                location = loc;
                                break;
                            }
                        }
                        
                        // Se não encontrou, criar nova Location baseada no WorkPost
                        if (location == null) {
                            String address = (workPost.getAddress() != null && !workPost.getAddress().trim().isEmpty()) 
                                    ? workPost.getAddress() 
                                    : "Endereço não informado";
                            
                            location = Location.builder()
                                    .name(workPost.getName())
                                    .description("Location criada automaticamente para o Posto de Trabalho: " + workPost.getName())
                                    .address(address)
                                    .unit(unit)
                                    .build();
                            location = locationRepository.save(location);
                        }
                    }
                }
            }
            
            // Estratégia 5: Se ainda não encontrou/criou e há locationId, tentar buscar diretamente
            // (mesmo que o locationId possa ser inválido, tentamos primeiro)
            if (location == null && dto.getLocationId() != null) {
                location = locationRepository.findById(dto.getLocationId())
                        .orElse(null);
            }
            
            // Se ainda não encontrou/criou, lançar exceção com mensagem clara
            if (location == null) {
                if (workPost != null) {
                    throw new EntityNotFoundException(
                        "Não foi possível encontrar ou criar uma Location para o Posto de Trabalho '" + 
                        workPost.getName() + "'. Verifique se o Posto de Trabalho está associado a um Cliente com Units cadastrados."
                    );
                } else if (dto.getLocationId() != null) {
                    throw new EntityNotFoundException(
                        "Location not found with ID: " + dto.getLocationId() + 
                        ". Se você forneceu um workPostId, verifique se ele está correto."
                    );
                } else {
                    throw new EntityNotFoundException("Location ID ou WorkPost ID é obrigatório");
                }
            }

            // Criar Schedule
            Schedule schedule = Schedule.builder()
                    .employee(employee)
                    .location(location)
                    .workPost(workPost)
                    .scheduleDate(dto.getScheduleDate())
                    .shift(dto.getShift())
                    .status(dto.getStatus())
                    .observations(dto.getObservations())
                    .build();

            return scheduleRepository.save(schedule);
        } catch (Exception e) {
            System.err.println("Erro ao criar Schedule: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional
    public Schedule update(UUID id, Schedule schedule) {
        Schedule existingSchedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Schedule not found"));
        
        existingSchedule.setScheduleDate(schedule.getScheduleDate());
        existingSchedule.setShift(schedule.getShift());
        existingSchedule.setLocation(schedule.getLocation());
        existingSchedule.setWorkPost(schedule.getWorkPost());
        existingSchedule.setStatus(schedule.getStatus());
        existingSchedule.setRoute(schedule.getRoute());
        existingSchedule.setPatrol(schedule.getPatrol());
        existingSchedule.setObservations(schedule.getObservations());
        
        return scheduleRepository.save(existingSchedule);
    }

    @Transactional
    public void delete(UUID id) {
        scheduleRepository.deleteById(id);
    }

    public Schedule findById(UUID id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Schedule not found"));
    }

    public List<Schedule> findByEmployeeId(UUID employeeId) {
        return scheduleRepository.findByEmployeeId(employeeId);
    }

    public List<Schedule> findByDate(LocalDate date) {
        return scheduleRepository.findByScheduleDate(date);
    }

    public List<Schedule> findAll() {
        try {
            // Tentar usar o método com JOIN FETCH para carregar relacionamentos eager
            return scheduleRepository.findAllWithRelations();
        } catch (Exception e) {
            // Se falhar, usar o método padrão
            System.err.println("Erro ao buscar escalas com relacionamentos: " + e.getMessage());
            return scheduleRepository.findAll();
        }
    }

    @Transactional
    public Schedule createSchedule(ScheduleDTO dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new EntityNotFoundException("Location not found"));
        
        Route route = routeRepository.findById(dto.getRouteId())
                .orElseThrow(() -> new EntityNotFoundException("Route not found"));
        
        Patrol patrol = patrolRepository.findById(dto.getPatrolId())
                .orElseThrow(() -> new EntityNotFoundException("Patrol not found"));

        Schedule schedule = new Schedule();
        schedule.setScheduleDate(dto.getScheduleDate());
        schedule.setShift(dto.getShift());
        schedule.setLocation(location);
        schedule.setStatus(dto.getStatus());
        schedule.setRoute(route);
        schedule.setPatrol(patrol);
        schedule.setObservations(dto.getObservations());

        return scheduleRepository.save(schedule);
    }

    @Transactional
    public EmployeeSchedule createEmployeeSchedule(EmployeeScheduleDTO dto) {
        Schedule schedule = scheduleRepository.findById(dto.getScheduleId())
                .orElseThrow(() -> new EntityNotFoundException("Schedule not found"));
        
        Position position = positionRepository.findById(dto.getPositionId())
                .orElseThrow(() -> new EntityNotFoundException("Position not found"));

        EmployeeSchedule employeeSchedule = new EmployeeSchedule();
        employeeSchedule.setSchedule(schedule);
        employeeSchedule.setPosition(position);
        employeeSchedule.setObservations(dto.getObservations());

        return employeeScheduleRepository.save(employeeSchedule);
    }

    public List<Schedule> findByPeriod(LocalDate startDate, LocalDate endDate) {
        return scheduleRepository.findByScheduleDateBetween(startDate, endDate);
    }

    public List<EmployeeSchedule> findByScheduleId(UUID scheduleId) {
        return employeeScheduleRepository.findByScheduleId(scheduleId);
    }
} 