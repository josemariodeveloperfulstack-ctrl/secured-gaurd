import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

// Mock de funcionários
const mockEmployees = [
  { id: 1, name: 'João Silva', cpf: '123.456.789-00', position: 'Vigilante' },
  { id: 2, name: 'Maria Souza', cpf: '987.654.321-00', position: 'Porteiro' },
  { id: 3, name: 'Carlos Lima', cpf: '111.222.333-44', position: 'Auxiliar Administrativo' },
  { id: 4, name: 'Ana Paula', cpf: '555.666.777-88', position: 'Supervisor' },
  { id: 5, name: 'Roberto Costa', cpf: '999.888.777-66', position: 'Gestor' },
];

const cargos = ['Vigilante', 'Porteiro', 'Auxiliar Administrativo', 'Supervisor', 'Gestor'];

function addYears(dateStr, years) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

const EmployeeTrainingFormModal = ({ open, onOpenChange, onSave, editData }) => {
  const [form, setForm] = useState({
    employeeId: '',
    employee: '',
    cpf: '',
    position: '',
    validUntil: '',
    sector: '',
    workSchedule: '',
    asoDate: '',
    psicotecnicoDate: '',
    id: undefined,
  });

  useEffect(() => {
    if (editData) {
      setForm(editData);
    } else {
      setForm({
        employeeId: '', employee: '', cpf: '', position: '', validUntil: '', sector: '', workSchedule: '', asoDate: '', psicotecnicoDate: '', id: undefined
      });
    }
  }, [editData, open]);

  // Ao selecionar funcionário, preenche CPF e Cargo
  const handleEmployeeChange = (val) => {
    const emp = mockEmployees.find(e => e.id.toString() === val);
    setForm(f => ({
      ...f,
      employeeId: val,
      employee: emp?.name || '',
      cpf: emp?.cpf || '',
      position: emp?.position || '',
      asoDate: emp?.position === 'Vigilante' ? f.asoDate : '',
      psicotecnicoDate: emp?.position === 'Vigilante' ? f.psicotecnicoDate : '',
    }));
  };

  // Validação automática das datas de validade
  useEffect(() => {
    if (form.position === 'Vigilante') {
      setForm(f => ({
        ...f,
        asoDate: f.asoDate,
        psicotecnicoDate: f.psicotecnicoDate,
      }));
    }
  }, [form.position]);

  const handleSave = () => {
    // Validação básica
    if (!form.employeeId || !form.validUntil || !form.sector || !form.workSchedule) return;
    // Se Vigilante, exigir ASO e Psicotécnico
    if (form.position === 'Vigilante' && (!form.asoDate || !form.psicotecnicoDate)) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-4 sm:p-6 rounded-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-center sm:text-left">
            {form.id ? 'Editar Treinamento' : 'Novo Treinamento'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-5">
          {/* Funcionário */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Funcionário</Label>
            <Select value={form.employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className="w-full h-10 sm:h-11">
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {mockEmployees.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CPF e Cargo em linha no desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">CPF</Label>
              <Input value={form.cpf} disabled className="w-full h-10 sm:h-11 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cargo</Label>
              <Input value={form.position} disabled className="w-full h-10 sm:h-11 text-sm" />
            </div>
          </div>

          {/* Data de Validade */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Data de Validade</Label>
            <Input 
              type="date" 
              value={form.validUntil} 
              onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} 
              className="w-full h-10 sm:h-11 text-sm" 
            />
          </div>

          {/* Setor e Horário em linha no desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Setor/Posto de Trabalho</Label>
              <Input 
                value={form.sector} 
                onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} 
                className="w-full h-10 sm:h-11 text-sm" 
                placeholder="Ex: Segurança, Portaria"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Horário de Trabalho</Label>
              <Input 
                value={form.workSchedule} 
                onChange={e => setForm(f => ({ ...f, workSchedule: e.target.value }))} 
                className="w-full h-10 sm:h-11 text-sm" 
                placeholder="Ex: 06h às 18h"
              />
            </div>
          </div>

          {/* Campos específicos para Vigilante */}
          {form.position === 'Vigilante' && (
            <div className="space-y-4 sm:space-y-5 border-t pt-4 sm:pt-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data do ASO</Label>
                <Input 
                  type="date" 
                  value={form.asoDate} 
                  onChange={e => setForm(f => ({ ...f, asoDate: e.target.value }))} 
                  className="w-full h-10 sm:h-11 text-sm" 
                />
                <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  Validade: {form.asoDate ? addYears(form.asoDate, 1) : '--'}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data do Psicotécnico</Label>
                <Input 
                  type="date" 
                  value={form.psicotecnicoDate} 
                  onChange={e => setForm(f => ({ ...f, psicotecnicoDate: e.target.value }))} 
                  className="w-full h-10 sm:h-11 text-sm" 
                />
                <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  Validade: {form.psicotecnicoDate ? addYears(form.psicotecnicoDate, 2) : '--'}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button 
            onClick={handleSave} 
            className="w-full sm:w-auto h-10 sm:h-11 text-sm font-medium"
            size="lg"
          >
            {form.id ? 'Salvar Alterações' : 'Cadastrar Treinamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeTrainingFormModal; 