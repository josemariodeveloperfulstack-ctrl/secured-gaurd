import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, User } from 'lucide-react';
import { formatDateForBackend, parseDateFromBackend } from '@/utils/dateUtils';
import { formatCpfForInput, validateCPF } from '@/utils/validation';
import { useToast } from '@/hooks/use-toast';
import dependentService from '@/services/dependentService';
import type { Dependent, DependentCreateRequest } from '@/types/dependent';

export type SpouseFormValues = {
  spouseName: string;
  spouseCpf: string;
  spouseRg: string;
  spouseBirthDate: string;
  spouseProfession: string;
  spousePhone: string;
};

interface SpouseFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<SpouseFormValues>;
  employeeId?: string;
  employeeCpf?: string;
  existingSpouseDependent?: Dependent | null;
  /** CPFs já usados por outros dependentes (exceto o cônjuge em edição) */
  existingDependentCpfs?: string[];
  /** Sem employeeId: devolve o payload do dependente para fila pendente */
  onPendingDependent?: (data: DependentCreateRequest) => void;
  onSaved: (spouse: SpouseFormValues, dependent?: Dependent | null) => void;
}

const emptySpouse: SpouseFormValues = {
  spouseName: '',
  spouseCpf: '',
  spouseRg: '',
  spouseBirthDate: '',
  spouseProfession: '',
  spousePhone: '',
};

const digitsOnly = (v: string) => v.replace(/\D/g, '');

/**
 * Cadastro de cônjuge ao selecionar Estado Civil = Casado.
 * Persiste nos campos do funcionário e também como dependente (CONJUGE).
 */
