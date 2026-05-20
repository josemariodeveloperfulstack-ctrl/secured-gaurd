import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileSearch,
  FileCheck,
  Plus,
  Loader2,
  File
} from 'lucide-react';
import { documentService } from '@/services/documentService';
import { Document, DocumentType } from '@/types/document';
import { useToast } from '@/hooks/use-toast';
import { useDocumentosGeradosByEmployee } from '@/hooks/queries/useDocumentosGerados';
import { SystemGeneratedDocumentsSection } from './SystemGeneratedDocumentsSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmployeeDocumentsTabProps {
  employeeId: string;
}

const REQUIRED_DOCUMENTS: { type: DocumentType; label: string; description: string }[] = [
  { type: 'RG', label: 'RG (Frente e Verso)', description: 'Carteira de Identidade' },
  { type: 'CPF', label: 'CPF', description: 'Cadastro de Pessoa Física' },
  { type: 'TITULO_ELEITOR', label: 'Título de Eleitor', description: 'Com comprovante de votação' },
  { type: 'CTPS', label: 'CTPS', description: 'Carteira de Trabalho (Digital ou Física)' },
  { type: 'PIS_PASEP', label: 'PIS/PASEP', description: 'Cartão PIS ou extrato' },
  { type: 'CERTIDAO_NASCIMENTO', label: 'Certidão de Nascimento/Casamento', description: 'Documento de estado civil' },
  { type: 'ASO', label: 'ASO Admissional', description: 'Atestado de Saúde Ocupacional' },
  { type: 'OUTROS', label: 'Comprovante de Residência', description: 'Conta de luz, água ou telefone' },
];

