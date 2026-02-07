import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { contractService, ContractDocument, ContractDocumentTypeType } from '@/services/contractService';
import { Loader2, Plus, Trash2, FileText, Upload, Download } from 'lucide-react';
import api from '@/lib/axios';
import { getApiUrl } from '@/config/environment';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const DOC_TYPES: { value: ContractDocumentTypeType; label: string }[] = [
  { value: 'CONTRACT', label: 'Contrato' },
  { value: 'AMENDMENT', label: 'Aditivo' },
  { value: 'LEGAL_ATTACHMENT', label: 'Anexo Legal' },
];

interface ContractDocumentsTabProps {
  contractId: string;
}

export const ContractDocumentsTab: React.FC<ContractDocumentsTabProps> = ({ contractId }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    type: 'CONTRACT' as ContractDocumentTypeType,
    fileName: '',
    fileUrl: ''
  });

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await contractService.getDocuments(contractId);
      setDocuments(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os documentos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [contractId]);

  const handleCreate = async () => {
    if (!formData.type) {
      toast({ title: 'Campos obrigatórios', description: 'Selecione o tipo do documento.', variant: 'destructive' });
      return;
    }
    if (!selectedFile && !formData.fileUrl) {
      toast({ title: 'Campos obrigatórios', description: 'Faça upload de um arquivo ou informe a URL.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let fileUrl = formData.fileUrl;
      let fileName = formData.fileName;

      if (selectedFile) {
        const form = new FormData();
        form.append('file', selectedFile);
        const res = await api.post('/uploads/contracts', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const data = res.data;
        fileUrl = data?.url || data?.path;
        if (!fileUrl && data?.path) {
          fileUrl = '/api/uploads/contracts/' + data?.filename;
        }
        fileName = data?.originalName || selectedFile.name;
      }

      await contractService.createDocument(contractId, {
        type: formData.type,
        fileName: fileName || undefined,
        fileUrl: fileUrl || undefined
      });
      toast({ title: 'Sucesso', description: 'Documento adicionado.' });
      setModalOpen(false);
      setFormData({ type: 'CONTRACT', fileName: '', fileUrl: '' });
      setSelectedFile(null);
      loadDocuments();
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Não foi possível adicionar.';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      await contractService.deleteDocument(contractId, documentId);
      toast({ title: 'Sucesso', description: 'Documento excluído.' });
      loadDocuments();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.response?.data?.message || 'Não foi possível excluir.', variant: 'destructive' });
    }
  };

  const getDocumentUrl = (fileUrl?: string) => {
    if (!fileUrl) return '';
    const base = getApiUrl().replace(/\/api\/?$/, '');
    return fileUrl.startsWith('http') ? fileUrl : `${base}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
  };

  const handleDownload = async (d: ContractDocument) => {
    const url = getDocumentUrl(d.fileUrl);
    if (!url) return;
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = res.data;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = d.fileName || 'documento';
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'SIGNED') return <Badge className="bg-green-500/20 text-green-400">Assinado</Badge>;
    if (status === 'REJECTED') return <Badge className="bg-red-500/20 text-red-400">Rejeitado</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-seguranca-lightgray">Documentos</h4>
        <Button size="sm" onClick={() => setModalOpen(true)} className="bg-seguranca-red hover:bg-seguranca-darkred">
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-seguranca-yellow" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">Nenhum documento vinculado.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {documents.map((d) => (
            <div
              key={d.id}
              className="p-3 bg-seguranca-black border border-gray-600 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="font-medium text-seguranca-lightgray">
                    {DOC_TYPES.find(t => t.value === d.type)?.label || d.type}
                  </span>
                  {d.fileName && <p className="text-sm text-gray-400">{d.fileName}</p>}
                  <div className="mt-1">{getStatusBadge(d.signatureStatus)}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {d.fileUrl && (
                  <Button size="sm" variant="outline" className="text-green-400 border-green-500/50" onClick={() => handleDownload(d)} title="Baixar">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-gray-400" onClick={() => handleDelete(d.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) {
          setSelectedFile(null);
          setFormData({ type: 'CONTRACT', fileName: '', fileUrl: '' });
        }
      }}>
        <DialogContent className="bg-seguranca-graphite border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-seguranca-lightgray">Adicionar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-seguranca-lightgray">Tipo *</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as ContractDocumentTypeType }))}>
                <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Arquivo *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setSelectedFile(f || null);
                  if (f) setFormData(prev => ({ ...prev, fileName: f.name, fileUrl: '' }));
                }}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
              />
              {selectedFile && (
                <p className="text-sm text-gray-400 mt-1">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>
            <div>
              <Label className="text-seguranca-lightgray">Ou URL do arquivo (opcional)</Label>
              <Input
                value={formData.fileUrl}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, fileUrl: e.target.value }));
                  if (e.target.value) setSelectedFile(null);
                }}
                className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                placeholder="https://... (alternativa ao upload)"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-seguranca-red hover:bg-seguranca-darkred">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {saving ? 'Enviando...' : 'Adicionar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
