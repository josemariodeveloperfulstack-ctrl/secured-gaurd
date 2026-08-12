import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileText, Download, Building, Shield, Loader2, CheckCircle2, User, X } from 'lucide-react';
import { companyService } from '@/services/companyService';
import { epiDeliveryFormService } from '@/services/epiDeliveryFormService';
import { useToast } from '@/hooks/use-toast';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { SimpleEmployee, employeeService } from '@/services/employeeService';
import { formatCPF } from '@/utils/validation';

interface FichaEntregaEPIManualFormProps {
    companyId?: string;
    employeeId?: string;
    hideHeader?: boolean;
}

const FichaEntregaEPIManualForm: React.FC<FichaEntregaEPIManualFormProps> = ({ companyId, employeeId, hideHeader = false }) => {
    const { toast } = useToast();
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
    const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
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

    useEffect(() => {
        if (employeeId) {
            setSelectedEmployeeId(employeeId);
            loadEmployeeDetails(employeeId);
        }
    }, [employeeId]);

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

    const loadEmployeeDetails = async (empId: string) => {
        try {
            const emp = await employeeService.getEmployeeById(empId);
            if (emp) {
                setSelectedEmployeeData(emp);
                if (emp.companyId && !selectedCompanyId) {
                    setSelectedCompanyId(emp.companyId);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do funcionário:', error);
        }
    };

    const handleEmployeeSelect = (emp: SimpleEmployee) => {
        setSelectedEmployeeData(emp);
        setSelectedEmployeeId(emp.id);
        if (emp.companyId && (!selectedCompanyId || selectedCompanyId !== emp.companyId)) {
            setSelectedCompanyId(emp.companyId);
        }
    };

    const handleClearEmployee = () => {
        setSelectedEmployeeId('');
        setSelectedEmployeeData(null);
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
            const targetEmpId = selectedEmployeeId || undefined;
            const blob = await epiDeliveryFormService.generateBlankPdf(selectedCompanyId, targetEmpId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const empNameSlug = selectedEmployeeData?.name 
                ? selectedEmployeeData.name.replace(/\s+/g, '-').toLowerCase() 
                : 'manual';
            a.download = `ficha-entrega-epi-${empNameSlug}.pdf`;

            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast({
                title: 'Sucesso',
                description: selectedEmployeeId
                    ? `Ficha de EPI para ${selectedEmployeeData?.name || 'funcionário'} gerada com sucesso!`
                    : 'Ficha de Entrega de EPI Manual gerada com sucesso!',
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
        <div className="w-full space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            <Card className="border-t-4 border-t-seguranca-yellow shadow-md bg-seguranca-graphite border-gray-600 w-full overflow-hidden">
                {!hideHeader && (
                    <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl text-white font-bold">
                                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-seguranca-yellow shrink-0" />
                                    <span>Ficha de Entrega de EPI Manual</span>
                                </CardTitle>
                                <CardDescription className="text-gray-400 text-xs sm:text-sm">
                                    Gere uma ficha de EPI com ou sem dados do funcionário para preenchimento dos itens à mão no papel.
                                </CardDescription>
                            </div>
                            {selectedCompanyId && (
                                <Badge variant="outline" className="shrink-0 bg-seguranca-yellow/20 text-seguranca-yellow border-seguranca-yellow/30 gap-1 px-3 py-1 text-xs">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Pronto para gerar
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                )}
                <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="bg-black/20 p-3 sm:p-5 rounded-xl border border-gray-600 space-y-4 sm:space-y-5 w-full overflow-hidden">
                        
                        {/* Configuração da Empresa */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-400 mb-1">
                                <Building className="h-4 w-4 text-seguranca-yellow shrink-0" />
                                <span>Empresa (Cabeçalho)</span>
                            </div>
                            <Select
                                value={selectedCompanyId}
                                onValueChange={setSelectedCompanyId}
                                disabled={loadingCompanies}
                            >
                                <SelectTrigger className="h-10 sm:h-11 bg-seguranca-graphite border-gray-600 text-seguranca-lightgray focus:border-seguranca-yellow text-xs sm:text-sm">
                                    <SelectValue placeholder={loadingCompanies ? "Carregando..." : "Selecione a empresa"} />
                                </SelectTrigger>
                                <SelectContent className="bg-seguranca-graphite border-gray-600 text-seguranca-lightgray max-h-60 overflow-y-auto">
                                    {companies.map(e => (
                                        <SelectItem key={e.id} value={e.id} className="hover:bg-gray-700 text-xs sm:text-sm">
                                            {e.sigla || e.tradeName || e.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                                A empresa selecionada será exibida no cabeçalho do documento com seu logotipo e CNPJ.
                            </p>
                        </div>

                        {/* Seleção do Funcionário (Opcional) */}
                        <div className="space-y-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-400">
                                    <User className="h-4 w-4 text-seguranca-yellow shrink-0" />
                                    <span>Funcionário (Opcional)</span>
                                </div>
                                {selectedEmployeeId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearEmployee}
                                        className="h-7 text-xs text-gray-400 hover:text-white px-2"
                                    >
                                        <X className="h-3.5 w-3.5 mr-1 shrink-0" /> Limpar seleção
                                    </Button>
                                )}
                            </div>

                            <EmployeeCombobox
                                value={selectedEmployeeId}
                                onChange={(val) => {
                                    setSelectedEmployeeId(val);
                                    if (!val) setSelectedEmployeeData(null);
                                }}
                                onEmployeeSelect={handleEmployeeSelect}
                                companyId={selectedCompanyId || undefined}
                                placeholder="Digite nome, CPF ou matrícula do colaborador..."
                            />

                            {selectedEmployeeData ? (
                                <div className="mt-2 p-3 bg-seguranca-yellow/10 border border-seguranca-yellow/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm">
                                    <div className="flex items-start sm:items-center gap-2 text-white min-w-0 break-words">
                                        <CheckCircle2 className="h-4 w-4 text-seguranca-yellow shrink-0 mt-0.5 sm:mt-0" />
                                        <div className="min-w-0">
                                            <span className="font-semibold block sm:inline">{selectedEmployeeData.name}</span>
                                            {selectedEmployeeData.cpf && (
                                                <span className="text-gray-300 text-xs block sm:inline sm:ml-2">
                                                    · CPF: {formatCPF(selectedEmployeeData.cpf)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Badge className="bg-seguranca-yellow text-seguranca-graphite font-semibold text-[11px] shrink-0 self-start sm:self-auto">
                                        Dados no PDF
                                    </Badge>
                                </div>
                            ) : (
                                <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                                    Se selecionado, o PDF virá preenchido com Nome, Função, CPF, RG e Data de Admissão. Se deixar em branco, todos os dados cadastrais virão com linhas para preenchimento manual.
                                </p>
                            )}
                        </div>

                    </div>

                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-blue-300 flex items-start gap-2.5">
                        <FileText className="h-5 w-5 shrink-0 mt-0.5 text-blue-400" />
                        <span className="leading-relaxed">
                            {selectedEmployeeId ? (
                                <>
                                    Os dados cadastrais do funcionário serão <strong>preenchidos automaticamente</strong> no PDF. Apenas a tabela de EPIs ficará em branco para preenchimento manual à mão no papel.
                                </>
                            ) : (
                                <>
                                    Esta ficha virá com os dados do funcionário e a tabela de EPIs em branco, permitindo que todo o preenchimento seja feito à mão no papel.
                                </>
                            )}
                        </span>
                    </div>

                    <Button
                        type="button"
                        onClick={handleGerarPDF}
                        disabled={loading || !selectedCompanyId}
                        className="w-full min-h-[48px] h-auto py-3 px-4 bg-seguranca-yellow hover:bg-seguranca-yellow/90 text-seguranca-graphite font-bold text-sm sm:text-base shadow-lg flex items-center justify-center text-center whitespace-normal leading-snug rounded-lg transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin shrink-0" />
                                <span>Gerando Documento...</span>
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-5 w-5 shrink-0" />
                                <span>
                                    {selectedEmployeeId ? 'Gerar Ficha Manual do Funcionário (PDF)' : 'Gerar Ficha Manual em Branco (PDF)'}
                                </span>
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default FichaEntregaEPIManualForm;
