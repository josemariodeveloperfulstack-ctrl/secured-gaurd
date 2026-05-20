import React, { useState, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useDropzone } from 'react-dropzone';
import { api } from '../../services/api';
import { Send, X, Paperclip, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  accountId: string;
  initialSignature?: string;
  onSent: () => void;
  onCancel: () => void;
}

export function EmailComposer({ accountId, initialSignature, onSent, onCancel }: Props) {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState(initialSignature ? `<p><br></p><p><br></p>${initialSignature}` : '');
  const [scheduledTime, setScheduledTime] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);

  const MAX_FILE_SIZE = 28 * 1024 * 1024; // 28MB
  const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.vbs', '.js', '.scr'];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    let sizeError = false;
    let extError = false;

    const safeFiles = acceptedFiles.filter(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        extError = true;
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        sizeError = true;
        return false;
      }
      return true;
    });

    if (extError) setError("Alguns arquivos foram bloqueados por segurança (extensão perigosa).");
    if (sizeError) setError("Alguns arquivos excedem o limite de 28MB.");

    setAttachments(prev => [...prev, ...safeFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleSend = async () => {
    if (!to || !subject) {
      setError("Destinatário e assunto são obrigatórios.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('to', to);
      formData.append('cc', cc);
      formData.append('bcc', bcc);
      formData.append('subject', subject);
      formData.append('htmlBody', htmlBody);
      if (scheduledTime) {
        formData.append('scheduledTime', scheduledTime);
      }
      
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      await api.post(`/webmail/${accountId}/send`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onSent();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao enviar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-zinc-100">Nova Mensagem</h2>
        <div className="flex items-center gap-2">
           <button 
            onClick={() => setScheduledTime(scheduledTime ? '' : new Date().toISOString().slice(0, 16))} 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${scheduledTime ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30' : 'text-zinc-400 hover:bg-zinc-800'}`}
            title="Agendar envio"
          >
            <Calendar size={16} /> {scheduledTime ? 'Agendado' : 'Agendar'}
          </button>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-200 transition-colors p-2 rounded-md hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md mb-4 flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400"><X size={14}/></button>
        </div>
      )}

      <div className="flex flex-col gap-3 flex-1 overflow-hidden bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-lg">
        
        <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Para</label>
            <button 
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              CC / BCC {showCcBcc ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>
          </div>
          <input 
            type="text" 
            placeholder="destinatario@exemplo.com"
            className="bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none w-full font-medium"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>

        {showCcBcc && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">CC</label>
              <input 
                type="text" 
                className="bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none w-full font-medium"
                value={cc}
                onChange={e => setCc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">BCC</label>
              <input 
                type="text" 
                className="bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none w-full font-medium"
                value={bcc}
                onChange={e => setBcc(e.target.value)}
              />
            </div>
          </div>
        )}

        {scheduledTime && (
          <div className="flex flex-col gap-1 border-b border-orange-900/30 bg-orange-950/10 p-2 rounded-md mb-2">
            <label className="text-xs font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1">
              <Calendar size={12}/> Data e Hora de Envio
            </label>
            <input 
              type="datetime-local" 
              className="bg-transparent text-orange-400 focus:outline-none w-full font-medium"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>
        )}
        
        <div className="flex flex-col gap-1 border-b border-zinc-800 pb-2">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Assunto</label>
          <input 
            type="text" 
            placeholder="Título da sua mensagem"
            className="bg-transparent text-zinc-100 placeholder-zinc-700 focus:outline-none w-full font-medium"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        <div className="flex-1 bg-zinc-100 text-zinc-900 mt-1 flex flex-col rounded-md overflow-hidden border border-zinc-800">
          <ReactQuill 
            theme="snow" 
            value={htmlBody} 
            onChange={setHtmlBody}
            className="flex-1 overflow-hidden h-full"
            style={{ height: 'calc(100% - 42px)' }}
          />
        </div>

        <div className="flex gap-4 mt-2">
          <div 
            {...getRootProps()} 
            className={`
              flex-1 border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center transition-colors cursor-pointer
              ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/50'}
            `}
          >
            <input {...getInputProps()} />
            <Paperclip size={20} className="text-zinc-500 mb-1" />
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Anexar (Máx 28MB)</p>
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2 max-h-32 overflow-y-auto p-1">
            {attachments.map((file, idx) => (
              <div key={idx} className="bg-zinc-800 rounded-md text-xs text-zinc-200 px-3 py-2 flex items-center gap-2 border border-zinc-700 shadow-sm animate-in zoom-in-95">
                <Paperclip size={12} className="text-blue-500" />
                <span className="truncate max-w-[150px] font-semibold">{file.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                <button onClick={() => removeAttachment(idx)} className="text-zinc-500 hover:text-red-400 ml-1 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      <div className="mt-4 flex justify-between items-center">
        <p className="text-xs text-zinc-500 italic">Dica: Você pode agendar o envio para mais tarde clicando em 'Agendar'.</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="text-zinc-400 font-bold text-xs uppercase tracking-widest px-4 py-2.5 hover:text-zinc-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-md px-8 py-3 flex items-center gap-2 hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] disabled:opacity-50"
          >
            {loading ? 'Processando...' : (
              <>{scheduledTime ? 'Confirmar Agendamento' : 'Enviar Mensagem'} <Send size={14} /></>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
