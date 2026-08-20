package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import com.z7design.secured_guard.model.enums.UserStatus;

@Data
public class CreateUserRequest {
    
    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 3, max = 100, message = "Nome deve ter entre 3 e 100 caracteres")
    private String name;
    
    @NotBlank(message = "Username é obrigatório")
    @Size(min = 3, max = 50, message = "Username deve ter entre 3 e 50 caracteres")
    private String username;
    
    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;
    
    @NotBlank(message = "Senha é obrigatória")
    @Size(min = 6, message = "Senha deve ter pelo menos 6 caracteres")
    @Pattern(
        regexp = "^(?:(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).*|\\d{11}@Promover\\d{4}|\\d{11}@2025|1234556)$",
        message = "Senha deve ser forte, CPF@PromoverAAAA, CPF@2025 ou padrão de funcionário"
    )
    private String password;
    
    @Pattern(regexp = "^\\d{9,20}$|^$", message = "WhatsApp deve conter apenas dígitos e ter entre 9 e 20 caracteres")
    private String whatsapp;
    
    private List<String> roles;  // Array de Strings com nomes dos roles
    
    private Boolean active = true;

    private String status = UserStatus.ACTIVE.name();

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

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
}

