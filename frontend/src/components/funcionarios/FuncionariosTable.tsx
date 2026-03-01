import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal, Edit, Trash2, Eye, User, Mail, Phone, MapPin,
  Calendar, Building, FileText, UserPlus, AlertCircle, UserMinus, Briefcase
} from 'lucide-react';
import { Employee } from '@/types/employee';
import { Checkbox } from '@/components/ui/checkbox';

interface FuncionariosTableProps {
  employees: Employee[];
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onTerminate: (employee: Employee) => void;
  onViewDocuments: (employee: Employee) => void;
  onViewDependents: (employee: Employee) => void;
  onViewDetails: (employee: Employee) => void;
  isLoading?: boolean;
  isMobileSelectionMode?: boolean;
}

export const FuncionariosTable: React.FC<FuncionariosTableProps> = ({
  employees,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onTerminate,
  onViewDocuments,
  onViewDependents,
  onViewDetails,
  isLoading = false,
  isMobileSelectionMode = false
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'ACTIVE': {
        label: 'Ativo',
        className: 'bg-green-500/20 text-green-300 border-green-500/30'
      },
      'INACTIVE': {
        label: 'Inativo',
        className: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      },
      'VACATION': {
        label: 'Férias',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      },
      'MATERNITY_LEAVE': {
        label: 'Licença Maternidade',
        className: 'bg-pink-500/20 text-pink-300 border-pink-500/30'
      },
      'MEDICAL_CERTIFICATE': {
        label: 'Atestado',
        className: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      },
      'TERMINATED': {
        label: 'Demitido',
        className: 'bg-red-500/20 text-red-300 border-red-500/30'
      },
      'SUSPENDED': {
        label: 'Suspenso',
        className: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
      }
    };

    const config = statusConfig[status] || statusConfig['INACTIVE'];
    return (
      <Badge className={`${config.className} px-3 py-1 font-medium border`}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-seguranca-black/50 animate-pulse rounded-lg border border-gray-600/30"
          />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-16">
        <User className="h-16 w-16 mx-auto text-gray-600 mb-4" />
        <p className="text-gray-400 text-lg font-medium">Nenhum funcionário encontrado</p>
        <p className="text-gray-500 text-sm mt-2">
          Tente ajustar os filtros ou adicione um novo funcionário
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop View - Table */}
      <div className="hidden lg:block rounded-lg border border-gray-600/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-seguranca-black/50 hover:bg-seguranca-black/70 border-gray-600/30">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={employees.length > 0 && selectedIds.length === employees.length}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  className="border-gray-500 data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red"
                />
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Funcionário</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Cargo/Função</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Empresa</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Posto de Trabalho</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Admissão</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Demissão</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold">Status</TableHead>
              <TableHead className="text-seguranca-yellow font-semibold w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee, index) => (
              <TableRow
                key={employee.id}
                className={`border-gray-600/30 hover:bg-seguranca-black/30 transition-all duration-200 group ${selectedIds.includes(employee.id) ? 'bg-seguranca-red/5' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell className="py-4">
                  <Checkbox
                    checked={selectedIds.includes(employee.id)}
                    onCheckedChange={(checked) => onSelect(employee.id, !!checked)}
                    className="border-gray-500 data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red"
                  />
                </TableCell>
                <TableCell className="py-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer group/name"
                    onClick={() => onViewDetails(employee)}
                  >
                    <div className="mt-1 p-2 rounded-lg bg-seguranca-red/10 border border-seguranca-red/20 group-hover:bg-seguranca-red/20 group-hover/name:border-seguranca-red/50 transition-colors">
                      <User className="h-5 w-5 text-seguranca-red" />
                    </div>
                    <div>
                      <div className="font-semibold text-seguranca-lightgray group-hover:text-white group-hover/name:text-seguranca-yellow transition-colors">
                        {employee.name}
                      </div>
                      {employee.registrationNumber && (
                        <div className="text-sm text-gray-400 mt-1 font-mono">
                          Mat: {employee.registrationNumber}
                        </div>
                      )}
                      {employee.cpf && (
                        <div className="text-sm text-gray-500 mt-1 font-mono">
                          CPF: {employee.cpf}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {employee.position?.name && (
                      <div className="flex items-center gap-2 text-sm text-seguranca-lightgray">
                        <Building className="h-4 w-4 text-gray-400" />
                        {employee.position.name}
                      </div>
                    )}
                    {employee.position?.description && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Briefcase className="h-4 w-4" />
                        {employee.position.description}
                      </div>
                    )}
                    {!employee.position?.name && !employee.position?.description && (
                      <span className="text-gray-500 italic text-sm">Não definido</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-seguranca-lightgray">
                    {employee.company?.sigla ? (
                      <>
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="truncate max-w-[200px] font-semibold">{employee.company.sigla}</span>
                      </>
                    ) : (
                      <span className="text-gray-500 italic text-sm">Não definido</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-seguranca-lightgray">
                    {(() => {
                      // Priorizar workPost, depois department (NÃO exibir unit)
                      const workPostName = employee.workPost?.name;
                      const departmentName = (employee as any).department?.name;
                      const displayName = workPostName || departmentName;
                      return displayName ? (
                        <>
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="truncate max-w-[200px]">{displayName}</span>
                        </>
                      ) : (
                        <span className="text-gray-500 italic text-sm">Não definido</span>
                      );
                    })()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-seguranca-lightgray">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(employee.hireDate)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-seguranca-lightgray">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(employee.terminationDate)}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(employee.status || 'INACTIVE')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(employee)}
                      className="h-8 w-8 p-0 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 hover:bg-seguranca-red/20 hover:text-seguranca-red transition-colors"
                        >
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-seguranca-black border-gray-600 w-56 p-1 bg-clip-padding backdrop-blur-xl"
                      >
                        <DropdownMenuItem
                          onClick={() => onViewDetails(employee)}
                          className="text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEdit(employee)}
                          className="text-seguranca-lightgray hover:bg-seguranca-graphite hover:text-white cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Funcionário
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onViewDocuments(employee)}
                          className="text-seguranca-yellow hover:bg-seguranca-yellow/20 hover:text-seguranca-yellow cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Ver Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onViewDependents(employee)}
                          className="text-green-400 hover:bg-green-500/20 hover:text-green-300 cursor-pointer"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Ver Dependentes
                        </DropdownMenuItem>
                        {employee.status !== 'TERMINATED' && (
                          <DropdownMenuItem
                            onClick={() => onTerminate(employee)}
                            className="text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 cursor-pointer"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Demitir Funcionário
                          </DropdownMenuItem>
                        )}
                        {employee.status === 'TERMINATED' && (
                          <DropdownMenuItem
                            onClick={() => onDelete(employee)}
                            className="text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Funcionário
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View - Cards */}
      <div className="lg:hidden space-y-3">
        {employees.map((employee, index) => (
          <Card
            key={employee.id}
            onClick={() => isMobileSelectionMode ? onSelect(employee.id, !selectedIds.includes(employee.id)) : onViewDetails(employee)}
            className={`bg-seguranca-black/50 border-gray-600/30 hover:border-seguranca-red/50 transition-all duration-300 overflow-hidden group relative
              ${selectedIds.includes(employee.id) ? 'ring-1 ring-seguranca-red border-seguranca-red/50 bg-seguranca-red/5' : ''}
              cursor-pointer active:scale-[0.98]`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {isMobileSelectionMode && (
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedIds.includes(employee.id)}
                  onCheckedChange={(checked) => onSelect(employee.id, !!checked)}
                  className="border-gray-500 data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red h-5 w-5"
                />
              </div>
            )}

            <div className={`p-3 space-y-2 ${isMobileSelectionMode ? 'pl-10' : ''}`}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-1.5 rounded-lg bg-seguranca-red/10 border border-seguranca-red/20 group-hover:bg-seguranca-red/20 transition-colors flex-shrink-0">
                    <User className="h-4 w-4 text-seguranca-red" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-seguranca-lightgray group-hover:text-seguranca-yellow transition-colors truncate text-sm">
                      {employee.name}
                    </h3>
                    {employee.registrationNumber && (
                      <p className="text-[10px] text-gray-500 font-mono">
                        Mat: {employee.registrationNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 scale-75 origin-right">
                  {getStatusBadge(employee.status || 'INACTIVE')}
                </div>
              </div>

              {/* Info Grid - Compact */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                {employee.position?.name && (
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                    <Briefcase className="h-3 w-3 flex-shrink-0 text-seguranca-yellow/70" />
                    <span className="truncate">{employee.position.name}</span>
                  </div>
                )}
                {employee.company?.sigla && (
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                    <Building className="h-3 w-3 flex-shrink-0 text-blue-400/70" />
                    <span className="truncate font-medium">{employee.company.sigla}</span>
                  </div>
                )}
                {(() => {
                  const displayName = employee.workPost?.name || (employee as any).department?.name;
                  return displayName ? (
                    <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                      <MapPin className="h-3 w-3 flex-shrink-0 text-red-400/70" />
                      <span className="truncate">{displayName}</span>
                    </div>
                  ) : null;
                })()}
                {employee.hireDate && (
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                    <Calendar className="h-3 w-3 flex-shrink-0 text-green-400/70" />
                    <span>{formatDate(employee.hireDate)}</span>
                  </div>
                )}
              </div>

              {/* Status Specific Messages inside footer if not selected */}
              {!isMobileSelectionMode && (
                <div className="pt-2 border-t border-gray-600/20 flex items-center justify-between">
                  <div className="flex-1">
                    {employee.status !== 'TERMINATED' ? (
                      <span className="text-[10px] text-orange-400/80 flex items-center">
                        <AlertCircle className="h-2.5 w-2.5 mr-1" />
                        Demitir para excluir
                      </span>
                    ) : (
                      <span className="text-[10px] text-green-400/80 flex items-center">
                        ✅ Elegível para exclusão
                      </span>
                    )}
                  </div>

                  {/* Desktop-like inline actions for mobile when not in selection mode */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onViewDetails(employee); }}
                      className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onEdit(employee); }}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-seguranca-black border-gray-600">
                        <DropdownMenuItem onClick={() => onViewDetails(employee)} className="text-blue-400 text-xs">
                          <Eye className="mr-2 h-3.5 w-3.5" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewDocuments(employee)} className="text-seguranca-yellow text-xs">
                          <FileText className="mr-2 h-3.5 w-3.5" /> Documentos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewDependents(employee)} className="text-green-400 text-xs">
                          <UserPlus className="mr-2 h-3.5 w-3.5" /> Dependentes
                        </DropdownMenuItem>
                        {employee.status !== 'TERMINATED' && (
                          <DropdownMenuItem onClick={() => onTerminate(employee)} className="text-orange-400 text-xs">
                            <UserMinus className="mr-2 h-3.5 w-3.5" /> Demitir
                          </DropdownMenuItem>
                        )}
                        {employee.status === 'TERMINATED' && (
                          <DropdownMenuItem onClick={() => onDelete(employee)} className="text-red-400 text-xs">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

