import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Save, AlertCircle, Mail } from 'lucide-react';

import { EmailAccount } from '../../types/webmail';

interface Props {
  account?: EmailAccount;
  onSaved: () => void;
}

export function AccountConfig({ account, onSaved }: Props) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: account?.email || '',
    password: '',
    imapHost: account?.imapHost || '',
    imapPort: account?.imapPort || 993,
    smtpHost: account?.smtpHost || '',
    smtpPort: account?.smtpPort || 465,
    signature: account?.signature || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (account) {
        await api.put(`/webmail/${account.id}/signature`, {
          signature: formData.signature
        });
      } else {
        await api.post('/webmail/accounts', {
          ...formData,
          userId: user?.id
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falha ao salvar conta. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];

  return (
    <div className="flex-1 flex items-start justify-center p-4 md:p-8 bg-zinc-950 w-full overflow-y-auto">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 shadow-lg rounded-xl overflow-hidden flex max-h-[86vh] flex-col">
        
        <div className="p-4 md:p-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-col gap-1">
          <div className="flex items-center gap-3 text-zinc-100">
            <div className="p-2 bg-blue-600 rounded-md">
              <Mail size={20} className="text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Configurar Conta de E-mail</h2>
          </div>
          <p className="text-zinc-500 text-xs md:text-sm mt-2">Insira as credenciais do seu provedor IMAP/SMTP para sincronizar.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-md mb-6 flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@dominio.com.br"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              
              {!account && (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Senha do App</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">IMAP Host</label>
                <input
                  type="text"
                  required
                  placeholder="imap.mail.yahoo.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  value={formData.imapHost}
                  onChange={e => setFormData({...formData, imapHost: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">IMAP Port (SSL)</label>
                <input
                  type="number"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  value={formData.imapPort}
                  onChange={e => setFormData({...formData, imapPort: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">SMTP Host</label>
                <input
                  type="text"
                  required
                  placeholder="smtp.mail.yahoo.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  value={formData.smtpHost}
                  onChange={e => setFormData({...formData, smtpHost: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">SMTP Port (SSL/TLS)</label>
                <input
                  type="number"
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-3 text-zinc-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  value={formData.smtpPort}
                  onChange={e => setFormData({...formData, smtpPort: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2 signature-editor">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Assinatura de E-mail</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-md overflow-hidden">
                  <ReactQuill 
                    theme="snow"
                    value={formData.signature}
                    onChange={val => setFormData({...formData, signature: val})}
                    modules={quillModules}
                    formats={quillFormats}
                    className="text-zinc-100"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 -mb-4 mt-6 border-t border-zinc-800 bg-zinc-900/95 px-4 py-4 md:-mx-6 md:-mb-6 md:px-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 text-white font-medium px-8 py-3 rounded-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? 'Processando...' : (
                  <>
                    <Save size={18} /> Salvar Configuração
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style>{`
        .signature-editor .ql-toolbar {
          background-color: #18181b;
          border-color: #27272a !important;
        }
        .signature-editor .ql-container {
          border-color: #27272a !important;
          min-height: 150px;
        }
        .signature-editor .ql-editor {
          min-height: 150px;
          color: #f4f4f5;
        }
        .signature-editor .ql-stroke {
          stroke: #a1a1aa !important;
        }
        .signature-editor .ql-fill {
          fill: #a1a1aa !important;
        }
        .signature-editor .ql-picker {
          color: #a1a1aa !important;
        }
      `}</style>
    </div>
  );
}
