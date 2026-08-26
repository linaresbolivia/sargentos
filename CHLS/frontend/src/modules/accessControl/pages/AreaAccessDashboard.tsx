import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Waves, 
  Dumbbell, 
  Clock, 
  Users, 
  Key, 
  Sparkles, 
  CheckCircle2, 
  Search, 
  UserCheck, 
  LogOut, 
  Plus, 
  RefreshCw, 
  Calendar, 
  History as HistoryIcon,
  Filter, 
  FileSpreadsheet, 
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Hash,
  User,
  Shield,
  Layers,
  Check,
  MoveRight,
  GripVertical,
  DoorOpen,
  CheckCheck,
  AlertTriangle,
  Download,
  Thermometer,
  Settings,
  Save,
  X
} from 'lucide-react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface AreaAccessDashboardProps {
  areaProp?: 'PISCINA' | 'GIMNASIO';
}

interface AreaLog {
  id: string;
  area: string;
  entryTime: string;
  exitTime?: string | null;
  memberCode?: string | null;
  personName: string;
  documentId?: string | null;
  dependency: string;
  gender: string;
  lockerKey?: string | null;
  towelNumber?: string | null;
  towelQty: number;
  towelSize?: string | null;
  observations?: string | null;
  status: string;
  casetaExitDetected?: boolean;
  casetaExitTime?: string;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    documentId?: string;
    mobile?: string;
  } | null;
}

interface GatehouseEntry {
  id: string;
  timestamp: string;
  personType: string;
  hasLeftClub?: boolean;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    documentId?: string;
    gender?: string;
    titularMemberships?: { membershipNumber: string }[];
    beneficiaries?: { membership: { membershipNumber: string } }[];
  } | null;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    documentId?: string;
  } | null;
  activeArea?: {
    id: string;
    area: string;
    personId: string | null;
    personName: string;
    lockerKey: string | null;
    entryTime: string;
    towelQty: number;
  } | null;
}

