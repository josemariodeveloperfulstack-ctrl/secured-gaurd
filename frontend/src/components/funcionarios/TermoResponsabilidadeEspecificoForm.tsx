import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Building, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { employeeService, SimpleEmployee } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { Employee } from '@/types/employee';
import { Company } from '@/types/company';
import { EmployeeCombobox } from '../ui/employee-combobox';


const documentTypes = [
    { id: 'BH_BUS', label: 'TERMO DE RESPONSABILIDADE CARTÃO BH BUS VALE-TRANSPORTE' },
    { id: 'OTIMO', label: 'TERMO DE RESPONSABILIDADE CARTÃO ÓTIMO VALE-TRANSPORTE' },
    { id: 'BETIM_CARD', label: 'TERMO DE RESPONSABILIDADE CARTÃO BETIM CARD VALE-TRANSPORTE' },
    { id: 'CELULAR', label: 'TERMO DE RESPONSABILIDADE APARELHO CELULAR' },
];

interface TermoResponsabilidadeEspecificoFormProps {
    employeeId?: string;
    companyId?: string;
}

const TermoResponsabilidadeEspecificoForm: React.FC<TermoResponsabilidadeEspecificoFormProps> = ({ employeeId, companyId }) => {
    const [form, setForm] = useState({
        funcionarioId: employeeId || '',
        empresaId: companyId || '',
        documentTypeId: 'BH_BUS',
        identificador: '', // Número do Cartão ou IMEI/Série do Celular
        descricao: '', // Marca/Modelo para celular
        dataEntrega: new Date().toISOString().split('T')[0],
    });

    const [loading, setLoading] = useState(false);
    const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingData, setLoadingData] = useState(false);


    useEffect(() => {
        setForm(prev => ({
            ...prev,
            funcionarioId: employeeId || prev.funcionarioId,
            empresaId: companyId || prev.empresaId
        }));
    }, [employeeId, companyId]);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const companiesData = await companyService.getAllCompanies();
                setCompanies(companiesData);

                // Se tivermos employeeId, buscar dados completos do funcionário
                if (employeeId) {
                    const fullEmployee = await employeeService.getEmployeeById(employeeId);
                    if (fullEmployee) {
                        setSelectedEmployeeData(fullEmployee as any);
                        if (fullEmployee.company?.id) {
                            setForm(prev => ({ ...prev, empresaId: fullEmployee.company.id }));
                        }
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, [employeeId]);


    const selectedFunc = selectedEmployeeData;
    const selectedEmp = companies.find(e => e.id === form.empresaId);
    const selectedDocType = documentTypes.find(t => t.id === form.documentTypeId);


    const handleGenerate = async (preview = false) => {
        if (!selectedFunc || !selectedEmp) {
            alert('Selecione funcionário e empresa!');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                companyId: selectedEmp.id,
                reportTitle: selectedDocType?.label,
                employeeName: selectedFunc.name,
                employeeCpf: selectedFunc.document || '',
                employeePosition: selectedFunc.positionName || '',

                equipments: [
                    {
                        name: form.documentTypeId === 'CELULAR' ? 'Aparelho Celular' : 'Cartão Vale-Transporte',
                        description: form.descricao || (form.documentTypeId !== 'CELULAR' ? selectedDocType?.label : ''),
                        identifier: form.identificador,
                        state: 'BOM',
                        value: 0.0
                    }
                ],
                city: selectedEmp.address && typeof selectedEmp.address === 'string' ? selectedEmp.address.split(',')[0] : '',
                documentDate: form.dataEntrega
            };

            const endpoint = preview ? '/api/equipment-responsibility/preview-pdf' : '/api/equipment-responsibility/generate-pdf';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Erro ao gerar documento');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            if (preview) {
                window.open(url, '_blank');
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = `${form.documentTypeId.toLowerCase()}-${selectedFunc.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            }

            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (err) {
            console.error('Erro:', err);
            alert('Erro ao processar solicitação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-t-4 border-t-seguranca-red shadow-md bg-seguranca-black text-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-2xl text-seguranca-lightgray">
                                <Shield className="h-6 w-6 text-seguranca-red" />
                                Termo de Responsabilidade - VT e Celular
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Geração de termos específicos para cartões de transporte e aparelhos celulares.
                            </CardDescription>
                        </div>
                        {selectedFunc && selectedEmp && (
                            <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800 gap-1 px-3 py-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Validado
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-seguranca-lightgray">Tipo de Documento</Label>
                            <Select
                                value={form.documentTypeId}
                                onValueChange={(val) => setForm(prev => ({ ...prev, documentTypeId: val, identificador: '', descricao: '' }))}
                            >
                                <SelectTrigger className="bg-seguranca-black border-gray-700 text-white h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-seguranca-black border-gray-700 text-white">
                                    {documentTypes.map(t => (
                                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-seguranca-lightgray">Data de Entrega</Label>
                            <Input
                                type="date"
                                value={form.dataEntrega}
                                onChange={(e) => setForm(prev => ({ ...prev, dataEntrega: e.target.value }))}
                                className="bg-seguranca-black border-gray-700 text-white h-11"
                            />
                        </div>
                    </div>

                    <Separator className="bg-gray-800" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-seguranca-lightgray">Funcionário</Label>
                            <EmployeeCombobox
                                value={form.funcionarioId}
                                onChange={(val) => setForm(prev => ({ ...prev, funcionarioId: val }))}
                                onEmployeeSelect={(emp) => {
                                    setSelectedEmployeeData(emp);
                                    if (emp.companyId) {
                                        setForm(prev => ({ ...prev, empresaId: emp.companyId! }));
                                    }
                                }}
                            />
                        </div>


                        <div className="space-y-2">
                            <Label className="text-seguranca-lightgray">Empresa</Label>
                            <Select value={form.empresaId} onValueChange={(val) => setForm(prev => ({ ...prev, empresaId: val }))}>
                                <SelectTrigger className="bg-seguranca-black border-gray-700 text-white h-11">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent className="bg-seguranca-black border-gray-700 text-white">
                                    {companies.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.sigla || e.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-seguranca-lightgray">
                                {form.documentTypeId === 'CELULAR' ? 'IMEI / Serial / Identificador' : 'Número do Cartão'}
                            </Label>
                            <Input
                                value={form.identificador}
                                onChange={(e) => setForm(prev => ({ ...prev, identificador: e.target.value }))}
                                placeholder="Informe o número de identificação"
                                className="bg-seguranca-black border-gray-700 text-white h-11"
                            />
                        </div>

                        {form.documentTypeId === 'CELULAR' && (
                            <div className="space-y-2">
                                <Label className="text-seguranca-lightgray">Marca / Modelo / Cor</Label>
                                <Input
                                    value={form.descricao}
                                    onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                                    placeholder="Ex: Samsung Galaxy A54 - Preto"
                                    className="bg-seguranca-black border-gray-700 text-white h-11"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => handleGenerate(true)}
                            disabled={loading}
                            className="border-gray-700 hover:bg-gray-800 text-gray-300"
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                        </Button>
                        <Button
                            onClick={() => handleGenerate(false)}
                            disabled={loading}
                            className="bg-seguranca-red hover:bg-seguranca-red/90 text-white"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                            Gerar PDF
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TermoResponsabilidadeEspecificoForm;
