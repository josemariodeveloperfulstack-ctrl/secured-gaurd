package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ClientStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public class ClientDTO {

    private java.util.UUID id;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 255, message = "Nome deve ter no máximo 255 caracteres")
    private String name;

    @NotBlank(message = "CNPJ é obrigatório")
    @Size(min = 11, max = 18, message = "CNPJ deve ter entre 11 e 18 caracteres")
    private String cnpj;

    @Size(max = 255, message = "Email deve ter no máximo 255 caracteres")
    private String email;

    @Size(max = 20, message = "Telefone deve ter no máximo 20 caracteres")
    private String phone;

    @Size(max = 20, message = "Celular deve ter no máximo 20 caracteres")
    private String mobile;

    @Size(max = 255, message = "Endereço deve ter no máximo 255 caracteres")
    private String address;

    @Size(max = 120, message = "Bairro deve ter no máximo 120 caracteres")
    private String neighborhood;

    @Size(max = 30, message = "Número deve ter no máximo 30 caracteres")
    private String addressNumber;

    @Size(max = 120, message = "Complemento deve ter no máximo 120 caracteres")
    private String addressComplement;

    @Size(max = 100, message = "Cidade deve ter no máximo 100 caracteres")
    private String city;

    @Size(max = 2, message = "Estado deve ter no máximo 2 caracteres")
    private String state;

    @Size(max = 10, message = "CEP deve ter no máximo 10 caracteres")
    private String zipCode;

    private java.util.UUID companyId;

    private String companyName;

    private String companySigla;

    @Size(max = 255, message = "Nome do contato deve ter no máximo 255 caracteres")
    private String contactName;

    @Size(max = 255, message = "Email do contato deve ter no máximo 255 caracteres")
    private String contactEmail;

    @Size(max = 20, message = "Telefone do contato deve ter no máximo 20 caracteres")
    private String contactPhone;

    private ClientStatus status;

    private String notes;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private java.util.List<String> notifiedDepartments;

    // Constructors
    public ClientDTO() {
    }

    public ClientDTO(String name, String cnpj) {
        this.name = name;
        this.cnpj = cnpj;
    }

    // Getters and Setters
    public java.util.UUID getId() {
        return id;
    }

    public void setId(java.util.UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCnpj() {
        return cnpj;
    }

    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getNeighborhood() {
        return neighborhood;
    }

    public void setNeighborhood(String neighborhood) {
        this.neighborhood = neighborhood;
    }

    public String getAddressNumber() {
        return addressNumber;
    }

    public void setAddressNumber(String addressNumber) {
        this.addressNumber = addressNumber;
    }

    public String getAddressComplement() {
        return addressComplement;
    }

    public void setAddressComplement(String addressComplement) {
        this.addressComplement = addressComplement;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getZipCode() {
        return zipCode;
    }

    public void setZipCode(String zipCode) {
        this.zipCode = zipCode;
    }

    public java.util.UUID getCompanyId() {
        return companyId;
    }

    public void setCompanyId(java.util.UUID companyId) {
        this.companyId = companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getCompanySigla() {
        return companySigla;
    }

    public void setCompanySigla(String companySigla) {
        this.companySigla = companySigla;
    }

    public String getContactName() {
        return contactName;
    }

    public void setContactName(String contactName) {
        this.contactName = contactName;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public void setContactEmail(String contactEmail) {
        this.contactEmail = contactEmail;
    }

    public String getContactPhone() {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone) {
        this.contactPhone = contactPhone;
    }

    public ClientStatus getStatus() {
        return status;
    }

    public void setStatus(ClientStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public java.util.List<String> getNotifiedDepartments() {
        return notifiedDepartments;
    }

    public void setNotifiedDepartments(java.util.List<String> notifiedDepartments) {
        this.notifiedDepartments = notifiedDepartments;
    }

    // Static factory method
    public static ClientDTO fromEntity(com.z7design.secured_guard.model.Client entity) {
        ClientDTO dto = new ClientDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setCnpj(entity.getCnpj());
        dto.setEmail(entity.getEmail());
        dto.setPhone(entity.getPhone());
        dto.setMobile(entity.getMobile());
        dto.setAddress(entity.getAddress());
        dto.setNeighborhood(entity.getNeighborhood());
        dto.setAddressNumber(entity.getAddressNumber());
        dto.setAddressComplement(entity.getAddressComplement());
        dto.setCity(entity.getCity());
        dto.setState(entity.getState());
        dto.setZipCode(entity.getZipCode());
        dto.setCompanyId(entity.getCompany() != null ? entity.getCompany().getId() : null);
        dto.setCompanyName(entity.getCompany() != null ? entity.getCompany().getName() : null);
        dto.setCompanySigla(entity.getCompany() != null ? entity.getCompany().getSigla() : null);
        dto.setContactName(entity.getContactName());
        dto.setContactEmail(entity.getContactEmail());
        dto.setContactPhone(entity.getContactPhone());
        dto.setStatus(entity.getStatus());
        dto.setNotes(entity.getNotes());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
