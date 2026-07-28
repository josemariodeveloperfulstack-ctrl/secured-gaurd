package com.z7design.secured_guard.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO para subcategoria do Plano de Contas")
public class SubcategoriaDTO {
    private UUID id;

    @NotNull(message = "Categoria pai é obrigatória")
    @Schema(description = "ID da categoria pai")
    private UUID categoriaPaiId;

    @Schema(description = "Nome da categoria pai")
    private String categoriaPaiNome;

    @Schema(description = "Código da categoria pai")
    private String categoriaPaiCodigo;

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
    @Schema(description = "Nome da subcategoria", example = "Energia Elétrica")
    private String nome;

    @NotBlank(message = "Código é obrigatório")
    @Size(max = 20, message = "Código deve ter no máximo 20 caracteres")
    @Schema(description = "Código da subcategoria", example = "DESP_OP_ENERGIA")
    private String codigo;

    @Schema(description = "Requer vínculo com funcionário", example = "false")
    private Boolean requerVinculoFuncionario = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static SubcategoriaDTO fromEntity(com.z7design.secured_guard.model.Subcategoria entity) {
        if (entity == null) return null;
        SubcategoriaDTO dto = new SubcategoriaDTO();
        dto.setId(entity.getId());
        if (entity.getCategoriaPai() != null) {
            dto.setCategoriaPaiId(entity.getCategoriaPai().getId());
            dto.setCategoriaPaiNome(entity.getCategoriaPai().getNome());
            dto.setCategoriaPaiCodigo(entity.getCategoriaPai().getCodigo());
        }
        dto.setNome(entity.getNome());
        dto.setCodigo(entity.getCodigo());
        dto.setRequerVinculoFuncionario(entity.getRequerVinculoFuncionario());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
