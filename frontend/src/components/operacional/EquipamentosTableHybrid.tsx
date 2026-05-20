import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  UserX, 
  UserPlus, 
  QrCode, 
  Trash2,
  MoreVertical,
  Calendar,
  User,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import './EquipamentosTable.css';
import AssignEquipmentModal from '../equipamentos/AssignEquipmentModal';
import UnassignEquipmentModal from '../equipamentos/UnassignEquipmentModal';

import {
  Equipment,
  EquipmentType,
  EquipmentStatus,
  EquipmentSize,
  ProtectionLevel,
  EQUIPMENT_STATUS_LABELS,
  PROTECTION_LEVEL_LABELS,
  EQUIPMENT_TYPE_LABELS
} from '@/types/equipment';

interface EquipamentosTableHybridProps {
  equipments: Equipment[];
  loading?: boolean;
  onSearch?: (term: string) => void;
  onView?: (equipment: Equipment) => void;
  onEdit?: (equipment: Equipment) => void;
  onAssignUser?: (equipment: Equipment) => void;
  onRemoveUser?: (equipment: Equipment) => void;
  onQRCode?: (equipment: Equipment) => void;
  onDelete?: (equipment: Equipment) => void;
  onCreate?: () => void;
  onReport?: () => void;
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'EM_ESTOQUE':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'EM_USO':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'EM_MANUTENCAO':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'BAIXADO':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200';
  }
};

const getTypeBadgeColor = (type?: EquipmentType) => {
  switch (type) {
    case EquipmentType.ARMA:
      return 'bg-red-50 text-red-700 border border-red-200';
    case EquipmentType.COLETE:
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case EquipmentType.MUNICAO:
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-700 border border-slate-200';
  }
};

