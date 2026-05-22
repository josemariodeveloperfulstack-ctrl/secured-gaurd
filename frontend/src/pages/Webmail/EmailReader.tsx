import React, { useEffect, useState } from 'react';
import { EmailCache, EmailContent } from '../../types/webmail';
import { api } from '../../services/api';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip, Download, AlertTriangle, User, MoreHorizontal, Reply, FolderInput, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  email: EmailCache;
  accountId?: string;
  folders?: string[];
  onEmailMoved?: () => void;
}

// Helper to generate initials from sender name
const getInitials = (sender: string) => {
  const cleanName = sender.split('<')[0].trim();
  const parts = cleanName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

// Helper to get stable HSL background color based on string
const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [200, 220, 35, 175, 12, 115, 190];
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 70%, 45%)`;
};

export function EmailReader({ email, accountId, folders = [], onEmailMoved }: Props) {
  const [content, setContent] = useState<EmailContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  useEffect(() => {
    if (email && accountId) {
      loadEmailBody();
    }
  }, [email, accountId]);

  const loadEmailBody = async () => {
    try {
      setLoading(true);
      setError(null);
      setContent(null);
      const res = await api.get(`/webmail/${accountId}/read/${email.providerUid}`);
      setContent(res.data);
    } catch (err: any) {
      setError('Falha ao baixar o conteúdo do e-mail via IMAP.');
    } finally {
      setLoading(false);
    }
  };

  const moveEmail = async (targetFolder: string) => {
    if (!accountId) return;
    try {
      setIsMoving(true);
      await api.put(`/webmail/${accountId}/emails/${email.providerUid}/move?targetFolder=${encodeURIComponent(targetFolder)}`);
      setShowMoveMenu(false);
      if (onEmailMoved) onEmailMoved();
    } catch (err) {
      alert("Erro ao mover email");
    } finally {
      setIsMoving(false);
    }
  };

  const createSafeHtml = (html: string) => {
    const clean = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: email.isSpam ? ['src', 'background'] : []
    });
    return { __html: clean };
  };

  const trashFolder = folders.find(f => f.toLowerCase().includes('trash') || f.toLowerCase().includes('lixeira'));
  const senderName = email.sender.split('<')[0].trim() || email.sender;
  const avatarBg = getAvatarColor(senderName);
  const initials = getInitials(senderName);

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full overflow-hidden font-mono select-none">
      
      {/* Top Command Action Bar (Outlook Command Ribbon) */}
      <div className="px-4 py-2 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Reply */}
          <button 
            className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 text-xs font-black uppercase text-zinc-300 hover:text-zinc-100 flex items-center gap-2 transition-all rounded-none"
            title="Responder"
          >
            <Reply size={12} className="text-blue-400" />
            <span>Responder</span>
          </button>

          {/* Quick Move Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              disabled={isMoving}
              className="px-3 py-1.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 text-xs font-black uppercase text-zinc-300 hover:text-zinc-100 flex items-center gap-2 transition-all disabled:opacity-50 rounded-none"
              title="Mover e organizar"
            >
              <FolderInput size={12} className="text-amber-500" />
              <span>Mover Pasta</span>
            </button>
            
            {showMoveMenu && folders.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-48 bg-zinc-950 border-2 border-zinc-800 shadow-xl z-30 overflow-hidden font-mono">
                <div className="px-3 py-2 text-[9px] font-black text-zinc-600 bg-zinc-900/40 uppercase tracking-widest border-b border-zinc-900">
                  Pastas Disponíveis
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {folders.map(f => (
                    <button 
                      key={f}
                      onClick={() => moveEmail(f)}
                      className="w-full text-left px-4 py-2 text-[10px] uppercase font-bold text-zinc-400 hover:bg-zinc-900 hover:text-blue-400 transition-colors truncate border-b border-zinc-900/40 rounded-none"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Delete */}
          {trashFolder && (
            <button 
              onClick={() => moveEmail(trashFolder)}
              disabled={isMoving}
              className="px-3 py-1.5 border border-zinc-800 hover:border-red-900 bg-zinc-900/50 hover:bg-red-950/20 text-xs font-black uppercase text-zinc-400 hover:text-red-400 flex items-center gap-2 transition-all disabled:opacity-50 rounded-none" 
              title="Mover para Lixeira"
            >
              <Trash2 size={12} />
              <span>Excluir</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-black text-zinc-600 font-mono tracking-widest uppercase">READING HUD</span>
        </div>
      </div>

      {/* Main Reader Frame */}
      <div className="flex-1 flex flex-col overflow-y-auto" onClick={() => setShowMoveMenu(false)}>
        {/* Spam Warning Panel */}
        {email.isSpam && (
          <div className="m-4 bg-red-950/20 text-red-400 p-3 text-[10px] uppercase tracking-wider font-black flex items-center gap-3 border border-red-900/50 rounded-none">
            <ShieldAlert size={14} className="text-red-500 animate-pulse shrink-0" />
            <span>Alerta de Risco: Mensagem classificada como Spam. Links e imagens externas desativados por segurança.</span>
          </div>
        )}

        {/* Sender details and subject line header */}
        <div className="p-6 border-b border-zinc-900 bg-zinc-950 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 select-text">
            <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest font-mono">Assunto da Mensagem</div>
            <h1 className="text-lg md:text-xl font-black text-zinc-100 uppercase tracking-tight leading-tight">
              {email.subject || '(Sem Assunto)'}
            </h1>
          </div>
          
          <div className="flex items-start gap-4 pt-2">
            {/* Initials Avatar */}
            <div
              className="w-10 h-10 border border-zinc-800 flex items-center justify-center text-zinc-100 text-sm font-black select-none tracking-tighter"
              style={{ backgroundColor: avatarBg }}
            >
              {initials}
            </div>

            {/* Meta Text */}
            <div className="flex-1 min-w-0 flex flex-col gap-1 select-text">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="text-xs font-bold text-zinc-200 truncate">{email.sender}</div>
                <div className="text-[9px] font-bold text-zinc-500 font-mono uppercase tracking-wider shrink-0 mt-0.5">
                  {format(new Date(email.receivedDate), "dd/MM/yyyy - HH:mm", { locale: ptBR })}
                </div>
              </div>
              <div className="text-[9px] font-bold text-zinc-500 font-mono uppercase tracking-wider">
                Para: <span className="text-zinc-400">mim (IMAP Client)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Email Body Content */}
        <div className="flex-1 p-6 flex flex-col gap-6 relative min-h-[300px]">
          {loading && (
            <div className="text-blue-500 text-xs font-black uppercase tracking-widest animate-pulse flex items-center justify-center h-48 w-full font-mono">
              Baixando corpo de e-mail via IMAP...
            </div>
          )}

          {error && (
            <div className="text-red-400 text-xs font-black uppercase tracking-widest flex items-center justify-center h-48 w-full font-mono border border-red-900/30 bg-red-950/5">
              {error}
            </div>
          )}

          {content && !loading && (
            <div className="flex flex-col xl:flex-row gap-6 h-full items-start">
              
              {/* HTML Viewport card */}
              <div className="flex-1 bg-white text-zinc-900 p-8 shadow-md border-2 border-zinc-800 rounded-none overflow-y-auto max-w-full select-text">
                <div 
                  className="email-html-content prose prose-sm max-w-none text-zinc-900 font-sans"
                  dangerouslySetInnerHTML={createSafeHtml(content.htmlBody)} 
                />
              </div>

              {/* Sidebar Anexos (Geometric Cards) */}
              {content.attachments && content.attachments.length > 0 && (
                <div className="w-full xl:w-72 shrink-0 flex flex-col gap-3">
                  <div className="text-[10px] font-black text-zinc-500 mb-1 border-b border-zinc-900 pb-2 uppercase tracking-widest">
                    Anexos Detectados ({content.attachments.length})
                  </div>
                  {content.attachments.map((att, idx) => (
                    <div key={idx} className="bg-zinc-900/60 border border-zinc-800 rounded-none p-3.5 flex flex-col gap-3 hover:border-zinc-700 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 border border-zinc-800">
                          <Paperclip size={14} className="text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-zinc-300 truncate flex-1 uppercase tracking-tight" title={att.filename}>
                          {att.filename}
                        </span>
                      </div>
                      <button className="text-[9px] tracking-widest font-black uppercase text-zinc-100 bg-zinc-800 hover:bg-blue-600 rounded-none py-2 px-3 w-full flex items-center justify-center gap-2 transition-all">
                        <Download size={12} />
                        Baixar Arquivo
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
