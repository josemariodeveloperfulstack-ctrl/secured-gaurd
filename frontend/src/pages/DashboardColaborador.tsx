import React, { useState, useEffect } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  MessageSquare, 
  User, 
  Calendar,
  File,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { payslipService } from '@/services/payslipService';
import { receiptService } from '@/services/receiptService';
import { unifiedDocumentService } from '@/services/unifiedDocumentService';
import { useNavigate } from 'react-router-dom';

interface Payslip {
  id: string;
  employeeName: string;
  cpf: string;
  month: number;
  year: number;
  fileName: string;
  filePath: string;
  createdAt: string;
}

interface Receipt {
  id: string;
  employeeName: string;
  cpf: string;
  month: number;
  year: number;
  fileName: string;
  filePath: string;
  transferDate: string;
}

interface UnifiedDocument {
  id: string;
  employeeName: string;
  cpf: string;
  month: number;
  year: number;
  payslipFileName: string;
  receiptFileName: string;
  unifiedFileName: string;
  createdAt: string;
}

const DashboardColaborador: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [unifiedDocs, setUnifiedDocs] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payslipsData, receiptsData, unifiedData] = await Promise.all([
        payslipService.getAllPayslips(),
        receiptService.getAllReceipts(),
        unifiedDocumentService.getAllUnifiedDocuments()
      ]);

      setPayslips(payslipsData);
      setReceipts(receiptsData);
      setUnifiedDocs(unifiedData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus documentos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslip = async (fileName: string) => {
    try {
      await payslipService.downloadPayslip(fileName);
      toast({
        title: 'Sucesso',
        description: 'Holerite baixado com sucesso!',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o holerite',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadReceipt = async (fileName: string) => {
    try {
      await receiptService.downloadReceipt(fileName);
      toast({
        title: 'Sucesso',
        description: 'Comprovante baixado com sucesso!',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o comprovante',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadUnified = async (fileName: string) => {
    try {
      await unifiedDocumentService.downloadUnifiedDocument(fileName);
      toast({
        title: 'Sucesso',
        description: 'Documento unificado baixado com sucesso!',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o documento',
        variant: 'destructive'
      });
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1] || 'Desconhecido';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <StandardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-seguranca-yellow mx-auto mb-4"></div>
            <p className="text-seguranca-lightgray">Carregando seus dados...</p>
          </div>
        </div>
      </StandardLayout>
    );
  }

  return (
    <StandardLayout>
      <div className="space-y-6 p-6">
        {/* Cabeçalho com dados do colaborador */}
        <div className="bg-gradient-to-r from-seguranca-graphite to-seguranca-black border border-seguranca-yellow rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-seguranca-yellow/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-seguranca-yellow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-seguranca-lightgray mb-1">
                  Bem-vindo, {user?.name}!
                </h1>
                <p className="text-gray-400 text-sm">Portal do Colaborador</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30">
                    Colaborador
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">CPF</p>
              <p className="text-seguranca-lightgray font-medium">{user?.username}</p>
              {user?.email && (
                <>
                  <p className="text-sm text-gray-400 mt-2">Email</p>
                  <p className="text-seguranca-lightgray font-medium">{user.email}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Holerites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-seguranca-lightgray">
                {payslips.length}
              </div>
              <p className="text-xs text-gray-400 mt-1">Disponíveis para download</p>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <File className="w-4 h-4 text-green-400" />
                Comprovantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-seguranca-lightgray">
                {receipts.length}
              </div>
              <p className="text-xs text-gray-400 mt-1">Disponíveis para download</p>
            </CardContent>
          </Card>

          <Card className="bg-seguranca-black border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400" />
                Unificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-seguranca-lightgray">
                {unifiedDocs.length}
              </div>
              <p className="text-xs text-gray-400 mt-1">Documentos completos</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-seguranca-graphite">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="payslips">Holerites</TabsTrigger>
            <TabsTrigger value="receipts">Comprovantes</TabsTrigger>
            <TabsTrigger value="unified">Unificados</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-seguranca-yellow" />
                  Comunicação Interna
                </CardTitle>
                <CardDescription>
                  Acesse suas mensagens e comunicados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate('/comunicacao/mensagens')}
                  className="w-full bg-seguranca-yellow hover:bg-seguranca-yellow/80 text-seguranca-black"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir Mensagens
                </Button>
              </CardContent>
            </Card>

            {/* Documentos Recentes */}
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Documentos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payslips.slice(0, 3).map((payslip) => (
                    <div
                      key={payslip.id}
                      className="flex items-center justify-between p-3 bg-seguranca-graphite rounded-lg hover:bg-seguranca-graphite/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-sm font-medium text-seguranca-lightgray">
                            Holerite {getMonthName(payslip.month)}/{payslip.year}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(payslip.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPayslip(payslip.fileName)}
                        className="border-seguranca-yellow/30 text-seguranca-yellow hover:bg-seguranca-yellow/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {payslips.length === 0 && (
                    <p className="text-center text-gray-400 py-4">
                      Nenhum documento disponível
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Holerites */}
          <TabsContent value="payslips" className="mt-4">
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Meus Holerites
                </CardTitle>
                <CardDescription>
                  {payslips.length} {payslips.length === 1 ? 'holerite disponível' : 'holerites disponíveis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payslips.map((payslip) => (
                    <div
                      key={payslip.id}
                      className="flex items-center justify-between p-4 bg-seguranca-graphite rounded-lg hover:bg-seguranca-graphite/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-seguranca-lightgray">
                            Holerite {getMonthName(payslip.month)}/{payslip.year}
                          </p>
                          <p className="text-sm text-gray-400">
                            Emitido em {formatDate(payslip.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPayslip(payslip.fileName)}
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {payslips.length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Nenhum holerite disponível</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comprovantes */}
          <TabsContent value="receipts" className="mt-4">
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <File className="w-5 h-5 text-green-400" />
                  Meus Comprovantes
                </CardTitle>
                <CardDescription>
                  {receipts.length} {receipts.length === 1 ? 'comprovante disponível' : 'comprovantes disponíveis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {receipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-4 bg-seguranca-graphite rounded-lg hover:bg-seguranca-graphite/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <File className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-seguranca-lightgray">
                            Comprovante {getMonthName(receipt.month)}/{receipt.year}
                          </p>
                          <p className="text-sm text-gray-400">
                            Transferência em {formatDate(receipt.transferDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadReceipt(receipt.fileName)}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {receipts.length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Nenhum comprovante disponível</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unificados */}
          <TabsContent value="unified" className="mt-4">
            <Card className="bg-seguranca-black border-gray-700">
              <CardHeader>
                <CardTitle className="text-seguranca-lightgray flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                  Documentos Unificados
                </CardTitle>
                <CardDescription>
                  {unifiedDocs.length} {unifiedDocs.length === 1 ? 'documento disponível' : 'documentos disponíveis'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unifiedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 bg-seguranca-graphite rounded-lg hover:bg-seguranca-graphite/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-seguranca-lightgray">
                            Documento {getMonthName(doc.month)}/{doc.year}
                          </p>
                          <p className="text-sm text-gray-400">
                            Holerite + Comprovante | {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadUnified(doc.unifiedFileName)}
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {unifiedDocs.length === 0 && (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400">Nenhum documento unificado disponível</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StandardLayout>
  );
};

export default DashboardColaborador;

