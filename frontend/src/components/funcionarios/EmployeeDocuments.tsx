import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Download, Eye, Upload, Calendar, Hash, User, Loader2, AlertCircle, FolderOpen, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { documentService } from '@/services/documentService';
import type { Document, DocumentType } from '@/types/document';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DocumentosGerarTab from './DocumentosGerarTab';
import { cn } from '@/lib/utils';

interface EmployeeDocumentsProps {
  employeeId: string;
  employeeName: string;
  companyId?: string;
}

export const EmployeeDocuments: React.FC<EmployeeDocumentsProps> = ({
  employeeId,
  employeeName,
  companyId
}) => {
  const [activeTab, setActiveTab] = useState<'cadastrados' | 'gerar'>('cadastrados');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDocument, setNewDocument] = useState({
    type: '' as DocumentType,
    number: '',
    issueDate: '',
    expirationDate: '',
    description: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
    loadDocumentTypes();
  }, [employeeId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentService.getDocumentsByEmployee(employeeId);
      setDocuments(data);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentTypes = async () => {
    try {
      const types = await documentService.getDocumentTypes();
      setDocumentTypes(types);
    } catch (error) {
      console.error('Erro ao carregar tipos de documento:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAddDocument = async () => {
    if (!selectedFile || !newDocument.type || !newDocument.number || !newDocument.issueDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios e selecione um arquivo.",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      // Criar documento
      const documentData = {
        type: newDocument.type,
        number: newDocument.number,
        issueDate: new Date(newDocument.issueDate),
        expirationDate: newDocument.expirationDate ? new Date(newDocument.expirationDate) : null,
        description: newDocument.description,
        fileUrl: selectedFile ? selectedFile.name : 'temp-file-url',
        fileName: selectedFile ? selectedFile.name : 'temp-file-name',
        employee: { id: employeeId }
      };

      const createdDocument = await documentService.createDocument(documentData);
      
      // Upload do arquivo
      await documentService.uploadFile(createdDocument.id, selectedFile);
      
      toast({
        title: "Sucesso",
        description: "Documento adicionado com sucesso!",
      });
      
      // Limpar formulário
      setNewDocument({
        type: '' as DocumentType,
        number: '',
        issueDate: '',
        expirationDate: '',
        description: ''
      });
      setSelectedFile(null);
      setShowAddForm(false);
      
      // Recarregar documentos
      loadDocuments();
    } catch (error) {
      console.error('Erro ao adicionar documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o documento.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }

    try {
      await documentService.deleteDocument(documentId);
      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso!",
      });
      loadDocuments();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadFile = async (documentId: string, fileName: string) => {
    try {
      const blob = await documentService.downloadFile(documentId);
      const fileBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 2000);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const handleViewFile = async (documentId: string) => {
    try {
      const blob = await documentService.downloadFile(documentId);
      const fileBlob = blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(fileBlob);
      const newWin = window.open(url, '_blank');
      if (!newWin) {
        toast({
          title: "Aviso",
          description: "O navegador bloqueou a abertura do arquivo em nova aba. Verifique as permissões de pop-up.",
          variant: "destructive"
        });
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 15000);
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o arquivo.",
        variant: "destructive"
      });
    }
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      CPF: 'CPF',
      RG: 'RG',
      CNH: 'CNH',
      TITULO_ELEITOR: 'Título de Eleitor',
      CERTIDAO_NASCIMENTO: 'Certidão de Nascimento',
      CERTIDAO_CASAMENTO: 'Certidão de Casamento',
      COMPROVANTE_RESIDENCIA: 'Comprovante de Residência',
      CONTRATO_TRABALHO: 'Contrato de Trabalho',
      CARTEIRA_TRABALHO: 'Carteira de Trabalho',
      CERTIFICADO_MILITAR: 'Certificado Militar',
      OUTROS: 'Outros'
    };
    return labels[type] || type;
  };

  const getStatusColor = (document: Document) => {
    if (!document.expirationDate) return 'bg-slate-800 text-slate-300 border border-slate-700';
    
    const today = new Date();
    const expirationDate = new Date(document.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) return 'bg-red-500/20 text-red-400 border border-red-500/40';
    if (daysUntilExpiration <= 30) return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
  };

  const getStatusText = (document: Document) => {
    if (!document.expirationDate) return 'Sem expiração';
    
    const today = new Date();
    const expirationDate = new Date(document.expirationDate);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) return 'Expirado';
    if (daysUntilExpiration <= 30) return 'Expira em breve';
    return 'Válido';
  };

  const formatDateDisplay = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const s = String(dateStr).split('T')[0];
    const parts = s.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-seguranca-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-abas da Seção Documentos */}
      <div className="flex items-center gap-2 border-b border-gray-700/80 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('cadastrados')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer",
            activeTab === 'cadastrados'
              ? "bg-seguranca-red text-white shadow-md"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
          )}
        >
          <FolderOpen className="h-4 w-4" />
          Documentos Anexados ({documents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gerar')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer",
            activeTab === 'gerar'
              ? "bg-purple-600 text-white shadow-md"
              : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80"
          )}
        >
          <FileCheck className="h-4 w-4" />
          Gerar Documentos & Termos PDF
        </button>
      </div>

      {activeTab === 'gerar' ? (
        <DocumentosGerarTab
          employeeId={employeeId}
          companyId={companyId}
          employeeName={employeeName}
          hideHeader={true}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-700/80">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-seguranca-lightgray">
                Documentos de {employeeName}
              </h2>
              <p className="text-sm text-gray-400">
                {documents.length} documento{documents.length !== 1 ? 's' : ''} cadastrado{documents.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="shrink-0 whitespace-nowrap bg-seguranca-yellow hover:bg-yellow-600 text-black font-semibold shadow-md"
            >
              <Plus size={18} className="mr-1.5 shrink-0" />
              <span className="whitespace-nowrap">Adicionar Documento</span>
            </Button>
          </div>

          {showAddForm && (
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray">Novo Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type" className="text-seguranca-lightgray">Tipo de Documento *</Label>
                    <Select 
                      value={newDocument.type} 
                      onValueChange={(value) => setNewDocument({...newDocument, type: value as DocumentType})}
                    >
                      <SelectTrigger className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-seguranca-black border-gray-600 text-seguranca-lightgray">
                        {documentTypes.map((type) => (
                          <SelectItem key={type} value={type} className="text-seguranca-lightgray">
                            {getDocumentTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="number" className="text-seguranca-lightgray">Número *</Label>
                    <Input
                      id="number"
                      value={newDocument.number}
                      onChange={(e) => setNewDocument({...newDocument, number: e.target.value})}
                      placeholder="Número do documento"
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="issueDate" className="text-seguranca-lightgray">Data de Emissão *</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={newDocument.issueDate}
                      onChange={(e) => setNewDocument({...newDocument, issueDate: e.target.value})}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="expirationDate" className="text-seguranca-lightgray">Data de Expiração</Label>
                    <Input
                      id="expirationDate"
                      type="date"
                      value={newDocument.expirationDate}
                      onChange={(e) => setNewDocument({...newDocument, expirationDate: e.target.value})}
                      className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-seguranca-lightgray">Descrição</Label>
                  <Input
                    id="description"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                    placeholder="Descrição adicional (opcional)"
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                </div>
                
                <div>
                  <Label htmlFor="file" className="text-seguranca-lightgray">Arquivo *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileSelect}
                    className="bg-seguranca-black border-gray-600 text-seguranca-lightgray"
                  />
                  {selectedFile && (
                    <p className="text-sm text-seguranca-lightgray mt-1">
                      Arquivo selecionado: {selectedFile.name}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleAddDocument}
                    disabled={uploading}
                    className="bg-seguranca-red hover:bg-seguranca-darkred"
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? 'Enviando...' : 'Adicionar Documento'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                    className="border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {documents.map((document) => (
              <Card 
                key={document.id} 
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:shadow-lg transition-all"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Lado Esquerdo: Ícone + Título + Metadados */}
                    <div className="flex items-start space-x-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="text-red-400 h-5 w-5" />
                      </div>
                      
                      <div className="space-y-1.5 min-w-0 flex-1">
                        {/* Título e Badge de Status */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                            {getDocumentTypeLabel(document.type)}
                          </h3>
                          <Badge className={`px-2 py-0.5 text-xs font-semibold shrink-0 ${getStatusColor(document)}`}>
                            {getStatusText(document)}
                          </Badge>
                        </div>

                        {/* Metadados: Número, Emissão, Expiração, Arquivo */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-300">
                          {document.number && (
                            <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-gray-800">
                              <Hash size={13} className="text-seguranca-yellow shrink-0" />
                              <span className="font-mono text-gray-200 font-medium">{document.number}</span>
                            </div>
                          )}
                          
                          {document.issueDate && (
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Calendar size={14} className="text-gray-400 shrink-0" />
                              <span>Emissão: <strong className="text-white">{formatDateDisplay(document.issueDate)}</strong></span>
                            </div>
                          )}

                          {document.expirationDate && (
                            <div className="flex items-center gap-1.5 text-gray-300">
                              <Calendar size={14} className="text-gray-400 shrink-0" />
                              <span>Expira: <strong className="text-white">{formatDateDisplay(document.expirationDate)}</strong></span>
                            </div>
                          )}

                          {document.fileName && (
                            <div className="flex items-center gap-1.5 text-gray-300 truncate max-w-[220px]" title={document.fileName}>
                              <FileText size={14} className="text-blue-400 shrink-0" />
                              <span className="truncate text-blue-300 font-medium">{document.fileName}</span>
                            </div>
                          )}
                        </div>

                        {/* Descrição */}
                        {document.description && (
                          <p className="text-xs sm:text-sm text-gray-400 mt-1 italic border-l-2 border-slate-700 pl-2">
                            {document.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Lado Direito: Botões de Ação */}
                    <div className="flex items-center flex-wrap gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800 justify-end">
                      {document.fileUrl && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs border-blue-600/60 text-blue-400 hover:bg-blue-950/60 hover:border-blue-500 font-medium shrink-0 whitespace-nowrap"
                            onClick={() => handleViewFile(document.id)}
                          >
                            <Eye size={14} className="mr-1 shrink-0" />
                            Visualizar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs border-emerald-600/60 text-emerald-400 hover:bg-emerald-950/60 hover:border-emerald-500 font-medium shrink-0 whitespace-nowrap"
                            onClick={() => handleDownloadFile(document.id, document.fileName || 'documento')}
                          >
                            <Download size={14} className="mr-1 shrink-0" />
                            Baixar
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs border-red-600/60 text-red-400 hover:bg-red-950/60 hover:border-red-500 font-medium shrink-0 whitespace-nowrap"
                        onClick={() => handleDeleteDocument(document.id)}
                      >
                        <Trash2 size={14} className="mr-1 shrink-0" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {documents.length === 0 && (
            <Card className="bg-seguranca-graphite border-gray-600">
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-seguranca-lightgray mb-2">
                  Nenhum documento cadastrado
                </h3>
                <p className="text-seguranca-lightgray">
                  Clique em "Adicionar Documento" para começar.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};