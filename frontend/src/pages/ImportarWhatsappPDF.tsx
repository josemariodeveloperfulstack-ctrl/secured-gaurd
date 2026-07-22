import React, { useState } from 'react';
import { StandardLayout } from '@/components/StandardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Users,
  Download,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

interface ImportResult {
  success: boolean;
  message: string;
  totalProcessed?: number;
  totalSuccess?: number;
  totalErrors?: number;
  errors?: string[];
}

const ImportarWhatsappPDF: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || 
                      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                      file.type === 'application/vnd.ms-excel';

      if (!isExcel) {
        toast({
          title: "Erro de Formato",
          description: "Por favor, selecione somente uma planilha Excel (.xlsx, .xls) válida.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione uma planilha Excel (.xlsx ou .xls).",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/employees/import/whatsapp-pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResult({
        success: response.data.success,
        message: response.data.message || 'Importação realizada com sucesso!',
        totalProcessed: response.data.totalProcessed,
        totalSuccess: response.data.totalSuccess,
        totalErrors: response.data.totalErrors,
        errors: response.data.errors
      });

      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Importação de planilha concluída com sucesso!",
        });
      } else {
        toast({
          title: "Aviso na Importação",
          description: "Importação concluída. Verifique os avisos/erros na tela.",
          variant: "destructive"
        });
      }

      // Limpar arquivo após sucesso
      setSelectedFile(null);
      const fileInput = document.getElementById('pdf-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error('Erro ao importar:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao processar a planilha de importação.';
      
      setResult({
        success: false,
        message: errorMessage,
        errors: error.response?.data?.errors || [errorMessage]
      });

      toast({
        title: "Erro na importação",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    toast({
      title: "Colunas da Planilha Excel",
      description: "CNPJ, Nome, Matrícula eSocial, Município Nascimento, UF Nascimento, Mãe, Pai, Nacionalidade, Estado Civil, CPF, RG, PIS/PASEP, Setor de Trabalho, Data de Admissão, Cargo, CBO, Salário Base, Rua, Bairro, CEP, Cidade, UF.",
    });
  };

  return (
    <StandardLayout
      title="Importar Funcionários (Excel)"
      subtitle="Importe o cadastro de funcionários exclusivamente via planilha de Excel (.xlsx, .xls)"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Instruções */}
        <Alert className="border-seguranca-yellow/40 bg-seguranca-graphite/40">
          <Info className="h-4 w-4 text-seguranca-yellow" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-seguranca-yellow">Instruções para Importação via Excel:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-300 ml-2">
                <li>Selecione uma planilha de Excel (formatos <strong>.xlsx</strong> ou <strong>.xls</strong>).</li>
                <li><strong>Validação de Empresa (CNPJ):</strong> O CNPJ informado na planilha deve estar previamente cadastrado no sistema. Se não estiver cadastrado, a linha não será importada.</li>
                <li><strong>Validação de Duplicidade (CPF):</strong> O sistema verifica se o CPF já existe no banco de dados. Se o CPF já estiver cadastrado, o funcionário <strong>NÃO será importado</strong>.</li>
                <li><strong>Colunas reconhecidas:</strong> CNPJ, Nome, Matrícula eSocial, Município Nascimento, UF Nascimento, Mãe, Pai, Nacionalidade, Estado Civil, CPF, RG, PIS/PASEP, Setor de Trabalho, Data de Admissão, Cargo, CBO, Salário Base, Rua, Bairro, CEP, Cidade, UF.</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        {/* Card de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-seguranca-yellow" />
              Upload de Planilha de Excel
            </CardTitle>
            <CardDescription>
              Selecione a planilha de Excel contendo os dados dos funcionários
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-file">Planilha Excel (.xlsx, .xls)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  disabled={uploading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ver Colunas
                </Button>
              </div>
              {selectedFile && (
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-black font-semibold"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando Planilha Excel...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Processar Importação Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado da Importação */}
        {result && (
          <Card className={result.success ? 'border-green-500' : 'border-red-500'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Importação Processada
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Erro no Processamento
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>

              {result.totalProcessed !== undefined && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-seguranca-graphite p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Total Analisado</p>
                    <p className="text-2xl font-bold text-seguranca-lightgray flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {result.totalProcessed}
                    </p>
                  </div>
                  <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                    <p className="text-sm text-gray-400">Cadastrados com Sucesso</p>
                    <p className="text-2xl font-bold text-green-500 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      {result.totalSuccess}
                    </p>
                  </div>
                  <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                    <p className="text-sm text-gray-400">Não Importados / Erros</p>
                    <p className="text-2xl font-bold text-red-500 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {result.totalErrors}
                    </p>
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-red-400">Detalhes de Ocorrências / Registros não importados:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 bg-red-950/20 p-3 rounded border border-red-900/30 max-h-60 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações Adicionais */}
        <Card className="bg-seguranca-graphite">
          <CardHeader>
            <CardTitle className="text-seguranca-lightgray">Regras de Validação da Planilha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-seguranca-yellow flex-shrink-0" />
              <p>Formato aceito: Apenas arquivos Excel no formato <strong>.xlsx</strong> ou <strong>.xls</strong>.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-seguranca-yellow flex-shrink-0" />
              <p>Validação de CNPJ da Empresa: O CNPJ deve corresponder a uma empresa já cadastrada no sistema. Se não for encontrada, o funcionário não será importado.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-seguranca-yellow flex-shrink-0" />
              <p>Validação de CPF Único: Se o CPF do funcionário já estiver cadastrado no banco de dados, o sistema <strong>não irá importar</strong> a linha para evitar duplicidade.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-seguranca-yellow flex-shrink-0" />
              <p>Vínculo de Setor de Trabalho: Se a coluna "Setor de Trabalho" estiver preenchida, o funcionário será associado ao posto/setor correspondente.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardLayout>
  );
};

export default ImportarWhatsappPDF;

