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
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] bg-seguranca-graphite border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Visitas do dia - {formatDate(date)}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {visits.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma visita agendada para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visits.map((visit) => (
                <Card
                  key={visit.id}
                  className="bg-seguranca-black border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => {
                    onVisitClick(visit);
                    onOpenChange(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-semibold text-lg">
                            {visit.workPostName || visit.location || 'Visita sem local'}
                          </h3>
                          {getStatusBadge(visit.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {visit.visitTime && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Clock className="w-4 h-4 text-seguranca-yellow" />
                              <span className="font-medium">{formatTime(visit.visitTime)}</span>
                            </div>
                          )}

                          {visit.location && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              <span>{visit.location}</span>
                            </div>
                          )}

                          {visit.clientName && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Building className="w-4 h-4 text-green-400" />
                              <span>{visit.clientName}</span>
                            </div>
                          )}

                          {visit.supervisorName && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <User className="w-4 h-4 text-purple-400" />
                              <span>Supervisor: {visit.supervisorName}</span>
                            </div>
                          )}
                        </div>

                        {visit.observations && (
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                            {visit.observations}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-seguranca-yellow hover:text-seguranca-yellow/80 hover:bg-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          onVisitClick(visit);
                          onOpenChange(false);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-700">
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-seguranca-graphite border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayVisitsModal;







