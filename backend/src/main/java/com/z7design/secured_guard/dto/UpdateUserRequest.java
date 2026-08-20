package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO para atualização de usuários
 * Não inclui validação obrigatória de senha (pode ser null)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 3, max = 100, message = "Nome deve ter entre 3 e 100 caracteres")
    private String name;

    @NotBlank(message = "Email é obrigatório")
    // @Email(message = "Email inválido") - Relaxing validation for legacy data
    private String email;

    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50, message = "Username deve ter entre 3 e 50 caracteres")
    private String username;

    /**
     * Senha opcional — validada em {@link com.z7design.secured_guard.service.UserService#updateFromRequest}
     * apenas quando informada (não aplicar @Size/@Pattern aqui para evitar 400 com string vazia).
     */
    private String password;

    private String whatsapp;

    private List<String> roles; // Array de Strings com nomes dos roles

    private Boolean active;

    private String status;

    // Campos de informações adicionais (opcionais)
    @Size(max = 500, message = "Avatar deve ter no máximo 500 caracteres")
    private String avatar;

    @Size(max = 100, message = "Departamento deve ter no máximo 100 caracteres")
    private String department;

    @Size(max = 100, message = "Posição deve ter no máximo 100 caracteres")
    private String position;

    @Size(max = 50, message = "Código do funcionário deve ter no máximo 50 caracteres")
    private String employeeCode;

    private String phone;

    @Size(max = 500, message = "Endereço deve ter no máximo 500 caracteres")
    private String address;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getWhatsapp() { return whatsapp; }
    public void setWhatsapp(String whatsapp) { this.whatsapp = whatsapp; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }

    public String getEmployeeCode() { return employeeCode; }
    public void setEmployeeCode(String employeeCode) { this.employeeCode = employeeCode; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
