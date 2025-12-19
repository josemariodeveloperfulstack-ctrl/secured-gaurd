import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, MapPin, Clock, User, Building, Calendar } from 'lucide-react';
import { Visit } from '@/types/visit';

interface DayVisitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visits: Visit[];
  date: Date;
  onVisitClick: (visit: Visit) => void;
}

const DayVisitsModal: React.FC<DayVisitsModalProps> = ({
  open,
  onOpenChange,
  visits,
  date,
  onVisitClick,
}) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { label: 'Pendente', className: 'bg-blue-500 text-white' },
      SCHEDULED: { label: 'Agendada', className: 'bg-blue-500 text-white' },
      IN_PROGRESS: { label: 'Em Andamento', className: 'bg-yellow-500 text-white' },
      COMPLETED: { label: 'Concluída', className: 'bg-green-500 text-white' },
      NOT_COMPLETED: { label: 'Não Realizada', className: 'bg-gray-500 text-white' },
      CANCELLED: { label: 'Cancelada', className: 'bg-red-500 text-white' },
      MISSED: { label: 'Não Realizada', className: 'bg-gray-500 text-white' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status || 'Desconhecido',
      className: 'bg-gray-500 text-white',
    };

    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return 'N/A';
    try {
      // Se for apenas hora (HH:mm), retornar como está
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        return timeString;
      }
      // Se for uma data completa, extrair apenas a hora
      const date = new Date(timeString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] sm:max-h-[80vh] bg-seguranca-graphite border-gray-700 p-4 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="text-white flex flex-col sm:flex-row items-start sm:items-center gap-2 text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Visitas do dia - </span>
              <span className="sm:hidden">Visitas - </span>
            </div>
            <span className="text-sm sm:text-base">{formatDate(date)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(90vh-180px)] sm:max-h-[60vh] overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          {visits.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">Nenhuma visita agendada para este dia</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {visits.map((visit) => (
                <Card
                  key={visit.id}
                  className="bg-seguranca-black border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => {
                    onVisitClick(visit);
                    onOpenChange(false);
                  }}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h3 className="text-white font-semibold text-sm sm:text-lg truncate">
                            {visit.workPostName || visit.location || 'Visita sem local'}
                          </h3>
                          <div className="flex-shrink-0">
                            {getStatusBadge(visit.status)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                          {visit.visitTime && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-seguranca-yellow flex-shrink-0" />
                              <span className="font-medium truncate">{formatTime(visit.visitTime)}</span>
                            </div>
                          )}

                          {visit.location && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
                              <span className="truncate">{visit.location}</span>
                            </div>
                          )}

                          {visit.clientName && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                              <span className="truncate">{visit.clientName}</span>
                            </div>
                          )}

                          {visit.supervisorName && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 flex-shrink-0" />
                              <span className="truncate">
                                <span className="hidden sm:inline">Supervisor: </span>
                                {visit.supervisorName}
                              </span>
                            </div>
                          )}
                        </div>

                        {visit.observations && (
                          <p className="text-xs sm:text-sm text-gray-400 mt-2 line-clamp-2">
                            {visit.observations}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-seguranca-yellow hover:text-seguranca-yellow/80 hover:bg-gray-800 w-full sm:w-auto self-stretch sm:self-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVisitClick(visit);
                          onOpenChange(false);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="text-xs sm:text-sm">Ver Detalhes</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 sm:pt-4 border-t border-gray-700 mt-4">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-seguranca-graphite border-gray-600 text-gray-300 hover:bg-gray-700 w-full sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayVisitsModal;












