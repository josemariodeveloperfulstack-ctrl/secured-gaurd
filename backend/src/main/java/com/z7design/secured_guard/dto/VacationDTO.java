package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.Vacation;
import com.z7design.secured_guard.model.enums.VacationStatus;
import com.z7design.secured_guard.model.enums.VacationType;
import com.z7design.secured_guard.util.PeriodoAquisitivoUtil;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VacationDTO {
    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer daysTaken;
    private Integer remainingDays;
    private VacationStatus status;
    private VacationType vacationType;
    private String periodoAquisitivo;
    private String empresa;
    private String setor;
    private UUID approvedById;
    private String approvedByName;
    private LocalDate approvalDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VacationDTO fromEntity(Vacation vacation) {
        Employee employee = vacation.getEmployee();
        return VacationDTO.builder()
                .id(vacation.getId())
                .employeeId(employee != null ? employee.getId() : null)
                .employeeName(employee != null ? employee.getName() : "Funcionário removido")
                .startDate(vacation.getStartDate())
                .endDate(vacation.getEndDate())
                .daysTaken(vacation.getDaysTaken())
                .remainingDays(vacation.getRemainingDays())
                .status(vacation.getStatus())
                .vacationType(vacation.getVacationType())
                .periodoAquisitivo(vacation.getPeriodoAquisitivo() != null ? vacation.getPeriodoAquisitivo()
                        : PeriodoAquisitivoUtil.calcular(employee != null ? employee.getHireDate() : null,
                                vacation.getStartDate()))
                .empresa(safeCompanySigla(employee))
                .setor(safeDepartmentName(employee))
                .approvedById(vacation.getApprovedBy() != null ? vacation.getApprovedBy().getId() : null)
                .approvedByName(vacation.getApprovedBy() != null ? vacation.getApprovedBy().getName() : null)
                .approvalDate(vacation.getApprovalDate())
                .createdAt(vacation.getCreatedAt())
                .updatedAt(vacation.getUpdatedAt())
                .build();
    }

    public Vacation toEntity() {
        return Vacation.builder()
                .id(this.id)
                .startDate(this.startDate)
                .endDate(this.endDate)
                .daysTaken(this.daysTaken)
                .remainingDays(this.remainingDays)
                .status(this.status)
                .vacationType(this.vacationType != null ? this.vacationType : VacationType.NORMAL)
                .periodoAquisitivo(this.periodoAquisitivo)
                .approvalDate(this.approvalDate)
                .build();
    }

    private static String safeCompanySigla(Employee employee) {
        if (employee == null) {
            return null;
        }
        try {
            return employee.getCompany() != null ? employee.getCompany().getSigla() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String safeDepartmentName(Employee employee) {
        if (employee == null) {
            return null;
        }
        try {
            return employee.getDepartment() != null ? employee.getDepartment().getName() : null;
        } catch (Exception e) {
            return null;
        }
    }
}
