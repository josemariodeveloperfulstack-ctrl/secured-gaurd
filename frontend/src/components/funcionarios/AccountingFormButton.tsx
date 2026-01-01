import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer, Eye, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { accountingFormService } from '@/services/accountingFormService';
import { useToast } from '@/hooks/use-toast';

interface AccountingFormButtonProps {
  employeeId: string;
  employeeName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const AccountingFormButton: React.FC<AccountingFormButtonProps> = ({
  employeeId,
  employeeName,
  variant = 'outline',
  size = 'default',
  className = '',
  disabled = false
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerateHtml = async () => {
    setLoading(true);
    try {
      await accountingFormService.generateHtml(employeeId);
      toast({
        title: "✅ Ficha Gerada",
        description: "Ficha de contabilidade aberta em nova aba",
      });
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao gerar ficha de contabilidade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setLoading(true);
    try {
      await accountingFormService.downloadPdf(employeeId, employeeName);
      toast({
        title: "✅ Download Iniciado",
        description: "Ficha de contabilidade está sendo baixada",
      });
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao baixar ficha de contabilidade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      await accountingFormService.print(employeeId);
      toast({
        title: "✅ Impressão Iniciada",
        description: "Abrindo janela de impressão",
      });
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao imprimir ficha de contabilidade",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={`${className} truncate`}
          disabled={loading || disabled || !employeeId}
        >
          {loading ? (
            <>
              <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
              <span className="truncate">Gerando...</span>
            </>
          ) : (
            <>
              <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Ficha Contabilidade</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleGenerateHtml}>
          <Eye className="mr-2 h-4 w-4" />
          Visualizar Ficha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          Baixar Ficha (HTML)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Ficha
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountingFormButton;

