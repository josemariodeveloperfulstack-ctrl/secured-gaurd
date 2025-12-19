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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.extern.slf4j.Slf4j;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
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
            log.info("Buscando todas as escalas com relacionamentos");
            // Tentar usar o método com JOIN FETCH para carregar relacionamentos eager
            List<Schedule> schedules = scheduleRepository.findAllWithRelations();
            
            // Filtrar escalas com Location inválida (null devido a @NotFound)
            List<Schedule> validSchedules = schedules.stream()
                .filter(schedule -> {
                    try {
                        // Tentar acessar a location para verificar se está válida
                        if (schedule.getLocation() == null) {
                            log.warn("⚠️ Escala {} tem Location inválida (null), será filtrada", schedule.getId());
                            return false;
                        }
                        return true;
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao verificar Location da escala {}: {}", schedule.getId(), e.getMessage());
                        return false;
                    }
                })
                .toList();
            
            if (validSchedules.size() < schedules.size()) {
                log.warn("⚠️ {} escalas foram filtradas devido a Locations inválidas", schedules.size() - validSchedules.size());
            }
            
            log.info("✅ Escalas encontradas: {} registros válidos (de {} total)", validSchedules.size(), schedules.size());
            return validSchedules;
        } catch (Exception e) {
            log.error("❌ Erro ao buscar escalas com relacionamentos", e);
            log.error("❌ Tipo de exceção: {}", e.getClass().getName());
            log.error("❌ Mensagem: {}", e.getMessage());
            if (e.getCause() != null) {
                log.error("❌ Causa: {}", e.getCause().getMessage());
                log.error("❌ Tipo da causa: {}", e.getCause().getClass().getName());
            }
            // Se falhar, usar o método padrão e filtrar
            try {
                log.info("Tentando buscar escalas com método padrão");
                List<Schedule> allSchedules = scheduleRepository.findAll();
                
                // Filtrar escalas com Location inválida
                List<Schedule> validSchedules = allSchedules.stream()
                    .filter(schedule -> {
                        try {
                            if (schedule.getLocation() == null) {
                                return false;
                            }
                            return true;
                        } catch (Exception ex) {
                            return false;
                        }
                    })
                    .toList();
                
                log.info("✅ Escalas encontradas (método padrão): {} registros válidos", validSchedules.size());
                return validSchedules;
            } catch (Exception e2) {
                log.error("❌ Erro também no método padrão", e2);
                throw new RuntimeException("Erro ao buscar escalas: " + e2.getMessage(), e2);
            }
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

    @Transactional(readOnly = true)
    public byte[] generatePDFReport(LocalDate startDate, LocalDate endDate, UUID employeeId, UUID workPostId, String status) throws IOException {
        log.info("Gerando relatório PDF de escalas - StartDate: {}, EndDate: {}, EmployeeId: {}, WorkPostId: {}, Status: {}", 
                startDate, endDate, employeeId, workPostId, status);
        
        // Buscar escalas com filtros
        List<Schedule> schedules;
        if (startDate != null && endDate != null) {
            schedules = scheduleRepository.findByScheduleDateBetween(startDate, endDate);
        } else {
            schedules = scheduleRepository.findAllWithRelations();
        }
        
        // Aplicar filtros adicionais
        if (employeeId != null) {
            schedules = schedules.stream()
                    .filter(s -> s.getEmployee() != null && s.getEmployee().getId().equals(employeeId))
                    .toList();
        }
        
        if (workPostId != null) {
            schedules = schedules.stream()
                    .filter(s -> s.getWorkPost() != null && s.getWorkPost().getId().equals(workPostId))
                    .toList();
        }
        
        if (status != null && !status.isEmpty()) {
            try {
                com.z7design.secured_guard.model.enums.ScheduleStatus statusEnum = 
                        com.z7design.secured_guard.model.enums.ScheduleStatus.valueOf(status);
                schedules = schedules.stream()
                        .filter(s -> s.getStatus() == statusEnum)
                        .toList();
            } catch (IllegalArgumentException e) {
                log.warn("Status inválido: {}", status);
            }
        }
        
        log.info("Total de escalas encontradas para o relatório: {}", schedules.size());
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = null;
        PdfDocument pdfDoc = null;
        Document document = null;
        
        try {
            writer = new PdfWriter(baos);
            pdfDoc = new PdfDocument(writer);
            document = new Document(pdfDoc);
            document.setMargins(50, 50, 50, 50);
            
            // Cabeçalho da empresa
            Paragraph companyHeader = new Paragraph("PROMOVER VIGILÂNCIA PATRIMONIAL LTDA")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(16)
                    .setBold()
                    .setMarginBottom(5);
            document.add(companyHeader);
            
            Paragraph companyInfo = new Paragraph("CNPJ: 43.576.260/0001-12")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(10)
                    .setMarginBottom(20);
            document.add(companyInfo);
            
            // Título
            Paragraph title = new Paragraph("RELATÓRIO DE ESCALAS DE TRABALHO")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(18)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(20);
            document.add(title);
            
            // Informações do relatório
            Paragraph reportInfo = new Paragraph("Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setFontSize(10)
                    .setMarginBottom(10);
            document.add(reportInfo);
            
            // Filtros aplicados
            if (startDate != null || endDate != null || employeeId != null || workPostId != null || status != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);
                
                if (startDate != null) {
                    document.add(new Paragraph("Data Início: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10).setMarginBottom(2));
                }
                if (endDate != null) {
                    document.add(new Paragraph("Data Fim: " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).setFontSize(10).setMarginBottom(2));
                }
                if (employeeId != null) {
                    document.add(new Paragraph("Funcionário: ID " + employeeId).setFontSize(10).setMarginBottom(2));
                }
                if (workPostId != null) {
                    document.add(new Paragraph("Posto de Trabalho: ID " + workPostId).setFontSize(10).setMarginBottom(2));
                }
                if (status != null && !status.isEmpty()) {
                    document.add(new Paragraph("Status: " + status).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }
            
            // Total de escalas
            Paragraph totalInfo = new Paragraph("Total de escalas: " + schedules.size())
                    .setFontSize(12)
                    .setBold()
                    .setMarginBottom(15);
            document.add(totalInfo);
            
            // Tabela de escalas
            if (schedules.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma escala encontrada com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(6).setWidth(UnitValue.createPercentValue(100));
                
                // Cabeçalhos
                table.addHeaderCell(createHeaderCell("Funcionário"));
                table.addHeaderCell(createHeaderCell("Localização"));
                table.addHeaderCell(createHeaderCell("Posto de Trabalho"));
                table.addHeaderCell(createHeaderCell("Data"));
                table.addHeaderCell(createHeaderCell("Turno"));
                table.addHeaderCell(createHeaderCell("Status"));
                
                // Dados
                DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                for (Schedule schedule : schedules) {
                    table.addCell(createCell(schedule.getEmployee() != null ? schedule.getEmployee().getName() : ""));
                    table.addCell(createCell(schedule.getLocation() != null ? schedule.getLocation().getName() : ""));
                    table.addCell(createCell(schedule.getWorkPost() != null ? schedule.getWorkPost().getName() : ""));
                    table.addCell(createCell(schedule.getScheduleDate() != null ? 
                            schedule.getScheduleDate().format(dateFormatter) : ""));
                    table.addCell(createCell(schedule.getShift() != null ? getShiftLabel(schedule.getShift()) : ""));
                    table.addCell(createCell(schedule.getStatus() != null ? getStatusLabel(schedule.getStatus()) : ""));
                }
                
                document.add(table);
            }
            
            // Rodapé
            Paragraph footer = new Paragraph("Documento gerado automaticamente pelo sistema Secured Guard")
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontSize(8)
                    .setMarginTop(30);
            document.add(footer);
            
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de escalas: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        } finally {
            if (document != null) {
                document.close();
            }
            if (pdfDoc != null) {
                pdfDoc.close();
            }
            if (writer != null) {
                writer.close();
            }
        }
        
        byte[] result = baos.toByteArray();
        log.info("PDF de escalas gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }
    
    private String getShiftLabel(com.z7design.secured_guard.model.enums.Shift shift) {
        if (shift == null) return "";
        switch (shift) {
            case DAY: return "Diurno";
            case NIGHT: return "Noturno";
            case MIXED: return "Misto";
            default: return shift.toString();
        }
    }
    
    private String getStatusLabel(com.z7design.secured_guard.model.enums.ScheduleStatus status) {
        if (status == null) return "";
        switch (status) {
            case PENDING: return "Pendente";
            case APPROVED: return "Aprovada";
            case REJECTED: return "Rejeitada";
            case IN_PROGRESS: return "Em Andamento";
            case COMPLETED: return "Concluída";
            case CANCELLED: return "Cancelada";
            default: return status.toString();
        }
    }
    
    // Método auxiliar para criar células de cabeçalho
    
    private Cell createHeaderCell(String text) {
        return new Cell()
                .add(new Paragraph(text).setBold().setFontSize(10))
                .setTextAlignment(TextAlignment.CENTER)
                .setBackgroundColor(com.itextpdf.kernel.colors.ColorConstants.LIGHT_GRAY);
    }
    
    private Cell createCell(String text) {
        return new Cell()
                .add(new Paragraph(text != null ? text : "").setFontSize(9))
                .setTextAlignment(TextAlignment.LEFT);
    }
} 