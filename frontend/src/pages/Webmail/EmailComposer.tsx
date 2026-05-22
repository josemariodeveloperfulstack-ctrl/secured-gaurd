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
    <div className="flex flex-col h-full bg-zinc-950 p-6 w-full font-mono overflow-y-auto">
      
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-5 border-b border-zinc-900 pb-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs font-black tracking-[0.25em] text-zinc-100 uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 inline-block animate-pulse rounded-full" />
            NOVA MENSAGEM
          </h2>
          <span className="text-[8px] font-bold text-zinc-500 tracking-wider uppercase">Promover Mail Composer v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setScheduledTime(scheduledTime ? '' : new Date().toISOString().slice(0, 16))} 
            className={`flex items-center gap-2 px-3 py-2 border transition-all text-[9px] font-bold uppercase tracking-wider rounded-none ${
              scheduledTime 
                ? 'bg-amber-950/20 text-amber-400 border-amber-600/40 shadow-[0_0_10px_rgba(245,158,11,0.05)]' 
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
            title="Agendar envio de e-mail"
          >
            <Calendar size={13} /> {scheduledTime ? 'AGENDADO' : 'AGENDAR'}
          </button>
          <button 
            onClick={onCancel} 
            className="text-zinc-500 hover:text-zinc-200 border border-transparent hover:border-zinc-800 p-2 transition-all rounded-none hover:bg-zinc-900"
            title="Fechar compositor"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-950/20 border-2 border-red-800 text-red-400 p-4 rounded-none mb-5 flex items-start gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-in fade-in duration-200">
          <AlertTriangle size={16} className="shrink-0 text-red-500 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">ERRO DO SISTEMA</span>
            <span className="text-[11px] font-medium leading-relaxed">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400 p-0.5 transition-colors">
            <X size={14}/>
          </button>
        </div>
      )}

      {/* Workspace Inner Panel */}
      <div className="flex flex-col gap-4 flex-1 bg-zinc-900/30 border-2 border-zinc-800 rounded-none p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Recipient Field */}
        <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Para</label>
            <button 
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-[9px] font-black text-blue-400 hover:text-blue-300 flex items-center gap-1 uppercase tracking-wider"
            >
              CC / CCO {showCcBcc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
            </button>
          </div>
          <input 
            type="text" 
            placeholder="destinatario@dominio.com"
            className="bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 placeholder-zinc-800 focus:border-zinc-700 focus:outline-none w-full font-bold text-xs rounded-none transition-all focus:shadow-[2px_2px_0px_0px_rgba(37,99,235,0.15)]"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>

        {/* CC and BCC Expander */}
        {showCcBcc && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">CC (Cópia)</label>
              <input 
                type="text" 
                placeholder="copia@dominio.com"
                className="bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 placeholder-zinc-800 focus:border-zinc-700 focus:outline-none w-full font-bold text-xs rounded-none transition-all"
                value={cc}
                onChange={e => setCc(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">CCO (Cópia Oculta)</label>
              <input 
                type="text" 
                placeholder="oculta@dominio.com"
                className="bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 placeholder-zinc-800 focus:border-zinc-700 focus:outline-none w-full font-bold text-xs rounded-none transition-all"
                value={bcc}
                onChange={e => setBcc(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Scheduled Send DateTime Input */}
        {scheduledTime && (
          <div className="flex flex-col gap-1.5 border-b border-amber-900/30 bg-amber-950/5 p-3 border-l-2 border-l-amber-500 mb-2">
            <label className="text-[10px] font-black text-amber-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Calendar size={12}/> DATA E HORA PROGRAMADA DO ENVIO
            </label>
            <input 
              type="datetime-local" 
              className="bg-zinc-950 border border-zinc-800 p-2.5 text-amber-400 focus:border-amber-600 focus:outline-none w-full font-bold text-xs rounded-none transition-all"
              value={scheduledTime}
              onChange={e => setScheduledTime(e.target.value)}
            />
          </div>
        )}
        
        {/* Subject Input */}
        <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Assunto</label>
          <input 
            type="text" 
            placeholder="Título da sua mensagem"
            className="bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 placeholder-zinc-800 focus:border-zinc-700 focus:outline-none w-full font-bold text-xs rounded-none transition-all focus:shadow-[2px_2px_0px_0px_rgba(37,99,235,0.15)]"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Custom Dark Rich Text Editor Area */}
        <div className="flex-1 min-h-[300px] mt-1 flex flex-col composer-editor">
          <ReactQuill 
            theme="snow" 
            value={htmlBody} 
            onChange={setHtmlBody}
            className="flex-1 overflow-hidden h-full"
            style={{ height: 'calc(100% - 42px)' }}
          />
        </div>

        {/* Drag & Drop File Upload Area */}
        <div className="flex gap-4 mt-2">
          <div 
            {...getRootProps()} 
            className={`
              flex-1 border-2 border-dashed p-4 flex flex-col items-center justify-center transition-colors cursor-pointer rounded-none
              ${isDragActive 
                ? 'border-blue-500 bg-blue-500/5' 
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900/20'
              }
            `}
          >
            <input {...getInputProps()} />
            <Paperclip size={18} className="text-zinc-500 mb-1.5" />
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Clique ou solte arquivos para anexar</p>
            <p className="text-[8px] text-zinc-650 font-bold uppercase tracking-wider mt-1">Limite Máximo: 28 Megabytes</p>
          </div>
        </div>

        {/* Selected Attachments list */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2 max-h-32 overflow-y-auto p-1.5 bg-zinc-950 border border-zinc-900">
            {attachments.map((file, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-900 text-[10px] text-zinc-300 px-3 py-2 flex items-center gap-2 border border-zinc-800 shadow-sm animate-in zoom-in-95 rounded-none"
              >
                <Paperclip size={11} className="text-blue-500 shrink-0" />
                <span className="truncate max-w-[150px] font-bold uppercase tracking-wide">{file.name}</span>
                <span className="text-[9px] text-zinc-600 font-mono shrink-0">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                <button 
                  onClick={() => removeAttachment(idx)} 
                  className="text-zinc-500 hover:text-red-400 ml-1 transition-colors p-0.5"
                  title="Remover anexo"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Action Footer */}
      <div className="mt-5 flex justify-between items-center border-t border-zinc-900 pt-4 bg-zinc-950">
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider hidden sm:block">
          DICA: AGENDAMENTOS PODEM SER EDITADOS NA ABA DE AGENDADOS
        </p>
        <div className="flex gap-3 ml-auto w-full sm:w-auto justify-end">
          <button 
            onClick={onCancel}
            className="border border-zinc-800 text-zinc-400 hover:text-zinc-100 bg-zinc-900/40 font-black text-[10px] uppercase tracking-[0.2em] rounded-none px-6 py-3 transition-all hover:bg-zinc-900 active:bg-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-none px-8 py-3.5 flex items-center gap-2 hover:bg-blue-500 active:bg-blue-700 border border-blue-500 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none disabled:opacity-50"
          >
            {loading ? 'PROCESSANDO...' : (
              <>{scheduledTime ? 'CONFIRMAR AGENDAMENTO' : 'ENVIAR MENSAGEM'} <Send size={12} className="ml-1" /></>
            )}
          </button>
        </div>
      </div>

      {/* Dark Editor Style overrides */}
      <style>{`
        .composer-editor .ql-toolbar {
          background-color: #09090b !important;
          border: 2px solid #27272a !important;
          border-bottom: none !important;
        }
        .composer-editor .ql-container {
          border: 2px solid #27272a !important;
          background-color: #09090b !important;
          min-height: 250px;
        }
        .composer-editor .ql-editor {
          min-height: 250px;
          color: #f4f4f5;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
        }
        .composer-editor .ql-stroke {
          stroke: #71717a !important;
        }
        .composer-editor .ql-stroke:hover {
          stroke: #3b82f6 !important;
        }
        .composer-editor .ql-fill {
          fill: #71717a !important;
        }
        .composer-editor .ql-picker {
          color: #71717a !important;
        }
      `}</style>

    </div>
  );
}
