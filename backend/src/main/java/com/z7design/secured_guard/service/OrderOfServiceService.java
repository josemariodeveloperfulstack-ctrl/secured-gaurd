package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CreateOrderOfServiceDTO;
import com.z7design.secured_guard.dto.OrderOfServiceDTO;
import com.z7design.secured_guard.exception.ResourceNotFoundException;
import com.z7design.secured_guard.model.OrderOfService;
import com.z7design.secured_guard.model.Role;
import com.z7design.secured_guard.repository.OrderOfServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.z7design.secured_guard.dto.ReportLayoutConfig;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class OrderOfServiceService {

    private final OrderOfServiceRepository orderOfServiceRepository;
    private final StandardReportLayoutService standardReportLayoutService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;

    public List<OrderOfServiceDTO> listByEmployee(UUID employeeId) {
        if (employeeId == null)
            return orderOfServiceRepository.findAll().stream().map(this::convertToDTO).toList();
        return orderOfServiceRepository.findByEmployeeId(employeeId).stream().map(this::convertToDTO).toList();
    }

    public List<OrderOfServiceDTO> listAll() {
        List<OrderOfService> orders = orderOfServiceRepository.findAll();
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public OrderOfServiceDTO findById(UUID id) {
        OrderOfService order = orderOfServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de serviço não encontrada com ID: " + id));
        return convertToDTO(order);
    }

    public OrderOfServiceDTO create(CreateOrderOfServiceDTO dto) {
        OrderOfService order = OrderOfService.builder()
                .employeeId(dto.getEmployeeId())
                .employeeName(dto.getEmployeeName())
                .employeeCpf(dto.getEmployeeCpf())
                .role(dto.getRole())
                .company(dto.getCompany())
                .client(dto.getClient())
                .workplace(dto.getWorkplace())
                .salary(dto.getSalary())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .signed(false)
                .build();

        OrderOfService savedOrder = orderOfServiceRepository.save(order);
        return convertToDTO(savedOrder);
    }

    public OrderOfServiceDTO update(UUID id, CreateOrderOfServiceDTO dto) {
        OrderOfService existingOrder = orderOfServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de serviço não encontrada com ID: " + id));

        existingOrder.setEmployeeId(dto.getEmployeeId());
        existingOrder.setEmployeeName(dto.getEmployeeName());
        existingOrder.setEmployeeCpf(dto.getEmployeeCpf());
        existingOrder.setRole(dto.getRole());
        existingOrder.setCompany(dto.getCompany());
        existingOrder.setClient(dto.getClient());
        existingOrder.setWorkplace(dto.getWorkplace());
        existingOrder.setSalary(dto.getSalary());
        existingOrder.setStartDate(dto.getStartDate());
        existingOrder.setEndDate(dto.getEndDate());

        OrderOfService updatedOrder = orderOfServiceRepository.save(existingOrder);
        return convertToDTO(updatedOrder);
    }

    public OrderOfServiceDTO sign(UUID id) {
        OrderOfService order = orderOfServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de serviço não encontrada com ID: " + id));

        order.setSigned(true);
        OrderOfService signedOrder = orderOfServiceRepository.save(order);
        return convertToDTO(signedOrder);
    }

    public OrderOfServiceDTO updateDocumentUrl(UUID id, String documentUrl) {
        OrderOfService order = orderOfServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ordem de serviço não encontrada com ID: " + id));

        order.setDocumentUrl(documentUrl);
        OrderOfService updatedOrder = orderOfServiceRepository.save(order);
        return convertToDTO(updatedOrder);
    }

    public void delete(UUID id) {
        if (!orderOfServiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ordem de serviço não encontrada com ID: " + id);
        }
        orderOfServiceRepository.deleteById(id);
    }

    public List<OrderOfServiceDTO> searchByTerm(String searchTerm) {
        List<OrderOfService> orders = orderOfServiceRepository.searchByTerm(searchTerm);
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<OrderOfServiceDTO> findBySigned(Boolean signed) {
        List<OrderOfService> orders = orderOfServiceRepository.findBySigned(signed);
        return orders.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Gerar relatório PDF de ordens de serviço
     */
    public byte[] generatePDFReport(String employeeId, Boolean signed, String search) throws IOException {
        List<OrderOfService> orders;

        if (employeeId != null && !employeeId.isEmpty()) {
            orders = orderOfServiceRepository.findByEmployeeId(UUID.fromString(employeeId));
        } else if (signed != null) {
            orders = orderOfServiceRepository.findBySigned(signed);
        } else if (search != null && !search.trim().isEmpty()) {
            orders = orderOfServiceRepository.searchByTerm(search);
        } else {
            orders = orderOfServiceRepository.findAll();
        }

        // Determinar companyId
        UUID companyId = resolveCompanyId(orders, employeeId);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos)) {
            ReportLayoutConfig config = ReportLayoutConfig.builder()
                    .reportTitle("RELATÓRIO DE ORDENS DE SERVIÇO")
                    .companyId(companyId)
                    .build();

            StandardReportLayoutService.DocumentWithPdf docWithPdf = standardReportLayoutService
                    .createDocumentWithLayout(writer, config);
            Document document = docWithPdf.getDocument();

            // Resumo
            document.add(new Paragraph("Total de Registros: " + orders.size())
                    .setBold()
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setMarginBottom(10));

            if (orders.isEmpty()) {
                document.add(new Paragraph("Nenhuma ordem de serviço encontrada.")
                        .setTextAlignment(TextAlignment.CENTER)
                        .setItalic());
            } else {
                float[] columnWidths = { 2, 2, 2, 1.5f, 1.5f, 1 };
                Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

                // Cabeçalho
                table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Funcionário").setBold()));
                table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Cliente").setBold()));
                table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Local").setBold()));
                table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Cargo").setBold()));
                table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Início").setBold()));
                table.addHeaderCell(new com.itextpdf.layout.element.Cell().add(new Paragraph("Status").setBold()));

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

                for (OrderOfService order : orders) {
                    table.addCell(new Paragraph(order.getEmployeeName()));
                    table.addCell(new Paragraph(order.getClient()));
                    table.addCell(new Paragraph(order.getWorkplace()));
                    table.addCell(new Paragraph(order.getRole()));
                    table.addCell(new Paragraph(order.getStartDate().format(formatter)));
                    table.addCell(new Paragraph(order.getSigned() ? "Assinada" : "Pendente"));
                }

                document.add(table);
            }

            standardReportLayoutService.finalizeDocumentLayout(docWithPdf);
            document.close();
        } catch (Exception e) {
            throw new IOException("Erro ao gerar PDF de ordens de serviço", e);
        }

        return baos.toByteArray();
    }

    private OrderOfServiceDTO convertToDTO(OrderOfService order) {
        return OrderOfServiceDTO.builder()
                .id(order.getId())
                .employeeId(order.getEmployeeId())
                .employeeName(order.getEmployeeName())
                .employeeCpf(order.getEmployeeCpf())
                .role(order.getRole())
                .company(order.getCompany())
                .client(order.getClient())
                .workplace(order.getWorkplace())
                .salary(order.getSalary())
                .startDate(order.getStartDate())
                .endDate(order.getEndDate())
                .documentUrl(order.getDocumentUrl())
                .signed(order.getSigned())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    /**
     * Resolve company ID from orders or employee
     */
    private UUID resolveCompanyId(List<OrderOfService> orders, String employeeId) {
        // Try to get from employeeId parameter
        if (employeeId != null && !employeeId.trim().isEmpty()) {
            try {
                UUID empId = UUID.fromString(employeeId);
                Employee employee = employeeRepository.findById(empId).orElse(null);
                if (employee != null && employee.getCompany() != null) {
                    return employee.getCompany().getId();
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid employee ID format: {}", employeeId);
            }
        }

        // Try to get from first order's employee
        if (!orders.isEmpty()) {
            for (OrderOfService order : orders) {
                if (order.getEmployeeId() != null) {
                    Employee employee = employeeRepository.findById(order.getEmployeeId()).orElse(null);
                    if (employee != null && employee.getCompany() != null) {
                        return employee.getCompany().getId();
                    }
                }
            }
        }

        // Fallback to first active company
        return companyRepository.findAll().stream()
                .filter(c -> c.getStatus() == Company.CompanyStatus.ACTIVE)
                .findFirst()
                .map(Company::getId)
                .orElse(null);
    }
}
