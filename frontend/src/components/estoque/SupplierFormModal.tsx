import React, { useEffect, useState } from 'react';
import { validateCPF, validateCNPJ } from '@/utils/validation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Supplier, CreateSupplierRequest } from '@/services/contasAPagarService';
import { useToast } from '@/hooks/use-toast';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Sparkles,
  User,
  Hash,
  Calendar,
  Tag,
  X
} from 'lucide-react';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
  onSave: (payload: CreateSupplierRequest) => Promise<void> | void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, supplier, onSave }) => {
  const [form, setForm] = useState<CreateSupplierRequest>({ name: '', cnpj: '', cpf: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatCnpj = (value: string): string => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 14);
    let out = digits;
    out = out.replace(/^(\d{2})(\d)/, '$1.$2');
    out = out.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    out = out.replace(/\.(\d{3})(\d)/, '.$1/$2');
    out = out.replace(/(\d{4})(\d)/, '$1-$2');
    return out;
  };

  const formatCpf = (value: string): string => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    let out = digits;
    out = out.replace(/^(\d{3})(\d)/, '$1.$2');
    out = out.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    out = out.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    return out;
  };

  const formatPhone = (value: string): string => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    let out = digits;
    if (digits.length <= 10) {
      out = out.replace(/^(\d{2})(\d)/, '($1) $2');
      out = out.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      out = out.replace(/^(\d{2})(\d)/, '($1) $2');
      out = out.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return out;
  };

  const formatZipCode = (value: string): string => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 8);
    let out = digits;
    out = out.replace(/^(\d{5})(\d)/, '$1-$2');
    return out;
  };

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setForm({
          name: supplier.name,
          cnpj: supplier.cnpj || '',
          cpf: supplier.cpf || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          city: supplier.city || '',
          state: supplier.state || '',
          zipCode: supplier.zipCode || '',
          category: supplier.category || '',
          notes: supplier.notes || '',
        });
      } else {
        setForm({ name: '', cnpj: '', cpf: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', category: '', notes: '' });
      }
    }
  }, [isOpen, supplier]);

  const update = (k: keyof CreateSupplierRequest, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalized: CreateSupplierRequest = {
        ...form,
        name: (form.name || '').trim(),
        cnpj: form.cnpj && form.cnpj.trim() ? formatCnpj(form.cnpj) : undefined,
        cpf: form.cpf && form.cpf.trim() ? formatCpf(form.cpf) : undefined,
        email: form.email ? (form.email || '').trim() : undefined,
        phone: form.phone ? formatPhone(form.phone) : undefined,
        zipCode: form.zipCode ? formatZipCode(form.zipCode) : undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        address: form.address || undefined,
        category: form.category || undefined,
        notes: form.notes || undefined
      };

      // Validações obrigatórias
      // (Nenhum campo é obrigatório)

      // Validar CNPJ se preenchido
      if (normalized.cnpj) {
        if (!validateCNPJ(normalized.cnpj)) {
          throw new Error('CNPJ inválido. Verifique os dígitos informados.');
        }
      }

      // Validar CPF se preenchido
      if (normalized.cpf) {
        if (!validateCPF(normalized.cpf)) {
          throw new Error('CPF inválido. Verifique os dígitos informados.');
        }
      }

      // Email e Telefone não são mais obrigatórios
      if (normalized.email && !normalized.email.match(/^[A-Za-z0-9+_.-]+@(.+)$/)) {
        throw new Error('E-mail inválido');
      }

      if (normalized.phone && (normalized.phone || '').replace(/\D/g, '').length < 10) {
        throw new Error('Telefone inválido');
      }

      await onSave(normalized);
      toast({
        title: '✅ Fornecedor salvo',
        description: 'Fornecedor criado/atualizado com sucesso.',
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="z-[10100] bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[10110] grid w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-0 border bg-[#1A1D21] border-gray-700/50 shadow-2xl p-0 rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Header */}
          <div className="p-6 pb-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#2A1515] border border-red-900/30">
                  <Building2 className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-white">
                    {supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                  </DialogTitle>
                  <DialogDescription className="text-gray-400 mt-1">
                    Preencha os dados do fornecedor
                  </DialogDescription>
                </div>
              </div>
              <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

          </div>

          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">

            {/* Informações Básicas */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-medium">
                <User className="h-4 w-4 text-red-500" />
                <h3>Informações Básicas</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1 md:col-span-1">
                  <Label className="text-gray-300 text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-red-500" />
                    Nome (Opcional)
                  </Label>
                  <Input
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                    placeholder="Nome do fornecedor"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-1">
                  <Label className="text-gray-300 text-sm flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-red-500" />
                    CNPJ
                  </Label>
                  <Input
                    value={form.cnpj}
                    onChange={e => update('cnpj', formatCnpj(e.target.value))}
                    className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-gray-300 text-sm flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-red-500" />
                    CPF
                  </Label>
                  <Input
                    value={form.cpf}
                    onChange={e => update('cpf', formatCpf(e.target.value))}
                    className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20 max-w-[50%]"
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-medium">
                <Mail className="h-4 w-4 text-red-500" />
                <h3>Contato</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-red-500" />
                    E-mail
                  </Label>
                  <Input
                    value={form.email || ''}
                    onChange={e => update('email', e.target.value)}
                    className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                    placeholder="contato@fornecedor.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-red-500" />
                    Telefone
                  </Label>
                  <Input
                    value={form.phone || ''}
                    onChange={e => update('phone', formatPhone(e.target.value))}
                    className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-medium">
                <MapPin className="h-4 w-4 text-red-500" />
                <h3>Endereço</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-red-500" />
                    Endereço
                  </Label>
                  <Input
                    value={form.address || ''}
                    onChange={e => update('address', e.target.value)}
                    className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                    placeholder="Rua, número, bairro"
                  />
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-5 space-y-2">
                    <Label className="text-gray-300 text-sm">Cidade</Label>
                    <Input
                      value={form.city || ''}
                      onChange={e => update('city', e.target.value)}
                      className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="col-span-12 md:col-span-4 space-y-2">
                    <Label className="text-gray-300 text-sm">Estado</Label>
                    <Input
                      value={form.state || ''}
                      onChange={e => update('state', e.target.value.toUpperCase())}
                      className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                  <div className="col-span-12 md:col-span-3 space-y-2">
                    <Label className="text-gray-300 text-sm">CEP</Label>
                    <Input
                      value={form.zipCode || ''}
                      onChange={e => update('zipCode', formatZipCode(e.target.value))}
                      className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Outros */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Categoria</Label>
                <Input
                  value={form.category || ''}
                  onChange={e => update('category', e.target.value)}
                  className="bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20"
                  placeholder="Categoria do fornecedor"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">Observações</Label>
                <Textarea
                  value={form.notes || ''}
                  onChange={e => update('notes', e.target.value)}
                  className="min-h-[80px] bg-[#111315] border-gray-700 text-white placeholder-gray-500 focus:border-red-500/50 focus:ring-red-500/20 resize-y"
                  placeholder="Observações adicionais"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-8"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default SupplierFormModal;
