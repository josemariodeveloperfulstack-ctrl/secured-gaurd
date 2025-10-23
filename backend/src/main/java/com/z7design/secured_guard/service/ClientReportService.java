package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.ClientReportFilterDTO;
import com.z7design.secured_guard.model.Client;
import com.z7design.secured_guard.repository.ClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;

// Placeholder for PDF generation library (e.g., iText, Apache PDFBox)
// Placeholder for Excel generation library (e.g., Apache POI)

@Service
@RequiredArgsConstructor
@Slf4j
public class ClientReportService {

    private final ClientRepository clientRepository;

    public byte[] generateClientPdfReport(ClientReportFilterDTO filters) {
        log.info("Gerando relatório PDF para clientes com filtros: {}", filters);
        List<Client> clients = findClientsByFilters(filters);

        // TODO: Implement PDF generation logic here
        // This is a placeholder. You would use a library like iText or Apache PDFBox.
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Example: Add some text to the PDF
            String content = "Relatório de Clientes\n\n";
            content += "Filtros Aplicados:\n";
            content += "Nome: " + (filters.getName() != null ? filters.getName() : "Todos") + "\n";
            content += "CNPJ: " + (filters.getCnpj() != null ? filters.getCnpj() : "Todos") + "\n";
            content += "Status: " + (filters.getStatus() != null ? filters.getStatus() : "Todos") + "\n";
            content += "Data Início: " + (filters.getStartDate() != null ? filters.getStartDate() : "N/A") + "\n";
            content += "Data Fim: " + (filters.getEndDate() != null ? filters.getEndDate() : "N/A") + "\n\n";
            content += "Total de Clientes Encontrados: " + clients.size() + "\n\n";
            
            for (Client client : clients) {
                content += "ID: " + client.getId() + "\n";
                content += "Nome: " + client.getName() + "\n";
                content += "CNPJ: " + client.getCnpj() + "\n";
                content += "Email: " + client.getEmail() + "\n";
                content += "Status: " + client.getStatus() + "\n";
                content += "-----------------------------------\n";
            }
            
            // In a real implementation, you'd use a PDF library to write this content
            baos.write(content.getBytes());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro na geração do PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório PDF", e);
        }
    }

    public byte[] generateClientExcelReport(ClientReportFilterDTO filters) {
        log.info("Gerando relatório Excel para clientes com filtros: {}", filters);
        List<Client> clients = findClientsByFilters(filters);

        // TODO: Implement Excel generation logic here
        // This is a placeholder. You would use a library like Apache POI.
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Example: Create a simple CSV-like output for demonstration
            StringBuilder csvContent = new StringBuilder();
            csvContent.append("ID,Nome,CNPJ,Email,Status,Data de Criação\n");
            for (Client client : clients) {
                csvContent.append(String.format("%s,%s,%s,%s,%s,%s\n",
                        client.getId(),
                        client.getName(),
                        client.getCnpj(),
                        client.getEmail(),
                        client.getStatus(),
                        client.getCreatedAt() != null ? client.getCreatedAt().toLocalDate() : ""
                ));
            }
            baos.write(csvContent.toString().getBytes());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro na geração do Excel: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao gerar relatório Excel", e);
        }
    }

    private List<Client> findClientsByFilters(ClientReportFilterDTO filters) {
        Specification<Client> spec = Specification.where(null);

        if (filters.getName() != null && !filters.getName().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), "%" + filters.getName().toLowerCase() + "%"));
        }
        if (filters.getCnpj() != null && !filters.getCnpj().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.like(root.get("cnpj"), "%" + filters.getCnpj() + "%"));
        }
        if (filters.getStatus() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), filters.getStatus()));
        }
        if (filters.getStartDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), LocalDateTime.of(filters.getStartDate(), java.time.LocalTime.MIN)));
        }
        if (filters.getEndDate() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), LocalDateTime.of(filters.getEndDate(), java.time.LocalTime.MAX)));
        }

        return clientRepository.findAll(spec);
    }
}