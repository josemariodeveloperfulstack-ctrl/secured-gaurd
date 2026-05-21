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
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.model.Unit;
import com.z7design.secured_guard.model.Company;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final CompanyRepository companyRepository;
    private final StandardReportLayoutService layoutService;

    @Transactional
    public Schedule create(Schedule schedule) {
        return scheduleRepository.save(schedule);
    }

    @Transactional
    public ScheduleDTO createFromDTO(CreateScheduleDTO dto) {
        try {
            // Validar que pelo menos locationId ou workPostId foi fornecido
            if (dto.getLocationId() == null && dto.getWorkPostId() == null) {
                throw new IllegalArgumentException("Location ID ou WorkPost ID é obrigatório");
            }

            // Buscar Employee
            Employee employee = employeeRepository.findById(dto.getEmployeeId())
                    .orElseThrow(
                            () -> new EntityNotFoundException("Employee not found with ID: " + dto.getEmployeeId()));

            Location location = null;
            WorkPost workPost = null;

            // Estratégia 0: Tentar buscar WorkPost pelo workPostId fornecido
            if (dto.getWorkPostId() != null) {
                workPost = workPostRepository.findById(dto.getWorkPostId()).orElse(null);
            }

            // Estratégia 0.5: Se locationId foi fornecido mas não é uma Location válida,
            // tentar usar como workPostId (o frontend pode estar enviando workPostId como
            // locationId)
            if (location == null && dto.getLocationId() != null && workPost == null) {
                // Tentar buscar Location primeiro
                location = locationRepository.findById(dto.getLocationId()).orElse(null);

                // Se não encontrou Location, tentar usar como workPostId
                if (location == null) {
                    workPost = workPostRepository.findById(dto.getLocationId()).orElse(null);
                    if (workPost != null) {
                        // Se encontrou WorkPost usando locationId, limpar locationId para evitar
                        // confusão
                        // e usar workPostId corretamente
                    }
                }
            }

            // Estratégia 1: Se workPost foi encontrado (por workPostId ou locationId),
            // priorizar busca baseada no WorkPost
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

                // Estratégia 3: Se não encontrou pelo nome, buscar Location do Unit do Client
                // do WorkPost
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

                // Estratégia 4: Se ainda não encontrou, criar uma Location automaticamente
                // baseada no WorkPost
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
                                        (workPost.getClient().getName() != null ? workPost.getClient().getName()
                                                : "Sem nome"))
                                .address(unitAddress)
                                .client(workPost.getClient())
                                .active(true)
                                .build();
                        unit = unitRepository.save(unit);
                    }

                    if (unit != null) {
                        // Verificar se já existe uma Location com o mesmo nome e Unit (evitar
                        // duplicatas)
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
                                    .description("Location criada automaticamente para o Posto de Trabalho: "
                                            + workPost.getName())
                                    .address(address)
                                    .unit(unit)
                                    .build();
                            location = locationRepository.save(location);
                        }
                    }
                }
            }

            // Estratégia 5: Se ainda não encontrou/criou e há locationId, tentar buscar
            // diretamente
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
                                    workPost.getName()
                                    + "'. Verifique se o Posto de Trabalho está associado a um Cliente com Units cadastrados.");
                } else if (dto.getLocationId() != null) {
                    throw new EntityNotFoundException(
                            "Location not found with ID: " + dto.getLocationId() +
                                    ". Se você forneceu um workPostId, verifique se ele está correto.");
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

            Schedule saved = scheduleRepository.save(schedule);
            return toDTO(saved);
        } catch (Exception e) {
            System.err.println("Erro ao criar Schedule: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional
    public ScheduleDTO updateToDTO(UUID id, Schedule schedule) {
        Schedule updated = update(id, schedule);
        return toDTO(updated);
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
        try {
            // Excluir EmployeeSchedules relacionados primeiro (para evitar constraint
            // violation)
            List<EmployeeSchedule> employeeSchedules = employeeScheduleRepository.findByScheduleId(id);
            if (!employeeSchedules.isEmpty()) {
                log.info("🗑️ Excluindo {} EmployeeSchedule(s) relacionados à escala {}", employeeSchedules.size(), id);
                employeeScheduleRepository.deleteAll(employeeSchedules);
            }

            // Tentar deletar usando deleteById primeiro
            scheduleRepository.deleteById(id);
            log.info("✅ Escala excluída com sucesso: {}", id);
        } catch (org.hibernate.FetchNotFoundException
                | org.springframework.orm.jpa.JpaObjectRetrievalFailureException e) {
            // Tratar caso onde Unit não existe mais (orphan record)
            // Isso acontece quando Location referencia uma Unit que foi deletada
            log.warn(
                    "⚠️ Location referencia Unit inexistente ao excluir escala {}. Tentando exclusão forçada com query nativa...",
                    id);
            try {
                // Usar query nativa para deletar diretamente sem carregar relacionamentos
                scheduleRepository.deleteByIdNative(id);
                log.info("✅ Escala excluída com sucesso (forçada via query nativa): {}", id);
            } catch (Exception e2) {
                log.error("❌ Erro ao excluir escala {} mesmo com exclusão forçada: {}", id, e2.getMessage());
                throw new RuntimeException("Erro ao excluir escala: " + e2.getMessage(), e2);
            }
        } catch (jakarta.persistence.EntityNotFoundException e) {
            log.warn("⚠️ Tentativa de excluir escala inexistente: {}", id);
            throw new EntityNotFoundException("Schedule not found with ID: " + id);
        } catch (DataIntegrityViolationException e) {
            log.error("❌ Erro de integridade ao excluir escala {}: {}", id, e.getMessage());
            throw new RuntimeException(
                    "Não é possível excluir esta escala pois ela possui relacionamentos que impedem a exclusão. " +
                            "Remova os relacionamentos antes de tentar novamente.",
                    e);
        } catch (Exception e) {
            log.error("❌ Erro ao excluir escala {}: {}", id, e.getMessage(), e);
            throw new RuntimeException("Erro ao excluir escala: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public ScheduleDTO findById(UUID id) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Schedule not found with id: " + id));
        return toDTO(schedule);
    }

    @Transactional(readOnly = true)
    public List<ScheduleDTO> findByEmployeeIdDTO(UUID employeeId) {
        return scheduleRepository.findByEmployeeId(employeeId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScheduleDTO> findByDateDTO(LocalDate date) {
        return scheduleRepository.findByScheduleDate(date).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ScheduleDTO> findAllDTO() {
        return findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private ScheduleDTO toDTO(Schedule s) {
        if (s == null) return null;
        
        ScheduleDTO dto = ScheduleDTO.builder()
                .id(s.getId())
                .scheduleDate(s.getScheduleDate())
                .shift(s.getShift())
                .status(s.getStatus())
                .observations(s.getObservations())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
                
        if (s.getEmployee() != null) {
            dto.setEmployeeId(s.getEmployee().getId());
            dto.setEmployeeName(s.getEmployee().getName());
            dto.setEmployeeDocument(s.getEmployee().getDocument());
        }
        
        if (s.getLocation() != null) {
            dto.setLocationId(s.getLocation().getId());
            dto.setLocationName(s.getLocation().getName());
        }
        
        if (s.getWorkPost() != null) {
            dto.setWorkPostId(s.getWorkPost().getId());
            dto.setWorkPostName(s.getWorkPost().getName());
            dto.setWorkPostCode(s.getWorkPost().getPostCode());
            
            if (s.getWorkPost().getClient() != null) {
                dto.setClientId(s.getWorkPost().getClient().getId());
                dto.setClientName(s.getWorkPost().getClient().getName());
            }
        }
        
        if (s.getRoute() != null) {
            dto.setRouteId(s.getRoute().getId());
        }
        
        if (s.getPatrol() != null) {
            dto.setPatrolId(s.getPatrol().getId());
        }
        
        return dto;
    }

    public List<Schedule> findByEmployeeId(UUID employeeId) {
        return scheduleRepository.findByEmployeeId(employeeId);
    }

    public List<Schedule> findByDate(LocalDate date) {
        return scheduleRepository.findByScheduleDate(date);
    }

    @Transactional(readOnly = true)
    public List<Schedule> findAll() {
        try {
            log.info("🔍 Buscando todas as escalas com relacionamentos");
            // Tentar usar o método com JOIN FETCH para carregar relacionamentos eager
            List<Schedule> schedules = scheduleRepository.findAllWithRelations();

            log.info("✅ Escalas encontradas (findAllWithRelations): {} registros", schedules.size());

            // Inicializar objetos necessários dentro da transação para evitar
            // LazyInitializationException
            for (Schedule schedule : schedules) {
                if (schedule.getEmployee() != null) {
                    // Forçar inicialização de campos básicos do Employee dentro da transação
                    schedule.getEmployee().getName();
                    schedule.getEmployee().getId();
                }
                if (schedule.getLocation() != null) {
                    schedule.getLocation().getName();
                    schedule.getLocation().getId();
                }
                if (schedule.getWorkPost() != null) {
                    schedule.getWorkPost().getName();
                    schedule.getWorkPost().getId();
                    // Inicializar client dentro da transação para evitar
                    // LazyInitializationException
                    try {
                        if (schedule.getWorkPost().getClient() != null) {
                            schedule.getWorkPost().getClient().getName();
                            schedule.getWorkPost().getClient().getId();
                        }
                    } catch (Exception ignored) {
                        // Ignorar erros de lazy initialization
                    }
                }
            }

            // Se retornou vazio, tentar método padrão como fallback
            if (schedules == null || schedules.isEmpty()) {
                log.warn("⚠️ findAllWithRelations retornou vazio, tentando método padrão");
                List<Schedule> allSchedules = scheduleRepository.findAll();
                log.info("✅ Escalas encontradas (método padrão): {} registros",
                        allSchedules != null ? allSchedules.size() : 0);

                // Inicializar também no método padrão
                if (allSchedules != null) {
                    for (Schedule schedule : allSchedules) {
                        if (schedule.getEmployee() != null) {
                            schedule.getEmployee().getName();
                            schedule.getEmployee().getId();
                        }
                        if (schedule.getLocation() != null) {
                            schedule.getLocation().getName();
                            schedule.getLocation().getId();
                        }
                        if (schedule.getWorkPost() != null) {
                            schedule.getWorkPost().getName();
                            schedule.getWorkPost().getId();
                            try {
                                if (schedule.getWorkPost().getClient() != null) {
                                    schedule.getWorkPost().getClient().getName();
                                    schedule.getWorkPost().getClient().getId();
                                }
                            } catch (Exception ignored) {
                                // lazy / órfão
                            }
                        }
                    }
                }

                return allSchedules != null ? allSchedules : new java.util.ArrayList<>();
            }

            // Retornar todas as escalas, mesmo com Location null
            // O @NotFound(action = NotFoundAction.IGNORE) já trata isso no modelo
            return schedules;
        } catch (Exception e) {
            log.error("❌ Erro ao buscar escalas com relacionamentos", e);
            log.error("❌ Tipo de exceção: {}", e.getClass().getName());
            log.error("❌ Mensagem: {}", e.getMessage());
            if (e.getCause() != null) {
                log.error("❌ Causa: {}", e.getCause().getMessage());
                log.error("❌ Tipo da causa: {}", e.getCause().getClass().getName());
            }
            // Não chamar repository.findAll() aqui: após falha JPA/Hibernate a transação pode estar
            // rollback-only e um segundo acesso causa UnexpectedRollbackException.
            log.warn("⚠️ Retornando lista vazia. Corrija dados órfãos ou use @NotFound(IGNORE) nas associações.");
            return new java.util.ArrayList<>();
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
    public byte[] generatePDFReport(LocalDate startDate, LocalDate endDate, UUID employeeId, UUID workPostId,
            String status) throws IOException {
        log.info(
                "Gerando relatório PDF de escalas - StartDate: {}, EndDate: {}, EmployeeId: {}, WorkPostId: {}, Status: {}",
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
                com.z7design.secured_guard.model.enums.ScheduleStatus statusEnum = com.z7design.secured_guard.model.enums.ScheduleStatus
                        .valueOf(status);
                schedules = schedules.stream()
                        .filter(s -> s.getStatus() == statusEnum)
                        .toList();
            } catch (IllegalArgumentException e) {
                log.warn("Status inválido: {}", status);
            }
        }

        log.info("Total de escalas encontradas para o relatório: {}", schedules.size());

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            // Configurar layout premium (Vertical/Retrato é o padrão do
            // StandardReportLayoutService)
            UUID companyId = resolveCompanyId(schedules, employeeId);

            com.z7design.secured_guard.dto.ReportLayoutConfig config = com.z7design.secured_guard.dto.ReportLayoutConfig
                    .builder()
                    .companyId(companyId)
                    .reportTitle("RELATÓRIO DE ESCALAS DE TRABALHO")
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = layoutService.createDocumentWithLayout(writer,
                    config);
            Document document = docWithPdf.getDocument();

            // Filtros aplicados
            if (startDate != null || endDate != null || employeeId != null || workPostId != null || status != null) {
                Paragraph filtersInfo = new Paragraph("Filtros aplicados:")
                        .setFontSize(10)
                        .setBold()
                        .setMarginBottom(5);
                document.add(filtersInfo);

                if (startDate != null) {
                    document.add(
                            new Paragraph("Data Início: " + startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                                    .setFontSize(10).setMarginBottom(2));
                }
                if (endDate != null) {
                    document.add(new Paragraph("Data Fim: " + endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                            .setFontSize(10).setMarginBottom(2));
                }
                if (employeeId != null && !schedules.isEmpty()) {
                    String empName = schedules.stream()
                            .filter(s -> s.getEmployee() != null && s.getEmployee().getId().equals(employeeId))
                            .map(s -> s.getEmployee().getName())
                            .findFirst().orElse("ID: " + employeeId);
                    document.add(new Paragraph("Funcionário: " + empName).setFontSize(10).setMarginBottom(2));
                }
                if (workPostId != null && !schedules.isEmpty()) {
                    String postName = schedules.stream()
                            .filter(s -> s.getWorkPost() != null && s.getWorkPost().getId().equals(workPostId))
                            .map(s -> s.getWorkPost().getName())
                            .findFirst().orElse("ID: " + workPostId);
                    document.add(new Paragraph("Posto de Trabalho: " + postName).setFontSize(10).setMarginBottom(2));
                }
                if (status != null && !status.isEmpty()) {
                    document.add(new Paragraph("Status: " + status).setFontSize(10).setMarginBottom(2));
                }
                document.add(new Paragraph("").setMarginBottom(10));
            }

            // Tabela de escalas
            if (schedules.isEmpty()) {
                Paragraph noData = new Paragraph("Nenhuma escala encontrada com os filtros aplicados.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setFontSize(12)
                        .setMarginTop(20);
                document.add(noData);
            } else {
                Table table = new Table(new float[] { 3, 3, 3, 2, 2, 2 }).useAllAvailableWidth();

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
                    table.addCell(createCell(
                            schedule.getScheduleDate() != null ? schedule.getScheduleDate().format(dateFormatter)
                                    : ""));
                    table.addCell(createCell(schedule.getShift() != null ? getShiftLabel(schedule.getShift()) : ""));
                    table.addCell(createCell(schedule.getStatus() != null ? getStatusLabel(schedule.getStatus()) : ""));
                }

                document.add(table);
            }

            document.close();
        } catch (Exception e) {
            log.error("Erro ao gerar PDF de escalas: {}", e.getMessage(), e);
            throw new IOException("Erro ao gerar relatório PDF: " + e.getMessage(), e);
        }

        byte[] result = baos.toByteArray();
        log.info("PDF de escalas gerado com sucesso, tamanho: {} bytes", result.length);
        return result;
    }

    private String getShiftLabel(com.z7design.secured_guard.model.enums.Shift shift) {
        if (shift == null)
            return "";
        switch (shift) {
            case DAY:
                return "Diurno";
            case NIGHT:
                return "Noturno";
            case MIXED:
                return "Misto";
            default:
                return shift.toString();
        }
    }

    private String getStatusLabel(com.z7design.secured_guard.model.enums.ScheduleStatus status) {
        if (status == null)
            return "";
        switch (status) {
            case PENDING:
                return "Pendente";
            case APPROVED:
                return "Aprovada";
            case REJECTED:
                return "Rejeitada";
            case IN_PROGRESS:
                return "Em Andamento";
            case COMPLETED:
                return "Concluída";
            case CANCELLED:
                return "Cancelada";
            default:
                return status.toString();
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

    private UUID resolveCompanyId(List<Schedule> schedules, UUID employeeId) {
        if (employeeId != null) {
            Employee employee = employeeRepository.findById(employeeId).orElse(null);
            if (employee != null && employee.getCompany() != null) {
                return employee.getCompany().getId();
            }
        }
        if (!schedules.isEmpty()) {
            for (Schedule s : schedules) {
                List<EmployeeSchedule> empSchedules = employeeScheduleRepository.findByScheduleId(s.getId());
                for (EmployeeSchedule es : empSchedules) {
                    if (es.getEmployee() != null && es.getEmployee().getCompany() != null) {
                        return es.getEmployee().getCompany().getId();
                    }
                }
            }
        }

        // Fallback for company resolution
        return companyRepository.findAll().stream()
                .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                .findFirst()
                .map(Company::getId)
                .orElse(null);
    }
}