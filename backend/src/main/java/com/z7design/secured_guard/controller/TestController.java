package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.repository.VisitRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.WorkPostRepository;
import com.z7design.secured_guard.repository.ClientRepository;
import com.z7design.secured_guard.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final VisitRepository visitRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkPostRepository workPostRepository;
    private final ClientRepository clientRepository;
    private final VisitService visitService;
    private final DataSource dataSource;

    @GetMapping("/visits")
    public ResponseEntity<Map<String, Object>> testVisits() {
        try {
            return ResponseEntity.ok(Map.of(
                "message", "Test endpoint working",
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/database")
    public ResponseEntity<Map<String, Object>> testDatabase() {
        try {
            long visitCount = visitRepository.count();
            long employeeCount = employeeRepository.count();
            long workPostCount = workPostRepository.count();
            long clientCount = clientRepository.count();
            
            return ResponseEntity.ok(Map.of(
                "message", "Database connection working",
                "visitCount", visitCount,
                "employeeCount", employeeCount,
                "workPostCount", workPostCount,
                "clientCount", clientCount,
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/visits-service")
    public ResponseEntity<Map<String, Object>> testVisitsService() {
        try {
            var visits = visitService.findAll(PageRequest.of(0, 20));
            return ResponseEntity.ok(Map.of(
                "message", "VisitService working",
                "totalElements", visits.getTotalElements(),
                "totalPages", visits.getTotalPages(),
                "size", visits.getSize(),
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/tables")
    public ResponseEntity<Map<String, Object>> testTables() {
        try {
            List<String> tables = new ArrayList<>();
            try (Connection connection = dataSource.getConnection()) {
                DatabaseMetaData metaData = connection.getMetaData();
                ResultSet rs = metaData.getTables(null, null, "%", new String[]{"TABLE"});
                while (rs.next()) {
                    String tableName = rs.getString("TABLE_NAME");
                    if (tableName.contains("visit")) {
                        tables.add(tableName);
                    }
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "Visit tables found",
                "tables", tables,
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/create-tables")
    public ResponseEntity<Map<String, Object>> createVisitTables() {
        try {
            List<String> results = new ArrayList<>();
            try (Connection connection = dataSource.getConnection()) {
                // Criar visit_employees
                String sql1 = "CREATE TABLE IF NOT EXISTS visit_employees (" +
                    "visit_id UUID NOT NULL, " +
                    "employee_id UUID NOT NULL, " +
                    "PRIMARY KEY (visit_id, employee_id), " +
                    "CONSTRAINT fk_visit_employees_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE" +
                    ")";
                connection.createStatement().execute(sql1);
                results.add("visit_employees created");

                // Criar visit_files
                String sql2 = "CREATE TABLE IF NOT EXISTS visit_files (" +
                    "visit_id UUID NOT NULL, " +
                    "file_path VARCHAR(255) NOT NULL, " +
                    "PRIMARY KEY (visit_id, file_path), " +
                    "CONSTRAINT fk_visit_files_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE" +
                    ")";
                connection.createStatement().execute(sql2);
                results.add("visit_files created");

                // Criar visit_photos
                String sql3 = "CREATE TABLE IF NOT EXISTS visit_photos (" +
                    "visit_id UUID NOT NULL, " +
                    "photo_path VARCHAR(255) NOT NULL, " +
                    "PRIMARY KEY (visit_id, photo_path), " +
                    "CONSTRAINT fk_visit_photos_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE" +
                    ")";
                connection.createStatement().execute(sql3);
                results.add("visit_photos created");
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "Visit collection tables created",
                "results", results,
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/visits-repository")
    public ResponseEntity<Map<String, Object>> testVisitsRepository() {
        try {
            var visits = visitRepository.findAll(PageRequest.of(0, 20));
            return ResponseEntity.ok(Map.of(
                "message", "VisitRepository working",
                "totalElements", visits.getTotalElements(),
                "totalPages", visits.getTotalPages(),
                "size", visits.getSize(),
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/visits-table-structure")
    public ResponseEntity<Map<String, Object>> testVisitsTableStructure() {
        try {
            List<Map<String, Object>> columns = new ArrayList<>();
            try (Connection connection = dataSource.getConnection()) {
                DatabaseMetaData metaData = connection.getMetaData();
                ResultSet rs = metaData.getColumns(null, null, "visits", null);
                while (rs.next()) {
                    Map<String, Object> column = Map.of(
                        "name", rs.getString("COLUMN_NAME"),
                        "type", rs.getString("TYPE_NAME"),
                        "nullable", rs.getString("IS_NULLABLE"),
                        "size", rs.getInt("COLUMN_SIZE")
                    );
                    columns.add(column);
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "Visits table structure",
                "columns", columns,
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/visits-count")
    public ResponseEntity<Map<String, Object>> testVisitsCount() {
        try {
            long count = visitRepository.count();
            return ResponseEntity.ok(Map.of(
                "message", "Visits count",
                "count", count,
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/create-test-visit")
    public ResponseEntity<Map<String, Object>> createTestVisit() {
        try {
            // Buscar um supervisor, work post e client existentes
            var supervisors = employeeRepository.findAll();
            var workPosts = workPostRepository.findAll();
            var clients = clientRepository.findAll();
            
            if (supervisors.isEmpty() || workPosts.isEmpty() || clients.isEmpty()) {
                return ResponseEntity.status(400).body(Map.of(
                    "error", "Missing required data: supervisors=" + supervisors.size() + 
                             ", workPosts=" + workPosts.size() + ", clients=" + clients.size(),
                    "timestamp", System.currentTimeMillis(),
                    "status", "ERROR"
                ));
            }
            
            // Criar uma visita de teste
            var visit = com.z7design.secured_guard.model.Visit.builder()
                .supervisor(supervisors.get(0))
                .workPost(workPosts.get(0))
                .client(clients.get(0))
                .visitDate(java.time.LocalDate.now())
                .visitTime(java.time.LocalTime.now())
                .description("Test visit")
                .status(com.z7design.secured_guard.model.enums.VisitStatus.PENDING)
                .build();
            
            var savedVisit = visitRepository.save(visit);
            
            return ResponseEntity.ok(Map.of(
                "message", "Test visit created",
                "visitId", savedVisit.getId(),
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/visits-findall")
    public ResponseEntity<Map<String, Object>> testVisitsFindAll() {
        try {
            var visits = visitRepository.findAll();
            return ResponseEntity.ok(Map.of(
                "message", "VisitRepository findAll working",
                "size", visits.size(),
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/visits-simple")
    public ResponseEntity<Map<String, Object>> testVisitsSimple() {
        try {
            // Testar apenas os campos básicos sem relacionamentos
            var visits = visitRepository.findAll();
            var simpleVisits = visits.stream().map(v -> Map.of(
                "id", v.getId(),
                "visitDate", v.getVisitDate(),
                "visitTime", v.getVisitTime(),
                "status", v.getStatus(),
                "description", v.getDescription()
            )).toList();
            
            return ResponseEntity.ok(Map.of(
                "message", "Simple visits data",
                "size", visits.size(),
                "visits", simpleVisits,
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }

    @GetMapping("/create-simple-visit")
    public ResponseEntity<Map<String, Object>> createSimpleVisit() {
        try {
            // Buscar dados existentes
            var supervisors = employeeRepository.findAll();
            var workPosts = workPostRepository.findAll();
            var clients = clientRepository.findAll();
            
            if (supervisors.isEmpty() || workPosts.isEmpty() || clients.isEmpty()) {
                return ResponseEntity.status(400).body(Map.of(
                    "error", "Missing required data",
                    "supervisors", supervisors.size(),
                    "workPosts", workPosts.size(),
                    "clients", clients.size(),
                    "timestamp", System.currentTimeMillis(),
                    "status", "ERROR"
                ));
            }
            
            // Criar visita simples
            var visit = com.z7design.secured_guard.model.Visit.builder()
                .supervisor(supervisors.get(0))
                .workPost(workPosts.get(0))
                .client(clients.get(0))
                .visitDate(java.time.LocalDate.now())
                .visitTime(java.time.LocalTime.now())
                .status(com.z7design.secured_guard.model.enums.VisitStatus.PENDING)
                .build();
            
            var savedVisit = visitRepository.save(visit);
            
            return ResponseEntity.ok(Map.of(
                "message", "Simple visit created",
                "visitId", savedVisit.getId(),
                "timestamp", System.currentTimeMillis(),
                "status", "OK"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                "error", e.getMessage(),
                "stackTrace", e.getStackTrace()[0].toString(),
                "timestamp", System.currentTimeMillis(),
                "status", "ERROR"
            ));
        }
    }
}