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
  startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Reservation {
  id: string;
  date: string;
  status: string;
}

interface AdminReservationCalendarProps {
  reservations: Reservation[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export const AdminReservationCalendar: React.FC<AdminReservationCalendarProps> = ({ 
  reservations, 
  selectedDate,
  onSelectDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const today = startOfToday();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={prevMonth} 
          className="p-2 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-brand-green dark:text-brand-gold"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold theme-text uppercase tracking-widest serif-brand">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button 
          onClick={nextMonth} 
          className="p-2 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-brand-green dark:text-brand-gold"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { weekStartsOn: 1 }); 

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-center font-bold text-sm text-gray-500 uppercase tracking-widest py-4 border-b border-gray-200 dark:border-white/10">
          {format(addDays(startDate, i), 'EEEE', { locale: es })}
        </div>
      );
    }

    return <div className="grid grid-cols-7">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const formattedDate = format(day, 'd');
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isToday = isSameDay(day, today);
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        // Count reservations for this day
        const dayStr = format(cloneDay, 'yyyy-MM-dd');
        const dayReservations = reservations.filter(r => r.date === dayStr);
        const pendingCount = dayReservations.filter(r => r.status === 'PENDING').length;
        const approvedCount = dayReservations.filter(r => r.status === 'APPROVED').length;

        days.push(
          <div 
            key={day.toString()} 
            onClick={() => onSelectDate(isSelected ? null : cloneDay)}
            className={`min-h-[100px] border-r border-b border-gray-200 dark:border-white/5 p-2 transition-all cursor-pointer relative
              ${!isCurrentMonth ? 'opacity-30 bg-gray-50 dark:bg-black/20' : 'hover:bg-brand-green/5 dark:hover:bg-white/5'}
              ${isSelected ? 'bg-brand-gold/10 border-brand-gold/50 shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]' : ''}
              ${isToday && !isSelected ? 'bg-brand-green/5' : ''}
            `}
          >
            <div className={`font-bold text-sm mb-2 ${isToday ? 'text-brand-green' : isSelected ? 'text-brand-gold' : 'text-gray-500 dark:text-gray-400'}`}>
              {formattedDate}
            </div>
            
            <div className="space-y-1">
              {pendingCount > 0 && (
                <div className="text-[10px] font-bold px-2 py-1 bg-amber-500/20 text-amber-400 rounded-md">
                  {pendingCount} Pendientes
                </div>
              )}
              {approvedCount > 0 && (
                <div className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md">
                  {approvedCount} Aprobadas
                </div>
              )}
            </div>
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
    return <div className="border-l border-t border-gray-200 dark:border-white/5">{rows}</div>;
  };

  return (
    <div className="w-full">
      {renderHeader()}
      <div className="bg-white dark:bg-black/20 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
};
