import React, { useState, useEffect } from 'react';
import { feriasService } from '../../services/feriasService';
import { operationalService } from '../../services/operationalService';
import { employeeService, Employee } from '../../services/employeeService';
import { FeriasTipo, FeriasPeriodo, CreateFeriasRequest, UpdateFeriasRequest } from '../../types/ferias';
import { 
  calcularPeriodoAquisitivo, 
  calcularDataFimFerias,
  PeriodoAquisitivoInfo, 
  formatBr 
} from '../../utils/feriasPeriodo';
import { 
  validarInicioFeriasClt, 
  CltValidationResult 
} from '../../utils/feriasCltValidator';
import { isEscala12x36 as checkIsEscala12x36 } from '../../utils/workSchedule';
import { SearchableSelect, Option } from '../ui/searchable-select';
import { X, Calendar, User, FileText, AlertTriangle, CheckCircle2, Clock, Users, UserCheck, ShieldAlert, Award, Ban } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  editingId?: string; // ID do registro sendo editado
  initialData?: CreateFeriasRequest;
  /** Funcionário pré-selecionado (ex: botão "Agendar" nos alertas de período aquisitivo) */
  initialEmployeeId?: string;
}

const tipoOptions = [
  { value: 'FERIAS_NORMAIS', label: 'Férias Normais (30 dias)' },
  { value: 'FERIAS_VENDIDAS', label: 'Férias Vendidas (até 10 dias)' },
  { value: 'ABONO_PECUNIARIO', label: 'Abono Pecuniário' },
];

const turnoOptions = [
  { value: 'DAY', label: 'Diurno' },
  { value: 'NIGHT', label: 'Noturno' },
  { value: 'MIXED', label: 'Misto' },
];

type ModalidadeFerias = '30' | '20' | 'CLT';

