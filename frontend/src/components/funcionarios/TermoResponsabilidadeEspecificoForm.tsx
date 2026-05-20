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

    // Carregar dados iniciais do funcionário se vier apenas o ID via props
    useEffect(() => {
        if (form.funcionarioId && !selectedEmployeeData) {
            const fetchEmployee = async () => {
                try {
                    const emp = await employeeService.getEmployeeById(form.funcionarioId);
                    if (emp) {
                        setSelectedEmployeeData({
                            id: emp.id,
                            name: emp.name,
                            document: emp.document || emp.cpf,
                            cpf: emp.cpf || emp.document,
                            email: emp.email,
                            phone: emp.phone,
                            registrationNumber: emp.registrationNumber,
                            hireDate: emp.hireDate,
                            positionName: emp.position?.name,
                            unitName: emp.unit?.name,
                            address: emp.address,
                            companyId: emp.company?.id,
                            companySigla: emp.company?.sigla
                        } as SimpleEmployee);

                        // Auto-selecionar empresa se o funcionário tiver uma
                        if (emp.company?.id && !form.empresaId) {
                            setForm(prev => ({ ...prev, empresaId: emp.company.id }));
                        }
                    }
                } catch (error) {
                    console.error("Erro ao carregar dados iniciais do funcionário:", error);
                }
            };
            fetchEmployee();
        }
    }, [form.funcionarioId, selectedEmployeeData, form.empresaId]);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            try {
                const companiesData = await companyService.getAllCompanies();
                setCompanies(companiesData);
            } catch (error) {
                console.error('Erro ao buscar dados:', error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);


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
                city: selectedEmp.city || '',
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
                            <Label className="text-seguranca-lightgray font-semibold">Funcionário</Label>
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
                            {selectedFunc && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-seguranca-black/50 px-3 py-2 border border-gray-800">
                                    <User className="h-3.5 w-3.5 text-seguranca-red" />
                                    <span className="text-xs font-semibold text-white">
                                        {selectedFunc.name}
                                    </span>
                                    {(selectedFunc.cpf || (selectedFunc as any).document) && (
                                        <span className="text-[11px] text-gray-400">
                                            · CPF: {selectedFunc.cpf || (selectedFunc as any).document || ''}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-seguranca-lightgray font-semibold">Empresa</Label>
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
                            {selectedEmp && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-seguranca-black/50 px-3 py-2 border border-gray-800">
                                    <Building className="h-3.5 w-3.5 text-seguranca-red" />
                                    <span className="text-xs font-semibold text-white">
                                        {selectedEmp.sigla || selectedEmp.name}
                                    </span>
                                    {selectedEmp.cnpj && (
                                        <span className="text-[11px] text-gray-400">
                                            · CNPJ: {selectedEmp.cnpj}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Detalhes do Funcionário */}
                        {selectedFunc && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 bg-seguranca-black/40 p-4 rounded-lg border border-gray-800">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                    <div className="flex items-center gap-2 font-medium text-seguranca-lightgray">
                                        <User className="h-4 w-4 text-seguranca-red" />
                                        Dados do Funcionário
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-gray-500 uppercase tracking-wider">Cargo</Label>
                                            <div className="p-2.5 bg-seguranca-black/60 rounded-md text-sm font-medium border border-gray-800 transition-colors truncate">
                                                {selectedFunc.positionName || '-'}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-gray-500 uppercase tracking-wider">Admissão</Label>
                                            <div className="p-2.5 bg-seguranca-black/60 rounded-md text-sm font-medium border border-gray-800 transition-colors">
                                                {selectedFunc.hireDate ? new Date(selectedFunc.hireDate).toLocaleDateString('pt-BR') : '-'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-gray-500 uppercase tracking-wider">Setor</Label>
                                        <div className="p-2.5 bg-seguranca-black/60 rounded-md text-sm font-medium border border-gray-800 transition-colors truncate">
                                            {selectedFunc.unitName || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detalhes da Empresa */}
                        {selectedEmp && (
                            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 delay-100 bg-seguranca-black/40 p-4 rounded-lg border border-gray-800">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                    <div className="flex items-center gap-2 font-medium text-seguranca-lightgray">
                                        <Building className="h-4 w-4 text-seguranca-red" />
                                        Dados da Empresa
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-gray-500 uppercase tracking-wider">Razão Social</Label>
                                        <div className="p-2.5 bg-seguranca-black/60 rounded-md text-sm font-medium border border-gray-800 transition-colors truncate">
                                            {selectedEmp.name}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-gray-500 uppercase tracking-wider">CNPJ</Label>
                                            <div className="p-2.5 bg-seguranca-black/60 rounded-md text-sm font-medium border border-gray-800 transition-colors">
                                                {selectedEmp.cnpj || '-'}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-gray-500 uppercase tracking-wider">Sigla</Label>
                                            <div className="p-2.5 bg-seguranca-black/60 rounded-md text-sm font-medium border border-gray-800 transition-colors">
                                                {selectedEmp.sigla || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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
