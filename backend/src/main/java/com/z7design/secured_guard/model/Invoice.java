package com.z7design.secured_guard.model;

import com.z7design.secured_guard.model.enums.ExpenseStatus;
import com.z7design.secured_guard.model.enums.ExpenseType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @NotBlank(message = "Número da fatura é obrigatório")
    @Size(max = 50, message = "Número da fatura deve ter no máximo 50 caracteres")
    @Column(name = "invoice_number", nullable = false, unique = true)
    private String invoiceNumber;

    @NotBlank(message = "Descrição é obrigatória")
    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    @Column(name = "description", nullable = false)
    private String description;

    @NotNull(message = "Valor é obrigatório")
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private ExpenseType type = ExpenseType.VARIAVEL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ExpenseStatus status = ExpenseStatus.PENDENTE;

    @NotNull(message = "Data de vencimento é obrigatória")
    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Size(max = 255, message = "Código de barras deve ter no máximo 255 caracteres")
    @Column(name = "barcode")
    private String barcode;

    @Size(max = 255, message = "Baixa deve ter no máximo 255 caracteres")
    @Column(name = "baixa")
    private String baixa;

    @Size(max = 100, message = "Categoria deve ter no máximo 100 caracteres")
    @Column(name = "category")
    private String category;

    @Size(max = 100, message = "Centro de custo deve ter no máximo 100 caracteres")
    @Column(name = "cost_center")
    private String centroCusto;

    @Size(max = 500, message = "URL do comprovante deve ter no máximo 500 caracteres")
    @Column(name = "comprovante_url")
    private String comprovanteUrl;

    @Size(max = 1000, message = "Observações deve ter no máximo 1000 caracteres")
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Size(max = 10, message = "Sigla da empresa deve ter no máximo 10 caracteres")
    @Column(name = "company_sigla", length = 10)
    private String companySigla;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subcategoria_id")
    private Subcategoria subcategoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
} 