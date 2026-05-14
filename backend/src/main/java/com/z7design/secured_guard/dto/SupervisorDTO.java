package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.Supervisor;
import com.z7design.secured_guard.model.User;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class SupervisorDTO {
    private UUID id;
    private String name;
    private String cpf;
    private String email;
    private String phone;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Campos para reconhecimento facial (não expor dados sensíveis)
    private Boolean hasFaceRegistered;
    private Double faceQualityScore;
    
    public static SupervisorDTO fromEntity(Supervisor supervisor) {
        SupervisorDTO dto = new SupervisorDTO();
        dto.setId(supervisor.getId());
        dto.setName(supervisor.getName());
        dto.setCpf(supervisor.getCpf());
        dto.setEmail(supervisor.getEmail());
        dto.setPhone(supervisor.getPhone());
        dto.setIsActive(supervisor.getIsActive());
        dto.setCreatedAt(supervisor.getCreatedAt());
        dto.setUpdatedAt(supervisor.getUpdatedAt());
        dto.setHasFaceRegistered(supervisor.getFaceTemplate() != null && supervisor.getFaceTemplate().length > 0);
        dto.setFaceQualityScore(supervisor.getFaceQualityScore());
        return dto;
    }

    /**
     * Adapter para representar um usuário do sistema (com role SUPERVISOR)
     * como um SupervisorDTO. Usado pelo fluxo de login da aba "Supervisor"
     * quando o cadastro vive na tabela de usuários (e não na tabela
     * supervisors dedicada).
     */
    public static SupervisorDTO fromUser(User user) {
        SupervisorDTO dto = new SupervisorDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setCpf(user.getCpf());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setIsActive(user.isActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        dto.setHasFaceRegistered(false);
        dto.setFaceQualityScore(null);
        return dto;
    }
}
