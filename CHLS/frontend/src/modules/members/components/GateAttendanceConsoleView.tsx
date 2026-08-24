import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Car, 
  UserCheck, 
  UserX, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Plus, 
  Building, 
  GraduationCap, 
  Calendar, 
  Sparkles,
  ArrowRight,
  LogOut,
  LogIn
} from 'lucide-react';
import toast from 'react-hot-toast';

export const GateAttendanceConsoleView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'REGISTRO_RAPIDO' | 'INVITADOS' | 'ESCUELAS_HOY' | 'EVENTOS_HOY'>('REGISTRO_RAPIDO');
  
  // Search query for member lookup in guardhouse
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock member verified in gate
  const [verifiedMember, setVerifiedMember] = useState<any>({
    id: 'MEM-1055',
    code: '1055',
    alphaCode: 'MEN-VAR-C-E',
    fullName: 'Carlos Mendoza Vargas',
    category: 'Socio Regular Activo (CDP)',
    status: 'ACTIVO',
    financialStatus: 'AL_DIA', // AL_DIA, MORA, BLOQUEADO
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    vehicles: ['4892-LPA (Toyota Land Cruiser)', '3120-KBC (Audi Q5)'],
    dependents: [
      { name: 'Mariana Mendoza Suárez', relation: 'HIJO', status: 'HABILITADO', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
      { name: 'Rodrigo Mendoza Suárez', relation: 'HIJO', status: 'HABILITADO', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
      { name: 'María Elena Suárez de Mendoza', relation: 'CONYUGE', status: 'HABILITADO', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' }
    ],
    supportStaff: [
      { name: 'Juana Quispe (Nana/Niñera)', doc: '6829104 LP', status: 'AUTORIZADO' },
      { name: 'Pedro Mamani (Chofer)', doc: '4920193 LP', status: 'AUTORIZADO' }
    ],
    horses: [
      { name: 'Centella del Valle', box: 'Box H-12', status: 'VIVO' }
    ]
  });

  // Today's attendance logs in gate
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([
    {
      id: 'ACC-001',
      time: '18:14',
      personName: 'Carlos Mendoza Vargas',
      type: 'SOCIO TITULAR',
      code: '1055',
      gate: 'Garita Principal (Acceso Vehicular)',
      companionsCount: 2,
      action: 'INGRESO',
      status: 'AUTORIZADO',
      plate: '4892-LPA'
    },
    {
      id: 'ACC-002',
      time: '17:50',
      personName: 'Mateo Durán Morales (Hijo)',
      type: 'DEPENDIENTE',
      code: '1042-D1',
      gate: 'Garita Hípica (Boxes)',
      companionsCount: 0,
      action: 'INGRESO',
      status: 'AUTORIZADO',
      plate: 'PEATONAL'
    },
    {
      id: 'ACC-003',
      time: '17:35',
      personName: 'Roberto Paz Soldán',
      type: 'SOCIO TITULAR',
      code: '1029',
      gate: 'Garita Tenis',
      companionsCount: 1,
      action: 'SALIDA',
      status: 'AUTORIZADO',
      plate: '5920-PTR'
    }
  ]);

  // Guest Registration Form State
  const [guestEntry, setGuestEntry] = useState({
    memberCode: '1055',
    maleAdults: 1,
    femaleAdults: 1,
    maleMinors: 0,
    femaleMinors: 0,
    guestNames: 'Andrés Zalles, Carmen Daza',
    vehiclePlate: '3921-KBC',
    notes: 'Invitados para restaurante y canchas de tenis'
  });

  const handleRegisterEntry = (type: string, name: string) => {
    const newLog = {
      id: `ACC-00${attendanceLogs.length + 1}`,
      time: new Date().toLocaleTimeString().substring(0, 5),
      personName: name,
      type: type,
      code: verifiedMember.code,
      gate: 'Garita Principal',
      companionsCount: guestEntry.maleAdults + guestEntry.femaleAdults + guestEntry.maleMinors + guestEntry.femaleMinors,
      action: 'INGRESO',
      status: 'AUTORIZADO',
      plate: guestEntry.vehiclePlate || '4892-LPA'
    };

    setAttendanceLogs([newLog, ...attendanceLogs]);
    toast.success(`¡Ingreso registrado para ${name}!`);
  };

  const handleRegisterExit = (logId: string) => {
    setAttendanceLogs(attendanceLogs.map(l => l.id === logId ? { ...l, action: 'SALIDA', time: new Date().toLocaleTimeString().substring(0, 5) } : l));
    toast.success('¡Salida registrada exitosamente!');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-gold" /> Consola de Control de Entrada & Asistencias 360°
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Identificación de socios, dependientes, invitados, alumnos y personal de apoyo en control de entrada (Págs 15, 16, 17 - Guía Socio)
          </p>
        </div>

        {/* Live Gate Clock */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/40 border border-white/10 text-xs">
          <Clock className="w-4 h-4 text-brand-gold" />
          <span className="font-mono font-black text-brand-gold text-sm">
            {new Date().toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' })} • 18:30
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            🟢 Control de Entrada Online
          </span>
        </div>
      </div>

      {/* Main Gate Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Member ID Verification Terminal */}
        <div className="lg:col-span-1 p-5 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Escanear QR, Nro. Título (ej. 1055), Placa o Nombre..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-brand-gold"
            />
          </div>

          {/* Member Card with Photo & Badges */}
          {verifiedMember && (
            <div className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 dark:from-white/5 dark:to-transparent border border-gray-200 dark:border-white/10 space-y-3">
                
                <div className="flex items-start gap-3">
                  <img
                    src={verifiedMember.photo}
                    alt={verifiedMember.fullName}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-gold shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-amber-800 dark:text-brand-gold text-sm">
                        #{verifiedMember.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                        {verifiedMember.financialStatus === 'AL_DIA' ? '🟢 Habilitado' : '🔴 En Mora'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 dark:text-white serif-brand truncate">
                      {verifiedMember.fullName}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{verifiedMember.category}</p>
                    <p className="text-[10px] text-gray-400 font-mono">Código Alfa: {verifiedMember.alphaCode}</p>
                  </div>
                </div>

                {/* Auto Plates & Boxes */}
                <div className="pt-2 border-t border-gray-200 dark:border-white/10 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span>Placas: <strong>{verifiedMember.vehicles.join(' | ')}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <Building className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hípica: <strong>Centella del Valle (Box H-12)</strong></span>
                  </div>
                </div>

                {/* Direct Gate Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleRegisterEntry('SOCIO TITULAR', verifiedMember.fullName)}
                    className="py-2 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center justify-center gap-1.5 hover:scale-105 transition-all shadow-md shadow-emerald-500/20"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Registrar Ingreso
                  </button>
                  <button
                    onClick={() => toast.success('Salida de titular registrada')}
                    className="py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gray-300 dark:hover:bg-white/20"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Registrar Salida
                  </button>
                </div>

              </div>

              {/* Dependents List (Pág 17 - Guía Socio) */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-gold" /> Familiares & Dependientes Registrados
                </h5>

                <div className="space-y-1.5">
                  {verifiedMember.dependents.map((dep: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <img src={dep.photo} alt={dep.name} className="w-7 h-7 rounded-lg object-cover" />
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">{dep.name}</span>
                          <span className="text-[9px] text-gray-400 font-semibold uppercase">{dep.relation}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRegisterEntry('DEPENDIENTE', dep.name)}
                        className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-brand-gold hover:text-black text-[10px] font-bold transition-all"
                      >
                        Ingreso →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support Staff (Nanas / Choferes - Pág 18 Guía Socio) */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Personal de Apoyo Autorizado (Nanas / Choferes)
                </h5>

                <div className="space-y-1.5">
                  {verifiedMember.supportStaff.map((staff: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{staff.name}</span>
                        <span className="text-[9px] text-gray-400">CI: {staff.doc}</span>
                      </div>

                      <button
                        onClick={() => handleRegisterEntry('PERSONAL DE APOYO', staff.name)}
                        className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-brand-gold hover:text-black text-[10px] font-bold transition-all"
                      >
                        Pase →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right 2 Columns: Live Gate Attendance Feed & Guest Registration */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Sub-tabs for Garita Console */}
          <div className="flex border-b border-gray-200 dark:border-white/10 gap-4">
            <button
              onClick={() => setActiveTab('REGISTRO_RAPIDO')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'REGISTRO_RAPIDO'
                  ? 'border-brand-gold text-amber-800 dark:text-brand-gold'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" /> Bitácora de Accesos de Hoy
            </button>

            <button
              onClick={() => setActiveTab('INVITADOS')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'INVITADOS'
                  ? 'border-brand-gold text-amber-800 dark:text-brand-gold'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" /> Registro de Invitados con Socio
            </button>
          </div>

          {activeTab === 'REGISTRO_RAPIDO' ? (
            <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">
                  Historial de Ingresos y Salidas en Tiempo Real
                </h3>
                <span className="text-xs text-gray-400 font-mono">Mostrando {attendanceLogs.length} movimientos</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="p-3">Hora</th>
                      <th className="p-3">Persona / Socio</th>
                      <th className="p-3">Condición</th>
                      <th className="p-3">Garita / Placa</th>
                      <th className="p-3">Acompañantes</th>
                      <th className="p-3">Movimiento</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{log.time}</td>
                        <td className="p-3">
                          <span className="font-bold text-gray-900 dark:text-white block">{log.personName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">#{log.code}</span>
                        </td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{log.type}</td>
                        <td className="p-3">
                          <span className="text-gray-900 dark:text-white block">{log.gate}</span>
                          <span className="text-[10px] text-blue-500 font-mono">{log.plate}</span>
                        </td>
                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">
                          {log.companionsCount > 0 ? `+${log.companionsCount} pers.` : 'Solo'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            log.action === 'INGRESO'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {log.action === 'INGRESO' && (
                            <button
                              onClick={() => handleRegisterExit(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 text-[11px] font-bold"
                            >
                              Marcar Salida
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Guest Registration Form (Pág 15 - Guía Socio) */
            <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">
                Registro de Invitados Acompañantes con Socio Titular
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">Varones Mayores</label>
                  <input
                    type="number"
                    value={guestEntry.maleAdults}
                    onChange={e => setGuestEntry({ ...guestEntry, maleAdults: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">Mujeres Mayores</label>
                  <input
                    type="number"
                    value={guestEntry.femaleAdults}
                    onChange={e => setGuestEntry({ ...guestEntry, femaleAdults: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">Varones Menores</label>
                  <input
                    type="number"
                    value={guestEntry.maleMinors}
                    onChange={e => setGuestEntry({ ...guestEntry, maleMinors: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px]">Mujeres Menores</label>
                  <input
                    type="number"
                    value={guestEntry.femaleMinors}
                    onChange={e => setGuestEntry({ ...guestEntry, femaleMinors: parseInt(e.target.value, 10) || 0 })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-center"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Nombres de Invitados</label>
                <input
                  type="text"
                  placeholder="Ej. Roberto Paz, Carmen Daza..."
                  value={guestEntry.guestNames}
                  onChange={e => setGuestEntry({ ...guestEntry, guestNames: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold outline-none"
                />
              </div>

              <button
                onClick={() => {
                  handleRegisterEntry('INVITADOS CON TITULAR', `${guestEntry.guestNames} (con #${verifiedMember.code})`);
                  setActiveTab('REGISTRO_RAPIDO');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs shadow-md hover:scale-[1.01] transition-all"
              >
                + Registrar Ingreso de Invitados en Control de Entrada
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