const DEPENDENCIES = [
  { id: 'TITULAR', label: 'Titular', color: 'bg-brand-gold/15 text-brand-gold border-brand-gold/30' },
  { id: 'ESPOSA', label: 'Esposa(o)', color: 'bg-pink-500/15 text-pink-500 border-pink-500/30' },
  { id: 'HIJO', label: 'Hijo(a)', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  { id: 'PADRE_MADRE', label: 'Padre/Madre', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  { id: 'NIETO', label: 'Nieto(a)', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' },
  { id: 'INVITADO', label: 'Invitado', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' },
  { id: 'PROFESOR', label: 'Profesor', color: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30' },
  { id: 'EXTERNO', label: 'Externo', color: 'bg-teal-500/15 text-teal-500 border-teal-500/30' },
  { id: 'CONVENIO', label: 'Convenio', color: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30' },
  { id: 'HUESPED', label: 'Huésped', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30' },
];

export interface FacilityItem {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: string;
  type: string;
  order?: number;
}

export const DEFAULT_PISCINA_FACILITIES: FacilityItem[] = [
  { id: 'piscina_5_carriles', name: 'PISCINA 5 CARRILES', value: '30', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 1 },
  { id: 'piscina_3_carriles', name: 'PISCINA 3 CARRILES', value: '30', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 2 },
  { id: 'jacuzzi', name: 'JACUZZI', value: '41', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 3 },
  { id: 'sauna_v_hierbas', name: 'SAUNA V. HIERBAS', value: '36', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 4 },
  { id: 'sauna_seco', name: 'SAUNA SECO', value: 'Ok', unit: '', status: 'OPTIMO', type: 'STATUS', order: 5 },
  { id: 'sauna_eucalipto', name: 'SAUNA EUCALIPTO', value: '36', unit: '°', status: 'OPTIMO', type: 'TEMP', order: 6 }
];

export const AreaAccessDashboard: React.FC<AreaAccessDashboardProps> = ({ areaProp }) => {
  const navigate = useNavigate();
  const params = useParams<{ area?: string }>();
  
  const currentArea = (areaProp || (params.area?.toUpperCase() === 'GIMNASIO' ? 'GIMNASIO' : 'PISCINA')).toUpperCase() as 'PISCINA' | 'GIMNASIO';
  const isPiscina = currentArea === 'PISCINA';

  // Stats
  const [stats, setStats] = useState<{
    currentlyInside: number;
    totalToday: number;
    lockersInUse: number;
    towelsLoanedToday: number;
    totalLockers?: number;
    maxCapacity?: number;
    lockersAvailable?: number;
    facilities?: FacilityItem[];
    poolTemp?: {
      temperature: number;
      ambientTemp?: number | null;
      phLevel?: number | null;
      chlorineLevel?: number | null;
      notes?: string | null;
      recordedBy?: string | null;
      recordedAt?: string | null;
      diffMinutes?: number | null;
      needsCheck?: boolean;
    } | null;
  }>({
    currentlyInside: 0,
    totalToday: 0,
    lockersInUse: 0,
    towelsLoanedToday: 0,
    totalLockers: isPiscina ? 50 : 40,
    maxCapacity: isPiscina ? 50 : 45,
    lockersAvailable: isPiscina ? 50 : 40,
    poolTemp: null,
    facilities: DEFAULT_PISCINA_FACILITIES
  });

  // Dynamic Lockers & Capacity & Facilities Config Modal
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configLockers, setConfigLockers] = useState<number>(isPiscina ? 50 : 40);
  const [configCapacity, setConfigCapacity] = useState<number>(isPiscina ? 50 : 45);
  const [configFacilities, setConfigFacilities] = useState<FacilityItem[]>(DEFAULT_PISCINA_FACILITIES);

  // Pool Temperature Control Modal
  const [showTempModal, setShowTempModal] = useState(false);
  const [tempValue, setTempValue] = useState<string>('28.0');
  const [ambientTempValue, setAmbientTempValue] = useState<string>('22.0');
  const [phValue, setPhValue] = useState<string>('7.4');
  const [chlorineValue, setChlorineValue] = useState<string>('1.5');
  const [tempNotes, setTempNotes] = useState<string>('');
  const [tempHistory, setTempHistory] = useState<any[]>([]);
  const [loadingTempHistory, setLoadingTempHistory] = useState(false);

  // Logs state
  const [activeLogs, setActiveLogs] = useState<AreaLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<AreaLog[]>([]);
  const [gatehouseEntries, setGatehouseEntries] = useState<GatehouseEntry[]>([]);
  const [rightTab, setRightTab] = useState<'DENTRO' | 'HISTORIAL'>('DENTRO');

  // Filter & Search
  const [casetaViewMode, setCasetaViewMode] = useState<'DISPONIBLES' | 'TODOS'>('DISPONIBLES');
  const [casetaFilter, setCasetaFilter] = useState('');
  const [activeSearchFilter, setActiveSearchFilter] = useState('');
  const [historyDate, setHistoryDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedMember, setDraggedMember] = useState<GatehouseEntry | null>(null);

  // Form Fields (Keyboard-first registration)
  const [memberCode, setMemberCode] = useState('');
  const [personName, setPersonName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [dependency, setDependency] = useState('TITULAR');
  const [gender, setGender] = useState<'VARON' | 'MUJER'>('VARON');
  const [lockerKey, setLockerKey] = useState('');
  const [towelNumber, setTowelNumber] = useState('');
  const [towelSize, setTowelSize] = useState<'NINGUNA' | 'GRANDE' | 'PEQUEÑA' | 'AMBAS'>('GRANDE');
  const [observations, setObservations] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Autocomplete Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Form Ref for quick focusing
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lockerInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchActiveLogs();
    fetchGatehouseEntries();

    const interval = setInterval(() => {
      fetchStats();
      fetchActiveLogs();
      fetchGatehouseEntries();
    }, 10000);

    return () => clearInterval(interval);
  }, [currentArea]);

  useEffect(() => {
    if (rightTab === 'HISTORIAL') {
      fetchHistoryLogs();
    }
  }, [rightTab, historyDate]);

  const fetchStats = async () => {
    try {
      const res = await api.get(`/access/area-stats?area=${currentArea}`);
      if (res.data?.success) {
        setStats(res.data.data);
        if (res.data.data?.totalLockers) {
          setConfigLockers(res.data.data.totalLockers);
        }
        if (res.data.data?.maxCapacity) {
          setConfigCapacity(res.data.data.maxCapacity);
        }
        if (res.data.data?.facilities && Array.isArray(res.data.data.facilities) && res.data.data.facilities.length > 0) {
          setConfigFacilities(res.data.data.facilities);
        }
        if (res.data.data?.poolTemp?.temperature) {
          setTempValue(res.data.data.poolTemp.temperature.toString());
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSaveTemperature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempValue || isNaN(parseFloat(tempValue))) {
      toast.error('Ingrese un valor de temperatura válido');
      return;
    }

    try {
      const res = await api.post('/access/pool-temperature', {
        temperature: parseFloat(tempValue),
        ambientTemp: ambientTempValue ? parseFloat(ambientTempValue) : undefined,
        phLevel: phValue ? parseFloat(phValue) : undefined,
        chlorineLevel: chlorineValue ? parseFloat(chlorineValue) : undefined,
        notes: tempNotes,
        recordedBy: 'Personal Piscina'
      });

      if (res.data?.success) {
        toast.success(`🌡️ Temperatura de ${tempValue}°C registrada con éxito`);
        setShowTempModal(false);
        setTempNotes('');
        fetchStats();
      }
    } catch (err: any) {
      console.error('Error saving temperature:', err);
      toast.error('Error al registrar temperatura');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/access/area-config', {
        area: currentArea,
        totalLockers: Number(configLockers) || (isPiscina ? 50 : 40),
        maxCapacity: Number(configCapacity) || (isPiscina ? 50 : 45),
        facilities: isPiscina ? configFacilities : undefined
      });

      if (res.data?.success) {
        toast.success(`⚙️ Configuración de ${currentArea} actualizada`);
        setShowConfigModal(false);
        fetchStats();
      }
    } catch (err: any) {
      console.error('Error updating config:', err);
      toast.error('Error al actualizar configuración');
    }
  };

  const fetchTempHistory = async () => {
    setLoadingTempHistory(true);
    try {
      const res = await api.get('/access/pool-temperature/history');
      if (res.data?.success) {
        setTempHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTempHistory(false);
    }
  };

  const fetchActiveLogs = async () => {
    try {
      const res = await api.get(`/access/area-logs?area=${currentArea}&status=DENTRO`);
      if (res.data?.success) {
        setActiveLogs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching active logs:', err);
    }
  };

  const fetchHistoryLogs = async () => {
    try {
      const res = await api.get(`/access/area-logs?area=${currentArea}&date=${historyDate}&status=ALL`);
      if (res.data?.success) {
        setHistoryLogs(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching history logs:', err);
    }
  };

  const fetchGatehouseEntries = async () => {
    try {
      const res = await api.get('/access/today-gatehouse');
      if (res.data?.success) {
        setGatehouseEntries(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching gatehouse entries:', err);
    }
  };

  // Instant Autocomplete Search
  const handleSearchChange = async (val: string) => {
    setMemberCode(val);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await api.get(`/access/search?q=${encodeURIComponent(val.trim())}`);
      if (res.data?.success && res.data.data?.length > 0) {
        setSuggestions(res.data.data.slice(0, 6));
        setShowSuggestions(true);
        setHighlightedIndex(0);
      } else {
        const matchedGatehouse = gatehouseEntries
          .filter(e => {
            const name = `${e.person?.firstName || ''} ${e.person?.lastName || ''} ${e.guest?.firstName || ''} ${e.guest?.lastName || ''}`.toLowerCase();
            return name.includes(val.toLowerCase());
          })
          .map(e => ({
            id: e.person?.id || e.guest?.id,
            firstName: e.person?.firstName || e.guest?.firstName || '',
            lastName: e.person?.lastName || e.guest?.lastName || '',
            documentId: e.person?.documentId || e.guest?.documentId || '',
            membershipNumber: e.person?.titularMemberships?.[0]?.membershipNumber || e.person?.beneficiaries?.[0]?.membership?.membershipNumber || 'S/C',
            personType: e.personType || 'SOCIO'
          }));
        
        setSuggestions(matchedGatehouse.slice(0, 5));
        setShowSuggestions(matchedGatehouse.length > 0);
        setHighlightedIndex(0);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSelectSuggestion = (s: any) => {
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
    setPersonName(fullName);
    setMemberCode(s.membershipNumber || s.memberCode || s.documentId || '');
    setDocumentId(s.documentId || '');
    setSelectedPersonId(s.id || null);

    if (s.personType === 'TITULAR' || s.personType === 'SOCIO') {
      setDependency('TITULAR');
    } else if (s.personType === 'GUEST' || s.personType === 'INVITADO') {
      setDependency('INVITADO');
    }

    if (s.gender) {
      setGender(s.gender.toUpperCase().includes('F') || s.gender.toUpperCase().includes('MUJER') ? 'MUJER' : 'VARON');
    }

    setShowSuggestions(false);
    setTimeout(() => {
      lockerInputRef.current?.focus();
    }, 50);
  };

  // Keyboard navigation for suggestions
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  // Populate form from Gatehouse Entry (Click or Drop)
  const populateFromGatehouse = (entry: GatehouseEntry) => {
    const fullName = entry.person 
      ? `${entry.person.firstName} ${entry.person.lastName}`.trim()
      : entry.guest ? `${entry.guest.firstName} ${entry.guest.lastName}`.trim() : 'Socio';
    
    const code = entry.person?.titularMemberships?.[0]?.membershipNumber 
      || entry.person?.beneficiaries?.[0]?.membership?.membershipNumber 
      || entry.person?.documentId 
      || entry.guest?.documentId 
      || '';

    setPersonName(fullName);
    setMemberCode(code);
    setDocumentId(entry.person?.documentId || entry.guest?.documentId || '');
    setSelectedPersonId(entry.person?.id || null);
    setDependency(entry.guest ? 'INVITADO' : 'TITULAR');

    if (entry.person?.gender) {
      setGender(entry.person.gender.toUpperCase().includes('F') || entry.person.gender.toUpperCase().includes('MUJER') ? 'MUJER' : 'VARON');
    }
    
    toast.success(`Cargado: ${fullName}`, {
      icon: '👤',
      duration: 2500
    });

    setTimeout(() => {
      lockerInputRef.current?.focus();
    }, 100);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, entry: GatehouseEntry) => {
    setDraggedMember(entry);
    e.dataTransfer.setData('application/json', JSON.stringify(entry));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const entry = JSON.parse(dataStr) as GatehouseEntry;
        populateFromGatehouse(entry);
      } else if (draggedMember) {
        populateFromGatehouse(draggedMember);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
    setDraggedMember(null);
  };

  // Submit new Area Access Log
  const handleRegisterAccess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!personName.trim()) {
      toast.error('Por favor ingrese o arrastre el socio a registrar');
      nameInputRef.current?.focus();
      return;
    }

    try {
      const payload = {
        area: currentArea,
        memberCode: memberCode.trim() || null,
        personName: personName.trim(),
        documentId: documentId.trim() || null,
        dependency,
        gender,
        lockerKey: lockerKey.trim() || null,
        towelNumber: towelNumber.trim() || null,
        towelQty: towelNumber.trim() ? 1 : 0,
        towelSize: towelNumber.trim() ? towelSize : 'NINGUNA',
        observations: observations.trim() || null,
        personId: selectedPersonId
      };

      const res = await api.post('/access/area-logs', payload);
      if (res.data?.success) {
        toast.success(`¡Ingreso registrado! (${personName})`, {
          icon: '✅',
          style: {
            borderRadius: '12px',
            background: '#0a100d',
            color: '#d4af37',
            border: '1px solid rgba(212,175,55,0.3)'
          }
        });

        // Reset form
        setMemberCode('');
        setPersonName('');
        setDocumentId('');
        setDependency('TITULAR');
        setGender('VARON');
        setLockerKey('');
        setTowelNumber('');
        setTowelSize('GRANDE');
        setObservations('');
        setSelectedPersonId(null);
        setShowSuggestions(false);

        // Refresh data
        fetchStats();
        fetchActiveLogs();
        setRightTab('DENTRO');

        // Refocus on search input for next entry
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      }
    } catch (err: any) {
      console.error('Error saving area log:', err);
      toast.error(err.response?.data?.message || 'Error al registrar el ingreso al área');
    }
  };

  // Exit & Return Key/Towels
  const handleRegisterExit = async (log: AreaLog) => {
    try {
      const res = await api.put(`/access/area-logs/${log.id}/exit`);
      if (res.data?.success) {
        toast.success(`Salida registrada para ${log.personName}. Llave/Toalla liberadas.`, {
          icon: '🚪'
        });
        fetchStats();
        fetchActiveLogs();
        if (rightTab === 'HISTORIAL') fetchHistoryLogs();
      }
    } catch (err: any) {
      console.error('Error registering exit:', err);
      toast.error('Error al registrar la salida');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = (rightTab === 'DENTRO' ? activeLogs : historyLogs).map(l => ({
      'Área': l.area,
      'Fecha / Hora Entrada': format(new Date(l.entryTime), 'dd/MM/yyyy HH:mm'),
      'Fecha / Hora Salida': l.exitTime ? format(new Date(l.exitTime), 'dd/MM/yyyy HH:mm') : 'DENTRO',
      'Código': l.memberCode || '-',
      'Nombre Concurrente': l.personName,
      'Dependencia': l.dependency,
      'Género': l.gender,
      'N° Llave / Locker': l.lockerKey || '-',
      'N° Toalla': (l.towelNumber || l.towelQty > 0) ? `Toalla #${l.towelNumber || l.towelQty} (${l.towelSize || 'Grande'})` : 'Ninguna',
      'Estado': l.status,
      'Observaciones': l.observations || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Accesos_${currentArea}`);
    XLSX.writeFile(wb, `Control_Acceso_${currentArea}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Archivo Excel generado exitosamente');
  };

  // Filtered Caseta entries with smart multi-area availability
  const availableCount = gatehouseEntries.filter(e => !e.activeArea && !e.hasLeftClub).length;
  const totalEnteredCount = gatehouseEntries.filter(e => !e.hasLeftClub).length;

  const filteredGatehouse = gatehouseEntries.filter(e => {
    // If DISPONIBLES mode is active, hide anyone currently active in ANY area or who has left the club
    if (casetaViewMode === 'DISPONIBLES') {
      if (e.hasLeftClub || e.activeArea) return false;
    }
    if (!casetaFilter.trim()) return true;
    const term = casetaFilter.toLowerCase();
    const name = `${e.person?.firstName || ''} ${e.person?.lastName || ''} ${e.guest?.firstName || ''} ${e.guest?.lastName || ''}`.toLowerCase();
    const doc = `${e.person?.documentId || ''} ${e.guest?.documentId || ''}`.toLowerCase();
    const code = `${e.person?.titularMemberships?.[0]?.membershipNumber || ''} ${e.person?.beneficiaries?.[0]?.membership?.membershipNumber || ''}`.toLowerCase();
    return name.includes(term) || doc.includes(term) || code.includes(term);
  });

  // Filtered active logs
  const filteredActiveLogs = activeLogs.filter(l => {
    if (!activeSearchFilter.trim()) return true;
    const term = activeSearchFilter.toLowerCase();
    return (
      l.personName.toLowerCase().includes(term) ||
      (l.memberCode && l.memberCode.toLowerCase().includes(term)) ||
      (l.lockerKey && l.lockerKey.toLowerCase().includes(term)) ||
      l.dependency.toLowerCase().includes(term)
    );
  });

  // Helper to check if a person from Caseta is already inside this area
  const isPersonAlreadyInside = (entry: GatehouseEntry) => {
    if (entry.activeArea && entry.activeArea.area === currentArea) return true;
    const pId = entry.person?.id;
    const gName = entry.guest ? `${entry.guest.firstName} ${entry.guest.lastName}`.trim() : null;
    const pName = entry.person ? `${entry.person.firstName} ${entry.person.lastName}`.trim() : null;

    return activeLogs.some(l => 
      (pId && l.person?.id === pId) || 
      (pName && l.personName.toLowerCase() === pName.toLowerCase()) ||
      (gName && l.personName.toLowerCase() === gName.toLowerCase())
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070b09] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 relative overflow-hidden flex flex-col justify-between">
      
      {/* Ambient background lighting */}
      <div className={`absolute top-0 right-1/4 w-[600px] h-[350px] ${isPiscina ? 'bg-cyan-500/10' : 'bg-emerald-500/10'} rounded-full blur-[140px] pointer-events-none -z-0`}></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[350px] bg-brand-gold/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>

      {/* Top Header */}
      <header className="relative z-10 w-full p-4 lg:px-8 flex justify-between items-center border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <BackButton to="/access-selection" title="Volver a Selección de Puntos" />
          <CrestLogo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase ${isPiscina ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}`}>
                {isPiscina ? 'ÁREA ACUÁTICA' : 'ÁREA FITNESS'}
              </span>
              <span className="text-xs text-gray-400 font-medium">Control de Acceso</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-extrabold text-gray-900 dark:text-white serif-brand tracking-tight flex items-center gap-2">
              {isPiscina ? <Waves className="w-6 h-6 text-cyan-400" /> : <Dumbbell className="w-6 h-6 text-emerald-400" />}
              {isPiscina ? 'Acceso a Piscina' : 'Acceso a Gimnasio'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold">
            <Clock className="w-4 h-4 text-brand-gold animate-pulse" />
            <span className="text-gray-500 dark:text-gray-400">{format(currentTime, "EEEE dd 'de' MMMM", { locale: es })}</span>
            <span className="text-brand-gold font-mono font-bold text-sm">{format(currentTime, 'HH:mm:ss')}</span>
          </div>

          {/* Temperature Badge in Piscina */}
          {isPiscina && (
            <button
              onClick={() => { setShowTempModal(true); fetchTempHistory(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold tracking-wider uppercase transition-all shadow-sm ${
                stats.poolTemp?.needsCheck
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse'
                  : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25'
              }`}
              title="Control de Temperatura del Agua (Cada 2 Horas)"
            >
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span>{stats.poolTemp?.temperature ? `${stats.poolTemp.temperature}°C` : 'Medir Temp.'}</span>
              {stats.poolTemp?.needsCheck && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>
          )}

          {/* Area Lockers & Capacity Config Button */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-brand-gold/20 hover:text-brand-gold text-gray-700 dark:text-gray-300 transition-all border border-gray-200 dark:border-white/10 shadow-sm"
            title="Configurar Capacidad Total y Casilleros Existentes"
          >
            <Settings className="w-4 h-4" />
          </button>

          <ThemeToggle />

          <button 
            onClick={() => navigate(`/access/${currentArea.toLowerCase()}/reports`)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-gold/15 hover:bg-brand-gold hover:text-black text-brand-gold transition-all text-xs font-extrabold tracking-wider uppercase border border-brand-gold/30 shadow-sm"
            title="Abrir Generador de Reportes e Historial"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Reportes
          </button>
        </div>
      </header>

      {/* PROMPT / ALERT BANNER: Pool Temperature Control every 2 hours */}
      {isPiscina && stats.poolTemp?.needsCheck && (
        <div className="relative z-10 w-full max-w-[1700px] mx-auto px-4 lg:px-8 pt-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-400 uppercase tracking-wide">
                  ⚠️ Control Periódico de Piscina Requerido (Cada 2 Horas)
                </h4>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  {stats.poolTemp?.recordedAt
                    ? `Última medición registrada hace ${stats.poolTemp.diffMinutes} minutos (${stats.poolTemp.temperature}°C). Por favor registre la temperatura actual.`
                    : 'Aún no se ha registrado la temperatura del agua hoy. Por favor realice la medición.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setShowTempModal(true); fetchTempHistory(); }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-amber-400 transition-all shadow-md shrink-0 flex items-center gap-1.5"
            >
              <Thermometer className="w-4 h-4" />
              Registrar Temperatura Ahora
            </button>
          </div>
        </div>
      )}

      {/* 4 KPI Metric Cards */}
      <div className="relative z-10 w-full max-w-[1700px] mx-auto px-4 lg:px-8 pt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between ${isPiscina ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} shadow-sm`}>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dentro Ahora</p>
              <h3 className={`text-2xl lg:text-3xl font-black ${isPiscina ? 'text-cyan-400' : 'text-emerald-400'} mt-0.5 tracking-tight`}>
                {stats.currentlyInside} <span className="text-xs font-bold text-gray-400">/ {stats.maxCapacity || 50}</span>
              </h3>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {Math.round((stats.currentlyInside / (stats.maxCapacity || 50)) * 100)}% de ocupación
              </span>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPiscina ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <Users className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-brand-gold/30 bg-brand-gold/10 backdrop-blur-md flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Lockers Disponibles</p>
              <h3 className="text-2xl lg:text-3xl font-black text-brand-gold mt-0.5 tracking-tight">
                {stats.lockersAvailable !== undefined ? stats.lockersAvailable : Math.max((stats.totalLockers || 50) - stats.lockersInUse, 0)} <span className="text-xs font-bold text-gray-400">/ {stats.totalLockers || 50}</span>
              </h3>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                {stats.lockersInUse} asignados ({stats.totalLockers ? Math.round((stats.lockersInUse / stats.totalLockers) * 100) : 0}% uso)
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 backdrop-blur-md flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Toallas Prestadas</p>
              <h3 className="text-2xl lg:text-3xl font-black text-blue-400 mt-0.5 tracking-tight">
                {stats.towelsLoanedToday}
              </h3>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Con número entregadas hoy</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {isPiscina ? (
            <div 
              onClick={() => setShowConfigModal(true)}
              className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md flex items-center justify-between shadow-sm cursor-pointer hover:border-cyan-400 transition-colors group"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  Piscinas 5C & 3C
                  <span className="text-[9px] text-cyan-400 font-extrabold uppercase">(Configurar)</span>
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight group-hover:scale-105 transition-transform font-mono">
                    5C: {(stats.facilities?.find(f => f.name.includes('5'))?.value || configFacilities.find(f => f.name.includes('5'))?.value || '30')}°
                  </h3>
                  <span className="text-gray-400 font-bold">&bull;</span>
                  <h3 className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight group-hover:scale-105 transition-transform font-mono">
                    3C: {(stats.facilities?.find(f => f.name.includes('3'))?.value || configFacilities.find(f => f.name.includes('3'))?.value || '30')}°
                  </h3>
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                  {stats.totalToday} ingresos registrados hoy
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                <Waves className="w-6 h-6" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 backdrop-blur-md flex items-center justify-between shadow-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Ingresos Hoy</p>
                <h3 className="text-2xl lg:text-3xl font-black text-purple-400 mt-0.5 tracking-tight">
                  {stats.totalToday}
                </h3>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Afluencia acumulada</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* WET ZONE TELEMETRY STRIP FOR PISCINA */}
      {isPiscina && (
        <div className="relative z-10 w-full max-w-[1700px] mx-auto px-4 lg:px-8 pt-3">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 dark:bg-[#07130e] border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-cyan-500/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Waves className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                    Telemetría del Área Húmeda & Saunas (En Vivo)
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      Visible a Socios
                    </span>
                  </h4>
                </div>
              </div>

              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Editar Temperaturas y Estados</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {(stats.facilities && stats.facilities.length > 0 ? stats.facilities : configFacilities).map((fac) => (
                <div 
                  key={fac.id} 
                  className="p-3 rounded-xl bg-black/5 dark:bg-white/[0.03] border border-gray-200 dark:border-cyan-500/20 flex flex-col justify-between hover:border-cyan-400/50 transition-all hover:-translate-y-0.5 group"
                >
                  <span className="text-[10px] font-black uppercase tracking-tight text-gray-600 dark:text-gray-400 truncate">
                    {fac.name}
                  </span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-base sm:text-lg font-black text-cyan-500 dark:text-cyan-400 tracking-tight group-hover:scale-105 transition-transform">
                      {fac.value}{fac.unit || ''}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {fac.status || 'OK'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3-COLUMN WORKSPACE: Caseta Feed (Left) + Fast Drop-Zone Form (Center) + Area Active List (Right) */}
      <main className="relative z-10 flex-1 max-w-[1700px] mx-auto w-full px-4 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* COLUMN 1: LIVE CASETA FEED / SOCIOS EN EL CLUB (3.5 Cols) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20 rounded-3xl p-5 shadow-xl flex flex-col h-[680px]">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3 mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-gold/20 text-brand-gold flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                  Socios en el Club
                </h3>
                <span className="text-[10px] text-brand-gold font-semibold uppercase tracking-wider">
                  Ingresos Caseta ({totalEnteredCount})
                </span>
              </div>
            </div>

            <button 
              onClick={fetchGatehouseEntries}
              title="Actualizar ingresos de caseta"
              className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 text-gray-400 hover:text-brand-gold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sub-Tabs: Disponibles vs Todos */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-white/5 mb-2.5 shrink-0">
            <button
              onClick={() => setCasetaViewMode('DISPONIBLES')}
              className={`py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                casetaViewMode === 'DISPONIBLES' 
                  ? 'bg-brand-gold text-black shadow-md font-extrabold' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Disponibles ({availableCount})
            </button>
            <button
              onClick={() => setCasetaViewMode('TODOS')}
              className={`py-1 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                casetaViewMode === 'TODOS' 
                  ? 'bg-brand-gold text-black shadow-md font-extrabold' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3 h-3" />
              Todos ({totalEnteredCount})
            </button>
          </div>

          {/* Instructions / Drag hint */}
          <div className="mb-2.5 px-2.5 py-1.5 rounded-xl bg-brand-gold/10 border border-brand-gold/20 text-[10px] text-brand-gold font-medium flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 shrink-0 animate-bounce" />
            <span>Haz clic o <strong>arrastra una tarjeta</strong> para asignarle llave.</span>
          </div>

          {/* Search Filter for Caseta */}
          <div className="relative mb-2.5 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar en caseta..."
              value={casetaFilter}
              onChange={(e) => setCasetaFilter(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold transition-all"
            />
          </div>

          {/* Draggable Cards Feed */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {filteredGatehouse.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                <DoorOpen className="w-10 h-10 text-gray-400 opacity-30 mb-2" />
                <p className="text-xs text-gray-400">
                  {casetaViewMode === 'DISPONIBLES' 
                    ? 'No hay socios disponibles sin asignar en el club.' 
                    : 'No hay ingresos registrados en caseta hoy aún.'}
                </p>
              </div>
            ) : (
              filteredGatehouse.map((entry) => {
                const name = entry.person 
                  ? `${entry.person.firstName} ${entry.person.lastName}`.trim()
                  : (entry.guest ? `${entry.guest.firstName} ${entry.guest.lastName}`.trim() : 'Socio');
                const code = entry.person?.titularMemberships?.[0]?.membershipNumber 
                  || entry.person?.beneficiaries?.[0]?.membership?.membershipNumber 
                  || entry.person?.documentId 
                  || entry.guest?.documentId 
                  || '-';
                const isInsideThisArea = isPersonAlreadyInside(entry);
                const activeOtherArea = entry.activeArea && entry.activeArea.area !== currentArea ? entry.activeArea : null;

                return (
                  <div
                    key={entry.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, entry)}
                    onClick={() => populateFromGatehouse(entry)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-grab active:cursor-grabbing select-none group relative ${
                      isInsideThisArea 
                        ? (isPiscina ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-emerald-500/5 border-emerald-500/30')
                        : activeOtherArea
                          ? 'bg-amber-500/5 border-amber-500/30 opacity-90'
                          : 'bg-gray-50 dark:bg-black/40 border-gray-200 dark:border-white/10 hover:border-brand-gold/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-gold/20 to-yellow-600/30 text-brand-gold font-bold text-xs flex items-center justify-center shrink-0 border border-brand-gold/30">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-gray-900 dark:text-white truncate group-hover:text-brand-gold transition-colors">
                            {name}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                            <span>Cód: <strong className="text-gray-700 dark:text-gray-300">{code}</strong></span>
                            <span>• {format(new Date(entry.timestamp), 'HH:mm')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status indicator or Action Button */}
                      <div className="shrink-0">
                        {entry.hasLeftClub ? (
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            🚪 Salió ({format(new Date(entry.timestamp), 'HH:mm')})
                          </span>
                        ) : isInsideThisArea ? (
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${isPiscina ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'} flex items-center gap-1`}>
                            <CheckCheck className="w-3 h-3" /> En este Área
                          </span>
                        ) : activeOtherArea ? (
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                            activeOtherArea.area === 'PISCINA' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          } flex items-center gap-1`}>
                            En {activeOtherArea.area} {activeOtherArea.lockerKey ? `(#${activeOtherArea.lockerKey})` : ''}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="p-1.5 rounded-lg bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-black transition-colors"
                            title="Cargar al formulario"
                          >
                            <MoveRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* COLUMN 2: FAST REGISTRATION FORM & DROP ZONE (4.5 Cols) */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`lg:col-span-4 xl:col-span-4 rounded-3xl p-6 shadow-xl relative overflow-visible transition-all duration-300 ${
            isDraggingOver 
              ? 'bg-brand-gold/15 dark:bg-brand-gold/10 border-2 border-dashed border-brand-gold scale-[1.01] shadow-[0_0_40px_rgba(212,175,55,0.35)]' 
              : 'bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/20'
          }`}
        >
          
          {/* Drop Overlay Indicator */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-brand-gold/20 backdrop-blur-sm rounded-3xl z-40 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-brand-gold animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-brand-gold text-black flex items-center justify-center mb-3 shadow-2xl animate-bounce">
                <Plus className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-extrabold text-brand-gold uppercase tracking-wider">¡Suelta la tarjeta aquí!</h3>
              <p className="text-xs text-white font-medium mt-1">Se cargarán automáticamente los datos del socio</p>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-brand-gold">Módulo de Asignación</span>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-gold" />
                Registro y Préstamos
              </h2>
            </div>
            <span className="text-[10px] bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-1 rounded font-mono font-bold">
              Tab ⇥ + Enter ↵
            </span>
          </div>

          <form onSubmit={handleRegisterAccess} className="space-y-3.5">
            
            {/* Field 1: Autocomplete Search / Socio Code */}
            <div className="relative">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                1. Buscar Socio / Código / CI <span className="text-brand-gold">*</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-brand-gold absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Código (ej. 1024), CI o arrastra de la izquierda..."
                  value={memberCode}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  tabIndex={1}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0c120f] border-2 border-brand-gold rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 animate-scaleIn">
                  <div className="p-2 bg-brand-gold/10 text-[10px] font-bold text-brand-gold uppercase tracking-wider flex justify-between">
                    <span>Sugerencias ({suggestions.length})</span>
                    <span>Enter ↵</span>
                  </div>
                  {suggestions.map((s, idx) => (
                    <div 
                      key={s.id || idx}
                      onClick={() => handleSelectSuggestion(s)}
                      className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${idx === highlightedIndex ? 'bg-brand-gold/20 text-brand-gold font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-brand-gold/20 text-brand-gold text-[10px] font-bold flex items-center justify-center">
                          {(s.firstName || s.personName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{s.firstName ? `${s.firstName} ${s.lastName}` : s.personName}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">Cód: {s.membershipNumber || s.memberCode || s.documentId || 'S/C'} • {s.personType || 'SOCIO'}</div>
                        </div>
                      </div>
                      <MoveRight className="w-3 h-3 text-brand-gold" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field 2: Nombre y Apellido + CI */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  2. Nombre y Apellido <span className="text-brand-gold">*</span>
                </label>
                <input 
                  ref={nameInputRef}
                  type="text"
                  placeholder="Nombre completo"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  tabIndex={2}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  3. CI / Doc
                </label>
                <input 
                  type="text"
                  placeholder="Doc ID"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  tabIndex={3}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-all"
                />
              </div>
            </div>

            {/* Field 3: Dependencia & Género */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  4. Dependencia
                </label>
                <select 
                  value={dependency}
                  onChange={(e) => setDependency(e.target.value)}
                  tabIndex={4}
                  className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold"
                >
                  {DEPENDENCIES.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  5. Género
                </label>
                <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setGender('VARON')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all ${gender === 'VARON' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}
                  >
                    Varón
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('MUJER')}
                    className={`py-1 text-xs font-bold rounded-lg transition-all ${gender === 'MUJER' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-500'}`}
                  >
                    Mujer
                  </button>
                </div>
              </div>
            </div>

            {/* Field 4: N° Llave y N° Toalla */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-brand-gold/5 border border-brand-gold/20">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-brand-gold mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> N° Llave / Locker
                </label>
                <input 
                  ref={lockerInputRef}
                  type="text"
                  placeholder="Ej: 14, B-02..."
                  value={lockerKey}
                  onChange={(e) => setLockerKey(e.target.value)}
                  tabIndex={6}
                  className="w-full bg-white dark:bg-black/60 border-2 border-brand-gold/40 rounded-xl px-3 py-2 text-xs font-black text-brand-gold placeholder:text-gray-400 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-blue-400 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-blue-400" /> N° Toalla y Tamaño
                </label>
                <div className="flex gap-1.5">
                  <input 
                    type="text"
                    placeholder="N° Toalla (ej: 45)"
                    value={towelNumber}
                    onChange={(e) => setTowelNumber(e.target.value)}
                    tabIndex={7}
                    className="w-1/2 bg-white dark:bg-black/60 border-2 border-blue-500/40 rounded-xl px-2.5 py-2 text-xs font-black text-blue-400 placeholder:text-gray-400 focus:outline-none focus:border-blue-400"
                  />
                  <select 
                    value={towelSize}
                    onChange={(e) => setTowelSize(e.target.value as any)}
                    tabIndex={8}
                    className="w-1/2 bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-2 py-2 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold"
                  >
                    <option value="GRANDE">Grande</option>
                    <option value="PEQUEÑA">Pequeña</option>
                    <option value="AMBAS">Ambas</option>
                    <option value="NINGUNA">Sin Toalla</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Field 5: Observaciones */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                7. Observaciones (Opcional)
              </label>
              <input 
                type="text"
                placeholder="Notas especiales, excepciones..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                tabIndex={9}
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                tabIndex={10}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-gold via-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-extrabold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Registrar Ingreso (Enter ↵)
              </button>
            </div>

          </form>

        </div>

        {/* COLUMN 3: Right Panel - DENTRO & HISTORIAL */}
        <div className="w-full xl:w-[460px] 2xl:w-[500px] flex flex-col h-full bg-white dark:bg-[#070c09] border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-brand-gold/20 shrink-0 overflow-hidden">
          
          {/* Header & Tabs */}
          <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/40 flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => setRightTab('DENTRO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  rightTab === 'DENTRO'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                En Área ({activeLogs.length})
              </button>

              <button
                onClick={() => {
                  setRightTab('HISTORIAL');
                  fetchHistoryLogs();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  rightTab === 'HISTORIAL'
                    ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-white'
                }`}
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                Historial del Día
              </button>
            </div>

            <button
              onClick={handleExportExcel}
              className="p-2 rounded-xl bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 transition-all text-xs font-bold flex items-center gap-1"
              title="Exportar a Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>

          {/* TAB 1: En Área (Activos) */}
          {rightTab === 'DENTRO' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {activeLogs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                    <LogOut className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">No hay personas registradas en {currentArea.toLowerCase()} en este momento.</p>
                </div>
              ) : (
                activeLogs.map((log) => {
                  return (
                    <div 
                      key={log.id} 
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        log.casetaExitDetected 
                          ? 'bg-red-500/10 border-red-500/60 shadow-lg shadow-red-500/10' 
                          : 'bg-black/5 dark:bg-white/[0.03] border-gray-200 dark:border-white/10 hover:border-brand-gold/30'
                      }`}
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold/30 to-brand-gold/10 text-brand-gold font-bold flex items-center justify-center shrink-0 border border-brand-gold/30 overflow-hidden">
                          {log.person?.photoUrl ? (
                            <img src={log.person.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{log.personName.charAt(0)}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-xs text-gray-900 dark:text-white truncate">
                              {log.personName}
                            </h4>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                              {log.dependency}
                            </span>
                            {log.memberCode && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-gold/15 text-brand-gold">
                                #{log.memberCode}
                              </span>
                            )}
                          </div>

                          {/* Caseta exit warning badge */}
                          {log.casetaExitDetected && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-black border border-red-500/40 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                              <span>⚠️ Salió de Caseta ({log.casetaExitTime ? format(new Date(log.casetaExitTime), 'HH:mm') : ''}) • Llave pendiente</span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-brand-gold/70" />
                              Entró: {format(new Date(log.entryTime), 'HH:mm')}
                            </span>
                            {log.documentId && <span>CI: {log.documentId}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Locker & Towels + Exit Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-white/5 shrink-0">
                        
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {log.lockerKey && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-gold/15 text-brand-gold text-[10px] font-bold border border-brand-gold/30">
                              <Key className="w-2.5 h-2.5" /> Llave #{log.lockerKey}
                            </span>
                          )}
                          {(log.towelNumber || log.towelQty > 0) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                              <Layers className="w-2.5 h-2.5" /> Toalla {log.towelNumber ? `#${log.towelNumber}` : `#${log.towelQty}`} {log.towelSize !== 'NINGUNA' ? `(${log.towelSize})` : ''}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRegisterExit(log)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            log.casetaExitDetected 
                              ? 'bg-red-500 text-white animate-bounce shadow-lg' 
                              : 'bg-black/10 dark:bg-white/10 hover:bg-red-500/20 hover:text-red-400'
                          }`}
                        >
                          Salida
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Historial del Día */}
          {rightTab === 'HISTORIAL' && (
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="mb-3 flex items-center justify-between">
                <input 
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="bg-black/5 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold"
                />
                <span className="text-xs text-gray-400 font-semibold">{historyLogs.length} accesos</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 uppercase text-[9px] tracking-wider">
                      <th className="py-2">Socio</th>
                      <th className="py-2">Ingreso</th>
                      <th className="py-2">Salida</th>
                      <th className="py-2">Insumos</th>
                      <th className="py-2 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {historyLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 text-xs">
                          No hay registros para la fecha seleccionada.
                        </td>
                      </tr>
                    ) : (
                      historyLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                          <td className="py-2">
                            <div className="font-bold text-gray-900 dark:text-white">{log.personName}</div>
                            <div className="text-[10px] text-gray-400">{log.dependency}</div>
                          </td>
                          <td className="py-2 text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                            {format(new Date(log.entryTime), 'HH:mm')}
                          </td>
                          <td className="py-2 text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                            {log.exitTime ? format(new Date(log.exitTime), 'HH:mm') : <span className="text-emerald-400 font-bold">DENTRO</span>}
                          </td>
                          <td className="py-2 text-[11px]">
                            <div className="text-gray-700 dark:text-gray-300 font-medium">
                              {log.lockerKey ? `Llave: #${log.lockerKey}` : '-'}
                            </div>
                            {(log.towelNumber || log.towelQty > 0) && (
                              <div className="text-[9px] text-blue-400 font-bold">
                                Toalla {log.towelNumber ? `#${log.towelNumber}` : `#${log.towelQty}`} {log.towelSize !== 'NINGUNA' ? `(${log.towelSize})` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${log.status === 'DENTRO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTRO Y CONTROL DE TEMPERATURA DEL AGUA (PISCINA)             */}
      {/* ========================================================================= */}
      {showTempModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1410] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 relative overflow-hidden">
            
            <div className="flex justify-between items-start border-b border-gray-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                    Control de Temperatura de Piscina
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Registro periódico obligatorio (cada 2 horas) para aforo y confort de los socios.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowTempModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemperature} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 block mb-1.5">
                    🌡️ Temperatura del Agua (°C) *
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.1"
                      min="15"
                      max="40"
                      required
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder="Ej: 28.5"
                      className="w-full bg-gray-50 dark:bg-black/40 border-2 border-cyan-500/40 focus:border-cyan-400 rounded-2xl py-3 px-4 text-xl font-extrabold text-gray-900 dark:text-white focus:outline-none"
                    />
                    <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-400">°C</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                    🌤️ Temp. Ambiente (°C)
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.1"
                      value={ambientTempValue}
                      onChange={(e) => setAmbientTempValue(e.target.value)}
                      placeholder="Ej: 22.0"
                      className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
                    />
                    <span className="absolute right-4 top-3.5 text-sm font-bold text-gray-400">°C</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                    🧪 Nivel de pH (7.2 - 7.6 óptimo)
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={phValue}
                    onChange={(e) => setPhValue(e.target.value)}
                    placeholder="Ej: 7.4"
                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                    💧 Cloro Libre (1.0 - 2.0 ppm)
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    value={chlorineValue}
                    onChange={(e) => setChlorineValue(e.target.value)}
                    placeholder="Ej: 1.5"
                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
                  />
                </div>

              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                  Observaciones del Agua / Caldera
                </label>
                <textarea 
                  rows={2}
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Ej: Caldera operando al 100%, agua cristalina y limpia."
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-2xl p-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTempModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Guardar Medición
                </button>
              </div>

            </form>

            {/* HISTORIAL RECIENTE DE MEDICIONES */}
            <div className="border-t border-gray-200 dark:border-white/10 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Historial de Mediciones Recientes
              </h4>
              <div className="max-h-36 overflow-y-auto custom-scrollbar">
                {tempHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">No hay registros de temperatura previos.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-gray-500 text-[10px] uppercase border-b border-white/5">
                        <th className="py-1">Fecha/Hora</th>
                        <th className="py-1">Agua</th>
                        <th className="py-1">pH / Cloro</th>
                        <th className="py-1">Registrado Por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {tempHistory.slice(0, 5).map((h) => (
                        <tr key={h.id}>
                          <td className="py-1 text-gray-400">{format(new Date(h.recordedAt), 'dd/MM HH:mm')}</td>
                          <td className="py-1 font-bold text-cyan-400">{h.temperature}°C</td>
                          <td className="py-1 text-gray-300">pH {h.phLevel || '-'} &bull; {h.chlorineLevel ? `${h.chlorineLevel}ppm` : '-'}</td>
                          <td className="py-1 text-gray-400">{h.recordedBy || 'Staff'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIGURACIÓN DE PISCINA / GIMNASIO                             */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-[#0c1410] border border-brand-gold/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex justify-between items-start border-b border-gray-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white">
                    Configuración de {currentArea}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Define la cantidad de casilleros existentes, aforo máximo y telemetría de instalaciones.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-gold block mb-1.5">
                    🔑 Total de Casilleros *
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={configLockers}
                    onChange={(e) => setConfigLockers(Number(e.target.value))}
                    placeholder="Ej: 50"
                    className="w-full bg-gray-50 dark:bg-black/40 border-2 border-brand-gold/40 focus:border-brand-gold rounded-2xl py-2.5 px-4 text-lg font-extrabold text-gray-900 dark:text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    💡 Casilleros disponibles se descuentan automáticamente.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1.5">
                    👥 Capacidad / Aforo Máximo *
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={configCapacity}
                    onChange={(e) => setConfigCapacity(Number(e.target.value))}
                    placeholder="Ej: 50"
                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-2xl py-2.5 px-4 text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    💡 Para cálculo del semáforo de ocupación en vivo.
                  </p>
                </div>
              </div>

              {/* TELEMETRÍA Y TEMPERATURAS DE INSTALACIONES (PISCINA & SAUNAS) */}
              {isPiscina && (
                <div className="pt-4 border-t border-gray-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Waves className="w-4 h-4" /> Telemetría Área Húmeda & Saunas (En Vivo para Socios)
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfigFacilities([...DEFAULT_PISCINA_FACILITIES])}
                      className="text-[10px] text-brand-gold hover:underline font-bold"
                    >
                      Restablecer valores
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Alimenta las temperaturas y estados operativos mostrados en tiempo real en la pantalla y portal de socios:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {configFacilities.map((fac, idx) => (
                      <div 
                        key={fac.id || idx} 
                        className="p-3 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-cyan-500/30 flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block truncate">
                            {fac.name}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {fac.type === 'TEMP' ? 'Temperatura medida' : 'Estado actual'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="text"
                            value={fac.value}
                            onChange={(e) => {
                              const updated = [...configFacilities];
                              updated[idx] = { ...updated[idx], value: e.target.value };
                              setConfigFacilities(updated);
                            }}
                            placeholder={fac.unit ? '30' : 'Ok'}
                            className="w-16 bg-white dark:bg-black/70 border-2 border-cyan-500/50 focus:border-cyan-400 rounded-xl py-1.5 px-2 text-center text-sm font-black text-gray-900 dark:text-white focus:outline-none"
                          />
                          {fac.unit ? (
                            <span className="text-xs font-black text-cyan-500 dark:text-cyan-400">{fac.unit}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-brand-gold text-black font-extrabold text-xs uppercase tracking-wider hover:bg-yellow-400 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default AreaAccessDashboard;
