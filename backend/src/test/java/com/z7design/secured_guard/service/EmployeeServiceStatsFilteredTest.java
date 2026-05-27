package com.z7design.secured_guard.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceStatsFilteredTest {

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query query;

    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        employeeService = new EmployeeService();
        ReflectionTestUtils.setField(employeeService, "entityManager", entityManager);
    }

    @Test
    void getStatsFiltered_withActiveStatus_returnsZeroTerminatedAndSuspended() {
        when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getSingleResult()).thenReturn(new Object[] { 18L, 18L, 0L, 0L, 0L, 0L });

        Map<String, Long> stats = employeeService.getStatsFiltered(
                null,
                null,
                "ACTIVE",
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 5, 30),
                null,
                null);

        assertEquals(18L, stats.get("total"));
        assertEquals(18L, stats.get("active"));
        assertEquals(0L, stats.get("terminated"));
        assertEquals(0L, stats.get("suspended"));

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(entityManager).createNativeQuery(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertTrue(sql.contains("CAST(e.status AS text) = :status"));
        org.junit.jupiter.api.Assertions.assertTrue(sql.contains("e.hire_date >= :hireDateFrom"));
        verify(query).setParameter("status", "ACTIVE");
        verify(query).setParameter("hireDateFrom", LocalDate.of(2026, 4, 1));
        verify(query).setParameter("hireDateTo", LocalDate.of(2026, 5, 30));
    }
}
