import React, { useState, useEffect } from 'react';
import { Mail, Settings, Plus, Folder, Trash2, Send, Inbox, Archive, AlertTriangle, RefreshCw, ShieldCheck, Clock, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { EmailAccount, EmailCache } from '../../types/webmail';
import { EmailSidebar } from './EmailSidebar';
import { EmailReader } from './EmailReader';
import { AccountConfig } from './AccountConfig';
import { EmailComposer } from './EmailComposer';
import { EmailRulesManager } from './EmailRulesManager';
import { ScheduledEmailList } from './ScheduledEmailList';
import { StandardLayout } from '../../components/StandardLayout';

export default function WebmailApp() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  
  const [folders, setFolders] = useState<string[]>(['INBOX']);
  const [selectedFolder, setSelectedFolder] = useState<string>('INBOX');

  const [emails, setEmails] = useState<EmailCache[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailCache | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'reader' | 'config' | 'compose' | 'rules'>('reader');

  const [mobileView, setMobileView] = useState<'folders' | 'list' | 'reader'>('folders');

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAccount && view === 'reader') {
      loadFolders(selectedAccount.id);
      if (selectedFolder === 'Agendados') {
        loadScheduledEmails(selectedAccount.id);
      } else {
        loadEmails(selectedAccount.id, selectedFolder);
      }
    }
  }, [selectedAccount, view, selectedFolder]);

  // Handle auto-navigation on mobile when selecting items
  const handleSelectFolder = (folder: string) => {
    setView('reader');
    setSelectedFolder(folder);
    setSelectedEmail(null);
    setMobileView('list');
  };

  const handleSelectEmail = (email: EmailCache) => {
    setSelectedEmail(email);
    setMobileView('reader');
  };

  const loadAccounts = async () => {
    try {
      const response = await api.get(`/webmail/accounts/${user?.id}`);
      setAccounts(response.data);
      if (response.data.length > 0) {
        setSelectedAccount(response.data[0]);
      } else {
        setView('config');
      }
    } catch (error) {
      console.error('Erro ao carregar contas de email', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async (accountId: string) => {
    try {
      const response = await api.get(`/webmail/${accountId}/folders`);
      const allFolders = [...response.data];
      if (!allFolders.includes('Agendados')) allFolders.push('Agendados');
      setFolders(allFolders);
    } catch (error) {
      console.error('Erro ao carregar pastas', error);
    }
  };

  const loadEmails = async (accountId: string, folderName: string) => {
    try {
      const response = await api.get(`/webmail/cache/${accountId}?folder=${encodeURIComponent(folderName)}`);
      setEmails(response.data.content || []);
    } catch (error) {
      console.error('Erro ao carregar emails', error);
    }
  };

  const loadScheduledEmails = async (accountId: string) => {
    try {
      const response = await api.get(`/webmail/${accountId}/scheduled`);
      setScheduledEmails(response.data);
    } catch (error) {
      console.error('Erro ao carregar emails agendados', error);
    }
  };

  const createFolder = async () => {
    const folderName = prompt("Nome da nova pasta:");
    if (folderName && selectedAccount) {
      try {
        await api.post(`/webmail/${selectedAccount.id}/folders?folderName=${encodeURIComponent(folderName)}`);
        loadFolders(selectedAccount.id);
      } catch (e) {
        alert("Erro ao criar pasta");
      }
    }
  };

  const emptyTrash = async () => {
    if (selectedAccount && confirm("Tem certeza que deseja limpar permanentemente a lixeira?")) {
      try {
        await api.delete(`/webmail/${selectedAccount.id}/folders/${encodeURIComponent(selectedFolder)}/empty`);
        loadEmails(selectedAccount.id, selectedFolder);
        alert("Lixeira esvaziada");
      } catch (e) {
        alert("Erro ao esvaziar lixeira");
      }
    }
  };

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'agendados') return <Calendar size={16} className="text-orange-500" />;
    if (lower.includes('inbox') || lower.includes('entrada')) return <Inbox size={16} />;
    if (lower.includes('sent') || lower.includes('enviados')) return <Send size={16} />;
    if (lower.includes('trash') || lower.includes('lixeira') || lower.includes('deleted')) return <Trash2 size={16} />;
    if (lower.includes('archive') || lower.includes('arquivo')) return <Archive size={16} />;
    if (lower.includes('spam') || lower.includes('junk')) return <AlertTriangle size={16} />;
    return <Folder size={16} />;
  };

  const getFriendlyName = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'inbox') return 'Entrada';
    if (lower.includes('sent')) return 'Enviados';
    if (lower.includes('trash') || lower.includes('deleted')) return 'Lixeira';
    if (lower.includes('junk') || lower.includes('spam')) return 'Spam';
    return name;
  };

  if (loading) return <div className="p-8 text-zinc-400">Carregando Webmail...</div>;

  return (
    <StandardLayout noPadding>
      <div className="flex h-[calc(100vh-64px)] w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans border-t border-zinc-900">
        
        {/* Pane 1: Folders (250px) */}
        <div className={`
          ${mobileView === 'folders' ? 'flex' : 'hidden'} 
          lg:flex w-full lg:w-64 lg:min-w-[250px] border-r border-zinc-900 bg-zinc-950 flex flex-col shadow-2xl z-20
        `}>
          <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/10">
            <h2 className="text-xl font-black tracking-tighter text-zinc-100 flex items-center gap-2">
              <Mail className="text-blue-500 fill-blue-500/20" size={22} />
              WEBMAIL
            </h2>
            <div className="flex items-center gap-1">
               <button onClick={() => setView('rules')} className={`p-1.5 rounded-md transition-colors ${view === 'rules' ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-100'}`} title="Regras de Automação">
                <ShieldCheck size={18} />
              </button>
              <button onClick={() => setView('config')} className={`p-1.5 rounded-md transition-colors ${view === 'config' ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-100'}`} title="Configurações">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {accounts.length > 0 && (
            <div className="p-4 flex flex-col gap-4 bg-zinc-900/5">
              <select 
                className="w-full bg-zinc-900 text-xs font-bold uppercase tracking-widest p-3 rounded-lg border border-zinc-800 focus:border-blue-500 outline-none text-zinc-400 transition-all"
                value={selectedAccount?.id || ''}
                onChange={(e) => {
                  const acc = accounts.find(a => a.id === e.target.value);
                  setSelectedAccount(acc || null);
                  setView('reader');
                }}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.email}</option>
                ))}
              </select>
              
              <button 
                onClick={() => { setView('compose'); setMobileView('reader'); }}
                className="w-full bg-blue-600 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-lg hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Nova Mensagem
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            <div className="flex justify-between items-center px-2 mb-2">
              <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">Pastas</span>
              <button onClick={createFolder} className="text-zinc-600 hover:text-zinc-200" title="Criar Pasta">
                <Plus size={14} />
              </button>
            </div>

            {folders.map(folder => {
              const isSelected = selectedFolder === folder && view === 'reader';
              const isTrash = folder.toLowerCase().includes('trash') || folder.toLowerCase().includes('lixeira');
              return (
                <div 
                  key={folder}
                  onClick={() => handleSelectFolder(folder)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all group ${
                    isSelected ? 'bg-blue-600 text-white shadow-lg font-bold' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className={isSelected ? 'text-white' : 'text-zinc-600 group-hover:text-blue-500 transition-colors'}>
                      {getFolderIcon(folder)}
                    </span>
                    <span className="text-xs uppercase tracking-wider truncate">{getFriendlyName(folder)}</span>
                  </div>
                  {isSelected && isTrash && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); emptyTrash(); }} 
                      className="text-white/70 hover:text-white transition-opacity" 
                      title="Esvaziar Lixeira"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pane 2 & 3 Content */}
        <div className={`
          flex-1 bg-zinc-950 overflow-hidden relative
          ${mobileView === 'folders' ? 'hidden' : 'flex'}
          lg:flex
        `}>
          
          {view === 'config' && (
            <div className="flex-1 z-30 flex flex-col h-full">
              <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                <button onClick={() => setMobileView('folders')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm">
                  <Plus className="rotate-45" size={16} /> Voltar para Pastas
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AccountConfig 
                  account={selectedAccount || undefined}
                  onSaved={() => { loadAccounts(); setView('reader'); setMobileView('folders'); }} 
                />
              </div>
            </div>
          )}

          {view === 'rules' && selectedAccount && (
            <div className="flex-1 z-30 flex flex-col h-full">
              <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                <button onClick={() => setMobileView('folders')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm">
                  <Plus className="rotate-45" size={16} /> Voltar para Pastas
                </button>
              </div>
              <EmailRulesManager accountId={selectedAccount.id} folders={folders.filter(f => f !== 'Agendados')} />
            </div>
          )}
          
          {view === 'compose' && selectedAccount && (
            <div className="flex-1 z-30 flex flex-col h-full">
              <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                <button onClick={() => setMobileView('folders')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm">
                  <Plus className="rotate-45" size={16} /> Cancelar
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <EmailComposer 
                  accountId={selectedAccount.id} 
                  initialSignature={selectedAccount.signature}
                  onSent={() => { setView('reader'); setMobileView('list'); }} 
                  onCancel={() => { setView('reader'); setMobileView('folders'); }} 
                />
              </div>
            </div>
          )}

          {view === 'reader' && (
            <>
              {/* Pane 2: Email List */}
              <div className={`
                ${mobileView === 'list' ? 'flex' : 'hidden'}
                lg:flex w-full lg:w-80 lg:min-w-[320px] border-r border-zinc-900 bg-zinc-900/10 flex-col overflow-hidden shadow-inner
              `}>
                <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/20">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setMobileView('folders')}
                      className="lg:hidden text-zinc-500 hover:text-zinc-100"
                    >
                      <Plus className="rotate-45" size={20} />
                    </button>
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">{getFriendlyName(selectedFolder)}</h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (!selectedAccount) return;
                      if (selectedFolder === 'Agendados') loadScheduledEmails(selectedAccount.id);
                      else loadEmails(selectedAccount.id, selectedFolder);
                    }} 
                    className="text-zinc-600 hover:text-blue-500 transition-colors"
                    title="Sincronizar"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {selectedFolder === 'Agendados' ? (
                    <ScheduledEmailList emails={scheduledEmails} />
                  ) : (
                    <EmailSidebar 
                      emails={emails} 
                      selectedEmailId={selectedEmail?.id}
                      onSelectEmail={handleSelectEmail} 
                    />
                  )}
                </div>
              </div>

              {/* Pane 3: Reading Panel */}
              <div className={`
                ${mobileView === 'reader' ? 'flex' : 'hidden'}
                lg:flex flex-1 h-full overflow-hidden flex-col bg-zinc-950 shadow-2xl
              `}>
                {selectedEmail ? (
                  <>
                    <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                      <button onClick={() => setMobileView('list')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm">
                        <Plus className="rotate-45" size={16} /> Voltar para Lista
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <EmailReader 
                        email={selectedEmail} 
                        accountId={selectedAccount?.id} 
                        folders={folders.filter(f => f !== 'Agendados')}
                        onEmailMoved={() => {
                          setSelectedEmail(null);
                          loadEmails(selectedAccount!.id, selectedFolder);
                          setMobileView('list');
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center flex-col gap-6 text-zinc-800">
                    <div className="relative">
                      <Mail size={80} className="opacity-10" />
                      <div className="absolute -bottom-2 -right-2 bg-blue-600/10 p-2 rounded-full">
                        <ShieldCheck size={24} className="text-blue-500/20" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-[0.3em] opacity-30">Secured Guard Mail</p>
                      <p className="text-[10px] font-bold text-zinc-700 mt-2">SELECIONE UMA MENSAGEM PARA COMEÇAR</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </StandardLayout>
  );
}
