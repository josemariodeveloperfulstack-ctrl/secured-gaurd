package com.z7design.secured_guard.dto;

import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "DTO para transferência de dados de fatura/despesa")
public class InvoiceDTO {
    private java.util.UUID id;
    
    @Schema(description = "Número da fatura", example = "FAT-2024-001")
    @Size(max = 50, message = "Número da fatura deve ter no máximo 50 caracteres")
    private String invoiceNumber;
    
    @NotBlank(message = "Descrição é obrigatória")
    @Schema(description = "Descrição da fatura/despesa", example = "Pagamento de serviços de segurança")
    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    private String description;
    
    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    @Schema(description = "Valor da fatura", example = "1500.00")
    private BigDecimal amount;
    
    @Schema(description = "Tipo da despesa", example = "VARIAVEL")
    private ExpenseType type;
    
    @Schema(description = "Status da fatura", example = "PENDENTE")
    @NotNull(message = "Status é obrigatório")
    private ExpenseStatus status;
    
    @Schema(description = "Data de emissão da fatura", example = "2024-01-15")
    @NotNull(message = "Data de emissão é obrigatória")
    private LocalDate issueDate;
    
    @Schema(description = "Data de vencimento da fatura", example = "2024-02-15")
    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dueDate;
    
    @Schema(description = "Data de pagamento da fatura", example = "2024-02-10")
    private LocalDate paymentDate;
    
    @Schema(description = "Categoria da fatura", example = "Manutenção")
    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    private String category;
    
    @Schema(description = "Centro de custo", example = "Operacional")
    @Size(max = 100, message = "Centro de custo deve ter no máximo 100 caracteres")
    private String centroCusto;
    
    @Schema(description = "URL do comprovante de pagamento", example = "/api/uploads/comprovantes/abc123.pdf")
    @Size(max = 500, message = "URL do comprovante deve ter no máximo 500 caracteres")
    private String comprovanteUrl;
    
    @Schema(description = "Código de barras do boleto", example = "12345678901234567890")
    @Size(max = 255, message = "Código de barras deve ter no máximo 255 caracteres")
    private String barcode;
    
    @Schema(description = "Observações sobre a fatura")
    @Size(max = 1000, message = "Observações deve ter no máximo 1000 caracteres")
    private String notes;
    
    @Schema(description = "Sigla da empresa associada", example = "ADM")
    private String companySigla;

    private java.util.UUID supplierId;
    private java.util.UUID clientId;
    private java.util.UUID contractId;
    private java.util.UUID unitId;
    
    private String supplierName;
    private String clientName;
    private String contractNumber;

    private java.util.UUID subcategoriaId;
    private String subcategoriaNome;
    private String subcategoriaCodigo;
    private String categoriaPaiNome;
    private String categoriaPaiCodigo;
    private Boolean requerVinculoFuncionario;

    private java.util.UUID employeeId;
    private String employeeName;

    private java.util.UUID createdById;
    private String createdByName;

    private String unitName;
    private String workSector;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public java.util.UUID getId() {
        return id;
    }
    public void setId(java.util.UUID id) {
        this.id = id;
    }

    public java.util.UUID getSupplierId() {
        return supplierId;
    }
    public void setSupplierId(java.util.UUID supplierId) {
        this.supplierId = supplierId;
    }

    public java.util.UUID getClientId() {
        return clientId;
    }
    public void setClientId(java.util.UUID clientId) {
        this.clientId = clientId;
    }

    public java.util.UUID getContractId() {
        return contractId;
    }
    public void setContractId(java.util.UUID contractId) {
        this.contractId = contractId;
    }

    public java.util.UUID getUnitId() {
        return unitId;
    }
    public void setUnitId(java.util.UUID unitId) {
        this.unitId = unitId;
    }

