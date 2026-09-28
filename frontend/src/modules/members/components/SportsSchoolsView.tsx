import React, { useState } from 'react';
import { 
  Award, 
  Users, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Activity, 
  UserPlus, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Printer, 
  GraduationCap 
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onOpenCashier?: (personId: string) => void;
}

export const SportsSchoolsView: React.FC<Props> = ({ onOpenCashier }) => {
  // Sports Academies & Schools List
  const [schools] = useState([
    {
      id: 'SCH-01',
      sport: 'TENIS',
      name: 'Escuela de Tenis Formativa (Menores)',
      instructor: 'Prof. Roberto Carpio (Head Coach)',
      schedule: 'Lunes a Jueves 16:00 - 18:00',
      monthlyFee: 280,
      ages: '4 a 16 años',
      enrolledCount: 38,
      capacity: 50,
      badgeColor: 'emerald'
    },
    {
      id: 'SCH-02',
      sport: 'TENIS',
      name: 'Academia de Tenis & Alta Competencia (Adultos)',
      instructor: 'Prof. Marcelo Quiroga',
      schedule: 'Martes y Jueves 19:00 - 21:00',
      monthlyFee: 320,
      ages: 'Adultos & Juveniles',
      enrolledCount: 22,
      capacity: 30,
      badgeColor: 'emerald'
    },
    {
      id: 'SCH-03',
      sport: 'EQUITACION',
      name: 'Academia de Salto Hípico & Adiestramiento',
      instructor: 'Cnl. René Morales (Instructor FEI)',
      schedule: 'Miércoles a Sábado 08:30 - 11:30',
      monthlyFee: 450,
      ages: 'Todas las edades',
      enrolledCount: 19,
      capacity: 25,
      badgeColor: 'amber'
    },
    {
      id: 'SCH-04',
      sport: 'NATACION',
      name: 'Escuela de Natación Los Sargentos',
      instructor: 'Prof. Andrea Beltrán',
      schedule: 'Lunes a Viernes 15:30 - 17:30',
      monthlyFee: 250,
      ages: '5 a 17 años',
      enrolledCount: 42,
      capacity: 60,
      badgeColor: 'blue'
    },
    {
      id: 'SCH-05',
      sport: 'PADEL',
      name: 'Escuela de Pádel & Frontón',
      instructor: 'Prof. Javier Arce',
      schedule: 'Lunes, Miércoles y Viernes 18:00 - 20:00',
      monthlyFee: 260,
      ages: 'Juveniles y Adultos',
      enrolledCount: 28,
      capacity: 35,
      badgeColor: 'purple'
    },
    {
      id: 'SCH-06',
      sport: 'SQUASH',
      name: 'Academia de Squash & Racquetball',
      instructor: 'Prof. David Soliz',
      schedule: 'Martes y Jueves 17:00 - 19:00',
      monthlyFee: 240,
      ages: '8 a 25 años',
      enrolledCount: 15,
      capacity: 20,
      badgeColor: 'indigo'
    }
  ]);

  // Students Inscriptions Registry
  const [inscriptions, setInscriptions] = useState<any[]>([
    {
      id: 'INS-2026-001',
      code: 'INS-2026-001',
      schoolName: 'Escuela de Tenis Formativa (Menores)',
      sport: 'TENIS',
      studentName: 'Mariana Mendoza Suárez',
      relationship: 'HIJO',
      titularName: 'Carlos Mendoza Vargas',
      memberCode: '1055',
      alphaCode: 'MEN-VAR-C-E',
      monthlyFee: 280,
      level: 'Nivel Intermedio',
      inscriptionDate: '2026-02-10',
      status: 'ACTIVO',
      paymentStatus: 'AL_DIA',
      notes: 'Grupo competitivo torneo interclubes.'
    },
    {
      id: 'INS-2026-002',
      code: 'INS-2026-002',
      schoolName: 'Academia de Salto Hípico & Adiestramiento',
      sport: 'EQUITACION',
      studentName: 'Mateo Durán Morales',
      relationship: 'HIJO',
      titularName: 'Gonzalo Durán Morales',
      memberCode: '1042',
      alphaCode: 'DUR-MOR-G-M',
      monthlyFee: 450,
      level: 'Salto 1.10m',
      inscriptionDate: '2026-01-15',
      status: 'ACTIVO',
      paymentStatus: 'PENDIENTE',
      notes: 'Caballo asignado: Sultán de la Colina (Box H-08).'
    },
    {
      id: 'INS-2026-003',
      code: 'INS-2026-003',
      schoolName: 'Escuela de Natación Los Sargentos',
      sport: 'NATACION',
      studentName: 'Lucía Ortiz Morales',
      relationship: 'HIJO',
      titularName: 'Patricia Morales de Ortiz',
      memberCode: '1038',
      alphaCode: 'MOR-ORT-P-A',
      monthlyFee: 250,
      level: 'Estilo Libre & Mariposa',
      inscriptionDate: '2026-03-01',
      status: 'ACTIVO',
      paymentStatus: 'AL_DIA',
      notes: 'Horario turno tarde B.'
    }
  ]);

  // Modals & Search State
  const [showInscriptionModal, setShowInscriptionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSport, setFilterSport] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Form State for new Inscription
  const [newInscription, setNewInscription] = useState({
    schoolId: 'SCH-01',
    studentName: '',
    relationship: 'HIJO',
    titularName: '',
    memberCode: '',
    alphaCode: '',
    documentId: '',
    level: 'Iniciación',
    billingModality: 'CARGO_CUOTA_MENSUAL', // CARGO_CUOTA_MENSUAL, PAGO_DIRECTO_CAJA
    notes: ''
  });

  const selectedSchool = schools.find(s => s.id === newInscription.schoolId) || schools[0];

  const handleCreateInscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInscription.studentName.trim() || !newInscription.titularName.trim()) {
      toast.error('Completa los datos obligatorios del alumno y socio titular');
      return;
    }

    const created: any = {
      id: `INS-2026-00${inscriptions.length + 1}`,
      code: `INS-2026-00${inscriptions.length + 1}`,
      schoolName: selectedSchool.name,
      sport: selectedSchool.sport,
      studentName: newInscription.studentName,
      relationship: newInscription.relationship,
      titularName: newInscription.titularName,
      memberCode: newInscription.memberCode || '1055',
      alphaCode: newInscription.alphaCode || 'SOC-TIT-N-A',
      monthlyFee: selectedSchool.monthlyFee,
      level: newInscription.level,
      inscriptionDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVO',
      paymentStatus: newInscription.billingModality === 'CARGO_CUOTA_MENSUAL' ? 'AL_DIA' : 'PENDIENTE',
      notes: newInscription.notes
    };

    setInscriptions([created, ...inscriptions]);
    toast.success(`¡Inscripción a ${selectedSchool.name} registrada exitosamente!`);
    setShowInscriptionModal(false);
  };

  const filteredInscriptions = inscriptions.filter(i => {
    const matchesSearch = 
      i.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.titularName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSport = filterSport === 'ALL' || i.sport === filterSport;
    const matchesStatus = filterStatus === 'ALL' || i.status === filterStatus;

    return matchesSearch && matchesSport && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-gold" /> Gestión de Escuelas Deportivas
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Inscripciones para socios e hijos dependientes, aranceles mensuales, instructores y cobros integrados
          </p>
        </div>

        <button
          onClick={() => setShowInscriptionModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
        >
          <UserPlus className="w-4 h-4" /> Inscribir Alumno a Escuela
        </button>
      </div>

      {/* Schools Cards Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schools.map((s) => (
          <div 
            key={s.id}
            className="p-5 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 hover:border-brand-gold/50 shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  {s.sport}
                </span>
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                  Bs {s.monthlyFee}/mes
                </span>
              </div>

              <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">{s.name}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Instructor: {s.instructor}</p>
            </div>

            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-gold" />
                <span>{s.schedule}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>{s.enrolledCount} alumnos inscritos (Cap. {s.capacity})</span>
              </div>
            </div>

            <button
              onClick={() => {
                setNewInscription(prev => ({ ...prev, schoolId: s.id }));
                setShowInscriptionModal(true);
              }}
              className="w-full py-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-brand-gold hover:text-black text-gray-800 dark:text-gray-200 text-xs font-bold transition-all border border-gray-300 dark:border-white/10"
            >
              + Inscribir en esta Escuela
            </button>
          </div>
        ))}
      </div>

      {/* Registry Table with Search and Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por alumno, socio titular, disciplina, código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterSport}
              onChange={e => setFilterSport(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
            >
              <option value="ALL">Todas las Disciplinas</option>
              <option value="TENIS">Tenis</option>
              <option value="EQUITACION">Equitación</option>
              <option value="NATACION">Natación</option>
              <option value="PADEL">Pádel</option>
              <option value="SQUASH">Squash</option>
            </select>
          </div>
        </div>

        {/* Inscriptions Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Alumno Inscrito</th>
                <th className="p-3">Socio Titular</th>
                <th className="p-3">Escuela / Nivel</th>
                <th className="p-3">Cuota Mes</th>
                <th className="p-3">Estado Pago</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {filteredInscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 text-xs">
                    No se encontraron inscripciones con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredInscriptions.map((ins) => (
                  <tr key={ins.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{ins.code}</td>
                    <td className="p-3">
                      <span className="font-bold text-gray-900 dark:text-white block">{ins.studentName}</span>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">({ins.relationship})</span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-gray-800 dark:text-gray-200 block">{ins.titularName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">#{ins.memberCode}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-gray-900 dark:text-white block">{ins.schoolName}</span>
                      <span className="text-[10px] text-brand-gold">{ins.level}</span>
                    </td>
                    <td className="p-3 font-mono font-black text-gray-900 dark:text-white">
                      Bs {ins.monthlyFee}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        ins.paymentStatus === 'AL_DIA'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                      }`}>
                        {ins.paymentStatus === 'AL_DIA' ? 'Al Día' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {onOpenCashier && ins.paymentStatus === 'PENDIENTE' && (
                        <button
                          onClick={() => onOpenCashier(ins.memberCode || 'SOC-1055')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[11px] font-extrabold flex items-center gap-1 hover:scale-105"
                        >
                          <DollarSign className="w-3.5 h-3.5" /> Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: NUEVA INSCRIPCIÓN A ESCUELA */}
      {showInscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl shadow-2xl p-6 space-y-4 my-8 text-gray-900 dark:text-white">
            
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-brand-gold" />
                <h3 className="text-lg font-bold serif-brand">Inscripción a Escuela Deportiva</h3>
              </div>
              <button onClick={() => setShowInscriptionModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInscription} className="space-y-3.5">
              
              {/* Escuela */}
              <div>
                <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Escuela Deportiva *</label>
                <select
                  value={newInscription.schoolId}
                  onChange={e => setNewInscription({ ...newInscription, schoolId: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.sport} • Bs {s.monthlyFee}/mes)
                    </option>
                  ))}
                </select>
              </div>

              {/* Alumno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Nombre del Alumno *</label>
                  <input
                    type="text"
                    placeholder="Ej. Mariana Mendoza Suárez"
                    value={newInscription.studentName}
                    onChange={e => setNewInscription({ ...newInscription, studentName: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Condición / Parentesco</label>
                  <select
                    value={newInscription.relationship}
                    onChange={e => setNewInscription({ ...newInscription, relationship: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  >
                    <option value="HIJO">Hijo(a) de Socio</option>
                    <option value="TITULAR">Socio Titular</option>
                    <option value="CONYUGE">Cónyuge</option>
                    <option value="PUPILO">Pupilo / Familiar</option>
                  </select>
                </div>
              </div>

              {/* Socio Titular Responsable */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Socio Titular Responsable *</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza Vargas"
                    value={newInscription.titularName}
                    onChange={e => setNewInscription({ ...newInscription, titularName: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Nro. Membresía</label>
                  <input
                    type="text"
                    placeholder="1055"
                    value={newInscription.memberCode}
                    onChange={e => setNewInscription({ ...newInscription, memberCode: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-mono font-bold text-amber-800 dark:text-brand-gold outline-none"
                  />
                </div>
              </div>

              {/* Nivel & Modalidad de Cobro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Nivel Deportivo</label>
                  <select
                    value={newInscription.level}
                    onChange={e => setNewInscription({ ...newInscription, level: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
                  >
                    <option value="Iniciación">Iniciación (Principiante)</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Alta Competencia">Alta Competencia / Federación</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold uppercase">Modalidad de Cobro</label>
                  <select
                    value={newInscription.billingModality}
                    onChange={e => setNewInscription({ ...newInscription, billingModality: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-900 dark:text-white outline-none"
                  >
                    <option value="CARGO_CUOTA_MENSUAL">Cargo en Cuota Mensual Socio</option>
                    <option value="PAGO_DIRECTO_CAJA">Pago Directo en Caja</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-brand-gold/10 border border-amber-300 dark:border-brand-gold/30 text-xs flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Arancel Mensual:</span>
                <span className="font-mono font-black text-sm text-amber-800 dark:text-brand-gold">Bs {selectedSchool.monthlyFee}.00 / mes</span>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInscriptionModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-black hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
                >
                  Completar Inscripción
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
