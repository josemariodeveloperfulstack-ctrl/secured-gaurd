import React, { useState, useEffect } from 'react';
import { Mail, Settings, Plus, Folder, Trash2, Send, Inbox, Archive, AlertTriangle, RefreshCw, ShieldCheck, Clock, Calendar, Menu } from 'lucide-react';
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
    // Instant local responsive read feedback
    if (!email.isRead) {
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e));
    }
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
      const response = await api.get(`/webmail/${accountId}/folders`, { silent: true } as Parameters<typeof api.get>[1]);
      const allFolders = [...response.data];
      if (!allFolders.includes('Agendados')) allFolders.push('Agendados');
      setFolders(allFolders);
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      if (status === 401) {
        console.warn('Webmail: credenciais IMAP inválidas — use cache local (INBOX).');
        setFolders(['INBOX', 'Agendados']);
        return;
      }
      console.error('Erro ao carregar pastas', error);
      setFolders(['INBOX', 'Agendados']);
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

  // Instant Actions from Sidebar/Hover (MS Outlook Integration)
  const handleDeleteEmail = async (email: EmailCache) => {
    if (!selectedAccount) return;
    const trashFolder = folders.find(f => f.toLowerCase().includes('trash') || f.toLowerCase().includes('lixeira'));
    if (!trashFolder) return;
    try {
      await api.put(`/webmail/${selectedAccount.id}/emails/${email.providerUid}/move?targetFolder=${encodeURIComponent(trashFolder)}`);
      // Update local state list instantly
      setEmails(prev => prev.filter(e => e.id !== email.id));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
    } catch (err) {
      console.error("Erro ao deletar email", err);
    }
  };

  const handleToggleRead = (email: EmailCache) => {
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: !e.isRead } : e));
    if (selectedEmail?.id === email.id) {
      setSelectedEmail(prev => prev ? { ...prev, isRead: !prev.isRead } : null);
    }
  };

  const getFolderIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'agendados') return <Calendar size={13} className="text-amber-500 shrink-0" />;
    if (lower.includes('inbox') || lower.includes('entrada')) return <Inbox size={13} className="shrink-0" />;
    if (lower.includes('sent') || lower.includes('enviados')) return <Send size={13} className="shrink-0" />;
    if (lower.includes('trash') || lower.includes('lixeira') || lower.includes('deleted')) return <Trash2 size={13} className="shrink-0" />;
    if (lower.includes('archive') || lower.includes('arquivo')) return <Archive size={13} className="shrink-0" />;
    if (lower.includes('spam') || lower.includes('junk')) return <AlertTriangle size={13} className="shrink-0" />;
    return <Folder size={13} className="shrink-0" />;
  };

  const getFriendlyName = (name: string) => {
    const lower = name.toLowerCase();
    if (lower === 'inbox') return 'Entrada';
    if (lower.includes('sent')) return 'Enviados';
    if (lower.includes('trash') || lower.includes('deleted')) return 'Lixeira';
    if (lower.includes('junk') || lower.includes('spam')) return 'Spam';
    return name;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">
        Sincronizando Promover Mail...
      </div>
    );
  }

  return (
    <StandardLayout noPadding>
      <div className="flex h-[calc(100vh-64px)] w-full bg-zinc-950 text-zinc-100 overflow-hidden font-mono border-t border-zinc-900 select-none">
        
        {/* Pane 0: Thin Navigation Icon Rail (64px) - MS Outlook Command Style */}
        <div className="hidden lg:flex w-16 shrink-0 bg-zinc-950 border-r border-zinc-900 flex flex-col items-center py-5 justify-between">
          <div className="flex flex-col gap-5 items-center w-full">
            {/* Brand Logo Initials */}
            <div className="w-10 h-10 border border-zinc-800 bg-zinc-900/60 flex items-center justify-center font-black text-amber-500 text-xs tracking-tighter shadow-inner">
              PM
            </div>
            
            <div className="w-8 border-b border-zinc-900 my-1" />

            <button
              onClick={() => setView('reader')}
              className={`p-2.5 border transition-all ${
                view === 'reader' && selectedFolder !== 'Agendados'
                  ? 'border-zinc-800 text-blue-400 bg-zinc-900/80 shadow-md'
                  : 'border-transparent text-zinc-600 hover:text-zinc-300'
              } rounded-none`}
              title="Inbox / Mensagens"
            >
              <Inbox size={16} />
            </button>

            <button
              onClick={() => { setView('compose'); setMobileView('reader'); }}
              className={`p-2.5 border transition-all ${
                view === 'compose'
                  ? 'border-zinc-800 text-blue-400 bg-zinc-900/80 shadow-md'
                  : 'border-transparent text-zinc-600 hover:text-zinc-300'
              } rounded-none`}
              title="Nova Mensagem"
            >
              <Plus size={16} />
            </button>

            <button
              onClick={() => setView('rules')}
              className={`p-2.5 border transition-all ${
                view === 'rules'
                  ? 'border-zinc-800 text-blue-400 bg-zinc-900/80 shadow-md'
                  : 'border-transparent text-zinc-600 hover:text-zinc-300'
              } rounded-none`}
              title="Regras e Filtros"
            >
              <ShieldCheck size={16} />
            </button>

            <button
              onClick={() => setView('config')}
              className={`p-2.5 border transition-all ${
                view === 'config'
                  ? 'border-zinc-800 text-blue-400 bg-zinc-900/80 shadow-md'
                  : 'border-transparent text-zinc-600 hover:text-zinc-300'
              } rounded-none`}
              title="Configurar Conta"
            >
              <Settings size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3">
            {/* Sync Latency Ping Indicator (Brutalist HUD style) */}
            <div className="flex items-center gap-1.5 text-[8px] font-black text-zinc-600 font-mono tracking-tighter" title="Conexão com servidor IMAP">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              24ms
            </div>
          </div>
        </div>

        {/* Pane 1: Collapsible Folders Navigation (220px) */}
        <div className={`
          ${mobileView === 'folders' ? 'flex' : 'hidden'} 
          lg:flex w-full lg:w-56 lg:min-w-[220px] border-r border-zinc-900 bg-zinc-950 flex flex-col z-20
        `}>
          {/* Header without WEBMAIL text */}
          <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/10">
            <div className="flex flex-col gap-0.5 select-none">
              <h2 className="text-xs font-black tracking-[0.2em] text-zinc-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 inline-block animate-ping rounded-full" />
                PROMOVER MAIL
              </h2>
              <span className="text-[8px] font-bold text-zinc-500 tracking-wider font-mono uppercase">IMAP Secured Portal</span>
            </div>
          </div>

          {/* Account selector and compose shortcut button */}
          {accounts.length > 0 && (
            <div className="p-4 flex flex-col gap-3 bg-zinc-900/5 border-b border-zinc-900">
              <div className="text-[9px] font-black text-zinc-600 font-mono tracking-widest">CONTA ATIVA</div>
              <select 
                className="w-full bg-zinc-900 text-[10px] font-bold tracking-wider p-2.5 rounded-none border border-zinc-800 focus:border-zinc-700 outline-none text-zinc-400 transition-all font-mono"
                value={selectedAccount?.id || ''}
                onChange={(e) => {
                  const acc = accounts.find(a => a.id === e.target.value);
                  setSelectedAccount(acc || null);
                  setView('reader');
                }}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-zinc-950 select-none text-zinc-400">{acc.email}</option>
                ))}
              </select>
              
              <button 
                onClick={() => { setView('compose'); setMobileView('reader'); }}
                className="w-full bg-transparent border border-blue-600 text-blue-500 font-bold text-[9px] uppercase tracking-[0.25em] py-3 rounded-none hover:bg-blue-600 hover:text-white transition-all duration-150 flex items-center justify-center gap-2 shadow-inner"
              >
                <Plus size={12} /> ESCREVER EMAIL
              </button>
            </div>
          )}

          {/* Folder items list */}
          <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1">
            <div className="flex justify-between items-center px-2 mb-2 select-none">
              <span className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em]">Pastas</span>
              <button onClick={createFolder} className="text-zinc-600 hover:text-zinc-200" title="Criar Pasta">
                <Plus size={12} />
              </button>
            </div>

            {folders.map(folder => {
              const isSelected = selectedFolder === folder && view === 'reader';
              const isTrash = folder.toLowerCase().includes('trash') || folder.toLowerCase().includes('lixeira');
              return (
                <div 
                  key={folder}
                  onClick={() => handleSelectFolder(folder)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-none cursor-pointer transition-all border ${
                    isSelected ? 'bg-zinc-900 border-zinc-800 text-blue-400 font-black' : 'border-transparent text-zinc-500 hover:bg-zinc-900/30 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate select-none">
                    <span className={isSelected ? 'text-blue-400' : 'text-zinc-700 group-hover:text-blue-500 transition-colors'}>
                      {getFolderIcon(folder)}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest truncate font-mono">{getFriendlyName(folder)}</span>
                  </div>
                  {isSelected && isTrash && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); emptyTrash(); }} 
                      className="text-zinc-500 hover:text-red-400 transition-opacity" 
                      title="Esvaziar Lixeira"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Display Panels: Config, Rules, Composer, Reader */}
        <div className={`
          flex-1 bg-zinc-950 overflow-hidden relative
          ${mobileView === 'folders' ? 'hidden' : 'flex'}
          lg:flex
        `}>
          
          {view === 'config' && (
            <div className="flex-1 z-30 flex flex-col h-full bg-zinc-950">
              <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                <button onClick={() => setMobileView('folders')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm font-bold">
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
            <div className="flex-1 z-30 flex flex-col h-full bg-zinc-950">
              <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                <button onClick={() => setMobileView('folders')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm font-bold">
                  <Plus className="rotate-45" size={16} /> Voltar para Pastas
                </button>
              </div>
              <EmailRulesManager accountId={selectedAccount.id} folders={folders.filter(f => f !== 'Agendados')} />
            </div>
          )}
          
          {view === 'compose' && selectedAccount && (
            <div className="flex-1 z-30 flex flex-col h-full bg-zinc-950">
              <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                <button onClick={() => setMobileView('folders')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm font-bold">
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
              {/* Pane 2: Message List (320px width minimum) */}
              <div className={`
                ${mobileView === 'list' ? 'flex' : 'hidden'}
                lg:flex w-full lg:w-80 lg:min-w-[320px] border-r border-zinc-900 bg-zinc-950 flex-col overflow-hidden
              `}>
                <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setMobileView('folders')}
                      className="lg:hidden text-zinc-500 hover:text-zinc-100"
                    >
                      <Menu size={18} />
                    </button>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 font-mono select-none">
                      {getFriendlyName(selectedFolder)}
                    </h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (!selectedAccount) return;
                      if (selectedFolder === 'Agendados') loadScheduledEmails(selectedAccount.id);
                      else loadEmails(selectedAccount.id, selectedFolder);
                    }} 
                    className="text-zinc-600 hover:text-blue-500 transition-colors"
                    title="Forçar Sincronização"
                  >
                    <RefreshCw size={12} className="animate-spin-hover" />
                  </button>
                </div>
                
                {/* List box wrapper */}
                <div className="flex-1 overflow-hidden">
                  {selectedFolder === 'Agendados' ? (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <ScheduledEmailList emails={scheduledEmails} />
                    </div>
                  ) : (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                      <EmailSidebar 
                        emails={emails} 
                        selectedEmailId={selectedEmail?.id}
                        onSelectEmail={handleSelectEmail} 
                        onDeleteEmail={handleDeleteEmail}
                        onToggleRead={handleToggleRead}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pane 3: Reading / Workspace Content Box */}
              <div className={`
                ${mobileView === 'reader' ? 'flex' : 'hidden'}
                lg:flex flex-1 h-full overflow-hidden flex-col bg-zinc-950
              `}>
                {selectedEmail ? (
                  <>
                    <div className="lg:hidden p-4 border-b border-zinc-900 flex items-center bg-zinc-900/50">
                      <button onClick={() => setMobileView('list')} className="text-zinc-400 hover:text-zinc-100 flex items-center gap-2 text-sm font-bold">
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
                  // Elegant empty state (Modern Outlook Cyber-HUD illustration)
                  <div className="flex h-full w-full items-center justify-center flex-col gap-6 text-zinc-900 bg-zinc-950 p-6 select-none font-mono">
                    <div className="relative">
                      <div className="w-24 h-24 border-2 border-zinc-900/50 flex items-center justify-center bg-zinc-900/5 shadow-inner">
                        <Mail size={44} className="opacity-15 text-zinc-500 animate-pulse" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-zinc-900 border border-zinc-800 p-1.5 shadow-md">
                        <ShieldCheck size={16} className="text-blue-500/30" />
                      </div>
                    </div>
                    
                    <div className="text-center flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.45em] text-zinc-600">Secured Guard Mail</p>
                      <p className="text-[9px] font-black text-zinc-700 mt-1 uppercase tracking-widest border border-zinc-900/30 px-3 py-1.5 bg-zinc-900/10">
                        SELECIONE UMA MENSAGEM PARA COMEÇAR
                      </p>
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
