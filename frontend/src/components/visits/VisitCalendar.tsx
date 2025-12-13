import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VisitCalendarEvent } from '@/services/visitService';

interface VisitCalendarProps {
  events: VisitCalendarEvent[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick: (event: VisitCalendarEvent) => void;
  onDayClick?: (date: Date, events: VisitCalendarEvent[]) => void;
  loading?: boolean;
}

export const VisitCalendar: React.FC<VisitCalendarProps> = ({
  events,
  selectedDate,
  onDateChange,
  onEventClick,
  onDayClick,
  loading = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Função auxiliar para converter string de data (YYYY-MM-DD) para Date no timezone local
  // Isso evita problemas de timezone onde uma data pode aparecer no dia anterior
  const parseLocalDate = (dateString: string): Date => {
    // Se a data já está no formato YYYY-MM-DD, criar diretamente no timezone local
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    // Fallback para o método padrão
    return new Date(dateString);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Adicionar dias do mês anterior
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        events: []
      });
    }

    // Adicionar dias do mês atual
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dayEvents = events.filter(event => {
        const eventDate = parseLocalDate(event.date);
        return eventDate.getFullYear() === dayDate.getFullYear() &&
               eventDate.getMonth() === dayDate.getMonth() &&
               eventDate.getDate() === dayDate.getDate();
      });

      days.push({
        date: day,
        isCurrentMonth: true,
        isToday: dayDate.toDateString() === today.toDateString(),
        isSelected: dayDate.toDateString() === selectedDate.toDateString(),
        events: dayEvents
      });
    }

    // Adicionar dias do próximo mês para completar a grade
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        events: []
      });
    }

    return days;
  };

  const handlePreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
    onDateChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
    onDateChange(newMonth);
  };

  const handleDayClick = (day: any) => {
    if (day.isCurrentMonth) {
      const newDate = new Date(currentMonth);
      newDate.setDate(day.date);
      onDateChange(newDate);
      
      // Se houver callback onDayClick e o dia tiver eventos, chamá-lo
      if (onDayClick && day.events && day.events.length > 0) {
        onDayClick(newDate, day.events);
      } else if (onDayClick) {
        // Chamar mesmo sem eventos para mostrar que não há visitas
        onDayClick(newDate, []);
      }
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) {
      console.warn('⚠️ Status não definido, usando SCHEDULED como padrão');
      return 'bg-blue-500';
    }
    
    const normalizedStatus = status.toUpperCase();
    console.log('🎨 Obtendo cor para status:', normalizedStatus);
    
    switch (normalizedStatus) {
      case 'SCHEDULED':
        return 'bg-blue-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-red-500';
      case 'PENDING':
        return 'bg-blue-500'; // Mesma cor de SCHEDULED para compatibilidade
      case 'NOT_COMPLETED':
        return 'bg-gray-500';
      case 'MISSED':
        return 'bg-gray-500';
      default:
        console.warn('⚠️ Status desconhecido:', normalizedStatus, '- usando cinza');
        return 'bg-gray-500';
    }
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-4">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <h2 className="text-xl font-semibold text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Agendada</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Concluída</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Cancelada</span>
          </div>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div
            key={index}
            className={`
              min-h-[120px] p-2 border border-gray-700 cursor-pointer transition-colors
              ${day.isCurrentMonth ? 'bg-seguranca-graphite hover:bg-gray-700' : 'bg-seguranca-black text-gray-600'}
              ${day.isToday ? 'ring-2 ring-seguranca-yellow' : ''}
              ${day.isSelected ? 'bg-seguranca-yellow/20' : ''}
            `}
            onClick={() => handleDayClick(day)}
          >
            <div className="flex flex-col h-full">
              <div className={`
                text-sm font-medium mb-1
                ${day.isCurrentMonth ? 'text-white' : 'text-gray-600'}
                ${day.isToday ? 'text-seguranca-yellow font-bold' : ''}
              `}>
                {day.date}
              </div>
              
              <div className="flex-1 space-y-1">
                {day.events.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`
                      text-xs p-1 rounded cursor-pointer truncate
                      ${getStatusColor(event.status)}
                      text-white hover:opacity-80
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    title={`${event.title} - ${event.time}`}
                  >
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">{event.time}</span>
                    </div>
                    <div className="truncate">{event.workPost}</div>
                  </div>
                ))}
                
                {day.events.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{day.events.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seguranca-yellow"></div>
        </div>
      )}

      {/* Eventos do dia selecionado */}
      {selectedDate && (() => {
        const selectedDayEvents = events.filter(event => {
          const eventDate = parseLocalDate(event.date);
          return eventDate.getFullYear() === selectedDate.getFullYear() &&
                 eventDate.getMonth() === selectedDate.getMonth() &&
                 eventDate.getDate() === selectedDate.getDate();
        });

        return (
          <Card className="bg-seguranca-graphite border-gray-700">
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Visitas em {selectedDate.toLocaleDateString('pt-BR')}
              </h3>
              
              {selectedDayEvents.length === 0 ? (
                <p className="text-gray-400">Nenhuma visita agendada para este dia</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-seguranca-black rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(event.status)}`}></div>
                        <div>
                          <p className="text-white font-medium">{event.workPost}</p>
                          <p className="text-sm text-gray-400">{event.client}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-white font-medium">{event.time}</p>
                        <p className="text-sm text-gray-400">{event.supervisor}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
        );
      })()}
    </div>
  );
};