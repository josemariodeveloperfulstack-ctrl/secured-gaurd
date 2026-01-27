package com.z7design.secured_guard.dto;

import java.time.LocalDate;
import java.util.UUID;

public class LGPDConsentRequest {
    private UUID companyId;
    private UUID employeeId;
    private String employeeName;
    private String employeeCpf;
    private String employeeRg;
    private String employeePosition;
    private String city;
    private LocalDate consentDate;

    public LGPDConsentRequest() {
    }

    // Manual Getters and Setters
    public UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(UUID companyId) {
        this.companyId = companyId;
    }

    public UUID getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(UUID employeeId) {
        this.employeeId = employeeId;
    }

    public String getEmployeeName() {
        return employeeName;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public String getEmployeeCpf() {
        return employeeCpf;
    }

    public void setEmployeeCpf(String employeeCpf) {
        this.employeeCpf = employeeCpf;
    }

    public String getEmployeeRg() {
        return employeeRg;
    }

    public void setEmployeeRg(String employeeRg) {
        this.employeeRg = employeeRg;
    }

    public String getEmployeePosition() {
        return employeePosition;
    }

    public void setEmployeePosition(String employeePosition) {
        this.employeePosition = employeePosition;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public LocalDate getConsentDate() {
        return consentDate;
    }

    public void setConsentDate(LocalDate consentDate) {
        this.consentDate = consentDate;
    }

    // Alias for date to support legacy service calls
    public LocalDate getDate() {
        return consentDate;
    }

    public void setDate(LocalDate date) {
        this.consentDate = date;
    }
}
