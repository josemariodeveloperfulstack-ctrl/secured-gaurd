import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Trash2, Plus, ShieldCheck, Mail, MessageSquare, AlertCircle } from 'lucide-react';

interface EmailRule {
  id: string;
  conditionType: 'DOMAIN' | 'SUBJECT' | 'SENDER';
  conditionValue: string;
  actionType: 'MOVE' | 'DELETE';
  actionValue?: string;
  active: boolean;
}

interface Props {
  accountId: string;
  folders: string[];
}

export function EmailRulesManager({ accountId, folders }: Props) {
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newType, setNewType] = useState<'DOMAIN' | 'SUBJECT' | 'SENDER'>('DOMAIN');
  const [newValue, setNewValue] = useState('');
  const [newAction, setNewAction] = useState<'MOVE' | 'DELETE'>('MOVE');
  const [newActionValue, setNewActionValue] = useState('INBOX');

  useEffect(() => {
    loadRules();
  }, [accountId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/webmail/${accountId}/rules`);
      setRules(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addRule = async () => {
    if (!newValue) return;
    try {
      await api.post(`/webmail/${accountId}/rules`, {
        conditionType: newType,
        conditionValue: newValue,
        actionType: newAction,
        actionValue: newAction === 'MOVE' ? newActionValue : undefined,
        active: true
      });
      setNewValue('');
      loadRules();
    } catch (e) {
      alert("Erro ao salvar regra");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await api.delete(`/webmail/rules/${id}`);
      loadRules();
    } catch (e) {
      alert("Erro ao excluir regra");
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-600/20 p-2 rounded-lg">
          <ShieldCheck className="text-blue-500" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Regras de Automação</h2>
          <p className="text-zinc-500 text-sm">Organize seus e-mails automaticamente com base em critérios definidos.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl mb-8">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Criar Nova Regra</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500">Se o...</label>
              <select 
                className="bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 transition-all"
                value={newType}
                onChange={e => setNewType(e.target.value as any)}
              >
                <option value="DOMAIN">Domínio for</option>
                <option value="SENDER">Remetente for</option>
                <option value="SUBJECT">Assunto contiver</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500">Valor</label>
              <input 
                type="text"
                placeholder={newType === 'DOMAIN' ? 'exemplo.com' : 'Valor a procurar'}
                className="bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 transition-all"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-500">Então...</label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 transition-all"
                  value={newAction}
                  onChange={e => setNewAction(e.target.value as any)}
                >
                  <option value="MOVE">Mover para</option>
                  <option value="DELETE">Excluir</option>
                </select>
                {newAction === 'MOVE' && (
                  <select 
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-sm text-zinc-100 outline-none focus:border-blue-500 transition-all"
                    value={newActionValue}
                    onChange={e => setNewActionValue(e.target.value)}
                  >
                    {folders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
              </div>
            </div>

            <button 
              onClick={addRule}
              className="bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-md py-3 hover:bg-blue-500 transition-all shadow-lg"
            >
              Adicionar Regra
            </button>
          </div>
        </div>

        <div className="p-0">
          {rules.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 italic">
              Nenhuma regra configurada ainda.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-950 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-800">
                  <th className="px-6 py-4">Condição</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {rule.conditionType === 'DOMAIN' && <ShieldCheck size={16} className="text-zinc-500"/>}
                        {rule.conditionType === 'SENDER' && <Mail size={16} className="text-zinc-500"/>}
                        {rule.conditionType === 'SUBJECT' && <MessageSquare size={16} className="text-zinc-500"/>}
                        <div>
                          <span className="text-zinc-400 text-xs font-bold uppercase mr-2">
                            {rule.conditionType === 'DOMAIN' ? 'Domínio' : rule.conditionType === 'SENDER' ? 'Remetente' : 'Assunto'}
                          </span>
                          <span className="text-zinc-100 font-medium">{rule.conditionValue}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${rule.actionType === 'DELETE' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {rule.actionType === 'DELETE' ? 'Excluir' : `Mover para ${rule.actionValue}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteRule(rule.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-zinc-500 bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
        <AlertCircle size={20} />
        <p className="text-xs">As regras são aplicadas automaticamente no momento em que novos e-mails entram na sua Caixa de Entrada durante a sincronização.</p>
      </div>
    </div>
  );
}