const FeriasFormModal: React.FC<Props> = ({ onSuccess, onClose, editingId, initialData, initialEmployeeId }) => {
  const [form, setForm] = useState<CreateFeriasRequest>({
    employeeId: initialEmployeeId || '',
    periodoAquisitivo: '',
    dataInicio: '',
    dataFim: '',
    tipo: 'FERIAS_NORMAIS',
    observacoes: ''
  });
  const [modalidade, setModalidade] = useState<ModalidadeFerias>('30');
  const [diasGozo, setDiasGozo] = useState<number>(30);
  const [cltValidacao, setCltValidacao] = useState<CltValidationResult>({ valid: true });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [periodoInfo, setPeriodoInfo] = useState<PeriodoAquisitivoInfo | null>(null);
  const [coberturaAtiva, setCoberturaAtiva] = useState(false);
  const [coberturaSubstituto, setCoberturaSubstituto] = useState('');
  const [coberturaTurno, setCoberturaTurno] = useState<'DAY' | 'NIGHT' | 'MIXED'>('DAY');
  const [manual12x36, setManual12x36] = useState<boolean>(false);

  const periodoAutoRef = React.useRef<string>('');

  useEffect(() => {
    // Se estiver editando, tentar buscar dados completos do backend ou usar initialData como fallback
    if (editingId) {
      feriasService.getFeriasById(editingId).then((ferias) => {
        setForm({
          employeeId: ferias.employeeId || '',
          periodoAquisitivo: ferias.periodoAquisitivo || '',
          dataInicio: ferias.dataInicio,
          dataFim: ferias.dataFim,
          tipo: ferias.tipo,
          observacoes: ferias.observacoes || ''
        });
        setStatus(ferias.status);

        // Detectar modalidade baseada nas datas
        if (ferias.dataInicio && ferias.dataFim) {
          const d1 = new Date(ferias.dataInicio + 'T00:00:00');
          const d2 = new Date(ferias.dataFim + 'T00:00:00');
          const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          setDiasGozo(diff);
          if (diff === 30) setModalidade('30');
          else if (diff === 20) setModalidade('20');
          else setModalidade('CLT');
        }
      }).catch((error) => {
        console.warn('Registro de férias não encontrado no backend, usando initialData como fallback:', error);
        if (initialData) {
          setForm(initialData);
        } else {
          setError('Registro de férias não encontrado ou indisponível.');
        }
      });
    } else if (initialData) {
      setForm(initialData);
    } else if (initialEmployeeId) {
      setForm(prev => ({
        ...prev,
        employeeId: initialEmployeeId
      }));
    }
    // Buscar todos os funcionários (garantindo lista completa para seleção e substituição)
    employeeService.fetchAllEmployeesForReport()
      .then(emps => {
        if (emps && emps.length > 0) {
          setEmployees(emps);
        } else {
          employeeService.getAllEmployees(undefined, 0, 1000).then(setEmployees);
        }
      })
      .catch(() => {
        employeeService.getAllEmployees(undefined, 0, 1000).then(setEmployees);
      });
  }, [editingId, initialData, initialEmployeeId]);

  // Período aquisitivo calculado pela admissão + últimas férias do funcionário
  useEffect(() => {
    let cancelled = false;

    if (!form.employeeId) {
      setPeriodoInfo(null);
      return;
    }

    const emp = employees.find(e => e.id === form.employeeId);

    feriasService.getFeriasByEmployee(form.employeeId)
      .then((lista) => {
        if (cancelled) return;
        const historico = (lista || []).map((f) => ({
          dataInicio: f.dataInicio || (f as { startDate?: string }).startDate,
          dataFim: f.dataFim || (f as { endDate?: string }).endDate,
          periodoAquisitivo: f.periodoAquisitivo,
          status: f.status
        }));
        const info = calcularPeriodoAquisitivo(emp?.hireDate, historico);
        setPeriodoInfo(info);
        if (!editingId && info.periodo) {
          setForm(prev => {
            if (prev.periodoAquisitivo && prev.periodoAquisitivo !== periodoAutoRef.current) {
              return prev; // usuário digitou manualmente
            }
            periodoAutoRef.current = info.periodo;
            return { ...prev, periodoAquisitivo: info.periodo };
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeriodoInfo(calcularPeriodoAquisitivo(emp?.hireDate, []));
        }
      });

    return () => { cancelled = true; };
  }, [form.employeeId, employees, editingId]);

  // Fechar com ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Atualiza modalidade selecionada (30 dias, 20 dias com abono ou CLT)
  const handleSelectModalidade = (novaModalidade: ModalidadeFerias) => {
    setModalidade(novaModalidade);
    let novosDias = diasGozo;
    let novoTipo: FeriasTipo = form.tipo;

    if (novaModalidade === '30') {
      novosDias = 30;
      novoTipo = 'FERIAS_NORMAIS';
    } else if (novaModalidade === '20') {
      novosDias = 20;
      novoTipo = 'ABONO_PECUNIARIO';
    }

    setDiasGozo(novosDias);

    // Recalcular data fim se já houver data de início
    if (form.dataInicio) {
      const novaFim = calcularDataFimFerias(form.dataInicio, novosDias);
      setForm(prev => ({
        ...prev,
        tipo: novoTipo,
        dataFim: novaFim
      }));
    } else {
      setForm(prev => ({ ...prev, tipo: novoTipo }));
    }
  };

  // Helper robusto para verificar se a escala do colaborador é 12x36
  const isEmployee12x36 = (emp?: Employee): boolean => {
    if (!emp) return false;
    return checkIsEscala12x36(emp.escalaTrabalho, emp.diasTrabalho, emp.horarioTrabalho);
  };

  const selectedEmployee = employees.find(e => e.id === form.employeeId);
  const detected12x36 = isEmployee12x36(selectedEmployee);
  const isEffective12x36 = manual12x36 || detected12x36;

  // Atualizar manual12x36 automaticamente quando o funcionário for alterado
  useEffect(() => {
    if (selectedEmployee) {
      setManual12x36(isEmployee12x36(selectedEmployee));
    }
  }, [selectedEmployee]);

  // Opções para o SearchableSelect de Funcionário
  const employeeOptions: Option[] = React.useMemo(() => {
    const list = employees.map(emp => {
      const escalaBadge = isEmployee12x36(emp) ? 'Escala 12x36' : (emp.diasTrabalho || emp.escalaTrabalho || '');
      const descParts = [
        emp.cpf ? `CPF: ${emp.cpf}` : '',
        emp.company?.name || emp.empresaNome || '',
        escalaBadge
      ].filter(Boolean);

      return {
        value: emp.id,
        label: emp.name,
        description: descParts.join(' • '),
        searchTerms: [emp.cpf || '', emp.registrationNumber || '', emp.workPost?.name || '']
      };
    });

    return list.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [employees]);

  // Opções para o SearchableSelect de Substituto (exclui o próprio funcionário e ordena de A a Z)
  const substituteOptions: Option[] = React.useMemo(() => {
    const list: Option[] = [
      {
        value: 'sem_cobertura',
        label: 'Sem cobertura (o sistema registrará como "Sem Cobertura")',
        description: 'Nenhum substituto escalado'
      }
    ];

    const subs = employees
      .filter(emp => emp.id !== form.employeeId)
      .map(emp => {
        const escalaBadge = isEmployee12x36(emp) ? 'Escala 12x36' : (emp.diasTrabalho || emp.escalaTrabalho || '');
        const descParts = [
          emp.cpf ? `CPF: ${emp.cpf}` : '',
          emp.company?.name || emp.empresaNome || '',
          escalaBadge
        ].filter(Boolean);

        return {
          value: emp.id,
          label: emp.name,
          description: descParts.join(' • '),
          searchTerms: [emp.cpf || '', emp.registrationNumber || '', emp.workPost?.name || '']
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

    return [...list, ...subs];
  }, [employees, form.employeeId]);

  // Função centralizada para aplicar e validar Data de Início
  const aplicarDataInicio = (novaDataInicio: string, customIs12x36?: boolean) => {
    const is12x36 = customIs12x36 !== undefined ? customIs12x36 : isEffective12x36;
    const validacao = validarInicioFeriasClt(novaDataInicio, [], is12x36);
    setCltValidacao(validacao);
    const novaFim = calcularDataFimFerias(novaDataInicio, diasGozo);
    setForm(prev => ({
      ...prev,
      dataInicio: novaDataInicio,
      dataFim: novaFim
    }));
  };

  // Revalida a data de início quando o colaborador selecionado ou regime 12x36 mudar
  useEffect(() => {
    if (form.dataInicio) {
      const validacao = validarInicioFeriasClt(form.dataInicio, [], isEffective12x36);
      setCltValidacao(validacao);
    }
  }, [form.employeeId, isEffective12x36]);

  // Ao alterar Data de Início -> valida regras CLT e calcula automaticamente a Data de Fim
  const handleDataInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    aplicarDataInicio(e.target.value);
  };

  // Ao alterar Total de Dias no modo CLT -> calcula automaticamente a Data de Fim
  const handleDiasGozoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = parseInt(e.target.value, 10);
    const dias = isNaN(valor) ? 0 : valor;
    setDiasGozo(dias);

    if (form.dataInicio && dias > 0) {
      const novaFim = calcularDataFimFerias(form.dataInicio, dias);
      setForm(prev => ({
        ...prev,
        dataFim: novaFim
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (!form.employeeId) throw new Error('Selecione o funcionário');

      // BLOQUEIO CLT: Não permitir agendamento de férias para colaborador com menos de 12 meses de empresa
      if (periodoInfo?.menosDe12Meses && !editingId) {
        throw new Error(
          `Agendamento bloqueado: O colaborador possui menos de 12 meses de admissão. Conforme a CLT (Art. 130), o direito às férias individuais só é adquirido após completar 1 ano de trabalho. Disponível a partir de ${formatBr(periodoInfo.disponivelEm)}.`
        );
      }

      // BLOQUEIO CLT: Regra de 2 dias antes de DSR ou Feriados (Art. 134, § 3º)
      if (!cltValidacao.valid && !editingId) {
        throw new Error(cltValidacao.mensagem || 'A data de início viola o Art. 134, § 3º da CLT.');
      }

      if (!form.periodoAquisitivo) throw new Error('Informe o período aquisitivo');
      if (!form.dataInicio) throw new Error('Informe a data de início');
      if (!form.dataFim) throw new Error('Informe a data de fim');

      // Validação de fracionamento CLT quando modalidade for CLT
      if (modalidade === 'CLT') {
        if (diasGozo < 5) {
          throw new Error('Pela CLT (Art. 134, §1º), nenhum período fracionado de férias pode ser inferior a 5 dias corridos.');
        }
      }

      let feriasCriada: FeriasPeriodo | null = null;

      // Se houver editingId, é uma edição - usar updateFerias
      if (editingId) {
        const updateData: UpdateFeriasRequest = {
          dataInicio: form.dataInicio,
          dataFim: form.dataFim,
          tipo: form.tipo,
          status: status || undefined,
          observacoes: form.observacoes || undefined
        };
        await feriasService.updateFerias(editingId, updateData);
      } else {
        feriasCriada = await feriasService.createFerias(form);

        // Cobertura (substituição) durante o período de férias
        if (coberturaAtiva && feriasCriada?.id) {
          try {
            await operationalService.createVacationCoverage({
              vacationId: feriasCriada.id,
              employeeId: form.employeeId,
              substituteEmployeeId: coberturaSubstituto || undefined,
              startDate: new Date(form.dataInicio).toISOString().split('T')[0],
              endDate: new Date(form.dataFim).toISOString().split('T')[0],
              shift: coberturaTurno,
              observations: form.observacoes || undefined
            });
          } catch (covErr) {
            console.warn('Férias lançadas, mas a cobertura não pôde ser criada:', covErr);
          }
        }
      }
      onSuccess();
    } catch (err: any) {
      const serverMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(serverMessage || (editingId ? 'Erro ao atualizar solicitação de férias' : 'Erro ao salvar solicitação de férias'));
      console.error('❌ Erro backend ao salvar férias:', serverMessage, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderPeriodoAlert = () => {
    if (!form.employeeId) {
      return (
        <div className="rounded border border-gray-600 bg-seguranca-graphite p-3 text-xs sm:text-sm text-gray-400 flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Selecione o funcionário para consultar automaticamente o período aquisitivo (admissão + últimas férias).</span>
        </div>
      );
    }

    if (!periodoInfo || periodoInfo.status === 'SEM_ADMISSAO') {
      return (
        <div className="rounded border border-yellow-600 bg-yellow-900/20 p-3 text-xs sm:text-sm text-yellow-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Não foi possível calcular o período aquisitivo: cadastre a data de admissão do funcionário na ficha cadastral.</span>
        </div>
      );
    }

    const funcionario = employees.find(e => e.id === form.employeeId)?.name || 'O funcionário';

    // REGRA CLT: Menos de 12 meses de admissão -> BLOQUEIO IMPEDITIVO
    if (periodoInfo.menosDe12Meses || periodoInfo.status === 'SEM_PERIODO') {
      return (
        <div className="rounded-xl border border-red-500 bg-red-950/40 p-4 text-xs sm:text-sm text-red-200 flex items-start gap-3 shadow-lg">
          <Ban className="h-6 w-6 mt-0.5 shrink-0 text-red-400" />
          <div className="space-y-1">
            <p className="font-bold text-red-300 text-sm sm:text-base uppercase tracking-wide">
              Agendamento de Férias Bloqueado (Art. 130 da CLT)
            </p>
            <p className="leading-relaxed">
              <strong>{funcionario}</strong> possui <strong>menos de 12 meses de trabalho</strong> na empresa. Pela legislação trabalhista brasileira, o empregado só adquire o direito de usufruir férias individuais após a conclusão integral do primeiro Período Aquisitivo (12 meses).
            </p>
            <p className="font-semibold text-red-100 pt-1">
              🗓️ Concessão permitida a partir de: <strong>{formatBr(periodoInfo.disponivelEm)}</strong> (faltam {periodoInfo.diasParaDisponibilizar} dias).
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Informativo de histórico de férias prévias */}
        {periodoInfo.jaTirouFerias ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs sm:text-sm text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-200">
                <strong>Cálculo a partir das Últimas Férias:</strong> {funcionario} já possui <strong>{periodoInfo.totalFeriasGozadas} período(s) de férias</strong> gozados na empresa.
              </p>
              <p className="text-emerald-400/90 text-xs mt-0.5">
                Próximo período aquisitivo calculado sequencialmente: <strong>{periodoInfo.periodo}</strong>. Limite concessivo para gozo sem dobra (Art. 134 CLT): <strong>{formatBr(periodoInfo.limiteConcessivo)}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-blue-500/40 bg-blue-950/20 p-3 text-xs sm:text-sm text-blue-300 flex items-start gap-2.5">
            <Award className="h-5 w-5 mt-0.5 shrink-0 text-blue-400" />
            <div>
              <p className="font-medium text-blue-200">
                <strong>1º Período Aquisitivo Completo:</strong> O colaborador já atingiu 12 meses de casa e está elegível para suas primeiras férias individuais.
              </p>
              <p className="text-blue-400/90 text-xs mt-0.5">
                Período aquisitivo ativo: <strong>{periodoInfo.periodo}</strong>. Limite para gozo: <strong>{formatBr(periodoInfo.limiteConcessivo)}</strong>.
              </p>
            </div>
          </div>
        )}

        {periodoInfo.status === 'VENCENDO' && (
          <div className="rounded-lg border border-orange-500 bg-orange-500/10 p-2.5 text-xs text-orange-300 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-orange-400" />
            <span>
              <strong>Atenção ao Limite Concessivo:</strong> Faltam <strong>{periodoInfo.diasParaVencer} dias</strong> para o vencimento do prazo de concessão deste período. Programe o gozo para evitar pagamento em dobro (Art. 137 CLT).
            </span>
          </div>
        )}
      </div>
    );
  };

  const isAgendamentoBloqueado = periodoInfo?.menosDe12Meses && !editingId;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn" 
      onClick={handleOverlayClick}
    >
      <div 
        className="bg-seguranca-darkgray border border-seguranca-graphite rounded-xl w-full max-w-2xl sm:max-w-3xl overflow-hidden shadow-2xl my-auto animate-scaleIn max-h-[92vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed & Always Visible */}
        <div className="shrink-0 flex justify-between items-center px-4 py-3.5 sm:px-6 sm:py-4 border-b border-seguranca-graphite bg-seguranca-graphite/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-seguranca-yellow">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {editingId ? 'Editar Solicitação de Férias' : 'Nova Solicitação de Férias (CLT)'}
              </h2>
              <p className="text-xs text-gray-400 hidden sm:block">
                Agendamento e controle de período de gozo em conformidade trabalhista
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-seguranca-graphite"
            title="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Primeira linha - Funcionário e Período Aquisitivo */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                  Funcionário
                </label>
                <SearchableSelect
                  options={employeeOptions}
                  value={form.employeeId}
                  onChange={(val) => {
                    const chosenId = val === 'all' ? '' : val;
                    const chosenEmp = employees.find(e => e.id === chosenId);
                    const is12 = isEmployee12x36(chosenEmp);
                    setManual12x36(is12);
                    setForm(prev => ({ ...prev, employeeId: chosenId }));
                    if (form.dataInicio) {
                      aplicarDataInicio(form.dataInicio, is12);
                    }
                  }}
                  placeholder="Selecione o funcionário..."
                  searchPlaceholder="Digite nome, CPF ou posto para buscar..."
                  emptyPlaceholder="Nenhum funcionário encontrado."
                  minSearchChars={0}
                  className="w-full text-sm"
                />
                {form.employeeId && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={isEffective12x36}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setManual12x36(checked);
                          if (form.dataInicio) {
                            aplicarDataInicio(form.dataInicio, checked);
                          }
                        }}
                        className="accent-seguranca-yellow h-3.5 w-3.5"
                      />
                      <span>Regime Escala 12x36 (Permite início em sexta, sábado ou domingo)</span>
                    </label>
                    {isEffective12x36 && (
                      <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium">
                        12x36 Ativo
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                  Período Aquisitivo
                </label>
                <input 
                  type="text" 
                  name="periodoAquisitivo" 
                  value={form.periodoAquisitivo} 
                  onChange={handleChange} 
                  placeholder="Ex: 2024/2025"
                  className="w-full p-2.5 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm" 
                  required 
                />
                {periodoInfo?.periodo && (
                  <p className="text-xs text-gray-400 mt-1">
                    Preenchido automaticamente a partir da admissão e últimas férias.
                  </p>
                )}
              </div>
            </div>

            {/* Alerta do período aquisitivo (admissão + últimas férias) */}
            {renderPeriodoAlert()}

            {/* SELEÇÃO DE MODALIDADE DE FÉRIAS (30 DIAS, 20 DIAS OU DE ACORDO COM A CLT) */}
            <div>
              <label className="block text-seguranca-lightgray mb-1.5 text-sm font-medium">
                Modalidade de Gozo (CLT)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectModalidade('30')}
                  disabled={isAgendamentoBloqueado}
                  className={`p-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    modalidade === '30'
                      ? 'bg-seguranca-yellow text-seguranca-black border-seguranca-yellow shadow-md'
                      : 'bg-seguranca-graphite text-gray-300 border-gray-600 hover:border-gray-500'
                  } ${isAgendamentoBloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>☀️ 30 Dias (Integral)</span>
                  <span className="text-[11px] font-normal opacity-85">Gozo de 30 dias corridos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectModalidade('20')}
                  disabled={isAgendamentoBloqueado}
                  className={`p-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    modalidade === '20'
                      ? 'bg-seguranca-yellow text-seguranca-black border-seguranca-yellow shadow-md'
                      : 'bg-seguranca-graphite text-gray-300 border-gray-600 hover:border-gray-500'
                  } ${isAgendamentoBloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>💰 20 Dias + 10 Abono</span>
                  <span className="text-[11px] font-normal opacity-85">20 dias gozo + 1/3 vendido</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectModalidade('CLT')}
                  disabled={isAgendamentoBloqueado}
                  className={`p-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                    modalidade === 'CLT'
                      ? 'bg-seguranca-yellow text-seguranca-black border-seguranca-yellow shadow-md'
                      : 'bg-seguranca-graphite text-gray-300 border-gray-600 hover:border-gray-500'
                  } ${isAgendamentoBloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>⚖️ De acordo com a CLT</span>
                  <span className="text-[11px] font-normal opacity-85">Fracionamento (mín. 5 ou 14)</span>
                </button>
              </div>
            </div>

            {/* SEGUNDA LINHA REORDENADA: 1. DATA DE INÍCIO -> 2. TOTAL DE DIAS -> 3. DATA DE FIM */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 p-3 bg-seguranca-graphite/30 rounded-xl border border-seguranca-graphite">
              {/* 1. DATA DE INÍCIO */}
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                  1. Data de Início
                </label>
                <input 
                  type="date" 
                  name="dataInicio" 
                  value={form.dataInicio} 
                  onChange={handleDataInicioChange}
                  disabled={isAgendamentoBloqueado}
                  className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed" 
                  required 
                />
              </div>

              {/* 2. TOTAL DE DIAS (MOVIDO PARA FICAR DEPOIS DA DATA DE INÍCIO) */}
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium flex items-center justify-between">
                  <span>2. Total de Dias</span>
                  {modalidade === 'CLT' && (
                    <span className="text-xs text-seguranca-yellow font-normal">Personalizado</span>
                  )}
                </label>
                {modalidade === 'CLT' ? (
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={diasGozo}
                    onChange={handleDiasGozoChange}
                    disabled={isAgendamentoBloqueado}
                    className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm font-semibold disabled:opacity-50"
                    placeholder="Dias (5 a 30)"
                    required
                  />
                ) : (
                  <div className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 text-sm flex items-center justify-between font-semibold h-[38px]">
                    <span>{diasGozo} dias de gozo</span>
                    {modalidade === '20' && (
                      <span className="text-[11px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                        +10 abono
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 3. DATA DE FIM (CALCULADA AUTOMATICAMENTE) */}
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium flex items-center justify-between">
                  <span>3. Data de Fim</span>
                  <span className="text-xs text-emerald-400 font-normal">Cálculo Automático</span>
                </label>
                <input 
                  type="date" 
                  name="dataFim" 
                  value={form.dataFim} 
                  readOnly
                  className="w-full p-2 rounded bg-seguranca-graphite/60 text-emerald-300 border border-emerald-600/40 focus:border-emerald-400 focus:outline-none text-sm font-semibold cursor-not-allowed h-[38px]" 
                  required 
                />
              </div>
            </div>

            {/* ALERTA IMPEDITIVO DO MOTOR CLT (Art. 134, § 3º - DSR e Feriados) */}
            {!cltValidacao.valid && (
              <div className="bg-red-950/40 border border-red-500 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-red-200 flex items-start gap-3 shadow-lg animate-fadeIn">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-red-300 uppercase tracking-wide flex items-center justify-between">
                    <span>Início de Férias Bloqueado (Art. 134, § 3º da CLT)</span>
                    <span className="text-[11px] bg-red-800/80 text-white px-2 py-0.5 rounded font-sans font-bold uppercase">
                      Impeditivo
                    </span>
                  </div>
                  <p className="leading-relaxed text-red-100 font-medium">
                    {cltValidacao.mensagem}
                  </p>
                  {cltValidacao.sugestaoData && (
                    <div className="pt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-gray-300 text-xs">Alternativa legal em dia útil:</span>
                      <button
                        type="button"
                        onClick={() => aplicarDataInicio(cltValidacao.sugestaoData!)}
                        className="bg-seguranca-yellow hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded transition-colors flex items-center gap-1.5 shadow"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Usar {formatBr(cltValidacao.sugestaoData)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Terceira linha - Tipo de Férias e Status (quando editando) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                  Tipo de Férias
                </label>
                <select 
                  name="tipo" 
                  value={form.tipo} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm" 
                  required
                >
                  {tipoOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {/* Campo de Status (editável quando editando) */}
              {editingId && (
                <div>
                  <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                    Status
                  </label>
                  <select 
                    name="status" 
                    value={status || 'PENDENTE'} 
                    onChange={(e) => setStatus(e.target.value)} 
                    className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm" 
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="CANCELADO">Cancelado</option>
                    <option value="REJECTED">Rejeitado</option>
                  </select>
                </div>
              )}
            </div>

            {/* Cobertura (substituição durante as férias) */}
            {!editingId && (
              <div className="border border-seguranca-graphite rounded-xl p-3 space-y-3 bg-seguranca-graphite/20">
                <label className="flex items-center gap-2 text-seguranca-lightgray text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coberturaAtiva}
                    onChange={(e) => setCoberturaAtiva(e.target.checked)}
                    className="accent-seguranca-yellow h-4 w-4"
                  />
                  <Users className="h-4 w-4 text-seguranca-yellow" />
                  Definir cobertura (substituição) neste período
                </label>

                {coberturaAtiva && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 pt-2">
                    <div>
                      <label className="block text-seguranca-lightgray mb-1 text-sm font-medium flex items-center gap-1">
                        <UserCheck className="h-4 w-4" />
                        Substituto
                      </label>
                      <SearchableSelect
                        options={substituteOptions}
                        value={coberturaSubstituto || 'sem_cobertura'}
                        onChange={(val) => {
                          setCoberturaSubstituto(val === 'sem_cobertura' || val === 'all' ? '' : val);
                        }}
                        placeholder="Selecione o substituto..."
                        searchPlaceholder="Digite nome, CPF ou posto para buscar..."
                        emptyPlaceholder="Nenhum substituto encontrado."
                        minSearchChars={0}
                        className="w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                        Turno da Cobertura
                      </label>
                      <select
                        value={coberturaTurno}
                        onChange={(e) => setCoberturaTurno(e.target.value as 'DAY' | 'NIGHT' | 'MIXED')}
                        className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm"
                      >
                        {turnoOptions.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">
                Observações e Justificativas
              </label>
              <textarea 
                name="observacoes" 
                value={form.observacoes || ''} 
                onChange={handleChange} 
                className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none resize-none text-sm" 
                rows={3}
                placeholder="Descreva as observações, justificativas ou detalhes adicionais sobre as férias..."
              />
            </div>
            
            {error && (
              <div className="text-red-400 bg-red-900/20 border border-red-500 rounded-lg p-3 text-xs sm:text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer com botões */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-seguranca-graphite">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-seguranca-graphite text-seguranca-lightgray rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading || isAgendamentoBloqueado || (!cltValidacao.valid && !editingId)} 
              className="px-5 py-2 bg-seguranca-yellow text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 shadow-lg"
              title={
                !cltValidacao.valid && !editingId 
                  ? 'Bloqueado: data viola o Art. 134, § 3º da CLT' 
                  : (isAgendamentoBloqueado ? 'Bloqueado: colaborador possui menos de 12 meses de admissão (Art. 130 CLT)' : '')
              }
            >
              {loading 
                ? (editingId ? 'Atualizando...' : 'Salvando...') 
                : (!cltValidacao.valid && !editingId 
                    ? 'Data Bloqueada pela CLT (Art. 134, §3º)' 
                    : (isAgendamentoBloqueado 
                        ? 'Agendamento Bloqueado (< 12 meses)' 
                        : (editingId ? 'Atualizar Férias' : 'Solicitar Férias')))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeriasFormModal;