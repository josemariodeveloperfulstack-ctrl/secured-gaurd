import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal, Edit, Trash2, Eye, User, Mail, Phone, MapPin,
  Calendar, Building, FileText, UserPlus, AlertCircle, UserMinus, Briefcase, QrCode
} from 'lucide-react';
import { Employee } from '@/types/employee';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate as formatDatePtBr, formatCPF } from '@/utils/formatters';

interface FuncionariosTableProps {
  employees: Employee[];
  /** IDs com solicitação de admissão PENDING/APPROVED vinculada ao cadastro */
  pendingAdmissionEmployeeIds?: Set<string>;
  /** IDs com solicitação de demissão PENDING/APPROVED vinculada ao cadastro */
  pendingDismissalEmployeeIds?: Set<string>;
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onTerminate: (employee: Employee) => void;
  onViewDocuments: (employee: Employee) => void;
  onViewDependents: (employee: Employee) => void;
  onViewDetails: (employee: Employee) => void;
  /** Abre o modal de crachá/QR Code do funcionário. Opcional para compatibilidade. */
  onViewQrCode?: (employee: Employee) => void;
  isLoading?: boolean;
  isMobileSelectionMode?: boolean;
  sortKey?: 'name' | 'position' | 'company' | 'workPost' | 'hireDate' | 'terminationDate' | 'status' | 'escalaTrabalho' | 'horarioTrabalho';
  sortDir?: 'asc' | 'desc';
  onSort?: (key: 'name' | 'position' | 'company' | 'workPost' | 'hireDate' | 'terminationDate' | 'status' | 'escalaTrabalho' | 'horarioTrabalho') => void;
}

