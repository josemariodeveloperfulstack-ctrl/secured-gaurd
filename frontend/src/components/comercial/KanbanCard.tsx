import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  User,
  Building2,
  Calendar,
  Mail,
  Phone,
  Target,
  Clock,
  XCircle,
  Edit,
  Eye,
  MessageSquare,
  Send,
  GripVertical,
} from 'lucide-react';

interface Lead {
  id: string | number | null;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'NEGOTIATION' | 'WON' | 'LOST';
  source: string;
  value: number;
  createdAt: string;
}

interface Opportunity {
  id: string | number;
  title: string;
  description: string;
  statusId: string | number;
  lead: Lead;
  value: number;
  probability: number;
  expectedCloseDate: string;
  assignedTo: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  lastContact: string;
  tags: string[];
}

interface KanbanCardProps {
  opportunity: Opportunity;
  onEdit: (opp: Opportunity) => void;
  getPriorityColor: (priority: string) => string;
  getLeadStatusColor: (status: string) => string;
  getLeadStatusText: (status: string) => string;
  selected?: boolean;
  onSelect?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  onSendEmail?: (opp: Opportunity) => void;
  onSendWhatsApp?: (opp: Opportunity) => void;
  onSendMessage?: (opp: Opportunity) => void;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
  /** Preview flutuante do dnd-kit — card completo, sem listeners de drag. */
  isDragOverlay?: boolean;
}

/** Impede que botões/checkbox iniciem o drag do dnd-kit. */
function stopDragStart(e: React.SyntheticEvent) {
  e.stopPropagation();
}

