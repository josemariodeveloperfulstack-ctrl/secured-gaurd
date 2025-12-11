import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import driverService from '@/services/driverService';
import { useToast } from '@/hooks/use-toast';
import { Driver } from '@/types/driver';
import { EmployeeCombobox } from '@/components/ui/employee-combobox';
import employeeService from '@/services/employeeService';

interface DriverFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  driver?: Driver | null; // Para edição
}

const DriverFormModal: React.FC<DriverFormModalProps> = ({ isOpen, onOpenChange, onSuccess, driver }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [status, setStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const isEditing = !!driver;

  useEffect(() => {
    if (driver) {
      setEmployeeId('');
      setName(driver.name);
      setLicenseNumber(driver.licenseNumber || '');
      setStatus(driver.status);
    } else {
      setEmployeeId('');
      setName('');
      setLicenseNumber('');
      setStatus('ATIVO');
    }
  }, [driver, isOpen]);

  // Quando escolher um funcionário, preencher nome e CNH automaticamente
  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) return;
      try {
        const emp = await employeeService.getEmployeeById(employeeId);
        if (emp) {
          setName(emp.name || '');
          if (emp.cnhNumber) setLicenseNumber(emp.cnhNumber);
          if (emp.status && ['ACTIVE', 'ATIVO'].includes(emp.status)) {
            setStatus('ATIVO');
          } else if (emp.status && ['INACTIVE', 'INATIVO'].includes(emp.status)) {
            setStatus('INATIVO');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar funcionário:', error);
      }
    };
    loadEmployee();
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast({
        title: 'Selecione o funcionário',
        description: 'Escolha um funcionário para vincular como motorista.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validar se já existe motorista com essa CNH (apenas na criação)
    if (!isEditing && licenseNumber && licenseNumber.trim()) {
      try {
        const existingDrivers = await driverService.getDrivers();
        const driverWithSameCNH = existingDrivers.find(
          d => d.licenseNumber && d.licenseNumber.trim() === licenseNumber.trim()
        );
        if (driverWithSameCNH) {
          toast({
            title: 'CNH já cadastrada',
            description: `Já existe um motorista cadastrado com esta CNH: ${licenseNumber}. Por favor, edite o motorista existente ou use uma CNH diferente.`,
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar CNH existente:', error);
        // Continua mesmo se houver erro na verificação
      }
    }
    
    setIsLoading(true);

    try {
      const driverData = { name, licenseNumber, status };
      if (isEditing && driver) {
        await driverService.updateDriver(driver.id, driverData);
      } else {
        await driverService.createDriver(driverData);
      }
      
      toast({
        title: 'Sucesso',
        description: `Motorista ${isEditing ? 'atualizado' : 'criado'} com sucesso.`,
        variant: 'default',
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || `Não foi possível ${isEditing ? 'atualizar' : 'criar'} o motorista.`;
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-seguranca-graphite text-seguranca-lightgray">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Funcionário (busca)
              </Label>
              <div className="col-span-3">
                <EmployeeCombobox
                  value={employeeId}
                  onChange={(value) => setEmployeeId(value)}
                  placeholder="Buscar funcionário pelo nome..."
                  searchPlaceholder="Digite pelo menos 2 letras"
                  emptyPlaceholder="Nenhum funcionário encontrado"
                  disabled={isEditing} // edição mantém o vínculo atual
                />
                <p className="mt-1 text-xs text-gray-400">O motorista é sempre um funcionário da empresa.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nome do motorista
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseNumber" className="text-right">
                Nº da CNH
              </Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={status} onValueChange={(value: 'ATIVO' | 'INATIVO') => setStatus(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="INATIVO">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading} className="bg-seguranca-red hover:bg-seguranca-darkred">
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DriverFormModal; 