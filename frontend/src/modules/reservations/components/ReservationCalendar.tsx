import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isBefore,
  startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ReservationCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  // Opcional: Para mostrar puntitos si hay canchas ocupadas ese día (en el futuro se puede conectar)
  activeReservations?: { date: string }[];
}

export const ReservationCalendar: React.FC<ReservationCalendarProps> = ({ 
  selectedDate, 
  onSelectDate,
  activeReservations = [] 
}) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const today = startOfToday();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Generar la grilla del calendario
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={prevMonth} 
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-gray-400 hover:text-brand-gold"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-white uppercase tracking-widest serif-brand">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button 
          onClick={nextMonth} 
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-gray-400 hover:text-brand-gold"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); // Lunes como primer día

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-bold text-xs text-brand-gold uppercase tracking-widest py-2">
          {format(addDays(startDate, i), 'EEE', { locale: es }).substring(0, 3)}
        </div>
      );
    }

    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const isPast = isBefore(day, today) && !isToday;
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        const hasReservation = activeReservations.some(r => r.date === format(cloneDay, 'yyyy-MM-dd'));

        days.push(
          <div 
            key={day.toString()} 
            className="p-1 h-12 md:h-16 w-full"
          >
            <button
              onClick={() => {
                if (!isPast) {
                  onSelectDate(cloneDay);
                }
              }}
              disabled={isPast}
              className={`w-full h-full flex flex-col items-center justify-center rounded-xl transition-all relative
                ${!isCurrentMonth ? 'text-gray-600' : ''}
                ${isPast ? 'opacity-30 cursor-not-allowed' : 'hover:border-brand-gold/50 cursor-pointer'}
                ${isSelected 
                  ? 'bg-gradient-to-br from-brand-gold to-yellow-600 text-[#0a150e] shadow-glow scale-105 z-10 font-bold' 
                  : 'bg-[#131c26]/50 border border-white/5 text-gray-300 hover:bg-white/5'}
                ${isToday && !isSelected ? 'border-brand-green/50 text-brand-green font-bold' : ''}
              `}
            >
              <span className="text-sm md:text-base">{formattedDate}</span>
              
              {/* Dot indicator if has reservations */}
              {hasReservation && (
                <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0a150e]' : 'bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
              )}
            </button>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className="w-full">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
};
