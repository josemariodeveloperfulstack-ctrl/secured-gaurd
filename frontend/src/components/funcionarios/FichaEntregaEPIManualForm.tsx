import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileText, Download, Building, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { epiDeliveryFormService } from '@/services/epiDeliveryFormService';
import { useToast } from '@/hooks/use-toast';

interface FichaEntregaEPIManualFormProps {
    companyId?: string;
    employeeId?: string;
}

const FichaEntregaEPIManualForm: React.FC<FichaEntregaEPIManualFormProps> = ({ companyId, employeeId }) => {
    const { toast } = useToast();
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCompanies, setLoadingCompanies] = useState(false);

    useEffect(() => {
        loadCompanies();
    }, []);

    useEffect(() => {
        if (companyId) {
            setSelectedCompanyId(companyId);
        }
    }, [companyId]);

    const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const data = await companyService.getAllCompanies();
            setCompanies(data);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar as empresas.',
                variant: 'destructive'
            });
        } finally {
            setLoadingCompanies(false);
        }
    };

    const handleGerarPDF = async () => {
        if (!selectedCompanyId) {
            toast({
                title: 'Atenção',
                description: 'Selecione uma empresa para gerar a ficha manual!',
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);
        try {
            const blob = await epiDeliveryFormService.generateBlankPdf(selectedCompanyId, employeeId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ficha-entrega-epi-manual.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast({
                title: 'Sucesso',
                description: 'Ficha de Entrega de EPI Manual gerada com sucesso!',
            });
        } catch (err: any) {
            console.error('Erro ao gerar PDF manual:', err);
            toast({
                title: 'Erro',
                description: 'Erro ao gerar PDF. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-t-4 border-t-seguranca-yellow shadow-md bg-seguranca-graphite border-gray-600">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-2xl text-white">
                                <Shield className="h-6 w-6 text-seguranca-yellow" />
                                Ficha de Entrega de EPI Manual
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Gere uma ficha de EPI em branco para preenchimento manual no papel.
                            </CardDescription>
                        </div>
                        {selectedCompanyId && (
                            <Badge variant="outline" className="bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30 gap-1 px-3 py-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Pronto para gerar
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-black/20 p-6 rounded-xl border border-gray-600 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                            <Building className="h-4 w-4" />
                            <span>Configuração da Empresa</span>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-base font-semibold text-white">Empresa (Cabeçalho)</Label>
                            <Select
                                value={selectedCompanyId}
                                onValueChange={setSelectedCompanyId}
                                disabled={loadingCompanies}
                            >
                                <SelectTrigger className="h-11 bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow">
                                    <SelectValue placeholder={loadingCompanies ? "Carregando..." : "Selecione a empresa"} />
                                </SelectTrigger>
                                <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray">
                                    {companies.map(e => (
                                        <SelectItem key={e.id} value={e.id} className="hover:bg-gray-700">
                                            {e.sigla || e.tradeName || e.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-1">
                                A empresa selecionada será exibida no cabeçalho do documento com seu respectivo logotipo e CNPJ.
                            </p>
                        </div>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
                        <p className="text-blue-300 text-sm flex items-start gap-2">
                            <FileText className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <span>
                                Esta ficha virá com os campos de funcionário, data e tabela de EPIs em branco, permitindo que o preenchimento seja feito totalmente à mão.
                            </span>
                        </p>
                    </div>

                    <Button
                        type="button"
                        onClick={handleGerarPDF}
                        disabled={loading || !selectedCompanyId}
                        className="w-full h-12 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-graphite font-bold text-lg shadow-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Gerando Documento...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-5 w-5" />
                                Gerar Ficha Manual (PDF)
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default FichaEntregaEPIManualForm;