export const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({ employeeId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Documentos gerados pelo sistema (Contrato, Termos, OS, NPPS, Relatórios, EPI).
  // Carregados via TanStack Query para se beneficiar do cache global e
  // de invalidações automáticas após geração de novos documentos.
  const {
    data: systemDocuments,
    isLoading: isLoadingSystemDocs,
  } = useDocumentosGeradosByEmployee(employeeId);

  // Upload Form State
  const [selectedType, setSelectedType] = useState<DocumentType>('RG');
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await documentService.getByEmployeeId(employeeId);
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar a lista de documentos do funcionário.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, toast]);

  useEffect(() => {
    if (employeeId) {
      fetchDocuments();
    }
  }, [employeeId, fetchDocuments]);

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Selecione um arquivo',
        description: 'É necessário selecionar um arquivo para upload.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      
      // 1. Criar o registro do documento
      const newDoc = await documentService.create({
        employeeId: employeeId,
        type: selectedType,
        number: docNumber || 'N/A',
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        expirationDate: expiryDate || undefined,
        description: selectedType === 'OUTROS' ? 'Comprovante de Residência' : undefined,
      });

      // 2. Fazer upload do arquivo
      await documentService.upload(newDoc.id, file);

      toast({
        title: 'Sucesso',
        description: 'Documento enviado com sucesso!',
      });

      setIsUploadModalOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro no upload',
        description: 'Ocorreu um erro ao enviar o documento.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await documentService.delete(id);
      toast({
        title: 'Documento excluído',
        description: 'O documento foi removido com sucesso.',
      });
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o documento.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await documentService.download(id);
    } catch (error) {
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar o arquivo.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setSelectedType('RG');
    setDocNumber('');
    setIssueDate('');
    setExpiryDate('');
    setFile(null);
  };

  const getDocStatus = (type: DocumentType) => {
    const doc = documents.find(d => d.type === type);
    return doc ? (doc.fileUrl ? 'DELIVERED' : 'PENDING') : 'MISSING';
  };

  const deliveredCount = REQUIRED_DOCUMENTS.filter(req => 
    documents.some(d => d.type === req.type && d.fileUrl)
  ).length;

  const progressPercentage = (deliveredCount / REQUIRED_DOCUMENTS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header com Progresso */}
      <Card className="bg-gradient-to-r from-seguranca-graphite to-gray-700 border-gray-600 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-seguranca-yellow" />
              Checklist de Admissão
            </h3>
            <p className="text-sm text-gray-400">
              Acompanhe a entrega dos documentos obrigatórios para contratação.
            </p>
          </div>
          
          <div className="flex-1 max-w-md space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300 font-medium">{deliveredCount} de {REQUIRED_DOCUMENTS.length} entregues</span>
              <span className="text-seguranca-yellow font-bold">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2 bg-gray-600" />
          </div>

          <Button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-seguranca-red hover:bg-seguranca-red/90 text-white gap-2 shadow-lg shadow-seguranca-red/20"
          >
            <Upload className="h-4 w-4" />
            Importar Documento
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist Col */}
        <div className="lg:col-span-1 space-y-4">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Checklist Obrigatório</h4>
          <div className="space-y-2">
            {REQUIRED_DOCUMENTS.map((req) => {
              const status = getDocStatus(req.type);
              return (
                <div 
                  key={req.type}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all duration-200 ${
                    status === 'DELIVERED' 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-seguranca-black/40 border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {status === 'DELIVERED' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${status === 'DELIVERED' ? 'text-white' : 'text-gray-300'}`}>
                        {req.label}
                      </p>
                      <p className="text-[11px] text-gray-500">{req.description}</p>
                    </div>
                  </div>
                  {status === 'DELIVERED' && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                      Entregue
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Documents List Col */}
        <div className="lg:col-span-2 space-y-4">
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider px-1">Documentos Importados</h4>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-seguranca-black/20 rounded-xl border border-dashed border-gray-700">
              <Loader2 className="h-8 w-8 text-seguranca-yellow animate-spin mb-4" />
              <p className="text-gray-400">Carregando documentos...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-seguranca-black/20 rounded-xl border border-dashed border-gray-700 text-center px-6">
              <div className="p-4 bg-gray-800/50 rounded-full mb-4">
                <FileSearch className="h-10 w-10 text-gray-500" />
              </div>
              <h5 className="text-white font-medium mb-1">Nenhum documento encontrado</h5>
              <p className="text-sm text-gray-500 max-w-xs">
                Inicie a importação dos documentos do funcionário clicando no botão de importação acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="bg-seguranca-black border-gray-700 hover:border-gray-500 transition-all group overflow-hidden">
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-seguranca-red/10 rounded-lg group-hover:bg-seguranca-red/20 transition-colors">
                          <FileText className="h-5 w-5 text-seguranca-red" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-white">{doc.type}</h5>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">{doc.fileName || 'documento.pdf'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <span className="text-[10px] text-gray-500">
                        Nº {doc.number || 'N/A'}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                          onClick={() => handleDownload(doc.id)}
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => handleDelete(doc.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documentos Gerados pelo Sistema */}
      <div className="pt-4 border-t border-gray-700">
        <SystemGeneratedDocumentsSection
          documents={systemDocuments}
          isLoading={isLoadingSystemDocs}
          variant="rh"
        />
      </div>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="bg-seguranca-graphite border-gray-600 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-seguranca-red" />
              Importar Documento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Tipo de Documento</Label>
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as DocumentType)}>
                <SelectTrigger className="bg-seguranca-black border-gray-700">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {REQUIRED_DOCUMENTS.map(req => (
                    <SelectItem key={req.type} value={req.type} className="text-white hover:bg-gray-700">
                      {req.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="OUTROS" className="text-white hover:bg-gray-700">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Número do Doc.</Label>
                <Input 
                  value={docNumber} 
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Ex: 12.345.678-9"
                  className="bg-seguranca-black border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Data de Emissão</Label>
                <Input 
                  type="date"
                  value={issueDate} 
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="bg-seguranca-black border-gray-700 [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Arquivo (PDF ou Imagem)</Label>
              <div className={`
                border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer transition-all
                hover:border-seguranca-red/50 hover:bg-seguranca-red/5
                ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
              `}
              onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  id="file-upload"
                  type="file" 
                  className="hidden" 
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="space-y-1">
                    <File className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium text-emerald-400">{file.name}</p>
                    <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-8 w-8 text-gray-600 mx-auto" />
                    <p className="text-sm text-gray-400">Clique para selecionar ou arraste o arquivo</p>
                    <p className="text-[10px] text-gray-500">Formatos aceitos: PDF, JPG, PNG (Max 10MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUploadModalOpen(false)}
              className="border-gray-700 text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading || !file}
              className="bg-seguranca-red hover:bg-seguranca-red/90 text-white min-w-[120px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Finalizar Importação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