const getDaysToExpiryColor = (days?: number) => {
  if (days === undefined || days === null) return 'text-muted-foreground';
  if (days < 0) return 'text-destructive font-bold';
  if (days <= 30) return 'text-orange-600 font-bold';
  return 'text-green-600 font-semibold';
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const EquipamentosTableHybrid: React.FC<EquipamentosTableHybridProps> = ({
  equipments,
  loading = false,
  onSearch,
  onView,
  onEdit,
  onAssignUser,
  onRemoveUser,
  onQRCode,
  onDelete,
  onCreate,
  onReport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [unassignModalOpen, setUnassignModalOpen] = useState(false);
  const [selectedEquipmentForAssign, setSelectedEquipmentForAssign] = useState<Equipment | null>(null);
  const [selectedEquipmentForUnassign, setSelectedEquipmentForUnassign] = useState<Equipment | null>(null);

  const handleSearch = () => {
    onSearch?.(searchTerm);
  };

  const handleAssignEquipment = (equipment: Equipment) => {
    setSelectedEquipmentForAssign(equipment);
    setAssignModalOpen(true);
  };

  const handleUnassignEquipment = (equipment: Equipment) => {
    setSelectedEquipmentForUnassign(equipment);
    setUnassignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    // Recarregar a lista de equipamentos ou atualizar o estado
    // Aqui você pode chamar uma função de callback para atualizar os dados
    console.log('Equipamento atribuído com sucesso');
  };

  const handleUnassignSuccess = () => {
    // Recarregar a lista de equipamentos ou atualizar o estado
    console.log('Atribuição de equipamento removida com sucesso');
  };

  const toggleRowExpansion = (equipmentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(equipmentId)) {
      newExpanded.delete(equipmentId);
    } else {
      newExpanded.add(equipmentId);
    }
    setExpandedRows(newExpanded);
  };

  const isExpanded = (equipmentId: string) => expandedRows.has(equipmentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando equipamentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca e ações */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por número de série, modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} variant="outline" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          {onReport && (
            <Button onClick={onReport} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
          )}
          {onCreate && (
            <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          )}
        </div>
      </div>

      {/* Tabela híbrida - Desktop/Tablet */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <div className="equipment-table-container overflow-x-auto">
            <table className="equipment-table w-full">
              <thead className="border-b bg-gray-50">
                <tr className="text-left">
                  <th className="p-4 font-medium text-gray-700">Tipo</th>
                  <th className="p-4 font-medium text-gray-700">Nº Série / Lote</th>
                  <th className="p-4 font-medium text-gray-700">Especificações / Detalhes</th>
                  <th className="p-4 font-medium text-gray-700">🏢 Localização</th>
                  <th className="p-4 font-medium text-gray-700">Status</th>
                  <th className="p-4 font-medium text-gray-700">Usuário</th>
                  <th className="p-4 font-medium text-gray-700">Validade</th>
                  <th className="p-4 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {equipments.map((equipment) => (
                  <tr key={equipment.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <Badge className={getTypeBadgeColor(equipment.type)}>
                        {EQUIPMENT_TYPE_LABELS[equipment.type || EquipmentType.COLETE]}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-sm font-medium">{equipment.serialNumber}</td>
                    <td className="p-4 text-sm">
                      {equipment.type === EquipmentType.ARMA ? (
                        <div>
                          <span className="font-semibold text-slate-700">{equipment.model || '-'}</span>
                          <div className="text-xs text-slate-500">
                            Registro: {equipment.weaponRegistration || '-'} • {equipment.shotsQuantity ? `${equipment.shotsQuantity} Tiros` : '-'}
                          </div>
                        </div>
                      ) : equipment.type === EquipmentType.MUNICAO ? (
                        <div>
                          <span className="font-semibold text-slate-700">{equipment.model || 'Munição'}</span>
                          <div className="text-xs text-slate-500">
                            Calibre: {equipment.caliber || '-'} • Quantidade: {equipment.quantity || '0'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-slate-700">{equipment.model || 'Colete'}</span>
                          <div className="text-xs text-slate-500">
                            Tam: {equipment.size || '-'} • CA: {equipment.caNumber || '-'} • Lote: {equipment.batch || '-'}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {equipment.workPostName ? (
                        <span className="text-blue-600 font-semibold">{equipment.workPostName}</span>
                      ) : (
                        <span className="text-slate-500 italic">🏢 Cofre da Empresa</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusBadgeColor(equipment.status)}>
                        {EQUIPMENT_STATUS_LABELS[equipment.status]}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-32">
                          {equipment.currentUserName || 'Não atribuído'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className={cn("font-medium", getDaysToExpiryColor(equipment.daysToExpiry))}>
                            {equipment.validityDate 
                              ? formatDate(equipment.validityDate)
                              : '-'
                            }
                          </div>
                          {equipment.type === EquipmentType.ARMA && equipment.weaponRegistrationValidity && (
                            <div className="text-[10px] text-amber-600 font-medium">
                              Reg: {formatDate(equipment.weaponRegistrationValidity)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {onView && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onView(equipment)}
                            title="Ver histórico"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onEdit(equipment)}
                            title="Editar"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Menu de ações adicionais */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {equipment.currentUserId ? (
                              <DropdownMenuItem onClick={() => handleUnassignEquipment(equipment)}>
                                <UserX className="h-4 w-4 mr-2" />
                                Remover Usuário
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAssignEquipment(equipment)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Atribuir Usuário
                              </DropdownMenuItem>
                            )}
                            {onQRCode && (
                              <DropdownMenuItem onClick={() => onQRCode(equipment)}>
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Code
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={() => onDelete(equipment)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cards móveis - Mobile/Tablet pequeno */}
      <div className="lg:hidden space-y-3">
        {equipments.map((equipment) => (
          <Card key={equipment.id} className="equipment-card overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getTypeBadgeColor(equipment.type)}>
                      {EQUIPMENT_TYPE_LABELS[equipment.type || EquipmentType.COLETE]}
                    </Badge>
                    <CardTitle className="text-sm font-semibold truncate font-mono">
                      {equipment.serialNumber}
                    </CardTitle>
                  </div>
                  <p className="text-sm text-gray-700 font-medium truncate">
                    {equipment.model || 'Sem modelo'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Badge className={getStatusBadgeColor(equipment.status)}>
                    {EQUIPMENT_STATUS_LABELS[equipment.status]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRowExpansion(equipment.id)}
                    className="h-8 w-8 p-0"
                  >
                    {isExpanded(equipment.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Informações principais - sempre visíveis */}
            <CardContent className="pt-0">
              <div className="equipment-info-grid grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Usuário:</span>
                  <span className="font-medium truncate">
                    {equipment.currentUserName || 'Não atribuído'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Localização:</span>
                  <span className="font-semibold text-blue-600 truncate">
                    {equipment.workPostName || 'Cofre'}
                  </span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Validade:</span>
                  <span className={cn(
                    "font-medium",
                    getDaysToExpiryColor(equipment.daysToExpiry)
                  )}>
                    {equipment.validityDate 
                      ? formatDate(equipment.validityDate)
                      : '-'
                    }
                  </span>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {isExpanded(equipment.id) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-slate-800">Especificações por Tipo</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {equipment.type === EquipmentType.ARMA && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nº Registro:</span>
                              <span className="font-medium">{equipment.weaponRegistration || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Validade Reg:</span>
                              <span className="font-medium">
                                {equipment.weaponRegistrationValidity ? formatDate(equipment.weaponRegistrationValidity) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Qtda. Tiros:</span>
                              <span className="font-medium">{equipment.shotsQuantity || '-'}</span>
                            </div>
                          </>
                        )}
                        {equipment.type === EquipmentType.COLETE && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nível de Proteção:</span>
                              <span className="font-medium">
                                {equipment.protectionLevel ? PROTECTION_LEVEL_LABELS[equipment.protectionLevel] : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tamanho:</span>
                              <span className="font-medium">{equipment.size || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Certificado (CA):</span>
                              <span className="font-medium">{equipment.caNumber || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Placa Balística:</span>
                              <span className="font-medium">{equipment.ballisticPlate || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lote:</span>
                              <span className="font-medium">{equipment.batch || '-'}</span>
                            </div>
                          </>
                        )}
                        {equipment.type === EquipmentType.MUNICAO && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Calibre:</span>
                              <span className="font-medium">{equipment.caliber || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Quantidade total:</span>
                              <span className="font-medium">{equipment.quantity || '0'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lote:</span>
                              <span className="font-medium">{equipment.batch || '-'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="mt-4 pt-4 border-t">
                <div className="equipment-actions flex flex-wrap gap-2">
                  {onView && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onView(equipment)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                  )}
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(equipment)}
                      className="flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  
                  {/* Menu de ações adicionais */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                        <MoreVertical className="h-4 w-4 mr-2" />
                        Mais
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {equipment.currentUserId ? (
                        <DropdownMenuItem onClick={() => handleUnassignEquipment(equipment)}>
                          <UserX className="h-4 w-4 mr-2" />
                          Remover Usuário
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleAssignEquipment(equipment)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Atribuir Usuário
                        </DropdownMenuItem>
                      )}
                      {onQRCode && (
                        <DropdownMenuItem onClick={() => onQRCode(equipment)}>
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem 
                          onClick={() => onDelete(equipment)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estado vazio */}
      {equipments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum equipamento encontrado</h3>
            <p className="text-gray-500 text-center mb-4">
              {searchTerm 
                ? 'Tente ajustar os filtros de busca para encontrar o que procura.'
                : 'Comece adicionando um novo equipamento ao sistema.'
              }
            </p>
            {onCreate && (
              <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Equipamento
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de atribuição de equipamento */}
      <AssignEquipmentModal
        equipment={selectedEquipmentForAssign}
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedEquipmentForAssign(null);
        }}
        onSuccess={handleAssignSuccess}
      />

      {/* Modal de remoção de atribuição de equipamento */}
      <UnassignEquipmentModal
        equipment={selectedEquipmentForUnassign}
        isOpen={unassignModalOpen}
        onClose={() => {
          setUnassignModalOpen(false);
          setSelectedEquipmentForUnassign(null);
        }}
        onSuccess={handleUnassignSuccess}
      />
    </div>
  );
};

export default EquipamentosTableHybrid;
