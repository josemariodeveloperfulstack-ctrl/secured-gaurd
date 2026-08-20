import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { refreshEmployeeDocuments } from '@/utils/refreshEmployeeDocuments';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, Eye, User, Calendar, MapPin, CheckCircle2, Loader2, Building, Info, Camera } from 'lucide-react';
import { Company } from '@/types/company';
import { EmployeeCombobox } from '../ui/employee-combobox';
import { SimpleEmployee, employeeService } from '@/services/employeeService';
import { companyService } from '@/services/companyService';
import { employeeAdmissionIsoDateOrToday } from '@/utils/employeeAdmissionDate';
import { resolveCompanySigningCity } from '@/utils/resolveCompanySigningCity';

interface TermoUsoImagemVozNomeFormProps {
  employeeId?: string;
  companyId?: string;
  companies?: Company[];
  employeeName?: string;
}

const TermoUsoImagemVozNomeForm: React.FC<TermoUsoImagemVozNomeFormProps> = ({ employeeId, companyId, companies: propCompanies, employeeName: propEmployeeName }) => {
  const [form, setForm] = useState({
    funcionarioId: employeeId || '',
    empresaId: companyId || '',
    cidadeEmissao: 'Contagem, MG',
    dataDocumento: employeeAdmissionIsoDateOrToday(),
  });

  const [selectedEmployeeData, setSelectedEmployeeData] = useState<SimpleEmployee | null>(null);
  const [companies, setCompanies] = useState<Company[]>(propCompanies || []);
  const [loadingData, setLoadingData] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funcionarioId: employeeId || prev.funcionarioId,
      empresaId: companyId || prev.empresaId,
    }));
  }, [employeeId, companyId]);

  const loadEmployee = async (id: string) => {
    try {
      const emp = await employeeService.getEmployeeById(id);
      if (!emp) return;

      const workPostName =
        (emp as any).workPostName ||
        emp.workPost?.name ||
        (emp as any).unitName ||
        emp.unit?.name ||
        '';

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
        workPostName,
        companyId: emp.company?.id,
        address: emp.address,
      } as SimpleEmployee);

      setForm(prev => ({
        ...prev,
        empresaId: emp.company?.id || prev.empresaId,
        dataDocumento: employeeAdmissionIsoDateOrToday(emp.hireDate),
      }));
    } catch (error) {
      console.error('Erro ao carregar dados do funcionário:', error);
    }
  };

  useEffect(() => {
    if (form.funcionarioId) {
      loadEmployee(form.funcionarioId);
    }
  }, [form.funcionarioId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const companiesData = await companyService.getAllCompanies();
        if (companiesData && companiesData.length > 0) {
          setCompanies(companiesData);
          if (!form.empresaId) {
            setForm(prev => ({ ...prev, empresaId: companiesData[0].id }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const effectiveCompanies = companies.length > 0 ? companies : (propCompanies || []);
  const funcionario = selectedEmployeeData;
  const empresa = effectiveCompanies.find(e => String(e.id) === String(form.empresaId)) || effectiveCompanies[0];
  const isReady = Boolean((funcionario || form.funcionarioId || employeeId) && (empresa || form.empresaId || companyId));

  const buildPayload = () => {
    const rawEmpId = funcionario?.id || (form.funcionarioId !== '' ? form.funcionarioId : undefined) || employeeId;
    const rawCompId = empresa?.id || (form.empresaId !== '' ? form.empresaId : undefined) || companyId;

    const targetEmployeeId = (rawEmpId && typeof rawEmpId === 'string' && rawEmpId.trim() !== '') ? rawEmpId : null;
    const targetCompanyId = (rawCompId && typeof rawCompId === 'string' && rawCompId.trim() !== '') ? rawCompId : null;
    const targetEmployeeName = funcionario?.name || propEmployeeName || 'Funcionário';

    return {
      companyId: targetCompanyId,
      employeeId: targetEmployeeId,
      employeeName: targetEmployeeName,
      city: form.cidadeEmissao || (empresa ? resolveCompanySigningCity(empresa as any) : 'Contagem, MG'),
      documentDate: form.dataDocumento,
    };
  };

  const handlePreview = async () => {
    if (!isReady) {
      alert('Selecione o funcionário e a empresa!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/image-voice-name-auth/preview-pdf', buildPayload(), {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      console.error('Erro ao gerar preview:', err);
      let message = 'Erro ao gerar preview. Tente novamente.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) message = json.message;
        } catch (_) {}
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPDF = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) {
      alert('Selecione o funcionário e a empresa!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/image-voice-name-auth/generate-pdf', buildPayload(), {
        responseType: 'blob',
      });

      const safeName = (funcionario?.name || propEmployeeName || 'funcionario').replace(/\s+/g, '-').toLowerCase();
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `termo-uso-imagem-voz-nome-${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const targetEmpId = funcionario?.id || form.funcionarioId || employeeId;
      if (targetEmpId) {
        void refreshEmployeeDocuments(targetEmpId);
      }
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      let message = 'Erro ao gerar PDF. Tente novamente.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.message) message = json.message;
        } catch (_) {}
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-purple-600 shadow-md bg-slate-900 border-slate-800 text-slate-100">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl text-white">
                <Camera className="h-6 w-6 text-purple-400" />
                Termo de Autorização para Uso de Imagem, Voz e Nome
              </CardTitle>
              <CardDescription className="text-slate-400">
                Autorização para utilização de imagem, som de voz e nome em materiais institucionais, publicitários e divulgação da empresa.
              </CardDescription>
            </div>
            {isReady && (
              <Badge variant="outline" className="bg-emerald-950/80 text-emerald-300 border-emerald-500/50 gap-1 px-3 py-1">
                <CheckCircle2 className="h-3 w-3" />
                Pronto para gerar
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção do Funcionário e Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-950/50 border border-slate-800">
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium flex items-center gap-1.5">
                <User className="h-4 w-4 text-purple-400" />
                Funcionário
              </Label>
              <EmployeeCombobox
                value={form.funcionarioId}
                onValueChange={(val) => setForm(prev => ({ ...prev, funcionarioId: val }))}
                placeholder="Selecione o funcionário..."
                className="w-full bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Building className="h-4 w-4 text-purple-400" />
                Empresa Contratante
              </Label>
              <Select
                value={form.empresaId}
                onValueChange={(val) => setForm(prev => ({ ...prev, empresaId: val }))}
                disabled={loadingData}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razaoSocial || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dados do Colaborador Carregados */}
          {funcionario && (
            <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 space-y-3">
              <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Info className="h-4 w-4 text-purple-400" />
                Dados do Autorizante
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block">Nome:</span>
                  <span className="font-semibold text-white">{funcionario.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">CPF:</span>
                  <span className="font-semibold text-white">{funcionario.cpf || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cargo:</span>
                  <span className="font-semibold text-white">{funcionario.positionName || 'Não informado'}</span>
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-slate-800" />

          {/* Cidade e Data do Documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300 font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-purple-400" />
                Cidade / UF de Emissão
              </Label>
              <Input
                value={form.cidadeEmissao}
                onChange={(e) => setForm(prev => ({ ...prev, cidadeEmissao: e.target.value }))}
                placeholder="Ex: Contagem, MG"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-purple-400" />
                Data do Documento
              </Label>
              <Input
                type="date"
                value={form.dataDocumento}
                onChange={(e) => setForm(prev => ({ ...prev, dataDocumento: e.target.value }))}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handlePreview}
              disabled={loading || !isReady}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 text-slate-400" />}
              Visualizar PDF
            </Button>
            <Button
              type="button"
              onClick={handleGerarPDF}
              disabled={loading || !isReady}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 font-bold shadow-lg shadow-purple-900/30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Gerar e Baixar Termo PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermoUsoImagemVozNomeForm;
