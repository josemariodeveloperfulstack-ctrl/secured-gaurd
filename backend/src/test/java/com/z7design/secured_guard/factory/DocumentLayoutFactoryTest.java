package com.z7design.secured_guard.factory;

import com.z7design.secured_guard.enums.DocumentType;
import com.z7design.secured_guard.service.ExcelReportLayoutService;
import com.z7design.secured_guard.service.StandardReportLayoutService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.jupiter.api.Assertions.*;

class DocumentLayoutFactoryTest {

    @Mock
    private StandardReportLayoutService pdfService;

    @Mock
    private ExcelReportLayoutService excelService;

    private DocumentLayoutFactory factory;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        factory = new DocumentLayoutFactory(pdfService, excelService);
    }

    @Test
    void useNewLayout_ShouldReturnTrueForMigratedType() {
        assertTrue(factory.useNewLayout(DocumentType.EMPLOYEE_RECORD));
    }

    @Test
    void useNewLayout_ShouldReturnFalseForNonMigratedType() {
        assertFalse(factory.useNewLayout(DocumentType.GENERIC_REPORT));
    }

    @Test
    void getMigrationStatus_ShouldReturnCorrectStats() {
        DocumentLayoutFactory.MigrationStatus status = factory.getMigrationStatus();

        assertNotNull(status);
        assertTrue(status.total() > 0);
        assertTrue(status.migrated() > 0);
        assertTrue(status.getPercentage() > 0);
    }
}
