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
@Table(name = "radio_checklists")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RadioChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Cabeçalho da Ficha de Inspeção
    @Column(name = "document_code", length = 50)
    @Builder.Default
    private String documentCode = "CK-ALMOX-HT";

    @Column(name = "document_version", length = 20)
    @Builder.Default
    private String documentVersion = "02";

    @Column(name = "document_date")
    private LocalDate documentDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", length = 30, nullable = false)
    @Builder.Default
    private MovementType movementType = MovementType.RETIRADA;

    // Dados do Posto e Vigilante
    @Column(name = "checklist_date", nullable = false)
    private LocalDate checklistDate;

    @Column(name = "checklist_time")
    private LocalTime checklistTime;

    @Column(name = "vigilante_name", length = 150)
    private String vigilanteName;

    @Column(name = "vigilante_registration", length = 50)
    private String vigilanteRegistration;

    @Column(name = "work_post_name", length = 150)
    private String workPostName;

    @Column(name = "radio_asset_id", length = 50)
    private String radioAssetId; // Nº Patrimônio

    @Column(name = "radio_serial_number", length = 100)
    private String radioSerialNumber; // Nº Série

    // 1. Inspeção Física Externa (Conservação)
    @Column(name = "carcaca_externa")
    private Boolean carcacaExterna; // Sem trincas graves, deformações ou peças soltas

    @Column(name = "antena")
    private Boolean antena; // Íntegra, firme, sem dobras acentuadas ou partes metálicas expostas

    @Column(name = "clip_cinto")
    private Boolean clipCinto; // Com boa pressão de mola e parafuso de fixação firme

    @Column(name = "conector_acessorios")
    private Boolean conectorAcessorios; // Borracha de vedação lateral presente e sem sujeira

    // 2. Alimentação e Bateria
    @Column(name = "encaixe_bateria")
    private Boolean encaixeBateria; // Trava com clique firme, sem folga no corpo do rádio

    @Column(name = "nivel_carga")
    private Boolean nivelCarga; // Bateria com carga completa (100%) antes de assumir o posto

    @Column(name = "contatos_carga")
    private Boolean contatosCarga; // Pinos dourados limpos, sem oxidação ou marcas de queimado

    // 3. Teste Operacional e Funcionalidades (Obrigatório)
    @Column(name = "botao_volume")
    private Boolean botaoVolume; // Gira suavemente, liga com bip sonoro claro

    @Column(name = "seletor_canais")
    private Boolean seletorCanais; // Troca os canais perfeitamente com aviso sonoro correto

    @Column(name = "botao_ptt")
    private Boolean botaoPtt; // Borracha intacta, clique macio, sem travar pressionado

    @Column(name = "teste_comunicacao_pratica")
    private Boolean testeComunicacaoPratica; // Transmissão enviada para a base limpa e recepção de áudio sem cortes

    // 4. Acessórios Adicionais
    @Column(name = "fone_ouvido_lapela")
    private Boolean foneOuvidoLapela; // Fios sem cortes, microfone transmitindo

    @Column(name = "carregador_mesa_fonte")
    private Boolean carregadorMesaFonte; // Tomada sem pinos tortos e LED da base acende

    // Declaração de Conformidade & Status
    @Column(name = "conformity_status", length = 30)
    @Builder.Default
    private String conformityStatus = "CONFORME"; // CONFORME ou COM_AVARIA

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    // Assinaturas e Nomes
    @Column(name = "vigilante_signature_base64", columnDefinition = "TEXT")
    private String vigilanteSignatureBase64;

    @Column(name = "almoxarife_name", length = 150)
    private String almoxarifeName;

    @Column(name = "almoxarife_signature_base64", columnDefinition = "TEXT")
    private String almoxarifeSignatureBase64;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum MovementType {
        RETIRADA,
        DEVOLUCAO
    }
}
