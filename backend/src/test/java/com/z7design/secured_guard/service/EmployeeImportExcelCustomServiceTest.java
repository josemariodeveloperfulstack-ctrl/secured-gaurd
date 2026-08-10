package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EmployeeImportExcelCustomServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmployeeImportRowService rowService;

    @InjectMocks
    private EmployeeImportExcelCustomService excelCustomService;

    @Test
    public void testImportarPlanilhaCustom_Success() throws Exception {
        // Arrange
        Company company = new Company();
        company.setId(java.util.UUID.randomUUID());
        company.setCnpj("36698521000101");
        company.setName("Promover Terceirização");

        when(companyRepository.findByNormalizedCnpj("36698521000101")).thenReturn(Optional.of(company));
        when(employeeRepository.existsByNormalizedDocument("12345678909")).thenReturn(false);

        // Mock rowService.processRow to return true and set isNewRef[0] = true
        when(rowService.processRow(
                eq("12345678909"), eq("JOAO SILVA"),
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any(),
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any()
        )).thenAnswer(invocation -> {
            boolean[] isNew = invocation.getArgument(31);
            if (isNew != null && isNew.length > 0) {
                isNew[0] = true;
            }
            return true;
        });

        // Create a mock Excel sheet
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Funcionarios");
        
        // Header Row
        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("CNPJ");
        headerRow.createCell(1).setCellValue("Nome");
        headerRow.createCell(2).setCellValue("CPF");
        headerRow.createCell(3).setCellValue("Data Nascimento");
        headerRow.createCell(4).setCellValue("Cargo");
        headerRow.createCell(5).setCellValue("Salarios Base");

        // Data Row
        Row dataRow = sheet.createRow(1);
        dataRow.createCell(0).setCellValue("36.698.521/0001-01");
        dataRow.createCell(1).setCellValue("JOAO SILVA");
        dataRow.createCell(2).setCellValue("123.456.789-09");
        dataRow.createCell(3).setCellValue("01/01/1990");
        dataRow.createCell(4).setCellValue("VIGILANTE");
        dataRow.createCell(5).setCellValue("2500,50");

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        workbook.write(bos);
        byte[] bytes = bos.toByteArray();
        workbook.close();

        MockMultipartFile file = new MockMultipartFile("file", "test.xlsx", 
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", bytes);

        // Act
        EmployeeImportExcelCustomService.CustomImportResult result = excelCustomService.importarPlanilhaCustom(file);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.total());
        assertEquals(1, result.criados());
        assertEquals(0, result.atualizados());
        assertEquals(0, result.erros());
        assertTrue(result.mensagens().isEmpty());

        verify(companyRepository, times(1)).findByNormalizedCnpj("36698521000101");
        verify(rowService, times(1)).processRow(
                eq("12345678909"), eq("JOAO SILVA"),
                eq(null), eq(null), eq(LocalDate.of(1990, 1, 1)), eq(null), eq(null),
                eq(null), eq(null), eq(null), eq(null), eq(null),
                eq(null), eq("VIGILANTE"), eq(null), eq(null),
                eq(new BigDecimal("2500.50")), eq(null), eq(null), eq(null), eq(null),
                eq(null), eq(null), eq(null), eq(null), eq(null), eq(null), eq(null),
                eq(null), eq(null), eq(company), any()
        );
    }
}
