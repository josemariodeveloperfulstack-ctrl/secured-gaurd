import React, { useEffect, useState } from 'react';
import { EmailCache, EmailContent } from '../../types/webmail';
import { api } from '../../services/api';
import DOMPurify from 'dompurify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip, Download, AlertTriangle, User, MoreHorizontal, Reply, FolderInput, Trash2 } from 'lucide-react';

interface Props {
  email: EmailCache;
  accountId?: string;
  folders?: string[];
  onEmailMoved?: () => void;
}

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

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-900/30">
        
        {email.isSpam && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-md text-sm font-medium flex items-center gap-3 mb-4 border border-red-500/20">
            <AlertTriangle size={18} />
            Aviso de Segurança: Este remetente foi sinalizado como SPAM. Imagens externas foram bloqueadas.
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 leading-tight">
            {email.subject || '(Sem Assunto)'}
          </h1>
          <div className="flex gap-2 text-zinc-400 relative">
            {trashFolder && (
              <button 
                onClick={() => moveEmail(trashFolder)}
                disabled={isMoving}
                className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors disabled:opacity-50" 
                title="Excluir"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button 
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              disabled={isMoving}
              className="p-2 hover:bg-zinc-800 hover:text-zinc-200 rounded-md transition-colors disabled:opacity-50" 
              title="Mover para..."
            >
              <FolderInput size={18} />
            </button>
            
            {showMoveMenu && folders.length > 0 && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-10 overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold text-zinc-500 bg-zinc-950/50 uppercase tracking-wider">
                  Mover para
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {folders.map(f => (
                    <button 
                      key={f}
                      onClick={() => moveEmail(f)}
                      className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors truncate"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="p-2 hover:bg-zinc-800 rounded-md transition-colors" title="Responder">
              <Reply size={18} />
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-md transition-colors" title="Mais opções">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 shadow-sm">
            <User size={20} className="text-zinc-400" />
          </div>
          <div className="flex flex-col">
            <div className="text-lg font-medium text-zinc-200">{email.sender}</div>
            <div className="text-sm text-zinc-500">
              {format(new Date(email.receivedDate), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 relative" onClick={() => setShowMoveMenu(false)}>
        {loading && (
          <div className="text-blue-500 text-sm animate-pulse flex items-center justify-center h-full">
            Sincronizando corpo da mensagem...
          </div>
        )}

        {error && (
          <div className="text-red-400 text-sm flex items-center justify-center h-full">
            {error}
          </div>
        )}

        {content && !loading && (
          <div className="flex flex-col xl:flex-row gap-6 h-full">
            
            {/* HTML Body */}
            <div className="flex-1 bg-white text-zinc-900 p-8 shadow-md rounded-lg overflow-y-auto border border-zinc-200/20">
              <div 
                className="email-html-content prose prose-sm max-w-none"
                dangerouslySetInnerHTML={createSafeHtml(content.htmlBody)} 
              />
            </div>

            {/* Attachments Sidebar */}
            {content.attachments && content.attachments.length > 0 && (
              <div className="w-full xl:w-72 flex flex-col gap-3">
                <div className="text-sm font-medium text-zinc-300 mb-2 border-b border-zinc-800 pb-2">
                  Anexos ({content.attachments.length})
                </div>
                {content.attachments.map((att, idx) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col gap-3 hover:border-blue-500 transition-colors group shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-md">
                        <Paperclip size={16} className="text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-zinc-200 truncate flex-1" title={att.filename}>
                        {att.filename}
                      </span>
                    </div>
                    <button className="text-xs text-white bg-zinc-800 hover:bg-blue-600 rounded-md py-2 px-3 font-medium w-full flex items-center justify-center gap-2 transition-colors">
                      <Download size={14} />
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
  );
}
