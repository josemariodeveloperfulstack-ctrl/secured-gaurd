import React from 'react';
import { EmailCache } from '../../types/webmail';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertOctagon, Paperclip } from 'lucide-react';

interface Props {
  emails: EmailCache[];
  selectedEmailId?: string;
  onSelectEmail: (email: EmailCache) => void;
}

export function EmailSidebar({ emails, selectedEmailId, onSelectEmail }: Props) {
  if (emails.length === 0) {
    return <div className="p-8 text-center text-sm text-zinc-500">Sua caixa de entrada está vazia.</div>;
  }

  return (
    <div className="flex flex-col">
      {emails.map((email) => {
        const isSelected = selectedEmailId === email.id;
        const isSpam = email.isSpam;
        
        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className={`
              p-4 cursor-pointer border-b border-zinc-800/50 transition-all flex flex-col gap-1
              ${isSelected ? 'bg-blue-600/10' : 'hover:bg-zinc-800/40'}
              ${!email.isRead && !isSelected ? 'border-l-4 border-l-blue-500 pl-3' : 'border-l-4 border-l-transparent pl-3'}
              ${isSpam ? 'border-l-red-500 bg-red-950/10' : ''}
            `}
          >
            <div className="flex justify-between items-start">
              <div className={`truncate text-sm w-3/4 ${!email.isRead ? 'font-bold text-zinc-100' : 'font-medium text-zinc-300'}`}>
                {email.sender.split('<')[0] || email.sender}
              </div>
              <div className={`text-xs ${!email.isRead ? 'font-semibold text-blue-400' : 'text-zinc-500'}`}>
                {format(new Date(email.receivedDate), 'dd/MM', { locale: ptBR })}
              </div>
            </div>
            
            <div className={`truncate text-sm ${!email.isRead ? 'font-semibold text-zinc-200' : 'text-zinc-400'}`}>
              {email.subject || '(Sem Assunto)'}
            </div>

            <div className="flex gap-2 mt-1 items-center">
              {email.hasAttachment && (
                <Paperclip size={14} className={isSelected ? 'text-blue-400' : 'text-zinc-500'} />
              )}
              {isSpam && (
                <AlertOctagon size={14} className="text-red-500" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
