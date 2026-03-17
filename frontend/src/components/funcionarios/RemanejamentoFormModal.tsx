import React, { useState, useEffect } from 'react';
import { remanejamentoService, Remanejamento, CreateRemanejamentoDTO } from '../../services/remanejamentoService';
import { employeeService } from '../../services/employeeService';
import { workPostService } from '../../services/workPostService';
import type { RemanejamentoTipo } from '../../types/remanejamento';
import { formatWorkPostDisplayName } from '../../utils/formatters';
import { X } from 'lucide-react';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { WorkPostCombobox } from '../ui/work-post-combobox';

interface Props {
  onSuccess: () => void;
  onClose: () => void;
  initialRemanejamento?: Remanejamento;
}

interface FormData {
  employeeId: string;
  tipo: string;
  dataRemanejamento: string;
  observacao?: string;
  sourceWorkPostId?: string;
  destinationWorkPostId?: string;
  notifyRH?: boolean;
  notifyOperacional?: boolean;
  notifyDepartamentoPessoal?: boolean;
}

const tipos: { value: RemanejamentoTipo; label: string }[] = [
  { value: 'TRANSFERENCIA_UNIDADE', label: 'Transferência de Unidade' },
  { value: 'TRANSFERENCIA_POSTO_TRABALHO', label: 'Transferência de Posto Trabalho' },
  { value: 'TROCA_FUNCAO', label: 'Troca de Função' },
  { value: 'PROMOCAO', label: 'Promoção' },
  { value: 'COBRIR_FERIAS', label: 'Cobrir Férias' },
  { value: 'COBRIR_FALTA', label: 'Cobrir Falta' },
  { value: 'PLANTAO', label: 'Plantão' },
  { value: 'OUTROS', label: 'Outros' },
];

