import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, Loader2, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

const NppsForm: React.FC = () => {
  const { toast } = useToast();
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const response = await api.post('/api/npps/preview-pdf', {}, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = globalThis.URL.createObjectURL(blob);
      globalThis.open(url, '_blank');

      setTimeout(() => globalThis.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('Erro ao gerar preview do NPPS:', error);
      toast({
        title: 'Erro ao visualizar',
        description: 'Não foi possível gerar o PDF do NPPS. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDownload(true);
    try {
      const response = await api.post('/api/npps/generate-pdf', {}, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = globalThis.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NPPS-Norma-e-Procedimento-do-Posto-de-Servico.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      globalThis.URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Documento NPPS gerado e baixado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao baixar NPPS:', error);
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível gerar o PDF do NPPS. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoadingDownload(false);
    }
  };

  return (
    <Card className="bg-seguranca-black/40 border-slate-800 shadow-xl">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-seguranca-red/10 border border-seguranca-red/40 flex items-center justify-center">
            <FileText className="h-5 w-5 text-seguranca-red" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-seguranca-lightgray">
              NPPS – Norma e Procedimento do Posto de Serviço
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Manual oficial de normas operacionais da Promover Vigilância Patrimonial Ltda.,
              disponível para impressão, visualização e download.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3 text-sm text-gray-300">
            <p>
              O NPPS consolida as principais diretrizes de conduta, atendimento ao público,
              comunicação, procedimentos internos e orientações de segurança para o vigilante em
              posto de serviço.
            </p>
            <p className="text-xs text-gray-400">
              Utilize este documento para treinamento, integração de novos colaboradores e
              formalização das responsabilidades no posto. O conteúdo é gerado em PDF no mesmo
              padrão visual dos demais documentos do sistema.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Shield className="h-3 w-3 text-seguranca-yellow" />
              <span>Versão para assinatura física pelo colaborador, com campos de nome, CPF e data.</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs text-gray-400 bg-slate-950/40 border border-slate-800 rounded-xl p-3">
            <span className="font-semibold text-seguranca-lightgray text-sm">
              Conteúdo resumido do NPPS:
            </span>
            <ul className="list-disc list-inside space-y-1">
              <li>Prefácio e objetivos do manual</li>
              <li>Características e requisitos pessoais do vigilante</li>
              <li>Procedimentos antes, durante e após o turno</li>
              <li>Deveres, disciplina e sigilo profissional</li>
              <li>Orientações de segurança patrimonial e prevenção</li>
              <li>Recomendações gerais e declaração do colaborador</li>
            </ul>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 h-11 w-full sm:w-auto"
            onClick={handlePreview}
            disabled={loadingPreview || loadingDownload}
          >
            {loadingPreview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Visualizando...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Visualizar NPPS
              </>
            )}
          </Button>

          <Button
            className="flex items-center gap-2 h-11 w-full sm:w-auto bg-seguranca-red hover:bg-seguranca-red/90 shadow-lg shadow-seguranca-red/40"
            onClick={handleDownload}
            disabled={loadingDownload || loadingPreview}
          >
            {loadingDownload ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar e Baixar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NppsForm;

