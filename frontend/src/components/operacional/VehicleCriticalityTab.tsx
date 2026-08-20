import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertOctagon, 
  ShieldAlert, 
  Car, 
  Wrench, 
  Download, 
  Disc, 
  Siren, 
  Lightbulb, 
  FileText, 
  Droplet, 
  Wind, 
  Sparkles, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { CRITICALITY_MATRIX_ITEMS, vehicleCriticalityService } from '@/services/vehicleCriticalityService';
import { vehicleChecklistService, VehicleChecklist } from '@/services/vehicleChecklistService';
import api from '@/lib/axios';

export const VehicleCriticalityTab: React.FC = () => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'MATRIZ' | 'MONITOR' | 'MANUTENCAO'>('MATRIZ');

  // Viaturas com Bloqueio Imediato provenientes dos checklists
  const [checklistsAvariados, setChecklistsAvariados] = useState<VehicleChecklist[]>([]);
  const [loadingMonitor, setLoadingMonitor] = useState(false);

  // Frota
  const [veiculos, setVeiculos] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingMonitor(true);
      const checklists = await vehicleChecklistService.getAll();
      if (Array.isArray(checklists)) {
        // Filtrar checklists que reprovaram algum item crítico
        const bloqueadas = checklists.filter((c) => {
          const falhaCritica = 
            !c.pneus || 
            !c.faroisLanternas || 
            !c.giroflexSirene || 
            !c.buzina || 
            !c.niveis || 
            !c.painel || 
            !c.documentacao;
          return falhaCritica || c.conformityStatus === 'COM_AVARIA';
        });
        setChecklistsAvariados(bloqueadas);
      }

      const resVeic = await api.get('/api/vehicles');
      setVeiculos(Array.isArray(resVeic.data) ? resVeic.data : []);
    } catch (error) {
      console.error('Erro ao carregar monitor de viaturas:', error);
    } finally {
      setLoadingMonitor(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const blob = await vehicleCriticalityService.downloadPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'matriz-criticidade-viaturas.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Sucesso',
        description: 'Matriz de Criticidade baixada em PDF!',
      });
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o PDF da matriz de criticidade.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  const getComponentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Disc': return <Disc className="w-4 h-4 text-rose-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'Siren': return <Siren className="w-4 h-4 text-rose-400" />;
      case 'Lightbulb': return <Lightbulb className="w-4 h-4 text-rose-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'Droplet': return <Droplet className="w-4 h-4 text-rose-400" />;
      case 'Car': return <Car className="w-4 h-4 text-amber-400" />;
      case 'Wind': return <Wind className="w-4 h-4 text-amber-400" />;
      case 'Sparkles': return <Sparkles className="w-4 h-4 text-emerald-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Indicadores do Topo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Itens de Bloqueio Imediato</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-400 mt-0.5">6 Componentes</p>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Viaturas Bloqueadas</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-500 mt-0.5">{checklistsAvariados.length}</p>
            </div>
            <div className="p-2.5 bg-rose-950 text-rose-400 rounded-xl border border-rose-800">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Falhas Toleráveis</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-0.5">3 Categorias</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow">
          <CardContent className="p-3.5 sm:p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Total Frota Monitorada</p>
              <p className="text-xl sm:text-2xl font-bold text-seguranca-yellow mt-0.5">{veiculos.length} Veículos</p>
            </div>
            <div className="p-2.5 bg-slate-800 text-seguranca-yellow rounded-xl">
              <Car className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Navegação das Visões */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                <span>Matriz de Criticidade de Viaturas & Manutenção Preventiva</span>
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Definição de falhas que exigem parada imediata (Viatura Baixada) e cronograma de revisões por Km.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-slate-950 font-bold h-9 text-xs px-3.5 flex items-center gap-1.5 shadow"
              >
                {downloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Baixar Matriz em PDF
              </Button>
            </div>
          </div>

          {/* Sub-Tabs de Navegação */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-800/80 mt-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('MATRIZ')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeSubTab === 'MATRIZ'
                  ? 'bg-seguranca-yellow text-slate-950 font-bold shadow'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" /> 1. Matriz de Criticidade (Bloqueio)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('MONITOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeSubTab === 'MONITOR'
                  ? 'bg-rose-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> 2. Monitor Viaturas Baixadas ({checklistsAvariados.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('MANUTENCAO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                activeSubTab === 'MANUTENCAO'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" /> 3. Guia de Manutenção por Km
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* VISÃO 1: MATRIZ DE CRITICIDADE */}
          {activeSubTab === 'MATRIZ' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-gray-300">
                <p className="leading-relaxed">
                  <strong className="text-seguranca-yellow">Regra Operacional:</strong> Esta matriz define o que é uma falha tolerável e o que exige a parada imediata do veículo (<strong>Viatura Baixada</strong>), evitando acidentes e multas pesadas durante a fiscalização nas ruas.
                </p>
              </div>

              {/* Cards Mobile */}
              <div className="block md:hidden space-y-2.5">
                {CRITICALITY_MATRIX_ITEMS.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border space-y-1.5 ${
                      item.nivel === 'CRITICO'
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : item.nivel === 'TOLERAVEL'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-emerald-950/20 border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getComponentIcon(item.icone)}
                        <span className="text-xs font-bold text-white">{item.componente}</span>
                      </div>
                      {item.nivel === 'CRITICO' ? (
                        <Badge className="bg-rose-600 text-white text-[10px] py-0.5 px-2">
                          BLOQUEIO IMEDIATO
                        </Badge>
                      ) : item.nivel === 'TOLERAVEL' ? (
                        <Badge className="bg-amber-600 text-white text-[10px] py-0.5 px-2">
                          Tolerável
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] py-0.5 px-2">
                          Baixa
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-300">
                      <strong>Falha:</strong> {item.tipoFalha}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      <strong>Ação:</strong> {item.acao}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tabela Desktop */}
              <div className="hidden md:block rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 bg-slate-950">
                      <TableHead className="text-gray-300 font-semibold w-[20%]">Componente</TableHead>
                      <TableHead className="text-gray-300 font-semibold w-[50%]">Tipo de Falha</TableHead>
                      <TableHead className="text-gray-300 font-semibold w-[30%] text-right">Ação Obrigatória</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CRITICALITY_MATRIX_ITEMS.map((item) => (
                      <TableRow
                        key={item.id}
                        className={`border-slate-800 transition-colors ${
                          item.nivel === 'CRITICO'
                            ? 'hover:bg-rose-950/20'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <TableCell className="font-semibold text-white text-xs">
                          <div className="flex items-center gap-2">
                            {getComponentIcon(item.icone)}
                            <span>{item.componente}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs">
                          {item.tipoFalha}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.nivel === 'CRITICO' ? (
                            <Badge className="bg-rose-600 text-white font-bold text-xs py-1 px-3">
                              🛑 Bloqueio Imediato (Viatura Baixada)
                            </Badge>
                          ) : item.nivel === 'TOLERAVEL' ? (
                            <Badge className="bg-amber-600 text-white text-xs py-0.5 px-2.5">
                              ⚠️ Tolerável (Reparo Programado)
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white text-xs py-0.5 px-2.5">
                              🟢 Baixa Prioridade (Monitorar)
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* VISÃO 2: MONITOR DE VIATURAS BAIXADAS */}
          {activeSubTab === 'MONITOR' && (
            <div className="space-y-4">
              <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-500/40 text-xs text-rose-200">
                <p>
                  <strong>Alerta em Tempo Real:</strong> Viaturas reprovadas em checklists diários recentes com bloqueio imediato ativo. Nenhuma viatura listada abaixo deve sair para rua antes da manutenção e liberação do supervisor.
                </p>
              </div>

              {loadingMonitor ? (
                <div className="py-12 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                  Verificando checklists de viaturas...
                </div>
              ) : checklistsAvariados.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">Nenhuma viatura bloqueada no momento!</p>
                  <p className="text-xs text-gray-400 mt-1">Todas as viaturas com checklists diários estão em conformidade.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {checklistsAvariados.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-rose-500/50 bg-slate-950 space-y-2 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className="bg-rose-600 text-white font-bold text-xs py-1 px-2.5">
                          🛑 VIATURA BAIXADA
                        </Badge>
                        <span className="text-xs text-gray-400">{item.checklistDate}</span>
                      </div>

                      <div>
                        <p className="text-base font-bold font-mono text-seguranca-yellow">
                          {item.plate} <span className="text-xs font-sans text-gray-300 font-normal">({item.model || 'Viatura Operacional'})</span>
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                          Condutor/Supervisor: <strong>{item.employeeName || item.supervisorName || '-'}</strong>
                        </p>
                        {item.currentKm && (
                          <p className="text-xs text-gray-400 mt-0.5">Km: {item.currentKm} km</p>
                        )}
                      </div>

                      {/* Itens Reprovados */}
                      <div className="p-2 bg-rose-950/40 rounded-lg border border-rose-900 text-xs space-y-1 text-rose-200">
                        <span className="font-semibold block text-[11px] text-rose-400 uppercase">Avarias Detectadas:</span>
                        {!item.pneus && <div>• Pneus com desgaste/avaria (Bloqueio)</div>}
                        {!item.faroisLanternas && <div>• Faróis ou lanternas inoperantes (Bloqueio)</div>}
                        {!item.giroflexSirene && <div>• Giroflex ou sirene sem funcionar (Bloqueio)</div>}
                        {!item.buzina && <div>• Buzina inoperante (Bloqueio)</div>}
                        {!item.niveis && <div>• Nível de óleo ou água comprometido (Bloqueio)</div>}
                        {!item.painel && <div>• Luz de advertência acesa no painel (Bloqueio)</div>}
                        {!item.documentacao && <div>• CRLV ausente no veículo (Bloqueio)</div>}
                        {item.observations && (
                          <p className="text-[11px] text-gray-300 pt-1 italic">
                            Obs: "{item.observations}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VISÃO 3: GUIA DE MANUTENÇÃO POR KM */}
          {activeSubTab === 'MANUTENCAO' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-gray-300">
                <p>
                  <strong>Metas de Quilometragem Rodada:</strong> Diretrizes de manutenção preventiva para carros e motos da supervisão operacional:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 5.000 km */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs">
                      A CADA 5.000 KM (OU 6 MESES)
                    </Badge>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1.5 pt-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>Óleo do Motor e Filtro:</strong> Troca obrigatória (frotas operacionais exigem mais do motor pelo uso severo em marcha lenta/paradas).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span><strong>Filtro de Combustível e de Ar:</strong> Inspeção e troca se o ambiente dos postos for muito empoeirado.</span>
                    </li>
                  </ul>
                </div>

                {/* 10.000 km */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold text-xs">
                      A CADA 10.000 KM
                    </Badge>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1.5 pt-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>Pastilhas de Freio:</strong> Inspeção visual da espessura (substituir se estiver abaixo de 3mm).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>Rodízio de Pneus:</strong> Inverter pneus dianteiros com os traseiros + Alinhamento e balanceamento.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span><strong>Filtro de Cabine (Ar Condicionado):</strong> Troca para preservar a saúde dos supervisores.</span>
                    </li>
                  </ul>
                </div>

                {/* 20.000 km */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-seguranca-yellow/20 text-seguranca-yellow border border-seguranca-yellow/40 font-bold text-xs">
                      A CADA 20.000 KM
                    </Badge>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1.5 pt-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-seguranca-yellow font-bold">•</span>
                      <span><strong>Velas de Ignição:</strong> Troca do jogo completo para evitar falhas em perseguições e consumo alto de combustível.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-seguranca-yellow font-bold">•</span>
                      <span><strong>Fluído de Freio:</strong> Sangria e troca completa do fluido (essencial para frotas que rodam 24h).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-seguranca-yellow font-bold">•</span>
                      <span><strong>Sistema de Suspensão:</strong> Revisão de amortecedores, batentes, buchas e pivôs.</span>
                    </li>
                  </ul>
                </div>

                {/* 40.000 / 50.000 km */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs">
                      A CADA 40.000 KM A 50.000 KM
                    </Badge>
                  </div>
                  <ul className="text-xs text-gray-300 space-y-1.5 pt-1">
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span><strong>Correia Dentada (Se houver):</strong> Troca preventiva com tensor (a quebra desse item destrói o motor).</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span><strong>Pneus:</strong> Troca do jogo de pneus se atingiram o limite de desgaste (TWI).</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