export default function KanbanCard({
  opportunity,
  onEdit,
  getPriorityColor,
  getLeadStatusColor,
  getLeadStatusText,
  selected,
  onSelect,
  onDelete,
  onSendEmail,
  onSendWhatsApp,
  onSendMessage,
  formatCurrency,
  formatDate,
  isDragOverlay = false,
}: KanbanCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const didDragRef = useRef(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: isDragOverlay ? `overlay-${opportunity.id}` : String(opportunity.id),
    data: { opportunity },
    disabled: isDragOverlay,
  });

  useEffect(() => {
    if (isDragging) {
      didDragRef.current = true;
    }
  }, [isDragging]);

  // Com DragOverlay: o card original fica no lugar (invisível).
  // Não aplicar transform — evita corte pelo overflow da coluna.
  const style: React.CSSProperties = isDragOverlay
    ? {
        width: 308,
        cursor: 'grabbing',
        boxShadow: '0 24px 48px rgba(0,0,0,0.55)',
        backgroundColor: '#111827',
      }
    : {
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : undefined,
      };

  const getDaysUntilClose = () => {
    if (!opportunity.expectedCloseDate) return null;
    const closeDate = new Date(opportunity.expectedCloseDate);
    if (Number.isNaN(closeDate.getTime())) return null;
    const today = new Date();
    const diffTime = closeDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilCloseColor = () => {
    const days = getDaysUntilClose();
    if (days == null) return 'text-gray-400';
    if (days < 0) return 'text-red-500';
    if (days <= 7) return 'text-orange-500';
    if (days <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const daysUntilClose = getDaysUntilClose();

  return (
    <Card
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : { ...listeners, ...attributes })}
      className={`bg-seguranca-black border-gray-600 overflow-visible shadow-md ${
        isDragOverlay
          ? 'border-2 border-seguranca-yellow pointer-events-none cursor-grabbing'
          : 'hover:border-seguranca-yellow transition-colors cursor-grab active:cursor-grabbing'
      } ${
        selected && !isDragOverlay
          ? 'ring-2 ring-seguranca-yellow border-seguranca-yellow bg-seguranca-graphite'
          : ''
      } ${isDragging ? 'pointer-events-none' : ''}`}
      onClick={() => {
        if (isDragOverlay) return;
        // Clique após arrastar não deve alternar a seleção
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onSelect?.(opportunity.id);
      }}
      title={isDragOverlay ? undefined : 'Arraste o card para outra coluna ou clique para selecionar'}
    >
      <CardContent className="p-3 pb-3 space-y-3 overflow-visible">
        {/* Topo: grip + checkbox + excluir */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 text-gray-500 shrink-0" aria-hidden />
            <div onClick={stopDragStart} onPointerDown={stopDragStart}>
              <input
                type="checkbox"
                checked={!!selected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect?.(opportunity.id);
                }}
                onClick={stopDragStart}
                className="h-4 w-4 rounded border-gray-600 bg-seguranca-black text-seguranca-yellow focus:ring-seguranca-yellow cursor-pointer"
                aria-label={`Selecionar oportunidade ${opportunity.title}`}
              />
            </div>
            <Badge className={`${getPriorityColor(opportunity.priority)} text-white text-[10px] px-1.5 shrink-0`}>
              {opportunity.priority === 'URGENT'
                ? 'URGENTE'
                : opportunity.priority === 'HIGH'
                  ? 'ALTA'
                  : opportunity.priority === 'MEDIUM'
                    ? 'MÉDIA'
                    : 'BAIXA'}
            </Badge>
            <Badge className="bg-seguranca-yellow text-black text-[10px] px-1.5 shrink-0">
              {opportunity.probability}%
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={stopDragStart} onPointerDown={stopDragStart}>
            <span className="text-sm font-bold text-seguranca-yellow whitespace-nowrap">
              {formatCurrency(opportunity.value)}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(opportunity.id);
              }}
              className="h-7 w-7 text-gray-500 hover:text-red-500 hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Título */}
        <div>
          <h4 className="font-semibold text-seguranca-lightgray text-sm leading-snug break-words">
            {opportunity.title}
          </h4>
          {opportunity.description && (
            <p className="text-xs text-gray-400 mt-1 break-words line-clamp-2">{opportunity.description}</p>
          )}
        </div>

        {/* Lead */}
        {opportunity.lead && (
          <div className="p-2 bg-seguranca-graphite rounded-md space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-xs font-medium text-seguranca-lightgray truncate">
                  {opportunity.lead.name || 'Sem nome'}
                </span>
              </div>
              {opportunity.lead.status && (
                <Badge className={`${getLeadStatusColor(opportunity.lead.status)} text-white text-[10px] shrink-0`}>
                  {getLeadStatusText(opportunity.lead.status)}
                </Badge>
              )}
            </div>
            {opportunity.lead.company && (
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400 truncate">{opportunity.lead.company}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {opportunity.tags && opportunity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opportunity.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-[10px] border-gray-600 text-gray-400">
                {tag}
              </Badge>
            ))}
            {opportunity.tags.length > 3 && (
              <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400">
                +{opportunity.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadados */}
        <div className="space-y-1.5 text-xs text-gray-400">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="h-3 w-3" />
              Fechamento:
            </span>
            <span className={`${getDaysUntilCloseColor()} text-right break-all`}>
              {formatDate(opportunity.expectedCloseDate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 shrink-0">
              <User className="h-3 w-3" />
              Responsável:
            </span>
            <span className="text-seguranca-lightgray text-right truncate max-w-[55%]">
              {opportunity.assignedTo || 'Não atribuído'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="h-3 w-3" />
              Último contato:
            </span>
            <span className="text-right">{formatDate(opportunity.lastContact)}</span>
          </div>
        </div>

        {/* Ações principais */}
        <div
          className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700"
          onClick={stopDragStart}
          onPointerDown={stopDragStart}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(opportunity);
            }}
            className="h-8 border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black text-xs"
          >
            <Edit className="h-3 w-3 mr-1 shrink-0" />
            Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="h-8 border-gray-600 text-seguranca-lightgray hover:bg-seguranca-black text-xs"
          >
            <Eye className="h-3 w-3 mr-1 shrink-0" />
            Detalhes
          </Button>
        </div>

        {/* Contato — grid 3 colunas, texto completo sem corte */}
        <div
          className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-700/50"
          onClick={stopDragStart}
          onPointerDown={stopDragStart}
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSendEmail?.(opportunity);
            }}
            disabled={!opportunity.lead?.email}
            title={opportunity.lead?.email ? `E-mail: ${opportunity.lead.email}` : 'Lead sem e-mail'}
            className="h-auto min-h-[2.75rem] px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight text-gray-300 hover:text-seguranca-yellow hover:bg-seguranca-yellow/10 disabled:opacity-30"
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-normal text-center">E-mail</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSendWhatsApp?.(opportunity);
            }}
            disabled={!opportunity.lead?.phone}
            title={opportunity.lead?.phone ? `WhatsApp: ${opportunity.lead.phone}` : 'Lead sem telefone'}
            className="h-auto min-h-[2.75rem] px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight text-gray-300 hover:text-green-400 hover:bg-green-400/10 disabled:opacity-30"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-normal text-center">WhatsApp</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onSendMessage?.(opportunity);
            }}
            disabled={!opportunity.lead}
            title="Registrar mensagem no histórico"
            className="h-auto min-h-[2.75rem] px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 text-[10px] leading-tight text-gray-300 hover:text-blue-400 hover:bg-blue-400/10 disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-normal text-center">Mensagem</span>
          </Button>
        </div>

        {showDetails && opportunity.lead && (
          <div className="pt-3 border-t border-gray-700 space-y-3" onClick={stopDragStart} onPointerDown={stopDragStart}>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-400 mb-1">Fonte do Lead:</p>
                <p className="text-seguranca-lightgray break-words">
                  {(() => {
                    const source = opportunity.lead.source;
                    if (!source || source === 'Não informado') return 'Não informado';
                    const sourceMap: Record<string, string> = {
                      WEBSITE: 'Website',
                      REFERRAL: 'Indicação',
                      COLD_CALL: 'Ligação a Frio',
                      EMAIL_MARKETING: 'Email Marketing',
                      SOCIAL_MEDIA: 'Redes Sociais',
                      GOOGLE_ADS: 'Google Ads',
                      EVENT: 'Evento',
                      PARTNER: 'Parceiro',
                      OTHER: 'Outro',
                    };
                    if (typeof source === 'object' && (source as { displayName?: string }).displayName) {
                      return (source as { displayName: string }).displayName;
                    }
                    return sourceMap[String(source)] || String(source);
                  })()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Data de criação:</p>
                <p className="text-seguranca-lightgray">
                  {opportunity.lead.createdAt ? formatDate(opportunity.lead.createdAt) : 'Não disponível'}
                </p>
              </div>
            </div>

            {opportunity.lead.phone && (
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3 w-3 text-gray-400" />
                <span className="text-seguranca-lightgray">{opportunity.lead.phone}</span>
              </div>
            )}

            <div>
              <p className="text-gray-400 mb-1 text-xs">Dias até fechamento:</p>
              <div className="flex items-center gap-2">
                <Target className={`h-4 w-4 ${getDaysUntilCloseColor()}`} />
                <span className={`font-semibold ${getDaysUntilCloseColor()}`}>
                  {daysUntilClose == null ? '—' : `${daysUntilClose} dias`}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