export const FuncionariosTable: React.FC<FuncionariosTableProps> = ({
  employees,
  pendingAdmissionEmployeeIds,
  pendingDismissalEmployeeIds,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onTerminate,
  onViewDocuments,
  onViewDependents,
  onViewDetails,
  onViewQrCode,
  isLoading = false,
  isMobileSelectionMode = false,
  sortKey = 'name',
  sortDir = 'asc',
  onSort
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; dot: string; className: string }> = {
      'ACTIVE': {
        label: 'Ativo',
        dot: 'bg-emerald-400',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      },
      'INACTIVE': {
        label: 'Inativo',
        dot: 'bg-gray-400',
        className: 'bg-gray-500/15 text-gray-300 border-gray-500/30'
      },
      'VACATION': {
        label: 'Férias',
        dot: 'bg-sky-400',
        className: 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      },
      'MATERNITY_LEAVE': {
        label: 'Licença Maternidade',
        dot: 'bg-pink-400',
        className: 'bg-pink-500/15 text-pink-300 border-pink-500/30'
      },
      'MEDICAL_CERTIFICATE': {
        label: 'Atestado',
        dot: 'bg-indigo-400',
        className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      },
      'TERMINATED': {
        label: 'Demitido',
        dot: 'bg-rose-400',
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      },
      'SUSPENDED': {
        label: 'Suspenso',
        dot: 'bg-amber-400',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      },
      'SUB_JUDICE': {
        label: 'Sub Júdice',
        dot: 'bg-amber-400',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
      },
      'INSS_LEAVE': {
        label: 'Afastamento INSS',
        dot: 'bg-blue-400',
        className: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      },
      'UNEXCUSED_ABSENCE': {
        label: 'Abandono / Falta',
        dot: 'bg-rose-500',
        className: 'bg-rose-600/20 text-rose-300 border-rose-500/40'
      }
    };

    const config = statusConfig[status] || statusConfig['INACTIVE'];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${config.className}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot} shrink-0`} />
        {config.label}
      </span>
    );
  };

  /** Data de desligamento: mesma prioridade da edição (data de rescisão na ficha). */
  const terminationDateForDisplay = (e: Employee) => e.dataRescisao || e.terminationDate;

  /** Status efetivo para UI: com data de demissão → Demitido. */
  const effectiveEmploymentStatus = (e: Employee) =>
    terminationDateForDisplay(e) ? 'TERMINATED' : (e.status || 'INACTIVE');

  const isTerminatedEmployee = (e: Employee) =>
    e.status === 'TERMINATED' || !!terminationDateForDisplay(e);

  const renderHistoryBadges = (employee: Employee, isMobile = false) => {
    const badges = [];
    const isReadmitido = employee.isReadmitido || (employee.periodCount && employee.periodCount > 1) || employee.admissionType === 'READMISSAO';

    if (isReadmitido) {
      badges.push(
        <span
          key="readmitido"
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap ${
            isMobile ? 'text-[9px]' : ''
          }`}
        >
          Readmitido {employee.periodCount && employee.periodCount > 1 ? `(${employee.periodCount}º)` : ''}
        </span>
      );
    } else if (employee.periodCount && employee.periodCount > 1) {
      badges.push(
        <span
          key="vinculos"
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30 whitespace-nowrap ${
            isMobile ? 'text-[9px]' : ''
          }`}
        >
          {employee.periodCount} Vínculos
        </span>
      );
    }

    if (employee.admissionType === 'PROMOCAO' || employee.lastPromotionDate) {
      const promoLabel = employee.lastPromotionDate
        ? `Promovido (${formatDatePtBr(employee.lastPromotionDate)})`
        : 'Promovido';
      badges.push(
        <span
          key="promovido"
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap ${
            isMobile ? 'text-[9px]' : ''
          }`}
        >
          {promoLabel}
        </span>
      );
    }

    if (employee.previousStatus || employee.previousWorkPostName || employee.previousTerminationDate) {
      const prevDateStr = employee.previousTerminationDate ? formatDatePtBr(employee.previousTerminationDate) : null;
      const statusLabel = employee.previousStatus === 'TERMINATED' ? 'Demitido' : (employee.previousStatus || 'Vínculo anterior');

      badges.push(
        <div
          key="previous-status"
          className="flex items-center gap-1 text-[10px] text-gray-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-gray-700/50 leading-none max-w-[170px]"
          title={`Histórico anterior: ${statusLabel}${prevDateStr ? ` em ${prevDateStr}` : ''}${employee.previousWorkPostName ? ` (${employee.previousWorkPostName})` : ''}`}
        >
          <span className="text-gray-500">Ant:</span>
          <span className="text-gray-300 truncate font-medium">{statusLabel}</span>
          {prevDateStr && <span className="text-gray-400 font-mono text-[9px]">({prevDateStr})</span>}
        </div>
      );
    }

    return badges;
  };

  const getWorkPostsLabel = (employee: Employee) => {
    const wp = (employee.workPost as any)?.name;
    const wpId = (employee.workPost as any)?.id;
    const wps = (employee as any)?.workPosts;
    const deptName = (employee as any).department?.name;
    const unitName = (employee as any).unit?.name;

    if (Array.isArray(wps) && wps.length) {
      const names = wps.map((x: any) => x?.name).filter(Boolean);
      if (names.length) return names.join(', ');
    }

    if (wp) return wp;
    // Sem nome mas com id: FK órfã (posto apagado) ou resposta antiga — usar unidade/setor como pista
    if (wpId) {
      if (unitName) return `${unitName} (posto indisponível — atualize o cadastro)`;
      if (deptName) return `${deptName} (posto indisponível — atualize o cadastro)`;
      return 'Posto removido ou inexistente (atualize o cadastro)';
    }
    // Importação/legado: setor gravado em department quando não houve match com posto
    if (deptName) return deptName;
    if (unitName) return unitName;
    return null;
  };

  const SortHead = ({ k, children }: { k: NonNullable<FuncionariosTableProps['sortKey']>; children: React.ReactNode }) => {
    const active = sortKey === k;
    const arrow = active ? (sortDir === 'asc' ? '↑' : '↓') : '';
    return (
      <button
        type="button"
        onClick={() => onSort?.(k)}
        className={`inline-flex items-center gap-2 ${onSort ? 'hover:text-white' : ''} ${active ? 'text-white' : ''}`}
        title={
          k === 'hireDate' || k === 'terminationDate'
            ? 'Ordenar por data (primeiro clique: mais recente primeiro)'
            : 'Ordenar'
        }
      >
        <span>{children}</span>
        <span className="text-xs text-gray-400">{arrow}</span>
      </button>
    );
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
              <TableHead className="w-[40px] px-2 py-2">
                <Checkbox
                  checked={employees.length > 0 && selectedIds.length === employees.length}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  className="border-gray-500 data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red"
                />
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="name">Funcionário</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="position">Cargo/Função</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="company">Empresa</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="workPost">Setor de Trabalho</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="escalaTrabalho">Escala</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="horarioTrabalho">Horário</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="hireDate">Admissão</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="terminationDate">Demissão</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs px-2 py-2">
                <SortHead k="status">Status</SortHead>
              </TableHead>
              <TableHead className="text-seguranca-yellow font-semibold text-xs w-[90px] px-2 py-2">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee, index) => (
              <TableRow
                key={employee.id}
                className={`border-gray-600/30 hover:bg-seguranca-black/30 transition-all duration-200 group ${selectedIds.includes(employee.id) ? 'bg-seguranca-red/5' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TableCell className="py-1.5 px-2">
                  <Checkbox
                    checked={selectedIds.includes(employee.id)}
                    onCheckedChange={(checked) => onSelect(employee.id, !!checked)}
                    className="border-gray-500 data-[state=checked]:bg-seguranca-red data-[state=checked]:border-seguranca-red"
                  />
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div
                    className="flex items-start gap-2 cursor-pointer group/name"
                    onClick={() => onViewDetails(employee)}
                  >
                    <div className="mt-0.5 p-1 rounded-md bg-seguranca-red/10 border border-seguranca-red/20 group-hover:bg-seguranca-red/20 group-hover/name:border-seguranca-red/50 transition-colors">
                      <User className="h-3.5 w-3.5 text-seguranca-red" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-seguranca-lightgray group-hover:text-white group-hover/name:text-seguranca-yellow transition-colors leading-tight">
                        {(() => {
                          const name = employee.name?.trim();
                          const mat = employee.registrationNumber?.trim();
                          if (name && !/^\d+$/.test(name)) return name;
                          if (mat) return mat;
                          return <span className="italic text-gray-500">Nome não informado</span>;
                        })()}
                      </div>
                      {(employee.cpf || employee.registrationNumber || (employee as any).document) && (
                        <div className="text-[10px] text-gray-400 mt-0.5 font-mono leading-tight">
                          CPF: {formatCPF(employee.cpf || employee.registrationNumber || (employee as any).document)}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="space-y-0.5">
                    {employee.position?.name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-seguranca-lightgray leading-tight">
                        <Building className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{employee.position.name}</span>
                      </div>
                    )}
                    {employee.position?.description && (
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 leading-tight">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{employee.position.description}</span>
                      </div>
                    )}
                    {!employee.position?.name && !employee.position?.description && (
                      <span className="text-gray-500 italic text-[11px]">Não definido</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-seguranca-lightgray leading-tight">
                    {employee.company?.sigla ? (
                      <>
                        <Building className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[140px] font-semibold">{employee.company.sigla}</span>
                      </>
                    ) : (
                      <span className="text-gray-500 italic text-[11px]">Não definido</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex flex-col gap-0.5 text-[11px] text-seguranca-lightgray leading-tight">
                    {(() => {
                      const workPostsLabel = getWorkPostsLabel(employee);
                      return workPostsLabel ? (
                        <div className="flex items-center gap-1.5" title="Setor de Trabalho Atual">
                          <MapPin className="h-3 w-3 text-seguranca-yellow flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{workPostsLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5" title="Sem Setor de Trabalho">
                          <MapPin className="h-3 w-3 text-gray-500 flex-shrink-0" />
                          <span className="text-gray-500 italic text-[11px]">Sem setor</span>
                        </div>
                      );
                    })()}
                    {employee.previousWorkPostName && (
                      <div className="text-[10px] text-gray-400 pl-4 truncate max-w-[150px]" title={`Posto Anterior: ${employee.previousWorkPostName}`}>
                        Anterior: {employee.previousWorkPostName}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-1 text-[11px] text-seguranca-lightgray leading-tight">
                    {employee.escalaTrabalho ? (
                      <span className="truncate max-w-[110px]">{employee.escalaTrabalho}</span>
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">Não definida</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-1 text-[11px] text-seguranca-lightgray leading-tight">
                    {employee.horarioTrabalho ? (
                      <span className="truncate max-w-[110px]">{employee.horarioTrabalho}</span>
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">Não definido</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-1 text-[11px] text-seguranca-lightgray leading-tight whitespace-nowrap">
                    <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                    {formatDatePtBr(employee.hireDate)}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-1 text-[11px] text-seguranca-lightgray leading-tight whitespace-nowrap">
                    <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                    {formatDatePtBr(terminationDateForDisplay(employee))}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex flex-col gap-1 items-start justify-center min-w-[120px]">
                    {getStatusBadge(effectiveEmploymentStatus(employee))}
                    {renderHistoryBadges(employee)}
                    {pendingAdmissionEmployeeIds?.has(employee.id) && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 font-medium leading-tight">
                        Admissão em processo
                      </span>
                    )}
                    {pendingDismissalEmployeeIds?.has(employee.id) && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/40 text-orange-300 font-medium leading-tight">
                        Demissão em processo
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(employee)}
                      className="h-7 w-7 p-0 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                      title="Ver Detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-seguranca-red/20 hover:text-seguranca-red transition-colors"
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
                        {onViewQrCode && (
                          <DropdownMenuItem
                            onClick={() => onViewQrCode(employee)}
                            className="text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 cursor-pointer"
                          >
                            <QrCode className="mr-2 h-4 w-4" />
                            Crachá / QR Code
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onViewDependents(employee)}
                          className="text-green-400 hover:bg-green-500/20 hover:text-green-300 cursor-pointer"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Ver Dependentes
                        </DropdownMenuItem>
                        {!isTerminatedEmployee(employee) && (
                          <DropdownMenuItem
                            onClick={() => onTerminate(employee)}
                            className="text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 cursor-pointer"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Demitir Funcionário
                          </DropdownMenuItem>
                        )}
                        {isTerminatedEmployee(employee) && (
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
                      {(() => {
                        const name = employee.name?.trim();
                        const mat = employee.registrationNumber?.trim();
                        if (name && !/^\d+$/.test(name)) return name;
                        if (mat) return mat;
                        return 'Nome não informado';
                      })()}
                    </h3>
                    {(employee.cpf || employee.registrationNumber || (employee as any).document) && (
                      <p className="text-[10px] text-gray-500 font-mono">
                        CPF: {formatCPF(employee.cpf || employee.registrationNumber || (employee as any).document)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1 scale-90 origin-right max-w-[140px]">
                  {getStatusBadge(effectiveEmploymentStatus(employee))}
                  {pendingAdmissionEmployeeIds?.has(employee.id) && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/70 text-amber-300 whitespace-normal text-right leading-tight">
                      Admissão em processo
                    </Badge>
                  )}
                  {pendingDismissalEmployeeIds?.has(employee.id) && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-orange-500/70 text-orange-300 whitespace-normal text-right leading-tight">
                      Demissão em processo
                    </Badge>
                  )}
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
                  const workPostsLabel = getWorkPostsLabel(employee);
                  return workPostsLabel ? (
                    <div className="flex items-center gap-1.5 text-gray-400 min-w-0" title="Setor de Trabalho">
                      <MapPin className="h-3 w-3 flex-shrink-0 text-seguranca-yellow/70" />
                      <span className="truncate">{workPostsLabel}</span>
                    </div>
                  ) : null;
                })()}
                {employee.escalaTrabalho && (
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0" title="Escala de Trabalho">
                    <Calendar className="h-3 w-3 flex-shrink-0 text-gray-500" />
                    <span className="truncate text-[10px]">{employee.escalaTrabalho}</span>
                  </div>
                )}
                {employee.horarioTrabalho && (
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0" title="Horário de Trabalho">
                    <Calendar className="h-3 w-3 flex-shrink-0 text-gray-500" />
                    <span className="truncate text-[10px]">{employee.horarioTrabalho}</span>
                  </div>
                )}
                {employee.hireDate && (
                  <div className="flex items-center gap-1.5 text-gray-400 min-w-0">
                    <Calendar className="h-3 w-3 flex-shrink-0 text-green-400/70" />
                    <span>{formatDatePtBr(employee.hireDate)}</span>
                  </div>
                )}
              </div>

              {/* Status Specific Messages inside footer if not selected */}
              {!isMobileSelectionMode && (
                <div className="pt-2 border-t border-gray-600/20 flex items-center justify-between">
                  <div className="flex-1">
                    {!isTerminatedEmployee(employee) ? (
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
                        {!isTerminatedEmployee(employee) && (
                          <DropdownMenuItem onClick={() => onTerminate(employee)} className="text-orange-400 text-xs">
                            <UserMinus className="mr-2 h-3.5 w-3.5" /> Demitir
                          </DropdownMenuItem>
                        )}
                        {isTerminatedEmployee(employee) && (
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

