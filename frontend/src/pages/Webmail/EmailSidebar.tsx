import React, { useState } from 'react';
import { EmailCache } from '../../types/webmail';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertOctagon, Paperclip, Search, Trash2, Mail, MailOpen, Flag } from 'lucide-react';

interface Props {
  emails: EmailCache[];
  selectedEmailId?: string;
  onSelectEmail: (email: EmailCache) => void;
  onDeleteEmail?: (email: EmailCache) => void;
  onToggleRead?: (email: EmailCache) => void;
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

// Helper to get a stable aesthetic HSL background color based on string
const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Curated elegant tech hue range: Blue (200-240), Orange/Gold (30-50), Aqua (170-190), Red/Orange (0-20), Green (100-140)
  // We strictly avoid purple (270-300)
  const hues = [200, 220, 35, 175, 12, 115, 190];
  const hue = hues[Math.abs(hash) % hues.length];
  return `hsl(${hue}, 70%, 45%)`;
};

export function EmailSidebar({ emails, selectedEmailId, onSelectEmail, onDeleteEmail, onToggleRead }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());

  const handleToggleFlag = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = new Set(flaggedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setFlaggedIds(updated);
  };

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <Mail size={40} className="text-zinc-700 mb-3 animate-pulse" />
        <div className="text-xs font-black uppercase tracking-widest text-zinc-500">Caixa Vazia</div>
        <div className="text-[10px] font-bold text-zinc-600 mt-1 uppercase">Sua caixa de entrada está limpa.</div>
      </div>
    );
  }

  // Filter & Search Logic
  const filteredEmails = emails.filter((email) => {
    const matchesSearch = 
      email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = filterTab === 'all' || !email.isRead;
    
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-mono">
      {/* Search Input Box */}
      <div className="px-4 pt-3 pb-2 border-b border-zinc-900 bg-zinc-950">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-zinc-500" />
          <input
            type="text"
            placeholder="PESQUISAR E-MAILS..."
            className="w-full bg-zinc-900/80 text-[10px] text-zinc-200 placeholder-zinc-600 pl-9 pr-3 py-2 rounded-none border border-zinc-800 focus:border-zinc-700 outline-none transition-all uppercase font-bold tracking-wider"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs (Outlook Style) */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/40 text-[9px] font-black tracking-widest">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 border transition-all ${
              filterTab === 'all'
                ? 'border-zinc-700 text-zinc-100 bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            } rounded-none uppercase`}
          >
            Tudo ({emails.length})
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1 border transition-all ${
              filterTab === 'unread'
                ? 'border-zinc-700 text-zinc-100 bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            } rounded-none uppercase`}
          >
            Não Lidos ({emails.filter(e => !e.isRead).length})
          </button>
        </div>
        <span className="text-zinc-600 font-bold uppercase">OUTLOOK CLASSIC</span>
      </div>

      {/* Email Cards List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredEmails.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-600 uppercase font-bold">
            Nenhum e-mail corresponde aos filtros.
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredEmails.map((email) => {
              const isSelected = selectedEmailId === email.id;
              const isSpam = email.isSpam;
              const isFlagged = flaggedIds.has(email.id);
              const senderName = email.sender.split('<')[0].trim() || email.sender;
              const avatarBg = getAvatarColor(senderName);
              const initials = getInitials(senderName);

              return (
                <div
                  key={email.id}
                  onClick={() => onSelectEmail(email)}
                  className={`
                    group relative p-4 cursor-pointer border-b border-zinc-900/60 transition-all duration-200 flex gap-3 select-none
                    ${isSelected ? 'bg-zinc-900/80 border-l-4 border-l-blue-500' : 'hover:bg-zinc-900/40 border-l-4 border-l-transparent'}
                    ${isSpam ? 'bg-red-950/5' : ''}
                  `}
                >
                  {/* Unread Bright Blue Left Stripe Indicator (Only if not selected and unread) */}
                  {!email.isRead && !isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                  )}

                  {/* Left Column: Avatar & Unread Indicator Dot */}
                  <div className="flex flex-col items-center justify-start shrink-0 pt-0.5">
                    <div
                      className="w-8 h-8 rounded-none border border-zinc-800 flex items-center justify-center text-zinc-100 text-xs font-black select-none tracking-tighter"
                      style={{ backgroundColor: avatarBg }}
                    >
                      {initials}
                    </div>
                  </div>

                  {/* Middle Column: Sender, Subject, Date & Content Preview */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    {/* Top Row: Sender Name & Date */}
                    <div className="flex justify-between items-start gap-1">
                      <div
                        className={`truncate text-xs tracking-tight ${
                          !email.isRead ? 'font-black text-zinc-100' : 'font-bold text-zinc-400'
                        }`}
                      >
                        {senderName}
                      </div>
                      <div
                        className={`text-[9px] font-bold font-mono tracking-tighter shrink-0 mt-0.5 ${
                          !email.isRead ? 'text-blue-400 font-black' : 'text-zinc-600'
                        }`}
                      >
                        {format(new Date(email.receivedDate), 'dd/MM HH:mm', { locale: ptBR })}
                      </div>
                    </div>

                    {/* Middle Row: Subject Line */}
                    <div
                      className={`truncate text-xs ${
                        !email.isRead ? 'font-bold text-zinc-200' : 'text-zinc-500'
                      }`}
                    >
                      {email.subject || '(Sem Assunto)'}
                    </div>

                    {/* Bottom Row: Icons (Attachment / Spam / Flag) */}
                    <div className="flex gap-2 mt-1.5 items-center">
                      {email.hasAttachment && (
                        <Paperclip size={10} className="text-zinc-600 shrink-0" />
                      )}
                      {isSpam && (
                        <AlertOctagon size={10} className="text-red-500 shrink-0" />
                      )}
                      {isFlagged && (
                        <Flag size={10} className="text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Absolute Overlay Command Buttons on Card Hover (MS Outlook Style) */}
                  <div className="absolute right-2 bottom-2 hidden group-hover:flex items-center gap-1 bg-zinc-950/90 border border-zinc-800 p-1 shadow-md animate-in fade-in duration-100">
                    {/* Mark Read/Unread Icon */}
                    {onToggleRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleRead(email);
                        }}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-colors"
                        title={email.isRead ? 'Marcar como não lida' : 'Marcar como lida'}
                      >
                        {email.isRead ? <Mail size={12} /> : <MailOpen size={12} />}
                      </button>
                    )}

                    {/* Toggle Flag Icon */}
                    <button
                      onClick={(e) => handleToggleFlag(e, email.id)}
                      className={`p-1 hover:bg-zinc-800 transition-colors ${
                        isFlagged ? 'text-amber-400 hover:text-amber-500' : 'text-zinc-400 hover:text-amber-400'
                      }`}
                      title={isFlagged ? 'Remover marcação' : 'Sinalizar mensagem'}
                    >
                      <Flag size={12} className={isFlagged ? 'fill-amber-400' : ''} />
                    </button>

                    {/* Instant Move/Delete Icon */}
                    {onDeleteEmail && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEmail(email);
                        }}
                        className="p-1 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Mover para lixeira"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
