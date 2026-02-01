import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { propostaService, PropostaParams } from '@/services/propostaService';
import { PropostaComercial } from '@/types/proposta';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { reportLayoutService } from '@/services/reportLayoutService';
import { StandardReportTemplate } from '../reporting/StandardReportTemplate';

const valoresPadrao: PropostaParams = {
  quantidadePorteiros: 4,
  salarioPorteiro: 2134.80,
  adicionalNoturnoPercent: 39,
  encargosPercent: 69,
  uniformeQuantidade: 2,
  uniformeUnitario: 50,
  equipamentosQuantidade: 1,
  equipamentosUnitario: 20,
  taxaAdministracaoPercent: 4,
  lucroPercent: 3.19,
  cofinsPercent: 7.6,
  pisPercent: 1.65,
  issqnPercent: 3.5,
  irPercent: 1,
  csllPercent: 1,
};

interface PropostaAcordoProps {
  onSaveProposal?: (proposalData: PropostaComercial) => Promise<void>;
}

export default function PropostaAcordo({ onSaveProposal }: PropostaAcordoProps) {
  const { toast } = useToast();
  const [params, setParams] = useState<PropostaParams>(valoresPadrao);
  const [proposta, setProposta] = useState<PropostaComercial | null>(
    propostaService.calcularProposta(valoresPadrao)
  );

  const handleChange = (field: keyof PropostaParams, value: string) => {
    setParams((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const handleCalcular = () => {
    setProposta(propostaService.calcularProposta(params));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });
  };

  const handleGeneratePDF = async () => {
    if (!proposta) return;

    try {
      const printElement = document.getElementById('proposta-acordo-printable');
      if (!printElement) {
        throw new Error('Elemento de impressão não encontrado');
      }

      await reportLayoutService.generatePremiumPDF(printElement, {
        title: 'Proposta Comercial de Acordo',
        filename: `proposta_acordo_${new Date().toISOString().split('T')[0]}.pdf`
      });

      toast({
        title: "Sucesso",
        description: "PDF gerado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateExcel = () => {
    if (!proposta) {
      toast({
        title: "Erro",
        description: "Calcule a proposta antes de gerar o Excel.",
        variant: "destructive"
      });
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      // Aba: Resumo
      const resumoData = [
        ['PROPOSTA COMERCIAL DE ACORDO'],
        ['Data', new Date().toLocaleDateString('pt-BR')],
        [''],
        ['VALOR FINAL'],
        ['Mensal', proposta.resultado.valorMensal],
        ['Anual', proposta.resultado.valorAnual],
        [''],
        ['DESCRIÇÃO DO SERVIÇO'],
        [proposta.descricaoServico]
      ];
      const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

      // Aba: Mão de Obra
      const maoDeObraData = [
        ['Item', 'Descrição', 'Valor'],
        ['1', `Salário do Porteiro (R$ ${proposta.maoDeObra.salarioPorteiro} x ${proposta.maoDeObra.quantidadePorteiros})`, proposta.maoDeObra.salarioPorteiro * proposta.maoDeObra.quantidadePorteiros],
        ['2', `Adicional Noturno (${proposta.maoDeObra.adicionalNoturnoPercent}%)`, proposta.maoDeObra.adicionalNoturnoValor],
        ['3', 'Reflexo Adicional Noturno/HE/DSR', proposta.maoDeObra.reflexoAdicional],
        ['4', 'Subtotal', proposta.maoDeObra.subtotal],
        ['5', `Encargos (${proposta.maoDeObra.encargosPercent}%)`, proposta.maoDeObra.encargosValor],
        ['', 'TOTAL MÃO DE OBRA', proposta.maoDeObra.total]
      ];
      const maoDeObraSheet = XLSX.utils.aoa_to_sheet(maoDeObraData);
      XLSX.utils.book_append_sheet(workbook, maoDeObraSheet, 'Mão de Obra');

      // Aba: Materiais
      const materiaisData = [
        ['Item', 'Descrição', 'Valor'],
        ['1', `Uniformes (${proposta.materiais.uniformeQuantidade} x R$ ${proposta.materiais.uniformeUnitario})`, proposta.materiais.uniformeQuantidade * proposta.materiais.uniformeUnitario],
        ['2', `Equipamentos (${proposta.materiais.equipamentosQuantidade} x R$ ${proposta.materiais.equipamentosUnitario})`, proposta.materiais.equipamentosQuantidade * proposta.materiais.equipamentosUnitario],
        ['', 'SUBTOTAL MATERIAIS', proposta.materiais.subtotal]
      ];
      const materiaisSheet = XLSX.utils.aoa_to_sheet(materiaisData);
      XLSX.utils.book_append_sheet(workbook, materiaisSheet, 'Materiais');

      // Aba: BDI
      const bdiData = [
        ['Item', 'Descrição', 'Valor'],
        ['1', `Taxa de Administração (${proposta.bdi.taxaAdministracaoPercent}%)`, proposta.bdi.taxaAdministracaoValor],
        ['2', `Lucro (${proposta.bdi.lucroPercent}%)`, proposta.bdi.lucroValor],
        ['', 'SUBTOTAL BDI', proposta.bdi.subtotal]
      ];
      const bdiSheet = XLSX.utils.aoa_to_sheet(bdiData);
      XLSX.utils.book_append_sheet(workbook, bdiSheet, 'BDI');

      // Aba: Impostos
      const impostosData = [
        ['Item', 'Descrição', 'Valor'],
        ['1', `COFINS (${proposta.impostos.cofinsPercent}%)`, proposta.impostos.cofinsValor],
        ['2', `PIS (${proposta.impostos.pisPercent}%)`, proposta.impostos.pisValor],
        ['3', `ISSQN (${proposta.impostos.issqnPercent}%)`, proposta.impostos.issqnValor],
        ['4', `IR (${proposta.impostos.irPercent}%)`, proposta.impostos.irValor],
        ['5', `CSLL (${proposta.impostos.csllPercent}%)`, proposta.impostos.csllValor],
        ['', 'TOTAL IMPOSTOS', proposta.impostos.total]
      ];
      const impostosSheet = XLSX.utils.aoa_to_sheet(impostosData);
      XLSX.utils.book_append_sheet(workbook, impostosSheet, 'Impostos');

      // Salvar Excel
      const fileName = `proposta_acordo_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Sucesso",
        description: "Excel gerado com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o Excel.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="bg-seguranca-graphite border-gray-600">
        <CardHeader>
          <CardTitle className="text-seguranca-lightgray text-lg">Simulação de Proposta de Acordo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-seguranca-lightgray mb-1">Quantidade de Porteiros</label>
              <Input type="number" min={1} value={params.quantidadePorteiros} onChange={e => handleChange('quantidadePorteiros', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Salário do Porteiro (R$)</label>
              <Input type="number" min={0} step={0.01} value={params.salarioPorteiro} onChange={e => handleChange('salarioPorteiro', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Adicional Noturno (%)</label>
              <Input type="number" min={0} step={0.01} value={params.adicionalNoturnoPercent} onChange={e => handleChange('adicionalNoturnoPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Encargos (%)</label>
              <Input type="number" min={0} step={0.01} value={params.encargosPercent} onChange={e => handleChange('encargosPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Uniformes (Qtd)</label>
              <Input type="number" min={0} value={params.uniformeQuantidade} onChange={e => handleChange('uniformeQuantidade', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Valor Unitário Uniforme (R$)</label>
              <Input type="number" min={0} step={0.01} value={params.uniformeUnitario} onChange={e => handleChange('uniformeUnitario', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Equipamentos (Qtd)</label>
              <Input type="number" min={0} value={params.equipamentosQuantidade} onChange={e => handleChange('equipamentosQuantidade', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Valor Unitário Equipamento (R$)</label>
              <Input type="number" min={0} step={0.01} value={params.equipamentosUnitario} onChange={e => handleChange('equipamentosUnitario', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Taxa Administração (%)</label>
              <Input type="number" min={0} step={0.01} value={params.taxaAdministracaoPercent} onChange={e => handleChange('taxaAdministracaoPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">Lucro (%)</label>
              <Input type="number" min={0} step={0.01} value={params.lucroPercent} onChange={e => handleChange('lucroPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">COFINS (%)</label>
              <Input type="number" min={0} step={0.01} value={params.cofinsPercent} onChange={e => handleChange('cofinsPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">PIS (%)</label>
              <Input type="number" min={0} step={0.01} value={params.pisPercent} onChange={e => handleChange('pisPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">ISSQN (%)</label>
              <Input type="number" min={0} step={0.01} value={params.issqnPercent} onChange={e => handleChange('issqnPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">IR (%)</label>
              <Input type="number" min={0} step={0.01} value={params.irPercent} onChange={e => handleChange('irPercent', e.target.value)} />
            </div>
            <div>
              <label className="block text-seguranca-lightgray mb-1">CSLL (%)</label>
              <Input type="number" min={0} step={0.01} value={params.csllPercent} onChange={e => handleChange('csllPercent', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleCalcular} className="bg-seguranca-yellow text-black hover:bg-yellow-500">Calcular Proposta</Button>
          </div>
        </CardContent>
      </Card>

      {proposta && (
        <Card className="bg-seguranca-graphite border-gray-600">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray text-lg">Proposta Comercial Detalhada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-seguranca-yellow font-bold text-xl mb-2">Valor Final</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="text-3xl font-bold text-seguranca-yellow">R$ {proposta.resultado.valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-base font-normal text-gray-400">/ mês</span></div>
                <div className="text-xl font-bold text-seguranca-yellow">R$ {proposta.resultado.valorAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-base font-normal text-gray-400">/ ano</span></div>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-seguranca-lightgray font-semibold mb-2">Descrição do Serviço</h4>
              <p className="text-gray-300">{proposta.descricaoServico}</p>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-seguranca-lightgray font-semibold mb-2">I. Mão de Obra</h4>
              <ul className="text-gray-300 space-y-1">
                <li>Salário do Porteiro: <b>R$ {proposta.maoDeObra.salarioPorteiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b> x {proposta.maoDeObra.quantidadePorteiros} = <b>R$ {(proposta.maoDeObra.salarioPorteiro * proposta.maoDeObra.quantidadePorteiros).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>Adicional Noturno ({proposta.maoDeObra.adicionalNoturnoPercent}%): <b>R$ {proposta.maoDeObra.adicionalNoturnoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>Reflexo Adicional Noturno/HE/DSR: <b>R$ {proposta.maoDeObra.reflexoAdicional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>Subtotal: <b>R$ {proposta.maoDeObra.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>Encargos ({proposta.maoDeObra.encargosPercent}%): <b>R$ {proposta.maoDeObra.encargosValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li><b>Total Mão de Obra: R$ {proposta.maoDeObra.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
              </ul>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-seguranca-lightgray font-semibold mb-2">II. Materiais / Equipamentos / Uniformes, EPI's</h4>
              <ul className="text-gray-300 space-y-1">
                <li>Uniformes: <b>{proposta.materiais.uniformeQuantidade}</b> x R$ {proposta.materiais.uniformeUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = <b>R$ {(proposta.materiais.uniformeQuantidade * proposta.materiais.uniformeUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>Equipamentos: <b>{proposta.materiais.equipamentosQuantidade}</b> x R$ {proposta.materiais.equipamentosUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = <b>R$ {(proposta.materiais.equipamentosQuantidade * proposta.materiais.equipamentosUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li><b>Subtotal Materiais: R$ {proposta.materiais.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
              </ul>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-seguranca-lightgray font-semibold mb-2">III. BDI (Base de Cálculo do Lucro)</h4>
              <ul className="text-gray-300 space-y-1">
                <li>Taxa de Administração ({proposta.bdi.taxaAdministracaoPercent}%): <b>R$ {proposta.bdi.taxaAdministracaoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>Lucro ({proposta.bdi.lucroPercent}%): <b>R$ {proposta.bdi.lucroValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li><b>Subtotal BDI: R$ {proposta.bdi.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
              </ul>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-seguranca-lightgray font-semibold mb-2">IV. Impostos</h4>
              <ul className="text-gray-300 space-y-1">
                <li>COFINS ({proposta.impostos.cofinsPercent}%): <b>R$ {proposta.impostos.cofinsValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>PIS ({proposta.impostos.pisPercent}%): <b>R$ {proposta.impostos.pisValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>ISSQN ({proposta.impostos.issqnPercent}%): <b>R$ {proposta.impostos.issqnValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>IR ({proposta.impostos.irPercent}%): <b>R$ {proposta.impostos.irValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li>CSLL ({proposta.impostos.csllPercent}%): <b>R$ {proposta.impostos.csllValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
                <li><b>Total Impostos: R$ {proposta.impostos.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b></li>
              </ul>
            </div>

            {/* Botões de Exportação e Salvar */}
            <div className="border-t border-gray-700 pt-6 flex justify-end gap-3">
              {onSaveProposal && (
                <Button
                  onClick={async () => {
                    if (proposta && onSaveProposal) {
                      await onSaveProposal(proposta);
                    }
                  }}
                  className="bg-seguranca-yellow text-black hover:bg-yellow-500"
                >
                  Salvar Proposta
                </Button>
              )}
              <Button
                onClick={handleGeneratePDF}
                className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
              <Button
                onClick={handleGenerateExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Gerar Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Printable Area (Hidden) */}
      {proposta && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div id="proposta-acordo-printable">
            <StandardReportTemplate title="Proposta Comercial de Acordo">
              <div className="space-y-8 text-black">
                {/* Cabeçalho de Valores */}
                <div className="border-b-2 border-seguranca-yellow pb-4">
                  <h3 className="text-seguranca-yellow font-bold text-2xl mb-2">Resumo da Proposta</h3>
                  <div className="flex gap-10">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Valor Mensal</p>
                      <p className="text-2xl font-bold text-black">{formatCurrency(proposta.resultado.valorMensal)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Valor Anual</p>
                      <p className="text-2xl font-bold text-black">{formatCurrency(proposta.resultado.valorAnual)}</p>
                    </div>
                  </div>
                </div>

                {/* Descrição do Serviço */}
                <div>
                  <h4 className="text-sm font-bold bg-gray-100 p-2 border-l-4 border-seguranca-yellow uppercase">Descrição do Serviço</h4>
                  <p className="mt-2 text-sm text-gray-700 leading-relaxed">{proposta.descricaoServico}</p>
                </div>

                {/* Tabelas de Detalhamento */}
                <div className="space-y-6">
                  {/* Mão de Obra */}
                  <div>
                    <h4 className="text-xs font-bold mb-2 uppercase">I. Mão de Obra</h4>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="p-2 text-left">Item</th>
                          <th className="p-2 text-left">Descrição</th>
                          <th className="p-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2">1</td>
                          <td className="p-2">Salário base ({proposta.maoDeObra.quantidadePorteiros} funcionário(s))</td>
                          <td className="p-2 text-right">{formatCurrency(proposta.maoDeObra.salarioPorteiro * proposta.maoDeObra.quantidadePorteiros)}</td>
                        </tr>
                        <tr className="border-b bg-gray-50">
                          <td className="p-2">2</td>
                          <td className="p-2">Adicional Noturno ({proposta.maoDeObra.adicionalNoturnoPercent}%)</td>
                          <td className="p-2 text-right">{formatCurrency(proposta.maoDeObra.adicionalNoturnoValor)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">3</td>
                          <td className="p-2">Reflexo Adicional Noturno/HE/DSR</td>
                          <td className="p-2 text-right">{formatCurrency(proposta.maoDeObra.reflexoAdicional)}</td>
                        </tr>
                        <tr className="border-b bg-gray-50 font-bold">
                          <td className="p-2">4</td>
                          <td className="p-2">Subtotal</td>
                          <td className="p-2 text-right">{formatCurrency(proposta.maoDeObra.subtotal)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">5</td>
                          <td className="p-2">Encargos ({proposta.maoDeObra.encargosPercent}%)</td>
                          <td className="p-2 text-right">{formatCurrency(proposta.maoDeObra.encargosValor)}</td>
                        </tr>
                        <tr className="bg-gray-200 font-extrabold text-sm">
                          <td className="p-2" colSpan={2}>TOTAL MÃO DE OBRA</td>
                          <td className="p-2 text-right">{formatCurrency(proposta.maoDeObra.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Materiais e BDI (Lado a Lado) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold mb-2 uppercase">II. Materiais</h4>
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-gray-800 text-white">
                            <th className="p-2 text-left">Descrição</th>
                            <th className="p-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">Uniformes ({proposta.materiais.uniformeQuantidade})</td>
                            <td className="p-2 text-right">{formatCurrency(proposta.materiais.uniformeQuantidade * proposta.materiais.uniformeUnitario)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">Equipamentos ({proposta.materiais.equipamentosQuantidade})</td>
                            <td className="p-2 text-right">{formatCurrency(proposta.materiais.equipamentosQuantidade * proposta.materiais.equipamentosUnitario)}</td>
                          </tr>
                          <tr className="bg-gray-100 font-bold">
                            <td className="p-2">Total Materiais</td>
                            <td className="p-2 text-right">{formatCurrency(proposta.materiais.subtotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold mb-2 uppercase">III. BDI / Lucro</h4>
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="bg-gray-800 text-white">
                            <th className="p-2 text-left">Descrição</th>
                            <th className="p-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2">Taxa de Adm ({proposta.bdi.taxaAdministracaoPercent}%)</td>
                            <td className="p-2 text-right">{formatCurrency(proposta.bdi.taxaAdministracaoValor)}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2">Lucro Proposto ({proposta.bdi.lucroPercent}%)</td>
                            <td className="p-2 text-right">{formatCurrency(proposta.bdi.lucroValor)}</td>
                          </tr>
                          <tr className="bg-gray-100 font-bold">
                            <td className="p-2">Total BDI</td>
                            <td className="p-2 text-right">{formatCurrency(proposta.bdi.subtotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Impostos */}
                  <div>
                    <h4 className="text-xs font-bold mb-2 uppercase">IV. Impostos</h4>
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="p-2 text-left">COFINS</th>
                          <th className="p-2 text-left">PIS</th>
                          <th className="p-2 text-left">ISSQN</th>
                          <th className="p-2 text-left">IR</th>
                          <th className="p-2 text-left">CSLL</th>
                          <th className="p-2 text-right">TOTAL IMPOSTOS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2">{formatCurrency(proposta.impostos.cofinsValor)}</td>
                          <td className="p-2">{formatCurrency(proposta.impostos.pisValor)}</td>
                          <td className="p-2">{formatCurrency(proposta.impostos.issqnValor)}</td>
                          <td className="p-2">{formatCurrency(proposta.impostos.irValor)}</td>
                          <td className="p-2">{formatCurrency(proposta.impostos.csllValor)}</td>
                          <td className="p-2 text-right font-bold bg-gray-100">{formatCurrency(proposta.impostos.total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assinaturas */}
                <div className="mt-20 flex justify-between gap-10">
                  <div className="flex-1 text-center border-t border-gray-300 pt-2">
                    <p className="text-xs font-bold">SECURED GUARD</p>
                    <p className="text-[10px] text-gray-500 uppercase">Responsável Comercial</p>
                  </div>
                  <div className="flex-1 text-center border-t border-gray-300 pt-2">
                    <p className="text-xs font-bold">CLIENTE / INTERESSADO</p>
                    <p className="text-[10px] text-gray-500 uppercase">Aceite e Assinatura</p>
                  </div>
                </div>
              </div>
            </StandardReportTemplate>
          </div>
        </div>
      )}
    </div>
  );
}