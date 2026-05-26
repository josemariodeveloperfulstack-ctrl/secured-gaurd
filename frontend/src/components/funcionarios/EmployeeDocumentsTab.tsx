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
  AlertCircle,
  FileSearch,
  FileCheck,
  Plus,
  Loader2,
  File,
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface EmployeeDocumentsTabProps {
  employeeId: string;
}

const DOC_SIDE = {
  FRONT: 'Frente',
  BACK: 'Verso',
} as const;

const REQUIRED_DOCUMENTS: { type: DocumentType; label: string; description: string }[] = [
  { type: 'RG', label: 'RG', description: 'Carteira de Identidade (geralmente frente e verso)' },
  { type: 'CPF', label: 'CPF', description: 'Cadastro de Pessoa Física' },
  { type: 'TITULO_ELEITOR', label: 'Título de Eleitor', description: 'Com comprovante de votação' },
  { type: 'CTPS', label: 'CTPS', description: 'Carteira de Trabalho (Digital ou Física)' },
  { type: 'PIS_PASEP', label: 'PIS/PASEP', description: 'Cartão PIS ou extrato' },
  { type: 'CERTIDAO_NASCIMENTO', label: 'Certidão de Nascimento/Casamento', description: 'Documento de estado civil' },
  { type: 'ASO', label: 'ASO Admissional', description: 'Atestado de Saúde Ocupacional' },
  { type: 'OUTROS', label: 'Comprovante de Residência', description: 'Conta de luz, água ou telefone' },
];

function FileDropZone({
  inputId,
  file,
  onSelect,
  emptyLabel,
  compact = false,
}: {
  inputId: string;
  file: File | null;
  onSelect: (file: File | null) => void;
  emptyLabel: string;
  compact?: boolean;
}) {
  const padding = compact ? 'p-4' : 'p-6';
  const iconSize = compact ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div
      className={`border-2 border-dashed border-gray-700 rounded-xl ${padding} text-center cursor-pointer transition-all hover:border-seguranca-red/50 hover:bg-seguranca-red/5 ${file ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
      onClick={() => document.getElementById(inputId)?.click()}
    >
      <input
        id={inputId}
        type="file"
        className="hidden"
        accept=".pdf,image/*"
        onChange={(e) => onSelect(e.target.files?.[0] || null)}
      />
      {file ? (
        <div className="space-y-1">
          <File className={`${iconSize} text-emerald-500 mx-auto`} />
          <p className={`font-medium text-emerald-400 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{file.name}</p>
          {!compact && (
            <p className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Upload className={`${iconSize} text-gray-600 mx-auto`} />
          <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>{emptyLabel}</p>
          {!compact && (
            <p className="text-[10px] text-gray-500">Formatos aceitos: PDF, JPG, PNG (Max 10MB)</p>
          )}
        </div>
      )}
    </div>
  );
}

