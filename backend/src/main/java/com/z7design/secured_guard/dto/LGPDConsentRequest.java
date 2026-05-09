package com.z7design.secured_guard.dto;

import java.time.LocalDate;
import java.util.UUID;

public class LGPDConsentRequest {
    private UUID companyId;
    private UUID employeeId;
    private String employeeName;
    private String employeeCpf;
    private String employeeRg;
    private String employeeRgOrgao;
    private String employeePosition;
    private String employeeAddress;
    private String employeeCity;
    private String employeeState;
    private String employeeNeighborhood;
    private String employeeNumber;
    private String employeeComplement;
    private String employeeCep;
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

    public String getEmployeeRgOrgao() {
        return employeeRgOrgao;
    }

    public void setEmployeeRgOrgao(String employeeRgOrgao) {
        this.employeeRgOrgao = employeeRgOrgao;
    }

    public String getEmployeePosition() {
        return employeePosition;
    }

    public void setEmployeePosition(String employeePosition) {
        this.employeePosition = employeePosition;
    }

    public String getEmployeeAddress() {
        return employeeAddress;
    }

    public void setEmployeeAddress(String employeeAddress) {
        this.employeeAddress = employeeAddress;
    }

    public String getEmployeeCity() {
        return employeeCity;
    }

    public void setEmployeeCity(String employeeCity) {
        this.employeeCity = employeeCity;
    }

    public String getEmployeeState() {
        return employeeState;
    }

    public void setEmployeeState(String employeeState) {
        this.employeeState = employeeState;
    }

    public String getEmployeeNeighborhood() {
        return employeeNeighborhood;
    }

    public void setEmployeeNeighborhood(String employeeNeighborhood) {
        this.employeeNeighborhood = employeeNeighborhood;
    }

    public String getEmployeeNumber() {
        return employeeNumber;
    }

    public void setEmployeeNumber(String employeeNumber) {
        this.employeeNumber = employeeNumber;
    }

    public String getEmployeeComplement() {
        return employeeComplement;
    }

    public void setEmployeeComplement(String employeeComplement) {
        this.employeeComplement = employeeComplement;
    }

    public String getEmployeeCep() {
        return employeeCep;
    }

    public void setEmployeeCep(String employeeCep) {
        this.employeeCep = employeeCep;
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