export const SpouseFormModal: React.FC<SpouseFormModalProps> = ({
  open,
  onOpenChange,
  initialValues,
  employeeId,
  employeeCpf,
  existingSpouseDependent,
  existingDependentCpfs = [],
  onPendingDependent,
  onSaved,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<SpouseFormValues>(emptySpouse);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm({
      ...emptySpouse,
      spouseName: initialValues?.spouseName || existingSpouseDependent?.name || '',
      spouseCpf: initialValues?.spouseCpf || existingSpouseDependent?.cpf || '',
      spouseRg: initialValues?.spouseRg || existingSpouseDependent?.rg || '',
      spouseBirthDate: initialValues?.spouseBirthDate || existingSpouseDependent?.birthDate || '',
      spouseProfession: initialValues?.spouseProfession || '',
      spousePhone: initialValues?.spousePhone || existingSpouseDependent?.phone || '',
    });
  }, [open, initialValues, existingSpouseDependent]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.spouseName.trim()) next.spouseName = 'Nome é obrigatório';
    const cpfDigits = digitsOnly(form.spouseCpf);
    if (cpfDigits.length !== 11 || !validateCPF(form.spouseCpf)) {
      next.spouseCpf = 'CPF inválido';
    } else if (employeeCpf && digitsOnly(employeeCpf) === cpfDigits) {
      next.spouseCpf = 'CPF do cônjuge não pode ser o mesmo do funcionário';
    } else {
      const used = existingDependentCpfs.some((c) => digitsOnly(c) === cpfDigits);
      if (used) next.spouseCpf = 'Este CPF já está cadastrado em outro dependente';
    }
    if (!form.spouseRg.trim()) next.spouseRg = 'RG é obrigatório';
    if (!form.spouseBirthDate) next.spouseBirthDate = 'Data de nascimento é obrigatória';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildDependentPayload = (): DependentCreateRequest => ({
    employeeId: employeeId || '',
    name: form.spouseName.trim(),
    relationship: 'CONJUGE',
    birthDate: form.spouseBirthDate.includes('T')
      ? form.spouseBirthDate.slice(0, 10)
      : form.spouseBirthDate,
    cpf: digitsOnly(form.spouseCpf),
    rg: form.spouseRg.trim(),
    phone: form.spousePhone?.trim() || undefined,
    notes: form.spouseProfession?.trim()
      ? `Profissão: ${form.spouseProfession.trim()}`
      : undefined,
    isBeneficiary: true,
  });

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      let dependent: Dependent | null = null;
      const payload = buildDependentPayload();

      if (employeeId) {
        if (existingSpouseDependent?.id) {
          dependent = await dependentService.updateDependent(existingSpouseDependent.id, {
            name: payload.name,
            relationship: 'CONJUGE',
            birthDate: payload.birthDate,
            cpf: payload.cpf,
            rg: payload.rg,
            phone: payload.phone,
            notes: payload.notes,
            isBeneficiary: true,
          });
        } else {
          dependent = await dependentService.createDependent({
            ...payload,
            employeeId,
          });
        }
      } else if (onPendingDependent) {
        onPendingDependent(payload);
      }

      onSaved(form, dependent);
      onOpenChange(false);
      toast({
        title: 'Cônjuge cadastrado',
        description: employeeId
          ? 'Dados salvos e cônjuge incluído em Dependentes.'
          : 'Dados do cônjuge preenchidos. Será incluído em Dependentes ao salvar o funcionário.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err?.message || err?.response?.data?.message || 'Não foi possível salvar o cônjuge.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="max-w-2xl bg-seguranca-graphite border-gray-600 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5 text-seguranca-yellow" />
            Cadastro do Cônjuge
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Os dados serão gravados no cadastro do funcionário e também como dependente (Cônjuge),
            evitando lançamento duplicado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div>
            <Label className="text-sm text-gray-200 flex items-center gap-2 mb-1.5">
              Nome do Cônjuge
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
            </Label>
            <Input
              value={form.spouseName}
              onChange={(e) => setForm((p) => ({ ...p, spouseName: e.target.value }))}
              placeholder="Nome completo do cônjuge"
              className="bg-seguranca-graphite border-gray-600"
            />
            {errors.spouseName && <p className="text-xs text-red-400 mt-1">{errors.spouseName}</p>}
          </div>
          <div>
            <Label className="text-sm text-gray-200 flex items-center gap-2 mb-1.5">
              CPF do Cônjuge
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
            </Label>
            <Input
              value={form.spouseCpf}
              onChange={(e) => setForm((p) => ({ ...p, spouseCpf: formatCpfForInput(e.target.value) }))}
              placeholder="000.000.000-00"
              className="bg-seguranca-graphite border-gray-600"
            />
            {errors.spouseCpf && <p className="text-xs text-red-400 mt-1">{errors.spouseCpf}</p>}
          </div>
          <div>
            <Label className="text-sm text-gray-200 flex items-center gap-2 mb-1.5">
              RG do Cônjuge
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
            </Label>
            <Input
              value={form.spouseRg}
              onChange={(e) => setForm((p) => ({ ...p, spouseRg: e.target.value }))}
              placeholder="Número do RG"
              className="bg-seguranca-graphite border-gray-600"
            />
            {errors.spouseRg && <p className="text-xs text-red-400 mt-1">{errors.spouseRg}</p>}
          </div>
          <div>
            <Label className="text-sm text-gray-200 flex items-center gap-2 mb-1.5">
              Data de Nascimento do Cônjuge
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">Obrigatório</Badge>
            </Label>
            <DatePicker
              date={parseDateFromBackend(form.spouseBirthDate) || undefined}
              onDateChange={(date) =>
                setForm((p) => ({ ...p, spouseBirthDate: formatDateForBackend(date) || '' }))
              }
              className="w-full"
            />
            {errors.spouseBirthDate && <p className="text-xs text-red-400 mt-1">{errors.spouseBirthDate}</p>}
          </div>
          <div>
            <Label className="text-sm text-gray-200 flex items-center gap-2 mb-1.5">
              Profissão do Cônjuge
              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
            </Label>
            <Input
              value={form.spouseProfession}
              onChange={(e) => setForm((p) => ({ ...p, spouseProfession: e.target.value }))}
              placeholder="Profissão do cônjuge"
              className="bg-seguranca-graphite border-gray-600"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-200 flex items-center gap-2 mb-1.5">
              Telefone do Cônjuge
              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs ml-auto">Opcional</Badge>
            </Label>
            <Input
              value={form.spousePhone}
              onChange={(e) => setForm((p) => ({ ...p, spousePhone: e.target.value }))}
              placeholder="(00) 00000-0000"
              className="bg-seguranca-graphite border-gray-600"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
            className="border-gray-600 text-gray-300"
          >
            Agora não
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={() => void handleSubmit()}
            className="bg-seguranca-red hover:bg-seguranca-darkred text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar cônjuge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SpouseFormModal;
