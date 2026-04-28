import React from 'react';
import { Calendar, Mail, User, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduledEmail {
  id: string;
  toAddress: string;
  subject: string;
  scheduledTime: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  hasAttachment?: boolean;
}

interface Props {
  emails: ScheduledEmail[];
}

export function ScheduledEmailList({ emails }: Props) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 opacity-30">
        <Calendar size={64} />
        <p className="font-bold text-sm uppercase tracking-widest">Nenhum e-mail agendado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10">
        <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          <Clock size={16} className="text-orange-500" /> Fila de Envio (Agendados)
        </h2>
      </div>
      
      <div className="divide-y divide-zinc-800">
        {emails.map((email) => (
          <div key={email.id} className="p-4 hover:bg-zinc-800/50 transition-colors group cursor-default">
            <div className="flex justify-between items-start mb-1">
              <div className="flex items-center gap-2">
                <User size={14} className="text-zinc-500" />
                <span className="text-sm font-bold text-zinc-200">{email.toAddress}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tighter">
                  {format(new Date(email.scheduledTime), "dd MMM, HH:mm", { locale: ptBR })}
                </span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-1 uppercase ${
                  email.status === 'PENDING' ? 'bg-zinc-800 text-zinc-400' :
                  email.status === 'SENT' ? 'bg-green-500/20 text-green-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {email.status === 'PENDING' ? 'Aguardando' : email.status === 'SENT' ? 'Enviado' : 'Falhou'}
                </span>
              </div>
            </div>
            
            <h3 className="text-sm text-zinc-100 font-medium truncate mb-1 pr-12">{email.subject}</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase">
                {email.status === 'PENDING' ? (
                  <span className="flex items-center gap-1"><Clock size={10}/> Saída agendada</span>
                ) : email.status === 'SENT' ? (
                  <span className="flex items-center gap-1 text-green-500"><CheckCircle size={10}/> Processado</span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500"><AlertTriangle size={10}/> Erro no envio</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
