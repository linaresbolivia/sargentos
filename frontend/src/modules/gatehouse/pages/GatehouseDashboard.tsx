import React, { useState, useRef } from 'react';
import { api } from '@config/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  LogOut,
  LogIn,
  Car, 
  AlertCircle, 
  Clock, 
  UserPlus, 
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Check,
  Waves,
  Dumbbell,
  Key,
  Layers,
  Receipt
} from 'lucide-react';
import { AccessLogHistory } from '../components/AccessLogHistory';
import type { AccessSearchResult } from '../types/gatehouse.types';
import { useDispatch } from 'react-redux';
import { logout } from '@store/authSlice';
import { AppDispatch } from '@store/store';
import { CrestLogo } from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { MemberHistoryModal } from '../components/MemberHistoryModal';
import { RegisterGuestModal } from '../components/RegisterGuestModal';
import { EditAccessModal } from '../components/EditAccessModal';
import { RegisterStandalonePersonModal } from '../components/RegisterStandalonePersonModal';
import { GatehouseInvoiceReceiptModal } from '../components/GatehouseInvoiceReceiptModal';
import { Edit2 } from 'lucide-react';

export const GatehouseDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'SOCIO' | 'RECIPROCITY' | 'EXTERNAL'>('SOCIO');
  const [searchResults, setSearchResults] = useState<AccessSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AccessSearchResult | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);
  const [isPendingLoansModalOpen, setIsPendingLoansModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  
  const [observation, setObservation] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [accessMethod, setAccessMethod] = useState<'VEHICLE' | 'TAXI' | 'PEDESTRIAN' | null>(null);
  const [actionType, setActionType] = useState<'ENTRY' | 'EXIT' | null>(null);
  const [accessPersonType, setAccessPersonType] = useState<string>('SOCIO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const plateRef = useRef<any>(null);
  const vehicleRadioRef = useRef<HTMLInputElement>(null);
  const taxiRadioRef = useRef<HTMLInputElement>(null);
  const pedestrianRadioRef = useRef<HTMLInputElement>(null);

  const socioRadioRef = useRef<HTMLInputElement>(null);
  const guestRadioRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    
    if (val.length < 2) {
      setSearchResults([]);
      setSelectedMember(null);
      return;
    }

    try {
      const response = await api.get(`/access/search?q=${val}&type=${searchType}`);
      setHasSearched(true);
      if (response.data.success) {
        setSearchResults(response.data.data);
        if (response.data.data.length === 1) {
          handleSelectMember(response.data.data[0], false);
        } else if (response.data.data.length > 0 && selectedMember) {
          // Keep selection if it's still in results, else clear
          const stillExists = response.data.data.find((m: any) => m.personId === selectedMember.personId);
          if (!stillExists) setSelectedMember(null);
        } else {
          setSelectedMember(null);
        }
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleSelectMember = (member: AccessSearchResult, focusPlate: boolean = false) => {
    setSelectedMember(member);
    setObservation('');
    setAccessMethod('VEHICLE');
    setAccessPersonType(member.personType || 'SOCIO');
    setVehiclePlate(member.lastVehiclePlate || member.vehicles[0]?.plate || '');
    setActionType(member.currentLocation === 'INSIDE' ? 'EXIT' : 'ENTRY');
    setSearchResults([]);
    if (focusPlate) {
      const isVip = member.personType === 'INVITADO_VIP' || member.personId?.startsWith('vip_');
      setTimeout(() => {
        if (isVip) {
          vehicleRadioRef.current?.focus();
        } else {
          socioRadioRef.current?.focus();
        }
      }, 50);
    }
  };

  const handleRegisterAccess = async (
    forceGranted: boolean = false, 
    itemsReceivedAtGatehouse: boolean = false, 
    forceWithoutItems: boolean = false
  ) => {
    if (!selectedMember) return;
    
    const effectiveAction = actionType || (selectedMember.currentLocation === 'INSIDE' ? 'EXIT' : 'ENTRY');

    // Intercept EXIT if member has unreturned area items and guard hasn't confirmed action in modal
    if (
      effectiveAction === 'EXIT' && 
      selectedMember.pendingAreaLoans && 
      selectedMember.pendingAreaLoans.length > 0 && 
      !itemsReceivedAtGatehouse && 
      !forceWithoutItems
    ) {
      setIsPendingLoansModalOpen(true);
      return;
    }
    
    if (!accessMethod) {
      toast.error('Debe seleccionar un método de acceso (Vehicular, Taxi o Peatonal)');
      return;
    }

    if (accessMethod === 'VEHICLE' && !vehiclePlate.trim()) {
      toast.error('Debe ingresar la placa del vehículo');
      plateRef.current?.focus();
      return;
    }
    
    setIsSubmitting(true);
    try {
      let finalStatus = selectedMember.status;
      let finalObservation = observation;
      
      if (forceGranted) {
        finalStatus = 'GRANTED';
        finalObservation = `[ACCESO FORZADO] ${observation}`;
      }

      if (forceWithoutItems) {
        finalObservation = `[SALIDA FORZADA - INSUMOS NO DEVUELTOS] ${observation}`;
      } else if (itemsReceivedAtGatehouse) {
        finalObservation = `[INSUMOS RECIBIDOS EN CASETA] ${observation}`;
      }

      let logObservation = finalObservation.trim();
      if (selectedMember.personId.startsWith('vip_')) {
        const vipName = selectedMember.fullName.replace('⭐ ', '');
        logObservation = logObservation ? `${vipName} • ${logObservation}` : vipName;
      }

      await api.post('/access/log', {
        personId: selectedMember.personId,
        gate: 'Puerta Principal',
        method: accessMethod === 'VEHICLE' ? 'Manual' : (accessMethod === 'TAXI' ? 'Taxi' : 'Peatonal'),
        actionType: effectiveAction,
        status: finalStatus,
        reason: selectedMember.reason,
        observation: logObservation,
        vehiclePlate: accessMethod === 'VEHICLE' ? (vehiclePlate || undefined) : undefined,
        personType: accessPersonType,
        itemsReceivedAtGatehouse
      });

      if (itemsReceivedAtGatehouse) {
        toast.success('¡Insumos recibidos en Caseta y Salida Registrada!', { icon: '📥', duration: 4000 });
      } else if (forceWithoutItems) {
        toast('Salida registrada con Incidencia de Seguridad (Insumos no devueltos)', { icon: '⚠️', duration: 5000 });
      } else {
        toast.success(finalStatus === 'GRANTED' 
          ? (effectiveAction === 'EXIT' ? 'Salida Registrada' : 'Ingreso Registrado') 
          : 'Denegación Registrada');
      }
      
      // Reset
      setIsPendingLoansModalOpen(false);
      setSearchTerm('');
      setHasSearched(false);
      setSelectedMember(null);
      setObservation('');
      setVehiclePlate('');
      setAccessMethod(null);
      setActionType(null);
      setRefreshTrigger(prev => prev + 1); // Trigger history refresh if needed (handled by interval mostly)
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar acceso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050806] text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="h-20 border-b border-emerald-500/30 dark:border-emerald-500/40 flex items-center justify-between px-6 lg:px-8 bg-white/90 dark:bg-gradient-to-r dark:from-[#061c12] dark:via-[#04140d] dark:to-[#020b07] backdrop-blur-xl shadow-[0_0_25px_rgba(16,185,129,0.12)] shrink-0 transition-all">
        <div className="flex items-center gap-4">
          <BackButton to="/access-selection" title="Volver a Selección de Puntos" />
          <CrestLogo size="sm" />
          <div>
            <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest leading-none block">Club Hípico Los Sargentos</span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white serif-brand leading-tight tracking-tight">
              Control de Garita & Portería Principal
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-500/40 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Recepción rápida de facturas (Luz, Agua, Gas, etc.)"
          >
            <Receipt className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Recibir Factura</span>
          </button>
          <ThemeToggle />
          <button 
            onClick={() => dispatch(logout())}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-600 dark:text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        
        {/* Left/Center Panel - Search & Decision */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 md:gap-8 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#030906] transition-colors duration-200 relative overflow-hidden">
          
          {/* Ambient background lighting */}
          <div className="absolute top-0 right-1/4 w-[650px] h-[450px] bg-emerald-500/15 rounded-full blur-[150px] pointer-events-none -z-0"></div>
          <div className="absolute top-1/3 left-1/4 w-[550px] h-[400px] bg-brand-gold/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>
          <div className="absolute bottom-0 right-1/3 w-[700px] h-[450px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none -z-0"></div>

          {/* Search Bar Container */}
          <div className="relative max-w-3xl mx-auto w-full mt-2 group z-10">
            <div className="flex justify-center gap-3 sm:gap-5 mb-4">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer transition-all border-2 ${
                searchType === 'SOCIO'
                  ? 'bg-gradient-to-r from-emerald-600/25 to-teal-600/25 border-emerald-400 text-slate-950 dark:text-emerald-300 font-black shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  : 'bg-white/40 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 font-bold'
              }`}>
                <input 
                  type="radio" 
                  name="searchType" 
                  value="SOCIO"
                  checked={searchType === 'SOCIO'} 
                  onChange={() => { setSearchType('SOCIO'); setSearchResults([]); setSearchTerm(''); setHasSearched(false); }} 
                  className="text-emerald-500 focus:ring-emerald-500 accent-emerald-500 w-4 h-4" 
                /> 
                <span>Socio CHLS</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer transition-all border-2 ${
                searchType === 'RECIPROCITY'
                  ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border-brand-gold text-slate-950 dark:text-brand-gold font-black shadow-[0_0_20px_rgba(234,179,8,0.35)]'
                  : 'bg-white/40 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 font-bold'
              }`}>
                <input 
                  type="radio" 
                  name="searchType" 
                  value="RECIPROCITY"
                  checked={searchType === 'RECIPROCITY'} 
                  onChange={() => { setSearchType('RECIPROCITY'); setSearchResults([]); setSearchTerm(''); setHasSearched(false); }} 
                  className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4" 
                /> 
                <span>Reciprocidad</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-2xl cursor-pointer transition-all border-2 ${
                searchType === 'EXTERNAL'
                  ? 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25 border-purple-400 text-slate-950 dark:text-purple-300 font-black shadow-[0_0_20px_rgba(168,85,247,0.35)]'
                  : 'bg-white/40 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 font-bold'
              }`}>
                <input 
                  type="radio" 
                  name="searchType" 
                  value="EXTERNAL"
                  checked={searchType === 'EXTERNAL'} 
                  onChange={() => { setSearchType('EXTERNAL'); setSearchResults([]); setSearchTerm(''); setHasSearched(false); }} 
                  className="text-purple-500 focus:ring-purple-500 accent-purple-500 w-4 h-4" 
                /> 
                <span>Externo / Visita</span>
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-emerald-400 transition-transform group-focus-within:scale-110" />
              </div>
              <input 
                ref={searchRef}
                type="text"
                placeholder={searchType === 'SOCIO' ? "Buscar por Nº carnet, CI, nombre o apellido..." : `Buscar ${searchType === 'RECIPROCITY' ? 'socio de reciprocidad' : 'externo'}...`}
                value={searchTerm}
                onChange={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedMember) {
                    const isVip = selectedMember.personType === 'INVITADO_VIP' || selectedMember.personId?.startsWith('vip_');
                    if (isVip) {
                      vehicleRadioRef.current?.focus();
                    } else {
                      socioRadioRef.current?.focus();
                    }
                  } else if (searchResults.length >= 1) {
                    handleSelectMember(searchResults[0], true);
                  }
                }
              }}
              className="block w-full pl-16 pr-6 py-5 border-2 border-emerald-500/40 dark:border-emerald-500/50 rounded-3xl leading-5 bg-white/90 dark:bg-gradient-to-r dark:from-[#062217] dark:via-[#041911] dark:to-[#020f0a] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:shadow-[0_0_45px_rgba(16,185,129,0.45)] shadow-[0_10px_35px_rgba(16,185,129,0.15)] text-lg backdrop-blur-xl transition-all"
            />
          </div>

            {/* Autocomplete Results Dropdown */}
            {searchResults.length > 0 && !selectedMember && (
              <div className="absolute z-50 w-full mt-2 bg-white/95 dark:bg-[#071d14]/95 border-2 border-emerald-500/40 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.25)] max-h-80 overflow-y-auto backdrop-blur-2xl">
                {searchResults.map((member) => (
                  <div 
                    key={member.personId}
                    onClick={() => handleSelectMember(member, true)}
                    className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between cursor-pointer hover:bg-emerald-500/10 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{member.fullName}</p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">ID: {member.documentId} | Membresía: <span className="text-emerald-400 font-bold">{member.membershipNumber}</span> ({member.membershipType})</p>
                    </div>
                    <div className={`w-3.5 h-3.5 rounded-full ${member.status === 'GRANTED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedMember ? (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full mt-2 z-10">
              
              {/* Top Row: Profile & Status (Symmetrical) */}
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                {/* Member Card */}
                <div className="flex-1 w-full bg-white/90 dark:bg-gradient-to-br dark:from-[#09291b] dark:via-[#051c12] dark:to-[#020e08] rounded-3xl border-2 border-emerald-500/40 p-7 shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-xl transition-all duration-300 flex flex-col justify-center">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full mb-4 overflow-hidden flex items-center justify-center border-2 border-brand-gold/60 shadow-[0_0_20px_rgba(234,179,8,0.4)] bg-gradient-to-br from-amber-300 via-brand-gold to-yellow-600">
                      {selectedMember.photoUrl ? (
                        <img src={selectedMember.photoUrl} alt="Socio" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-black text-slate-950 drop-shadow-md">{selectedMember.fullName.charAt(0)}</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 serif-brand">{selectedMember.fullName}</h2>
                    <p className="text-slate-500 dark:text-gray-300 text-sm mb-1 font-medium">CI/ID: <span className="text-slate-900 dark:text-white font-mono font-bold">{selectedMember.documentId}</span></p>
                    <p className="text-slate-500 dark:text-gray-300 text-sm font-medium">Membresía: <span className="text-emerald-400 font-bold">{selectedMember.membershipNumber} ({selectedMember.membershipType})</span></p>
                  </div>
                </div>

                {/* Giant Status Indicator */}
                {(() => {
                  const isExiting = actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE';
                  const hasPendingLoans = selectedMember.pendingAreaLoans && selectedMember.pendingAreaLoans.length > 0;

                  if (isExiting) {
                    return (
                      <div className="flex-1 w-full rounded-3xl border-2 p-7 shadow-[0_0_35px_rgba(245,158,11,0.25)] bg-white/90 dark:bg-gradient-to-br dark:from-[#362a08] dark:via-[#211a04] dark:to-[#120e02] border-amber-500/50 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                        <LogOut className="w-20 h-20 text-amber-400 mb-3 animate-pulse" />
                        <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wide mb-1">
                          Registrando Salida del Club
                        </h2>
                        {hasPendingLoans ? (
                          <p className="text-amber-200 font-bold text-xs bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/40 mt-1">
                            ⚠️ Insumos de Piscina/Gimnasio pendientes por entregar en Caseta
                          </p>
                        ) : (
                          <p className="text-slate-600 dark:text-gray-300 text-xs font-medium">
                            Socio/Invitado registrado actualmente dentro del Club Hípico.
                          </p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className={`flex-1 w-full rounded-3xl border-2 p-7 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur-xl transition-all duration-300 flex flex-col items-center justify-center text-center ${
                      selectedMember.status === 'GRANTED' 
                        ? 'bg-white/90 dark:bg-gradient-to-br dark:from-[#093120] dark:via-[#051e13] dark:to-[#020f09] border-emerald-500/50 shadow-[0_0_45px_rgba(16,185,129,0.35)]' 
                        : 'bg-white/90 dark:bg-gradient-to-br dark:from-[#330c0c] dark:via-[#1f0606] dark:to-[#100303] border-rose-500/50 shadow-[0_0_45px_rgba(244,63,94,0.35)]'
                    }`}>
                      {selectedMember.status === 'GRANTED' ? (
                        <>
                          <CheckCircle className="w-22 h-22 text-emerald-400 mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                          <h2 className="text-3xl font-black text-emerald-400 tracking-wide mb-2 serif-brand">Acceso Concedido</h2>
                          <p className="text-slate-600 dark:text-gray-300 font-medium">Sin deuda pendiente &bull; Membresía Vigente</p>
                          {selectedMember.lastPaymentDate && (
                            <p className="text-xs text-slate-400 dark:text-gray-400 mt-1">Último pago: {new Date(selectedMember.lastPaymentDate).toLocaleDateString()}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-22 h-22 text-rose-500 mb-3 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                          <h2 className="text-3xl font-black text-rose-500 tracking-wide mb-2 serif-brand">Acceso Denegado</h2>
                          <p className="text-slate-800 dark:text-gray-200 font-bold">{selectedMember.reason || 'Restricción Administrativa'}</p>
                          {selectedMember.totalDebt > 0 && (
                            <p className="text-rose-500 dark:text-rose-400 font-black mt-2 text-lg">Deuda Pendiente: ${selectedMember.totalDebt.toLocaleString()}</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Warning Banner: Insumos Pendientes de Devolución */}
              {selectedMember.pendingAreaLoans && selectedMember.pendingAreaLoans.length > 0 && (
                <div className="w-full bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 border-2 border-amber-500/60 rounded-3xl p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse backdrop-blur-xl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                          ¡Alerta Caseta!
                        </span>
                        <h4 className="font-black text-sm text-amber-400 uppercase tracking-wide">
                          Insumos del Club Pendientes de Devolución
                        </h4>
                      </div>
                      <div className="text-xs text-slate-800 dark:text-gray-200 mt-1 flex flex-wrap gap-2">
                        {selectedMember.pendingAreaLoans.map((loan) => (
                          <span key={loan.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-black/50 border border-amber-500/40 text-white font-bold text-xs">
                            {loan.area === 'PISCINA' ? <Waves className="w-3.5 h-3.5 text-cyan-400" /> : <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />}
                            <strong>{loan.area}:</strong> 
                            {loan.lockerKey ? ` Casillero #${loan.lockerKey}` : ''}
                            {(loan.towelNumber || loan.towelQty > 0) ? ` • Toalla #${loan.towelNumber || loan.towelQty} (${loan.towelSize || ''})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-xs text-amber-300 font-bold bg-black/50 px-3.5 py-2 rounded-2xl border border-amber-500/40">
                      👉 Solicitar entrega antes de permitir salida
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Row: Entry/Exit Form */}
              <div className="w-full bg-white/90 dark:bg-gradient-to-br dark:from-[#09291b] dark:via-[#051c12] dark:to-[#020e08] rounded-3xl border-2 border-emerald-500/40 p-7 shadow-[0_0_35px_rgba(16,185,129,0.2)] backdrop-blur-xl transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  {/* Left Column */}
                  <div className="flex flex-col gap-6">
                    {/* Tipo de Acceso */}
                    {(() => {
                      const isVipGuest = selectedMember?.personType === 'INVITADO_VIP' || selectedMember?.personId?.startsWith('vip_');
                      return (
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                              Tipo de Acceso
                            </h3>
                            {isVipGuest && (
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40 flex items-center gap-1 shadow-xs">
                                🔒 Invitado VIP (Fijo)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${accessPersonType === 'SOCIO' && !isVipGuest ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300'} ${isVipGuest ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input 
                                ref={socioRadioRef}
                                type="radio" 
                                name="accessPersonType" 
                                value="SOCIO" 
                                disabled={isVipGuest}
                                checked={accessPersonType === 'SOCIO' && !isVipGuest} 
                                onChange={() => !isVipGuest && setAccessPersonType('SOCIO')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); vehicleRadioRef.current?.focus(); }
                                  else if (e.key === 'Tab') { 
                                    e.preventDefault(); 
                                    if (e.shiftKey) {
                                      guestRadioRef.current?.focus();
                                    } else {
                                      setAccessPersonType('GUEST');
                                      guestRadioRef.current?.focus(); 
                                    }
                                  }
                                }}
                                className="text-emerald-500 focus:ring-emerald-500 accent-emerald-500 w-4 h-4"
                              />
                              <span className="text-sm font-bold">Socio</span>
                            </label>
                            <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${accessPersonType === 'GUEST' || isVipGuest ? 'bg-amber-500/20 border-brand-gold text-brand-gold font-bold' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300'} ${isVipGuest ? 'opacity-90 cursor-not-allowed font-extrabold text-brand-gold' : 'cursor-pointer'}`}>
                              <input 
                                ref={guestRadioRef}
                                type="radio" 
                                name="accessPersonType" 
                                value="GUEST" 
                                disabled={isVipGuest}
                                checked={accessPersonType === 'GUEST' || isVipGuest} 
                                onChange={() => !isVipGuest && setAccessPersonType('GUEST')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { 
                                    e.preventDefault(); 
                                    if (!isVipGuest) setIsGuestModalOpen(true);
                                  }
                                  else if (e.key === 'Tab') {
                                    e.preventDefault();
                                    if (e.shiftKey) {
                                      setAccessPersonType('SOCIO');
                                      socioRadioRef.current?.focus();
                                    } else {
                                      vehicleRadioRef.current?.focus();
                                    }
                                  }
                                }}
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm font-bold">
                                {isVipGuest ? 'Invitado VIP' : 'Invitado'}
                              </span>
                            </label>
                          </div>
                          
                          {accessPersonType === 'GUEST' && !isVipGuest && (
                            <div className="mt-4">
                              <button 
                                type="button"
                                onClick={() => setIsGuestModalOpen(true)}
                                className="w-full bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold transition-colors py-2.5 px-6 rounded-2xl text-sm font-black flex items-center justify-center gap-2 border-2 border-brand-gold/40 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                              >
                                <UserPlus className="w-4 h-4" />
                                Registrar Invitado
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Registro de Acceso */}
                    <div className="flex flex-col">
                      <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-3">
                        Registro de Acceso
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${accessMethod === 'VEHICLE' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300'} cursor-pointer`}>
                          <input 
                            ref={vehicleRadioRef}
                            type="radio" 
                            name="accessMethod" 
                            value="VEHICLE" 
                            checked={accessMethod === 'VEHICLE'} 
                            onChange={() => setAccessMethod('VEHICLE')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (accessMethod === 'VEHICLE') {
                                  plateRef.current?.focus();
                                }
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                  socioRadioRef.current?.focus();
                                } else {
                                  setAccessMethod('PEDESTRIAN');
                                  pedestrianRadioRef.current?.focus();
                                }
                              }
                            }}
                            className="text-emerald-500 focus:ring-emerald-500 accent-emerald-500 w-4 h-4"
                          />
                          <Car className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold">Vehículo</span>
                        </label>
                        <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${accessMethod === 'PEDESTRIAN' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300'} cursor-pointer`}>
                          <input 
                            ref={pedestrianRadioRef}
                            type="radio" 
                            name="accessMethod" 
                            value="PEDESTRIAN" 
                            checked={accessMethod === 'PEDESTRIAN'} 
                            onChange={() => setAccessMethod('PEDESTRIAN')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRegisterAccess();
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                  setAccessMethod('VEHICLE');
                                  vehicleRadioRef.current?.focus();
                                } else {
                                  setAccessMethod('TAXI');
                                  taxiRadioRef.current?.focus();
                                }
                              }
                            }}
                            className="text-emerald-500 focus:ring-emerald-500 accent-emerald-500 w-4 h-4"
                          />
                          <span className="text-sm font-bold">Peatón</span>
                        </label>
                        <label className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border ${accessMethod === 'TAXI' ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300'} cursor-pointer`}>
                          <input 
                            ref={taxiRadioRef}
                            type="radio" 
                            name="accessMethod" 
                            value="TAXI" 
                            checked={accessMethod === 'TAXI'} 
                            onChange={() => setAccessMethod('TAXI')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRegisterAccess();
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                  setAccessMethod('PEDESTRIAN');
                                  pedestrianRadioRef.current?.focus();
                                } else {
                                  if (accessMethod === 'VEHICLE') {
                                    plateRef.current?.focus();
                                  }
                                }
                              }
                            }}
                            className="text-emerald-500 focus:ring-emerald-500 accent-emerald-500 w-4 h-4"
                          />
                          <span className="text-sm font-bold">Taxi / App</span>
                        </label>
                      </div>
                    </div>

                    {/* Placa del Vehículo */}
                    <div className="flex flex-col">
                      <label className="block text-xs text-slate-500 dark:text-gray-400 font-black uppercase tracking-wider mb-2">Placa del Vehículo</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Car className="h-4 w-4 text-emerald-400" />
                        </div>
                        {selectedMember.vehicles && selectedMember.vehicles.length > 0 ? (
                          <select 
                            ref={plateRef}
                            value={vehiclePlate} 
                            onChange={(e) => setVehiclePlate(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRegisterAccess();
                              }
                            }}
                            className="w-full bg-slate-50 dark:bg-black/50 border-2 border-emerald-500/30 rounded-2xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400 appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                            disabled={accessMethod !== 'VEHICLE'}
                          >
                            <option value="">Ingresó a pie / Otro vehículo</option>
                            {selectedMember.vehicles.map(v => (
                              <option key={v.plate} value={v.plate}>{v.plate} - {v.brand} {v.model}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            ref={plateRef}
                            type="text" 
                            placeholder="Ej. 1234ABC"
                            value={vehiclePlate}
                            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRegisterAccess();
                              }
                            }}
                            className="w-full bg-slate-50 dark:bg-black/50 border-2 border-emerald-500/30 rounded-2xl pl-10 pr-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400 placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase font-mono"
                            disabled={accessMethod !== 'VEHICLE'}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col">
                      <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-3">Observaciones</h3>
                      <textarea 
                        placeholder="Compañantes, novedades, etc."
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        className="w-full flex-1 min-h-[120px] bg-slate-50 dark:bg-black/50 border-2 border-emerald-500/30 rounded-2xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-400 placeholder:text-slate-400 dark:placeholder:text-gray-500 transition-colors resize-none font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  {(actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE' || selectedMember.status === 'GRANTED') ? (
                    <button 
                      onClick={() => handleRegisterAccess(false)}
                      disabled={isSubmitting}
                      className={`flex-1 ${(actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE') ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.4)]'} font-black py-4 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 tracking-wider uppercase text-sm cursor-pointer hover:scale-105 active:scale-95`}
                    >
                      {isSubmitting ? 'Registrando...' : ((actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE') ? '🚪 Registrar Salida del Club' : '✓ Registrar Ingreso al Club')}
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleRegisterAccess(false)}
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black py-4 rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.4)] transition-all text-sm tracking-wide disabled:opacity-50 hover:scale-105 active:scale-95 cursor-pointer uppercase"
                      >
                        {isSubmitting ? 'Registrando...' : 'Registrar Denegación'}
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setActionType('EXIT');
                          setTimeout(() => {
                            handleRegisterAccess(false);
                          }, 50);
                        }}
                        disabled={isSubmitting}
                        className="px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0 hover:scale-105 active:scale-95"
                        title="Registrar Salida de la persona aunque el pase/membresía esté denegado"
                      >
                        <LogOut className="w-4 h-4 text-slate-950" />
                        <span>🚪 Registrar Salida</span>
                      </button>

                      <button 
                        onClick={() => {
                          if(window.confirm('¿Está seguro que desea FORZAR el ingreso de este socio/invitado a pesar de tener el acceso denegado? Esto quedará registrado.')) {
                            handleRegisterAccess(true);
                          }
                        }}
                        disabled={isSubmitting}
                        className="px-6 bg-transparent border-2 border-rose-500/50 text-rose-400 hover:bg-rose-500/15 font-black py-4 rounded-2xl transition-all text-xs flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer uppercase"
                      >
                        <AlertCircle className="w-4 h-4" /> Forzar Acceso
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {!selectedMember && searchResults.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-10 relative overflow-hidden z-10">
              
              {/* Standby Central Card Ultra-Lujo Verde Esmeralda */}
              <div className="w-full max-w-3xl bg-white/95 dark:bg-gradient-to-br dark:from-[#092d1e] dark:via-[#051c12] dark:to-[#020e08] p-10 sm:p-14 rounded-[3rem] relative z-10 flex flex-col items-center border-2 border-emerald-500/40 dark:border-emerald-400/50 shadow-[0_0_60px_rgba(16,185,129,0.25),0_0_120px_rgba(16,185,129,0.12)] backdrop-blur-2xl overflow-hidden group hover:border-emerald-400 transition-all duration-500">
                
                {/* Radiant Cyber Sonar Rings */}
                <div className="relative mb-10">
                  <div className="absolute inset-0 border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(16,185,129,0.5)] rounded-full animate-ping" style={{ animationDuration: '2.5s' }}></div>
                  <div className="absolute inset-[-25px] border-2 border-brand-gold/60 shadow-[0_0_25px_rgba(234,179,8,0.5)] rounded-full animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}></div>
                  <div className="absolute inset-[-50px] border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-full animate-ping" style={{ animationDuration: '4.5s', animationDelay: '1.6s' }}></div>
                  
                  <div className="w-44 h-44 bg-gradient-to-br from-emerald-500/20 via-black/60 to-brand-gold/20 backdrop-blur-xl border-2 border-emerald-400/60 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform duration-500">
                    <CrestLogo size="lg" />
                  </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Sistema de Seguridad & Garita Activo
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 tracking-[0.08em] mb-4 text-center serif-brand drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  PUNTO DE CONTROL INGRESO
                </h2>
                
                <div className="h-1 w-32 bg-gradient-to-r from-transparent via-emerald-400 to-transparent mb-6 rounded-full"></div>
                
                <div className="bg-slate-100/80 dark:bg-black/50 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 text-center max-w-lg relative overflow-hidden shadow-inner mb-8">
                  <p className="text-slate-700 dark:text-gray-200 text-sm font-medium leading-relaxed">
                    Sistema de seguridad activo en tiempo real. Ingrese el <strong className="text-brand-gold">Nº Carnet / CI</strong>, <strong className="text-brand-gold">Nombre</strong> o <strong className="text-brand-gold">Placa</strong> del vehículo en la barra superior para validar el acceso al Club.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex-1 w-full sm:w-auto h-13 px-6 bg-emerald-500/15 hover:bg-emerald-500/25 border-2 border-emerald-500/40 hover:border-emerald-400 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-emerald-400" />
                    Historial por Socio
                  </button>

                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-1 w-full sm:w-auto h-13 px-6 bg-brand-gold/15 hover:bg-brand-gold/25 border-2 border-brand-gold/40 hover:border-brand-gold text-amber-900 dark:text-brand-gold font-black text-xs uppercase tracking-wider rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-brand-gold" />
                    Editar Recientes
                  </button>
                </div>
                
              </div>
            </div>
          )}
          </>
          )}

        </div>

        {/* Right Sidebar / Bottom panel on mobile - Live Logs */}
        {(selectedMember || searchResults.length > 0) && (
          <div className="w-full xl:w-96 2xl:w-[420px] h-64 xl:h-auto bg-white dark:bg-[#050806] border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-brand-gold/20 shrink-0 flex-none xl:block animate-in fade-in slide-in-from-right-8 duration-500 transition-colors">
            <AccessLogHistory key={refreshTrigger} />
          </div>
        )}
      </div>

      <MemberHistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />

      <EditAccessModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <RegisterGuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        host={selectedMember}
        personType={accessPersonType}
        onSuccess={() => {
          setRefreshTrigger(prev => prev + 1);
          toast.success('Invitado registrado y acceso concedido');
        }}
      />

      <RegisterStandalonePersonModal
        isOpen={isStandaloneModalOpen}
        onClose={() => setIsStandaloneModalOpen(false)}
        personType={searchType as 'RECIPROCITY' | 'EXTERNAL'}
        initialDocumentId={searchTerm}
        onSuccess={(person) => {
          setIsStandaloneModalOpen(false);
          setSearchTerm(person.documentId);
          handleSelectMember(person, true);
        }}
      />

      {/* Modal de Alerta e Intercepción de Insumos Pendientes */}
      {isPendingLoansModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0c130f] border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl shadow-amber-500/20 animate-scaleIn relative overflow-hidden">
            
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -z-0"></div>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5 border-b border-gray-200 dark:border-white/10 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase bg-amber-500 text-black px-2.5 py-0.5 rounded-full">
                  Control de Insumos • Caseta
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                  Insumos Pendientes de Devolución
                </h3>
              </div>
            </div>

            {/* Member summary */}
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 mb-5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-gold/20 text-brand-gold font-bold flex items-center justify-center shrink-0">
                {selectedMember.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{selectedMember.fullName}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">CI: {selectedMember.documentId} • Membresía: <strong className="text-brand-gold">{selectedMember.membershipNumber}</strong></p>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                Elementos del club registrados a nombre del socio:
              </p>
              {selectedMember.pendingAreaLoans?.map((loan) => (
                <div key={loan.id} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {loan.area === 'PISCINA' ? <Waves className="w-5 h-5 text-cyan-400" /> : <Dumbbell className="w-5 h-5 text-emerald-400" />}
                    <div>
                      <div className="text-xs font-extrabold text-gray-900 dark:text-white uppercase">{loan.area}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {loan.lockerKey && <span>🔑 Casillero / Llave: <strong className="text-amber-400 font-bold">#{loan.lockerKey}</strong></span>}
                        {(loan.towelNumber || loan.towelQty > 0) && <span className="ml-2">🧺 Toalla: <strong className="text-blue-400">#{loan.towelNumber || loan.towelQty} ({loan.towelSize})</strong></span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium mb-6 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <span>Si el socio tiene los elementos en mano, puedes recibirlos directamente aquí en Caseta y quedarán liberados en el sistema.</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => handleRegisterAccess(false, true, false)}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                1. Recibir Insumos Aquí en Caseta y Autorizar Salida
              </button>

              <button
                onClick={() => setIsPendingLoansModalOpen(false)}
                className="w-full py-3 px-4 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 font-bold text-xs uppercase tracking-wider transition-all"
              >
                2. Cancelar Salida (El socio va a devolver los insumos al área)
              </button>

              <button
                onClick={() => {
                  if (window.confirm('¿Confirmar salida forzada SIN devolver insumos? Esto quedará registrado como incidencia de seguridad.')) {
                    handleRegisterAccess(false, false, true);
                  }
                }}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/30 font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                3. Salida Forzada sin Devolución (Registrar Incidencia)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Invoice Receipt Modal for Guards */}
      <GatehouseInvoiceReceiptModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
};