    public static InvoiceDTO fromEntity(com.z7design.secured_guard.model.Invoice invoice) {
        if (invoice == null) return null;
        try {
            InvoiceDTO dto = new InvoiceDTO();
            dto.setId(invoice.getId());
            dto.setInvoiceNumber(invoice.getInvoiceNumber());
            dto.setDescription(invoice.getDescription());
            dto.setAmount(invoice.getAmount());
            dto.setType(invoice.getType());
            dto.setStatus(invoice.getStatus());
            dto.setIssueDate(invoice.getIssueDate());
            dto.setDueDate(invoice.getDueDate());
            dto.setPaymentDate(invoice.getPaymentDate());
            dto.setCategory(invoice.getCategory());
            dto.setCentroCusto(invoice.getCentroCusto());
            dto.setComprovanteUrl(invoice.getComprovanteUrl());
            dto.setBarcode(invoice.getBarcode());
            dto.setNotes(invoice.getNotes());
            dto.setCompanySigla(invoice.getCompanySigla());
            
            // Tratamento seguro para relacionamentos (pode causar LazyInitializationException)
            try {
                dto.setSupplierId(invoice.getSupplier() != null ? invoice.getSupplier().getId() : null);
                dto.setSupplierName(invoice.getSupplier() != null ? invoice.getSupplier().getName() : null);
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar supplier da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setSupplierId(null);
                dto.setSupplierName(null);
            }
            
            try {
                dto.setClientId(invoice.getClient() != null ? invoice.getClient().getId() : null);
                dto.setClientName(invoice.getClient() != null ? invoice.getClient().getName() : null);
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar client da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setClientId(null);
                dto.setClientName(null);
            }
            
            try {
                dto.setContractId(invoice.getContract() != null ? invoice.getContract().getId() : null);
                dto.setContractNumber(invoice.getContract() != null ? invoice.getContract().getContractNumber() : null);
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar contract da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setContractId(null);
                dto.setContractNumber(null);
            }
            
            try {
                dto.setUnitId(invoice.getUnit() != null ? invoice.getUnit().getId() : null);
                dto.setUnitName(invoice.getUnit() != null ? invoice.getUnit().getName() : null);
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar unit da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setUnitId(null);
                dto.setUnitName(null);
            }

            dto.setWorkSector(invoice.getWorkSector());

            try {
                if (invoice.getSubcategoria() != null) {
                    dto.setSubcategoriaId(invoice.getSubcategoria().getId());
                    dto.setSubcategoriaNome(invoice.getSubcategoria().getNome());
                    dto.setSubcategoriaCodigo(invoice.getSubcategoria().getCodigo());
                    dto.setRequerVinculoFuncionario(invoice.getSubcategoria().getRequerVinculoFuncionario());
                    if (invoice.getSubcategoria().getCategoriaPai() != null) {
                        dto.setCategoriaPaiNome(invoice.getSubcategoria().getCategoriaPai().getNome());
                        dto.setCategoriaPaiCodigo(invoice.getSubcategoria().getCategoriaPai().getCodigo());
                    }
                }
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar subcategoria da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setSubcategoriaId(null);
                dto.setSubcategoriaNome(null);
                dto.setSubcategoriaCodigo(null);
                dto.setCategoriaPaiNome(null);
                dto.setCategoriaPaiCodigo(null);
                dto.setRequerVinculoFuncionario(null);
            }

            try {
                dto.setEmployeeId(invoice.getEmployee() != null ? invoice.getEmployee().getId() : null);
                dto.setEmployeeName(invoice.getEmployee() != null ? invoice.getEmployee().getName() : null);
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar employee da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setEmployeeId(null);
                dto.setEmployeeName(null);
            }

            try {
                dto.setCreatedById(invoice.getCreatedBy() != null ? invoice.getCreatedBy().getId() : null);
                dto.setCreatedByName(invoice.getCreatedBy() != null ? invoice.getCreatedBy().getName() : null);
            } catch (Exception e) {
                System.err.println("⚠️ Erro ao acessar createdBy da invoice " + invoice.getId() + ": " + e.getMessage());
                dto.setCreatedById(null);
                dto.setCreatedByName(null);
            }

            dto.setCreatedAt(invoice.getCreatedAt());
            dto.setUpdatedAt(invoice.getUpdatedAt());
            return dto;
        } catch (Exception e) {
            System.err.println("❌ Erro ao converter Invoice para DTO: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Erro ao converter Invoice para DTO: " + e.getMessage(), e);
        }
    }
} 