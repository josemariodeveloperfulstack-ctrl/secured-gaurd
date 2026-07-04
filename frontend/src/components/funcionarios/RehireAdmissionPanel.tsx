import React from 'react';
import { AlertTriangle, UserCheck, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ADMISSION_TYPE_LABELS,
  EligibleRehireEmployee,
  EmploymentAdmissionType,
} from '@/services/employeeEmploymentPeriodService';

interface RehireAdmissionPanelProps {
  eligibleEmployee: EligibleRehireEmployee;
  admissionType: EmploymentAdmissionType | '';
  onAdmissionTypeChange: (type: EmploymentAdmissionType) => void;
  showTerminatedEditHint?: boolean;
}

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('pt-BR');
}

const RehireAdmissionPanel: React.FC<RehireAdmissionPanelProps> = ({
  eligibleEmployee,
  admissionType,
  onAdmissionTypeChange,
  showTerminatedEditHint = false,
}) => {
  const prevCompany =
    (eligibleEmployee.company as { name?: string } | undefined)?.name ||
    (eligibleEmployee as { empresaNome?: string }).empresaNome ||
    'Empresa anterior';
  const prevHireDate = eligibleEmployee.hireDate;
  const dismissalDate =
    eligibleEmployee.dataRescisao || eligibleEmployee.terminationDate;

  return (
    <div className="md:col-span-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <UserCheck className="h-5 w-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-200">
            Funcionário já cadastrado — recontratação disponível
          </p>
          <p className="text-xs text-amber-100/80 mt-1">
            <span className="font-medium">{eligibleEmployee.name}</span> será recontratado
            reutilizando o mesmo cadastro. O vínculo anterior permanece registrado no histórico.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-600 bg-gray-900/60 p-3 space-y-2">
        <div className="flex items-center gap-2 text-gray-300">
          <History className="h-4 w-4 text-seguranca-yellow shrink-0" />
          <span className="text-sm font-medium">Vínculo anterior (preservado no histórico)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Empresa: </span>
            <span className="text-gray-200">{prevCompany}</span>
          </div>
          <div>
            <span className="text-gray-500">Data de admissão: </span>
            <span className="text-gray-200 font-medium">{formatDate(prevHireDate)}</span>
          </div>
          <div>
            <span className="text-gray-500">Data de demissão: </span>
            <span className="text-gray-200 font-medium">{formatDate(dismissalDate)}</span>
          </div>
          {eligibleEmployee.terminationReason && (
            <div className="sm:col-span-2">
              <span className="text-gray-500">Motivo da demissão: </span>
              <span className="text-gray-200">{eligibleEmployee.terminationReason}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
          Tipo de nova admissão
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Obrigatório</Badge>
        </Label>
        <RadioGroup
          value={admissionType}
          onValueChange={(val) => onAdmissionTypeChange(val as EmploymentAdmissionType)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {(Object.keys(ADMISSION_TYPE_LABELS) as EmploymentAdmissionType[]).map((type) => (
            <label
              key={type}
              htmlFor={`admission-type-${type}`}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                admissionType === type
                  ? 'border-seguranca-yellow bg-seguranca-yellow/10'
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <RadioGroupItem id={`admission-type-${type}`} value={type} />
              <div>
                <p className="text-sm font-medium text-white">{ADMISSION_TYPE_LABELS[type]}</p>
                <p className="text-xs text-gray-400">
                  {type === 'READMISSAO'
                    ? 'Nova contratação em outra empresa do sistema'
                    : 'Promoção com readmissão em nova empresa ou cargo'}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {showTerminatedEditHint && admissionType && (
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Preencha abaixo a <strong className="text-gray-300">nova data de admissão</strong>, empresa,
            cargo e unidade. As datas do vínculo anterior não serão apagadas — ficam na aba Histórico.
          </span>
        </div>
      )}
    </div>
  );
};

export default RehireAdmissionPanel;
