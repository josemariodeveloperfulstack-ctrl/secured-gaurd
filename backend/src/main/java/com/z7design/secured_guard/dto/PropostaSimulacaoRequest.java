package com.z7design.secured_guard.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * DTO para geração de PDF a partir dos dados da simulação (Proposta de Acordo),
 * sem necessidade de salvar a proposta no banco.
 */
public class PropostaSimulacaoRequest {

    @NotNull
    private String descricaoServico;

    @NotNull
    private MaoDeObraData maoDeObra;

    @NotNull
    private MateriaisData materiais;

    @NotNull
    private BdiData bdi;

    @NotNull
    private ImpostosData impostos;

    @NotNull
    private ResultadoData resultado;

    private String clientName;
    private String clientAddress;

    public static class MaoDeObraData {
        public BigDecimal salarioPorteiro;
        public Integer quantidadePorteiros;
        public BigDecimal adicionalNoturnoPercent;
        public BigDecimal adicionalNoturnoValor;
        public BigDecimal reflexoAdicional;
        public BigDecimal encargosPercent;
        public BigDecimal encargosValor;
        public BigDecimal subtotal;
        public BigDecimal total;
    }

    public static class MateriaisData {
        public Integer uniformeQuantidade;
        public BigDecimal uniformeUnitario;
        public Integer equipamentosQuantidade;
        public BigDecimal equipamentosUnitario;
        public BigDecimal subtotal;
    }

    public static class BdiData {
        public BigDecimal taxaAdministracaoPercent;
        public BigDecimal taxaAdministracaoValor;
        public BigDecimal lucroPercent;
        public BigDecimal lucroValor;
        public BigDecimal subtotal;
    }

    public static class ImpostosData {
        public BigDecimal cofinsPercent;
        public BigDecimal cofinsValor;
        public BigDecimal pisPercent;
        public BigDecimal pisValor;
        public BigDecimal issqnPercent;
        public BigDecimal issqnValor;
        public BigDecimal irPercent;
        public BigDecimal irValor;
        public BigDecimal csllPercent;
        public BigDecimal csllValor;
        public BigDecimal total;
    }

    public static class ResultadoData {
        public BigDecimal valorMensal;
        public BigDecimal valorAnual;
    }

    public String getDescricaoServico() { return descricaoServico; }
    public void setDescricaoServico(String descricaoServico) { this.descricaoServico = descricaoServico; }
    public MaoDeObraData getMaoDeObra() { return maoDeObra; }
    public void setMaoDeObra(MaoDeObraData maoDeObra) { this.maoDeObra = maoDeObra; }
    public MateriaisData getMateriais() { return materiais; }
    public void setMateriais(MateriaisData materiais) { this.materiais = materiais; }
    public BdiData getBdi() { return bdi; }
    public void setBdi(BdiData bdi) { this.bdi = bdi; }
    public ImpostosData getImpostos() { return impostos; }
    public void setImpostos(ImpostosData impostos) { this.impostos = impostos; }
    public ResultadoData getResultado() { return resultado; }
    public void setResultado(ResultadoData resultado) { this.resultado = resultado; }
    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }
    public String getClientAddress() { return clientAddress; }
    public void setClientAddress(String clientAddress) { this.clientAddress = clientAddress; }
}