const RemanejamentoFormModal: React.FC<Props> = ({ onSuccess, onClose, initialRemanejamento }) => {
  const [form, setForm] = useState<FormData>({
    employeeId: initialRemanejamento?.employeeId || '',
    tipo: initialRemanejamento?.tipo || initialRemanejamento?.status || '',
    dataRemanejamento: initialRemanejamento?.dataRemanejamento || initialRemanejamento?.remanejamentoDate || '',
    observacao: initialRemanejamento?.observacao || initialRemanejamento?.notes || '',
    sourceWorkPostId: initialRemanejamento?.originWorkstationId || '',
    destinationWorkPostId: initialRemanejamento?.destinationWorkstationId || '',
    notifyRH: true, // Por padrão, RH sempre é notificado
    notifyOperacional: false,
    notifyDepartamentoPessoal: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEmployeeWorkPost, setCurrentEmployeeWorkPost] = useState<{ id: string; name: string } | null>(null);
  const [loadingEmployeeDetails, setLoadingEmployeeDetails] = useState(false);

  // Ao selecionar funcionário, buscar posto atual do banco para preencher posto de origem
  useEffect(() => {
    if (!form.employeeId) {
      setCurrentEmployeeWorkPost(null);
      setForm(prev => ({ ...prev, sourceWorkPostId: '' }));
      return;
    }
    const fetchEmployeeWorkPost = async () => {
      setLoadingEmployeeDetails(true);
      try {
        const emp = await employeeService.getEmployeeById(form.employeeId);
        if (!emp) {
          setCurrentEmployeeWorkPost(null);
          setForm(prev => ({ ...prev, sourceWorkPostId: '' }));
          return;
        }
        const wp = emp.workPost;
        const wpId = emp.workPostId ?? (wp?.id != null ? String(wp.id) : '');
        const wpName = wp?.name;
        if (wpId && wpName) {
          setCurrentEmployeeWorkPost({ id: String(wpId), name: formatWorkPostDisplayName({ name: wpName }) });
          setForm(prev => ({ ...prev, sourceWorkPostId: String(wpId) }));
        } else if (wpId) {
          try {
            const found = await workPostService.getWorkPostById(String(wpId));
            setCurrentEmployeeWorkPost({ id: String(wpId), name: formatWorkPostDisplayName(found) });
            setForm(prev => ({ ...prev, sourceWorkPostId: String(wpId) }));
          } catch {
            setCurrentEmployeeWorkPost({ id: String(wpId), name: 'Posto ID ' + wpId });
            setForm(prev => ({ ...prev, sourceWorkPostId: String(wpId) }));
          }
        } else {
          setCurrentEmployeeWorkPost(null);
          setForm(prev => ({ ...prev, sourceWorkPostId: '' }));
        }
      } catch {
        setCurrentEmployeeWorkPost(null);
        setForm(prev => ({ ...prev, sourceWorkPostId: '' }));
      } finally {
        setLoadingEmployeeDetails(false);
      }
    };
    fetchEmployeeWorkPost();
  }, [form.employeeId]);

  // Função helper para verificar se uma string é um UUID válido
  // Atualizar formulário quando initialRemanejamento mudar
  useEffect(() => {
    if (initialRemanejamento) {
      let dataFormatada = '';
      if (initialRemanejamento.dataRemanejamento) {
        dataFormatada = initialRemanejamento.dataRemanejamento.split('T')[0];
      } else if (initialRemanejamento.remanejamentoDate) {
        dataFormatada = initialRemanejamento.remanejamentoDate.split('T')[0];
      }
        
      const sourceWorkPostId = initialRemanejamento.originWorkstationId ? String(initialRemanejamento.originWorkstationId) : '';
      const destinationWorkPostId = initialRemanejamento.destinationWorkstationId ? String(initialRemanejamento.destinationWorkstationId) : '';
        
      setForm(prev => ({
        ...prev,
        employeeId: initialRemanejamento.employeeId || '',
        tipo: initialRemanejamento.tipo || initialRemanejamento.status || '',
        dataRemanejamento: dataFormatada,
        observacao: initialRemanejamento.observacao || initialRemanejamento.notes || '',
        sourceWorkPostId,
        destinationWorkPostId,
      }));
    } else {
      // Resetar formulário quando não há remanejamento inicial
      setForm({
        employeeId: '',
        tipo: '',
        dataRemanejamento: '',
        observacao: '',
        sourceWorkPostId: '',
        destinationWorkPostId: '',
        notifyRH: true,
        notifyOperacional: false,
        notifyDepartamentoPessoal: false
      });
    }
  }, [initialRemanejamento]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!form.employeeId) throw new Error('Selecione o funcionário');
      
      // Converter para CreateRemanejamentoDTO
      const remanejamentoData: CreateRemanejamentoDTO = {
        employeeId: form.employeeId,
        tipo: form.tipo as RemanejamentoTipo,
        dataRemanejamento: form.dataRemanejamento,
        observacao: form.observacao,
        originWorkstationId: form.sourceWorkPostId || undefined,
        destinationWorkstationId: form.destinationWorkPostId || undefined
      };
      
      if (initialRemanejamento?.id) {
        // Editar remanejamento existente
        await remanejamentoService.updateRemanejamento(initialRemanejamento.id, remanejamentoData);
      } else {
        // Criar novo remanejamento
        await remanejamentoService.createRemanejamento(remanejamentoData);
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar remanejamento');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-seguranca-black border border-seguranca-graphite rounded-lg w-full max-w-sm sm:max-w-md lg:max-w-2xl xl:max-w-3xl relative max-h-[90vh] overflow-y-auto">
        {/* Header com título e botão X */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-seguranca-graphite sticky top-0 bg-seguranca-black z-10">
          <h2 className="text-base sm:text-lg font-bold text-seguranca-yellow">
            {initialRemanejamento ? 'Editar Remanejamento' : 'Novo Remanejamento'}
          </h2>
          <button
            onClick={onClose}
            className="text-seguranca-lightgray hover:text-seguranca-yellow transition-colors p-1"
            type="button"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            {/* Primeira linha - 3 colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">Nome do funcionário</label>
                <EmployeeCombobox
                  value={form.employeeId}
                  onChange={(v) => setForm(prev => ({ ...prev, employeeId: v }))}
                  placeholder="Selecione o funcionário"
                  searchPlaceholder="Digite pelo menos 3 caracteres para buscar pelo nome..."
                  minChars={3}
                />
              </div>
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">Tipo de Remanejamento</label>
                <select 
                  name="tipo" 
                  value={form.tipo} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm" 
                  required
                >
                  <option value="">Selecione o tipo...</option>
                  {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">Data do Remanejamento</label>
                <input 
                  type="date" 
                  name="dataRemanejamento" 
                  value={form.dataRemanejamento} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none text-sm" 
                  required 
                />
              </div>
            </div>

            {/* Segunda linha - Postos de Trabalho - 2 colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">Posto de Trabalho de Origem</label>
                <input
                  type="text"
                  readOnly
                  value={
                    loadingEmployeeDetails
                      ? 'Carregando...'
                      : currentEmployeeWorkPost
                        ? `${currentEmployeeWorkPost.name}`
                        : form.employeeId
                          ? 'Nenhum posto atribuído'
                          : 'Selecione o funcionário primeiro'
                  }
                  className="w-full p-2 rounded bg-seguranca-graphite/70 text-seguranca-lightgray border border-gray-600 cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">Posto de Trabalho de Destino</label>
                <WorkPostCombobox
                  value={form.destinationWorkPostId || ''}
                  onChange={(v) => setForm(prev => ({ ...prev, destinationWorkPostId: v }))}
                  placeholder="Selecione o posto de destino (qualquer posto do sistema)"
                  searchPlaceholder="Digite para buscar pelo nome ou código..."
                />
              </div>
            </div>

            {/* Quarta linha - Notificações */}
            <div>
              <label className="block text-seguranca-lightgray mb-2 text-sm font-medium">Notificar Remanejamento</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-seguranca-graphite p-3 rounded border border-gray-600">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyRH"
                    name="notifyRH"
                    checked={form.notifyRH || false}
                    onChange={(e) => setForm(prev => ({ ...prev, notifyRH: e.target.checked }))}
                    className="w-4 h-4 text-seguranca-yellow bg-seguranca-black border-gray-600 rounded focus:ring-seguranca-yellow focus:ring-2"
                  />
                  <label htmlFor="notifyRH" className="text-sm text-seguranca-lightgray cursor-pointer">
                    Recursos Humanos
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyOperacional"
                    name="notifyOperacional"
                    checked={form.notifyOperacional || false}
                    onChange={(e) => setForm(prev => ({ ...prev, notifyOperacional: e.target.checked }))}
                    className="w-4 h-4 text-seguranca-yellow bg-seguranca-black border-gray-600 rounded focus:ring-seguranca-yellow focus:ring-2"
                  />
                  <label htmlFor="notifyOperacional" className="text-sm text-seguranca-lightgray cursor-pointer">
                    Operacional
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="notifyDepartamentoPessoal"
                    name="notifyDepartamentoPessoal"
                    checked={form.notifyDepartamentoPessoal || false}
                    onChange={(e) => setForm(prev => ({ ...prev, notifyDepartamentoPessoal: e.target.checked }))}
                    className="w-4 h-4 text-seguranca-yellow bg-seguranca-black border-gray-600 rounded focus:ring-seguranca-yellow focus:ring-2"
                  />
                  <label htmlFor="notifyDepartamentoPessoal" className="text-sm text-seguranca-lightgray cursor-pointer">
                    Departamento Pessoal
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Selecione os departamentos que devem ser notificados sobre este remanejamento
              </p>
            </div>

            {/* Quinta linha - Observação em largura total */}
            <div>
              <label className="block text-seguranca-lightgray mb-1 text-sm font-medium">Observações e Justificativas</label>
              <textarea 
                name="observacao" 
                value={form.observacao || ''} 
                onChange={handleChange} 
                className="w-full p-2 rounded bg-seguranca-graphite text-seguranca-lightgray border border-gray-600 focus:border-seguranca-yellow focus:outline-none resize-none text-sm" 
                rows={4}
                placeholder="Descreva as observações, justificativas ou detalhes adicionais sobre o remanejamento..."
              />
            </div>
            
            {error && (
              <div className="text-red-400 bg-red-900/20 border border-red-500 rounded p-2 text-xs sm:text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer com botões */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-seguranca-graphite">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 py-2 sm:px-4 sm:py-2 bg-seguranca-graphite text-seguranca-lightgray rounded hover:bg-gray-600 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-3 py-2 sm:px-4 sm:py-2 bg-seguranca-yellow text-black font-bold rounded hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Salvando...' : (initialRemanejamento ? 'Atualizar' : 'Salvar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RemanejamentoFormModal; 