export const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({ employeeId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const {
    data: systemDocuments,
    isLoading: isLoadingSystemDocs,
    isError: isSystemDocsError,
    refetch: refetchSystemDocs,
  } = useDocumentosGeradosByEmployee(employeeId);

  const [selectedType, setSelectedType] = useState<DocumentType>('RG');
  const [hasFrontBack, setHasFrontBack] = useState<'yes' | 'no' | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileFront, setFileFront] = useState<File | null>(null);
  const [fileBack, setFileBack] = useState<File | null>(null);

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

  const uploadDocumentFile = async (uploadFile: File, sideDescription?: string) => {
    const defaultDescription = selectedType === 'OUTROS' ? 'Comprovante de Residência' : undefined;
    const newDoc = await documentService.create({
      employeeId,
      type: selectedType,
      number: docNumber || 'N/A',
      issueDate: issueDate || new Date().toISOString().split('T')[0],
      expirationDate: expiryDate || undefined,
      description: sideDescription ?? defaultDescription,
    });
    await documentService.upload(newDoc.id, uploadFile);
  };

  const handleUpload = async () => {
    if (hasFrontBack === null) {
      toast({
        title: 'Informe frente e verso',
        description: 'Selecione se o documento possui frente e verso.',
        variant: 'destructive',
      });
      return;
    }

    if (hasFrontBack === 'yes') {
      if (!fileFront || !fileBack) {
        toast({
          title: 'Arquivos incompletos',
          description: 'Envie o arquivo da frente e do verso do documento.',
          variant: 'destructive',
        });
        return;
      }
    } else if (!file) {
      toast({
        title: 'Selecione um arquivo',
        description: 'É necessário selecionar um arquivo para upload.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      if (hasFrontBack === 'yes') {
        await uploadDocumentFile(fileFront!, DOC_SIDE.FRONT);
        await uploadDocumentFile(fileBack!, DOC_SIDE.BACK);
      } else {
        await uploadDocumentFile(file!);
      }

      toast({
        title: 'Sucesso',
        description: hasFrontBack === 'yes'
          ? 'Frente e verso enviados com sucesso!'
          : 'Documento enviado com sucesso!',
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
    setHasFrontBack(null);
    setDocNumber('');
    setIssueDate('');
    setExpiryDate('');
    setFile(null);
    setFileFront(null);
    setFileBack(null);
  };

  const handleTypeChange = (type: DocumentType) => {
    setSelectedType(type);
    setHasFrontBack(null);
    setFile(null);
    setFileFront(null);
    setFileBack(null);
  };

  const getDocStatus = (type: DocumentType): 'DELIVERED' | 'PARTIAL' | 'PENDING' | 'MISSING' => {
    const typeDocs = documents.filter((d) => d.type === type);
    if (typeDocs.length === 0) return 'MISSING';

    const frontDoc = typeDocs.find((d) => d.description === DOC_SIDE.FRONT);
    const backDoc = typeDocs.find((d) => d.description === DOC_SIDE.BACK);

    if (frontDoc || backDoc) {
      const frontOk = Boolean(frontDoc?.fileUrl);
      const backOk = Boolean(backDoc?.fileUrl);
      if (frontOk && backOk) return 'DELIVERED';
      if (frontOk || backOk) return 'PARTIAL';
      return 'MISSING';
    }

    const singleDoc = typeDocs.find((d) => d.fileUrl);
    return singleDoc ? 'DELIVERED' : 'PENDING';
  };

  const isUploadReady =
    hasFrontBack === 'yes' ? Boolean(fileFront && fileBack) :
    hasFrontBack === 'no' ? Boolean(file) :
    false;

  const deliveredCount = REQUIRED_DOCUMENTS.filter((req) => getDocStatus(req.type) === 'DELIVERED').length;
  const progressPercentage = (deliveredCount / REQUIRED_DOCUMENTS.length) * 100;

  return (
    <div className="space-y-6">
      <Card className="bg-seguranca-black/40 border-gray-700 p-4 sm:p-6">
        <SystemGeneratedDocumentsSection
          documents={systemDocuments}
          isLoading={isLoadingSystemDocs}
          isError={isSystemDocsError}
          onRetry={() => void refetchSystemDocs()}
          employeeId={employeeId}
          variant="rh"
        />
      </Card>

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
                      : status === 'PARTIAL'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-seguranca-black/40 border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {status === 'DELIVERED' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : status === 'PARTIAL' ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
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
                  {status === 'PARTIAL' && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px]">
                      Parcial
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-sm font-bold text-white">{doc.type}</h5>
                            {(doc.description === DOC_SIDE.FRONT || doc.description === DOC_SIDE.BACK) && (
                              <Badge variant="outline" className="text-[10px] text-seguranca-yellow border-seguranca-yellow/40">
                                {doc.description}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate max-w-[150px]">{doc.fileName || 'documento.pdf'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <span className="text-[10px] text-gray-500">Nº {doc.number || 'N/A'}</span>
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

      <Dialog
        open={isUploadModalOpen}
        onOpenChange={(open) => {
          setIsUploadModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="bg-seguranca-graphite border-gray-600 text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-seguranca-red" />
              Importar Documento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Tipo de Documento</Label>
              <Select value={selectedType} onValueChange={(v) => handleTypeChange(v as DocumentType)}>
                <SelectTrigger className="bg-seguranca-black border-gray-700">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-seguranca-graphite border-gray-600">
                  {REQUIRED_DOCUMENTS.map((req) => (
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

            <div className="space-y-3 rounded-lg border border-gray-700 bg-seguranca-black/40 p-4">
              <Label className="text-sm text-gray-200">Este documento possui frente e verso?</Label>
              <RadioGroup
                value={hasFrontBack ?? ''}
                onValueChange={(v) => {
                  setHasFrontBack(v as 'yes' | 'no');
                  setFile(null);
                  setFileFront(null);
                  setFileBack(null);
                }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="doc-front-back-yes" className="border-seguranca-red text-seguranca-red" />
                  <Label htmlFor="doc-front-back-yes" className="text-sm text-gray-300 cursor-pointer">
                    Sim, possui frente e verso
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="doc-front-back-no" className="border-seguranca-red text-seguranca-red" />
                  <Label htmlFor="doc-front-back-no" className="text-sm text-gray-300 cursor-pointer">
                    Não, apenas um arquivo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {hasFrontBack === 'yes' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Frente do documento</Label>
                  <FileDropZone
                    inputId="file-upload-front"
                    file={fileFront}
                    onSelect={setFileFront}
                    emptyLabel="Selecionar frente"
                    compact
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Verso do documento</Label>
                  <FileDropZone
                    inputId="file-upload-back"
                    file={fileBack}
                    onSelect={setFileBack}
                    emptyLabel="Selecionar verso"
                    compact
                  />
                </div>
              </div>
            ) : hasFrontBack === 'no' ? (
              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Arquivo (PDF ou Imagem)</Label>
                <FileDropZone
                  inputId="file-upload"
                  file={file}
                  onSelect={setFile}
                  emptyLabel="Clique para selecionar ou arraste o arquivo"
                />
              </div>
            ) : (
              <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Selecione acima se o documento possui frente e verso para habilitar o upload.
              </p>
            )}
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
              disabled={uploading || !isUploadReady}
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
