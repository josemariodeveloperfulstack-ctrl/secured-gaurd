package com.z7design.secured_guard.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "vehicle_checklists")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VehicleChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Dados da Viatura
    @Column(name = "plate", length = 20, nullable = false)
    private String plate;

    @Column(name = "model", length = 100)
    private String model;

    @Column(name = "current_km")
    private Integer currentKm;

    @Column(name = "checklist_date", nullable = false)
    private LocalDate checklistDate;

    @Column(name = "checklist_time")
    private LocalTime checklistTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift", length = 20, nullable = false)
    private ShiftType shift; // DIA ou NOITE

    @Column(name = "supervisor_name", length = 150)
    private String supervisorName;

    @Column(name = "employee_name", length = 150)
    private String employeeName;

    @Column(name = "employee_registration", length = 50)
    private String employeeRegistration;

    // 1. Inspeção Externa e Lataria (Visual)
    @Column(name = "dianteira")
    private Boolean dianteira; // Parachoque firme, grade sem quebras e capô travado

    @Column(name = "laterais")
    private Boolean laterais; // Ausência de novos riscos, mossas ou batidas nas portas

    @Column(name = "vidros_retrovisores")
    private Boolean vidrosRetrovisores; // Limpos, sem trincas e espelhos regulando perfeitamente

    @Column(name = "identificacao_visual")
    private Boolean identificacaoVisual; // Adesivos com logotipo da empresa e número da viatura legíveis

    // 2. Iluminação e Sinalização Sonora (Segurança)
    @Column(name = "farois_lanternas")
    private Boolean faroisLanternas; // Farol alto/baixo, setas, luz de freio e ré funcionando

    @Column(name = "giroflex_sirene")
    private Boolean giroflexSirene; // Luzes de emergência táticas acendendo e sirene com som claro

    @Column(name = "buzina")
    private Boolean buzina; // Emitindo som forte e sem falhas

    // 3. Mecânica Básica e Fluídos
    @Column(name = "pneus")
    private Boolean pneus; // Calibrados, com sulcos visíveis (acima do TWI) e estepe presente e cheio

    @Column(name = "niveis")
    private Boolean niveis; // Óleo do motor e água do radiador checados (com motor frio)

    @Column(name = "painel")
    private Boolean painel; // Sem luzes de advertência acesas (Injeção, Óleo ou Bateria) após dar partida

    // 4. Kit de Bordo e Equipamentos Operacionais
    @Column(name = "documentacao")
    private Boolean documentacao; // CRLV do veículo presente no porta-luvas

    @Column(name = "ferramentas_emergencia")
    private Boolean ferramentasEmergencia; // Macaco, triângulo e chave de roda a bordo

    @Column(name = "extintor_incendio")
    private Boolean extintorIncendio; // Dentro do prazo de validade e com o ponteiro no verde

    @Column(name = "kit_prancheta")
    private Boolean kitPrancheta; // Contendo talão de ocorrências, caneta e mapas de postos

    // Status e Observações
    @Column(name = "conformity_status", length = 30)
    @Builder.Default
    private String conformityStatus = "CONFORME"; // CONFORME ou COM_AVARIA

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    // Assinatura Digital Touch
    @Column(name = "signature_base64", columnDefinition = "TEXT")
    private String signatureBase64;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ShiftType {
        DIA,
        NOITE
    }
}
