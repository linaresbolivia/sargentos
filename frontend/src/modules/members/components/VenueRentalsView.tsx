import React, { useState } from 'react';
import { 
  Building, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Plus, 
  Search, 
  CheckCircle2, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Filter, 
  Car, 
  UserCheck, 
  X,
  Sparkles,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onOpenCashier?: (personId: string) => void;
}

export const VenueRentalsView: React.FC<Props> = ({ onOpenCashier }) => {
  // Venues Catalog
  const [venues] = useState([
    {
      id: 'VEN-01',
      name: 'Salón Principal Los Sargentos',
      code: 'SALON_PRINCIPAL',
      capacity: 350,
      hourlyRate: 3500,
      cleaningFee: 350,
      depositFee: 1500,
      description: 'Gran salón para recepciones de gala, matrimonios y asambleas generales de socios.',
      image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80',
      features: ['Climatizado', 'Escenario & Audio Pro', 'Cocina Industrial', 'Acceso Garita VIP']
    },
    {
      id: 'VEN-02',
      name: 'Picadero Cubierto & Pista Hípica',
      code: 'PICADERO_CUBIERTO',
      capacity: 500,
      hourlyRate: 2800,
      cleaningFee: 500,
      depositFee: 2000,
      description: 'Pista de arena sílica y tribunas para clínicas ecuestres, exhibiciones y eventos especiales.',
      image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=600&q=80',
      features: ['Arena Reglamentaria FEI', 'Tribunas Iluminadas', 'Boxes Temporales', 'Paddock de Calentamiento']
    },
    {
      id: 'VEN-03',
      name: 'Salón de Eventos El Valle',
      code: 'SALON_VALLE',
      capacity: 180,
      hourlyRate: 1900,
      cleaningFee: 250,
      depositFee: 1000,
      description: 'Ambiente acogedor con vista al picadero exterior para almuerzos y cumpleaños.',
      image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80',
      features: ['Vista Panorámica', 'Parrilleros Integrados', 'Barra de Coctelería', 'Wi-Fi de Alta Velocidad']
    },
    {
      id: 'VEN-04',
      name: 'Pérgola & Jardines Los Sauces',
      code: 'PERGOLA_JARDINES',
      capacity: 120,
      hourlyRate: 1200,
      cleaningFee: 200,
      depositFee: 800,
      description: 'Área verde al aire libre con toldos rústicos para eventos diurnos y aniversarios.',
      image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&q=80',
      features: ['Jardines Exclusivos', 'Zona de Parrilladas', 'Seguridad Perimetral', 'Parque Infantil Contiguo']
    },
    {
      id: 'VEN-05',
      name: 'Salón VIP & Terraza Panorámica',
      code: 'SALON_VIP',
      capacity: 60,
      hourlyRate: 950,
      cleaningFee: 150,
      depositFee: 500,
      description: 'Espacio ejecutivo y privado para reuniones de directorio, degustaciones y cócteles selectos.',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
      features: ['Mobiliario de Lujo', 'Pantallas 4K', 'Cava de Vinos', 'Servicio de Mozo Dedicado']
    }
  ]);

  // Active Rentals State
  const [rentals, setRentals] = useState<any[]>([
    {
      id: 'ALQ-2026-001',
      code: 'ALQ-2026-001',
      venueName: 'Salón Principal Los Sargentos',
      venueCode: 'SALON_PRINCIPAL',
      applicantName: 'Carlos Mendoza Vargas',
      memberCode: '1055',
      alphaCode: 'MEN-VAR-C-E',
      eventDate: '2026-09-12',
      startTime: '18:00',
      endTime: '02:00',
      eventType: 'Matrimonio & Recepción de Gala',
      guestsCount: 220,
      rentalAmount: 3500,
      cleaningFee: 350,
      depositFee: 1500,
      totalAmount: 5350,
      paymentStatus: 'PAGADO',
      status: 'CONFIRMADO',
      guestList: 'Roberto Paz (4892-LPA), Carmen Daza (3921-KBC), Andrés Zalles, Maria Inés Rivero...',
      notes: 'Requiere prueba de sonido a las 15:00. Catering autorizado por el Club.'
    },
    {
      id: 'ALQ-2026-002',
      code: 'ALQ-2026-002',
      venueName: 'Picadero Cubierto & Pista Hípica',
      venueCode: 'PICADERO_CUBIERTO',
      applicantName: 'Asociación de Salto Hípico La Paz',
      memberCode: 'INST-014',
      alphaCode: 'ASO-SAL-L-P',
      eventDate: '2026-09-19',
      startTime: '08:00',
      endTime: '18:00',
      eventType: 'Concurso Departamental de Salto Ecuestre',
      guestsCount: 400,
      rentalAmount: 2800,
      cleaningFee: 500,
      depositFee: 2000,
      totalAmount: 5300,
      paymentStatus: 'PENDIENTE',
      status: 'RESERVADO',
      guestList: 'Jinetes federados, jueces oficiales y delegaciones departamentales.',
      notes: 'Instalación de cronometraje electrónico el día anterior.'
    },
    {
      id: 'ALQ-2026-003',
      code: 'ALQ-2026-003',
      venueName: 'Salón de Eventos El Valle',
      venueCode: 'SALON_VALLE',
      applicantName: 'Patricia Morales de Ortiz',
      memberCode: '1042',
      alphaCode: 'MOR-ORT-P-A',
      eventDate: '2026-09-05',
      startTime: '12:30',
      endTime: '19:00',
      eventType: 'Almuerzo Familiar & Cumpleaños 50 Años',
      guestsCount: 95,
      rentalAmount: 1900,
      cleaningFee: 250,
      depositFee: 1000,
      totalAmount: 3150,
      paymentStatus: 'PAGADO',
      status: 'CONFIRMADO',
      guestList: 'Familia Ortiz Morales, Juan Carlos Ortiz (5920-PTR), Sofía Morales...',
      notes: 'Uso de parrilleros exteriores.'
    }
  ]);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRentalForDetails, setSelectedRentalForDetails] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVenue, setFilterVenue] = useState('ALL');

  // New Reservation Form State
  const [newRental, setNewRental] = useState({
    venueCode: 'SALON_PRINCIPAL',
    applicantName: '',
    memberCode: '',
    alphaCode: '',
    documentId: '',
    phone: '',
    eventDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    startTime: '18:00',
    endTime: '01:00',
    eventType: 'Matrimonio & Recepción',
    guestsCount: 150,
    guestList: '',
    notes: '',
    paymentMethod: 'EFECTIVO'
  });

  const selectedVenueObj = venues.find(v => v.code === newRental.venueCode) || venues[0];
  const calculatedTotal = selectedVenueObj.hourlyRate + selectedVenueObj.cleaningFee + selectedVenueObj.depositFee;

  const handleCreateRental = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRental.applicantName.trim()) {
      toast.error('Ingresa el nombre del solicitante o socio');
      return;
    }

    const created: any = {
      id: `ALQ-2026-00${rentals.length + 1}`,
      code: `ALQ-2026-00${rentals.length + 1}`,
      venueName: selectedVenueObj.name,
      venueCode: selectedVenueObj.code,
      applicantName: newRental.applicantName,
      memberCode: newRental.memberCode || 'EXTERNO',
      alphaCode: newRental.alphaCode || 'SOC-EXT-N-A',
      eventDate: newRental.eventDate,
      startTime: newRental.startTime,
      endTime: newRental.endTime,
      eventType: newRental.eventType,
      guestsCount: newRental.guestsCount,
      rentalAmount: selectedVenueObj.hourlyRate,
      cleaningFee: selectedVenueObj.cleaningFee,
      depositFee: selectedVenueObj.depositFee,
      totalAmount: calculatedTotal,
      paymentStatus: 'PENDIENTE',
      status: 'CONFIRMADO',
      guestList: newRental.guestList,
      notes: newRental.notes
    };

    setRentals([created, ...rentals]);
    toast.success(`¡Reserva de ${selectedVenueObj.name} registrada exitosamente!`);
    setShowCreateModal(false);
  };

  const filteredRentals = rentals.filter(r => {
    const matchesSearch = 
      r.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.memberCode && r.memberCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesVenue = filterVenue === 'ALL' || r.venueCode === filterVenue;

    return matchesSearch && matchesVenue;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Metric Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand flex items-center gap-2">
            <Building className="w-5 h-5 text-brand-gold" /> Alquiler de Salones & Picadero
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control de reservas de espacios sociales, picadero de salto, garantía y lista de invitados para garita
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Nueva Reserva de Salón / Picadero
        </button>
      </div>

      {/* Venues Showcase Carousel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((v) => (
          <div 
            key={v.id}
            className="group rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 overflow-hidden hover:border-brand-gold/50 shadow-md transition-all flex flex-col justify-between"
          >
            <div className="h-36 relative overflow-hidden">
              <img 
                src={v.image} 
                alt={v.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-brand-gold text-black">
                  Cap. {v.capacity} personas
                </span>
                <span className="text-xs font-bold font-mono text-white bg-black/60 px-2 py-0.5 rounded-lg border border-white/20">
                  Bs {v.hourlyRate.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">{v.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{v.description}</p>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Limpieza:</span>
                  <span className="font-bold text-gray-900 dark:text-white">Bs {v.cleaningFee}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Garantía Reembolsable:</span>
                  <span className="font-bold text-amber-800 dark:text-brand-gold">Bs {v.depositFee}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setNewRental(prev => ({ ...prev, venueCode: v.code }));
                  setShowCreateModal(true);
                }}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-brand-gold hover:text-black text-gray-800 dark:text-gray-200 text-xs font-bold transition-all border border-gray-300 dark:border-white/10"
              >
                Reservar Este Espacio
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search Table for Rentals */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por socio, código de reserva, salón..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterVenue}
              onChange={e => setFilterVenue(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
            >
              <option value="ALL">Todos los Salones y Picaderos</option>
              <option value="SALON_PRINCIPAL">Salón Principal</option>
              <option value="PICADERO_CUBIERTO">Picadero Cubierto</option>
              <option value="SALON_VALLE">Salón El Valle</option>
              <option value="PERGOLA_JARDINES">Pérgola & Jardines</option>
              <option value="SALON_VIP">Salón VIP</option>
            </select>
          </div>
        </div>

        {/* Table of Rentals */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Espacio / Salón</th>
                <th className="p-3">Socio / Solicitante</th>
                <th className="p-3">Fecha & Horario</th>
                <th className="p-3">Tipo Evento</th>
                <th className="p-3">Total (Bs)</th>
                <th className="p-3">Pago</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 text-xs">
                    No se encontraron reservas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRentals.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{r.code}</td>
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{r.venueName}</td>
                    <td className="p-3">
                      <span className="font-semibold block text-gray-900 dark:text-white">{r.applicantName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">#{r.memberCode} ({r.alphaCode})</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-gray-800 dark:text-gray-200 block">{r.eventDate}</span>
                      <span className="text-[10px] text-gray-500">{r.startTime} - {r.endTime}</span>
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{r.eventType}</td>
                    <td className="p-3 font-black text-gray-900 dark:text-white font-mono">
                      Bs {r.totalAmount.toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        r.paymentStatus === 'PAGADO'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                      }`}>
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRentalForDetails(r)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 text-[11px] font-bold"
                          title="Ver Invitados y Garita"
                        >
                          <Users className="w-3.5 h-3.5 inline mr-1" /> Invitados
                        </button>
                        {onOpenCashier && r.paymentStatus === 'PENDIENTE' && (
                          <button
                            onClick={() => onOpenCashier(r.memberCode || 'SOC-1055')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[11px] font-extrabold flex items-center gap-1 hover:scale-105"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Cobrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NUEVA RESERVA DE SALÓN / PICADERO */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl shadow-2xl p-6 space-y-4 my-8 text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-gold" />
                <h3 className="text-lg font-bold serif-brand">Reserva de Salón / Picadero</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRental} className="space-y-4">
              
              {/* Espacio Seleccionado */}
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Espacio / Salón Solicitado *</label>
                <select
                  value={newRental.venueCode}
                  onChange={e => setNewRental({ ...newRental, venueCode: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-sm font-bold text-gray-900 dark:text-white outline-none"
                >
                  {venues.map(v => (
                    <option key={v.code} value={v.code}>
                      {v.name} (Alquiler: Bs {v.hourlyRate} • Cap. {v.capacity} pers)
                    </option>
                  ))}
                </select>
              </div>

              {/* Solicitante y Membresía */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Nombre del Socio / Solicitante *</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza Vargas"
                    value={newRental.applicantName}
                    onChange={e => setNewRental({ ...newRental, applicantName: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Nro. Membresía</label>
                  <input
                    type="text"
                    placeholder="Ej. 1055"
                    value={newRental.memberCode}
                    onChange={e => setNewRental({ ...newRental, memberCode: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-mono font-bold text-amber-800 dark:text-brand-gold outline-none"
                  />
                </div>
              </div>

              {/* Fecha y Horarios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Fecha del Evento *</label>
                  <input
                    type="date"
                    value={newRental.eventDate}
                    onChange={e => setNewRental({ ...newRental, eventDate: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Hora Inicio</label>
                  <input
                    type="time"
                    value={newRental.startTime}
                    onChange={e => setNewRental({ ...newRental, startTime: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Hora Fin</label>
                  <input
                    type="time"
                    value={newRental.endTime}
                    onChange={e => setNewRental({ ...newRental, endTime: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Tipo de Evento & Nro Invitados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Tipo de Evento</label>
                  <input
                    type="text"
                    placeholder="Ej. Matrimonio, Aniversario, Concurso Ecuestre..."
                    value={newRental.eventType}
                    onChange={e => setNewRental({ ...newRental, eventType: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Cantidad de Asistentes</label>
                  <input
                    type="number"
                    value={newRental.guestsCount}
                    onChange={e => setNewRental({ ...newRental, guestsCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Lista de Invitados Autorizados para Garita */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-blue-500" />
                  <label className="text-xs text-gray-800 dark:text-gray-200 font-bold uppercase">
                    Lista de Invitados & Placas Autorizadas (Garita)
                  </label>
                </div>
                <textarea
                  rows={3}
                  placeholder="Pega la lista de invitados y placas de vehículos para habilitar el ingreso en garita..."
                  value={newRental.guestList}
                  onChange={e => setNewRental({ ...newRental, guestList: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                ></textarea>
              </div>

              {/* Resumen Financiero de la Reserva */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-brand-gold/10 border border-amber-300 dark:border-brand-gold/30 space-y-2 text-xs">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Tarifa Alquiler del Espacio:</span>
                  <span className="font-mono font-bold">Bs {selectedVenueObj.hourlyRate.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Tarifa de Limpieza Obligatoria:</span>
                  <span className="font-mono font-bold">Bs {selectedVenueObj.cleaningFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Garantía Reembolsable por Daños:</span>
                  <span className="font-mono font-bold">Bs {selectedVenueObj.depositFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-amber-300 dark:border-brand-gold/30 font-bold text-sm text-gray-900 dark:text-white">
                  <span>TOTAL A COBRAR EN CAJA:</span>
                  <span className="font-mono font-black text-amber-800 dark:text-brand-gold">Bs {calculatedTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-black hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
                >
                  Confirmar Reserva de Salón
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: DETALLES DE INVITADOS Y GARITA */}
      {selectedRentalForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold serif-brand">
                  Pase de Garita: {selectedRentalForDetails.code}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedRentalForDetails.venueName} • {selectedRentalForDetails.eventDate}
                </p>
              </div>
              <button onClick={() => setSelectedRentalForDetails(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Solicitante:</span>
                <span className="font-bold">{selectedRentalForDetails.applicantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Horario Autorizado:</span>
                <span className="font-bold text-brand-gold">{selectedRentalForDetails.startTime} a {selectedRentalForDetails.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Capacidad Aforo:</span>
                <span className="font-bold">{selectedRentalForDetails.guestsCount} invitados</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-bold uppercase flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-blue-400" /> Lista de Invitados y Vehículos Registrados
              </label>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {selectedRentalForDetails.guestList || 'Sin invitados cargados para control de garita.'}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Pase de Garita
              </button>
              <button
                onClick={() => setSelectedRentalForDetails(null)}
                className="px-5 py-2 rounded-xl bg-brand-gold text-black text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
