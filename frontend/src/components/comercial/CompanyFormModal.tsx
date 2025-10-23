import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { companyService, CreateCompanyRequest } from '@/services/companyService';

interface CompanyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (company: any) => void;
  initialData?: Partial<CreateCompanyRequest> | null;
}

export const CompanyFormModal: React.FC<CompanyFormModalProps> = ({ open, onOpenChange, onSuccess, initialData }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateCompanyRequest>({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    sigla: '',
    description: '',
    website: '',
    status: 'ACTIVE'
  });

  React.useEffect(() => {
    if (open && initialData) {
      setForm(prev => ({
        ...prev,
        ...initialData
      } as CreateCompanyRequest));
    }
  }, [open, initialData]);

  const handleChange = (key: keyof CreateCompanyRequest, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.cnpj) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha Nome e CNPJ.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      let saved;
      if ((initialData as any)?.id) {
        saved = await companyService.updateCompany((initialData as any).id, form);
      } else {
        saved = await companyService.createCompany(form);
      }
      toast({ title: 'Empresa criada', description: 'Cadastro realizado com sucesso.' });
      onSuccess?.(saved);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.response?.data?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-seguranca-graphite border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-seguranca-yellow">Nova Empresa</DialogTitle>
          <DialogDescription>Preencha os dados mínimos: Nome e CNPJ. Campos adicionais são opcionais.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Nome *</Label>
              <Input value={form.name} onChange={e => handleChange('name', e.target.value)} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="Razão Social" />
            </div>
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">CNPJ *</Label>
              <Input value={form.cnpj} onChange={e => handleChange('cnpj', e.target.value)} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Email</Label>
              <Input value={form.email} onChange={e => handleChange('email', e.target.value)} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="email@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Telefone</Label>
              <Input value={form.phone} onChange={e => handleChange('phone', e.target.value)} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="(00) 0000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-seguranca-lightgray">Endereço</Label>
            <Input value={form.address} onChange={e => handleChange('address', e.target.value)} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="Rua, número, complemento" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Sigla</Label>
              <Input value={form.sigla} onChange={e => handleChange('sigla', e.target.value.toUpperCase())} maxLength={8} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="ADM, TERC, VIG..." />
            </div>
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Website</Label>
              <Input value={form.website} onChange={e => handleChange('website', e.target.value)} className="bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-seguranca-yellow focus:ring-seguranca-yellow" placeholder="https://suaempresa.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-seguranca-lightgray">Status</Label>
              <select
                value={form.status}
                onChange={e => handleChange('status', e.target.value as any)}
                className="w-full rounded-md bg-white border border-gray-300 text-black px-3 py-2 focus:border-seguranca-yellow focus:ring-seguranca-yellow"
              >
                <option value="ACTIVE">Ativa</option>
                <option value="PENDING">Pendente</option>
                <option value="INACTIVE">Inativa</option>
                <option value="SUSPENDED">Suspensa</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600 text-white hover:bg-seguranca-black">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-seguranca-red hover:bg-seguranca-darkred">{loading ? 'Salvando...' : 'Salvar Empresa'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFormModal;

