package com.z7design.secured_guard.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO para categoria pai do Plano de Contas")
public class CategoriaPaiDTO {
    private java.util.UUID id;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
    @Schema(description = "Nome da categoria", example = "Despesas Operacionais")
    private String nome;

    @NotBlank(message = "Código é obrigatório")
    @Size(max = 10, message = "Código deve ter no máximo 10 caracteres")
    @Schema(description = "Código da categoria", example = "DESP_OP")
    private String codigo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CategoriaPaiDTO fromEntity(com.z7design.secured_guard.model.CategoriaPai entity) {
        if (entity == null) return null;
        CategoriaPaiDTO dto = new CategoriaPaiDTO();
        dto.setId(entity.getId());
        dto.setNome(entity.getNome());
        dto.setCodigo(entity.getCodigo());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
