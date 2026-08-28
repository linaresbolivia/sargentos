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
  AlertTriangle,
  Check,
  Waves,
  Dumbbell,
  Key,
  Layers
} from 'lucide-react';
import { AccessLogHistory } from '../components/AccessLogHistory';
import { AccessSearchResult } from '../../../../../backend/src/modules/accessControl/application/useCases/SearchMemberForAccessUseCase';
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#050806] text-gray-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 dark:border-brand-gold/20 flex items-center justify-between px-6 bg-white dark:bg-[#0a100d] shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3.5">
          <BackButton to="/" title="Volver al Menú Principal" />
          <CrestLogo size="sm" />
          <div>
            <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest leading-none block">Club Hípico Los Sargentos</span>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white serif-brand leading-tight">Control de Garita Principal</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={() => dispatch(logout())}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        
        {/* Left/Center Panel - Search & Decision */}
        <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 md:gap-8 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-[#050806] transition-colors duration-200">
          
          {/* Search Bar */}
          <div className="relative max-w-3xl mx-auto w-full mt-6 group">
            <div className="flex justify-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="searchType" 
                  value="SOCIO"
                  checked={searchType === 'SOCIO'} 
                  onChange={() => { setSearchType('SOCIO'); setSearchResults([]); setSearchTerm(''); setHasSearched(false); }} 
                  className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4" 
                /> 
                <span className="text-gray-700 dark:text-gray-300 font-medium">Socio</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="searchType" 
                  value="RECIPROCITY"
                  checked={searchType === 'RECIPROCITY'} 
                  onChange={() => { setSearchType('RECIPROCITY'); setSearchResults([]); setSearchTerm(''); setHasSearched(false); }} 
                  className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4" 
                /> 
                <span className="text-gray-700 dark:text-gray-300 font-medium">Socio de Reciprocidad</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="searchType" 
                  value="EXTERNAL"
                  checked={searchType === 'EXTERNAL'} 
                  onChange={() => { setSearchType('EXTERNAL'); setSearchResults([]); setSearchTerm(''); setHasSearched(false); }} 
                  className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4" 
                /> 
                <span className="text-gray-700 dark:text-gray-300 font-medium">Externo</span>
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-brand-gold transition-transform group-focus-within:scale-110" />
              </div>
              <input 
                ref={searchRef}
                type="text"
                placeholder={searchType === 'SOCIO' ? "Buscar miembros o ID o nombre" : `Buscar ${searchType === 'RECIPROCITY' ? 'socio de reciprocidad' : 'externo'}...`}
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
              className="block w-full pl-16 pr-6 py-5 border-2 border-brand-gold/40 dark:border-brand-gold rounded-full leading-5 bg-[#133825] dark:bg-[#141816] text-white placeholder-brand-gold/40 dark:placeholder-gray-400 focus:outline-none focus:border-brand-gold focus:shadow-[0_0_40px_rgba(204,161,75,0.3)] shadow-[0_10px_40px_rgba(19,56,37,0.2)] dark:shadow-none text-lg transition-all"
            />
          </div>

          {searchType !== 'SOCIO' && searchTerm.length >= 2 && searchResults.length === 0 && hasSearched && !selectedMember && (
            <div className="text-center mt-2 max-w-3xl mx-auto">
              <p className="text-gray-500 mb-4">No se encontró a nadie con ese nombre o documento.</p>
              <button
                onClick={() => setIsStandaloneModalOpen(true)}
                className="px-6 py-3 bg-brand-gold text-[#0a2014] font-bold rounded-xl hover:bg-brand-gold/90 transition-colors shadow-lg"
              >
                <UserPlus className="w-5 h-5 inline mr-2" />
                Registrar Nuevo {searchType === 'RECIPROCITY' ? 'Socio de Reciprocidad' : 'Externo'}
              </button>
            </div>
          )}
            
          {/* Search Dropdown */}
            {searchResults.length > 1 && !selectedMember && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0d2116] border border-gray-200 dark:border-brand-gold/20 rounded-xl shadow-[0_10px_30px_rgba(204,161,75,0.1)] z-20 max-h-60 overflow-y-auto">
                {searchResults.map(member => (
                  <div 
                    key={member.personId}
                    onClick={() => handleSelectMember(member, true)}
                    className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-200">{member.fullName}</p>
                      <p className="text-xs text-gray-500">ID: {member.documentId} | Membresía: {member.membershipNumber} ({member.membershipType})</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${member.status === 'GRANTED' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedMember ? (
            <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full mt-2">
              
              {/* Top Row: Profile & Status (Symmetrical) */}
              <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                {/* Member Card */}
                <div className="flex-1 w-full bg-white dark:bg-[#0d2116] rounded-2xl border border-gray-200 dark:border-brand-gold/20 p-6 shadow-xl dark:shadow-[0_4px_20px_rgba(204,161,75,0.05)] transition-colors duration-200 flex flex-col justify-center">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full mb-4 overflow-hidden flex items-center justify-center border-2 border-brand-gold/50 shadow-[0_0_15px_rgba(204,161,75,0.4)] bg-gradient-to-br from-[#dfc285] via-[#cca14b] to-[#b08b26]">
                      {selectedMember.photoUrl ? (
                        <img src={selectedMember.photoUrl} alt="Socio" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-[#0a1d13] drop-shadow-md">{selectedMember.fullName.charAt(0)}</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedMember.fullName}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">CI/ID: <span className="text-gray-900 dark:text-gray-200">{selectedMember.documentId}</span></p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Membresía: <span className="text-brand-gold">{selectedMember.membershipNumber} ({selectedMember.membershipType})</span></p>

                  </div>
                </div>

                {/* Giant Status Indicator */}
                {(() => {
                  const isExiting = actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE';
                  const hasPendingLoans = selectedMember.pendingAreaLoans && selectedMember.pendingAreaLoans.length > 0;

                  if (isExiting) {
                    return (
                      <div className="flex-1 w-full rounded-2xl border p-6 shadow-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:bg-[#1a120b] border-amber-500/50 dark:border-amber-500/40 flex flex-col items-center justify-center text-center">
                        <LogOut className="w-20 h-20 text-amber-400 mb-3 animate-pulse" />
                        <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wide mb-1">
                          Registrando Salida del Club
                        </h2>
                        {hasPendingLoans ? (
                          <p className="text-amber-200 font-bold text-xs bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/40 mt-1">
                            ⚠️ Insumos de Piscina/Gimnasio pendientes por entregar en Caseta
                          </p>
                        ) : (
                          <p className="text-gray-300 text-xs">
                            Socio/Invitado registrado actualmente dentro del Club Hípico.
                          </p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className={`flex-1 w-full rounded-2xl border p-6 shadow-xl dark:shadow-[0_4px_20px_rgba(204,161,75,0.05)] transition-colors duration-200 flex flex-col items-center justify-center text-center ${
                      selectedMember.status === 'GRANTED' 
                        ? 'bg-gradient-to-br from-brand-gold/10 to-[#133825]/5 dark:bg-[#0d2116] border-brand-gold/40 dark:border-brand-gold/30' 
                        : 'bg-red-50 dark:bg-[#1a0f0f] border-red-200 dark:border-red-500/30'
                    }`}>
                      {selectedMember.status === 'GRANTED' ? (
                        <>
                          <CheckCircle className="w-24 h-24 text-[#cca14b] mb-4" />
                          <h2 className="text-3xl font-bold text-[#cca14b] tracking-wide mb-2">Acceso Concedido</h2>
                          <p className="text-gray-300">Sin deuda pendiente.</p>
                          {selectedMember.lastPaymentDate && (
                            <p className="text-sm text-gray-500 mt-1">Último pago: {new Date(selectedMember.lastPaymentDate).toLocaleDateString()}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <XCircle className="w-24 h-24 text-red-500 mb-4" />
                          <h2 className="text-3xl font-bold text-red-600 dark:text-red-500 tracking-wide mb-2">Acceso Denegado</h2>
                          <p className="text-gray-800 dark:text-gray-300 font-medium">{selectedMember.reason || 'Restricción Administrativa'}</p>
                          {selectedMember.totalDebt > 0 && (
                            <p className="text-red-600 dark:text-red-400 font-bold mt-2 text-lg">Deuda Pendiente: ${selectedMember.totalDebt.toLocaleString()}</p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Warning Banner: Insumos Pendientes de Devolución */}
              {selectedMember.pendingAreaLoans && selectedMember.pendingAreaLoans.length > 0 && (
                <div className="w-full bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 border-2 border-amber-500/60 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                          ¡Alerta Caseta!
                        </span>
                        <h4 className="font-extrabold text-sm text-amber-400 uppercase tracking-wide">
                          Insumos del Club Pendientes de Devolución
                        </h4>
                      </div>
                      <div className="text-xs text-gray-200 mt-1 flex flex-wrap gap-2">
                        {selectedMember.pendingAreaLoans.map((loan) => (
                          <span key={loan.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/50 border border-amber-500/40 text-white font-medium text-xs">
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
                    <span className="text-[11px] text-amber-300 font-semibold bg-black/40 px-3 py-1.5 rounded-xl border border-amber-500/30">
                      👉 Solicitar entrega antes de permitir salida
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Row: Entry/Exit Form */}
              <div className="w-full bg-white dark:bg-[#0d2116] rounded-2xl border border-gray-200 dark:border-brand-gold/20 p-6 shadow-xl dark:shadow-[0_4px_20px_rgba(204,161,75,0.05)] transition-colors duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  {/* Left Column */}
                  <div className="flex flex-col gap-6">
                    {/* Tipo de Acceso */}
                    {(() => {
                      const isVipGuest = selectedMember?.personType === 'INVITADO_VIP' || selectedMember?.personId?.startsWith('vip_');
                      return (
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-brand-gold tracking-wide">
                              Tipo de Acceso
                            </h3>
                            {isVipGuest && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40 flex items-center gap-1">
                                🔒 Invitado VIP (Fijo)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4">
                            <label className={`flex items-center gap-1.5 ${isVipGuest ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
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
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Socio</span>
                            </label>
                            <label className={`flex items-center gap-1.5 ${isVipGuest ? 'opacity-90 cursor-not-allowed font-extrabold text-brand-gold' : 'cursor-pointer'}`}>
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
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {isVipGuest ? 'Invitado VIP' : 'Invitado'}
                              </span>
                            </label>
                          </div>
                          
                          {accessPersonType === 'GUEST' && !isVipGuest && (
                            <div className="mt-4">
                              <button 
                                type="button"
                                onClick={() => setIsGuestModalOpen(true)}
                                className="w-full bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold transition-colors py-2 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-brand-gold/30 shadow-[0_4px_15px_rgba(204,161,75,0.1)]"
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
                      <h3 className="text-sm font-semibold text-brand-gold tracking-wide mb-3">
                        Registro de Acceso
                      </h3>
                      <div className="flex flex-wrap gap-5">
                        <label className="flex items-center gap-2 cursor-pointer">
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
                                  setAccessMethod('PEDESTRIAN');
                                  setVehiclePlate('');
                                  pedestrianRadioRef.current?.focus();
                                } else {
                                  setAccessMethod('TAXI');
                                  setVehiclePlate('');
                                  taxiRadioRef.current?.focus();
                                }
                              }
                            }}
                            className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicular</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            ref={taxiRadioRef}
                            type="radio" 
                            name="accessMethod" 
                            value="TAXI" 
                            checked={accessMethod === 'TAXI'} 
                            onChange={() => {
                              setAccessMethod('TAXI');
                              setVehiclePlate('');
                            }}
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
                                  setAccessMethod('PEDESTRIAN');
                                  setVehiclePlate('');
                                  pedestrianRadioRef.current?.focus();
                                }
                              }
                            }}
                            className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">En Taxi</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            ref={pedestrianRadioRef}
                            type="radio" 
                            name="accessMethod" 
                            value="PEDESTRIAN" 
                            checked={accessMethod === 'PEDESTRIAN'} 
                            onChange={() => {
                              setAccessMethod('PEDESTRIAN');
                              setVehiclePlate('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRegisterAccess();
                              } else if (e.key === 'Tab') {
                                e.preventDefault();
                                if (e.shiftKey) {
                                  setAccessMethod('TAXI');
                                  setVehiclePlate('');
                                  taxiRadioRef.current?.focus();
                                } else {
                                  setAccessMethod('VEHICLE');
                                  vehicleRadioRef.current?.focus();
                                }
                              }
                            }}
                            className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Peatonal</span>
                        </label>
                      </div>
                    </div>

                    {/* Placa del Vehículo */}
                    <div className="flex flex-col">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide mb-2">Placa del Vehículo</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Car className="h-4 w-4 text-gray-400 dark:text-gray-500" />
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
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-brand-gold/20 rounded-lg pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold/50 appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-300 dark:border-brand-gold/20 rounded-lg pl-10 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold/50 placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={accessMethod !== 'VEHICLE'}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col">
                      <h3 className="text-sm font-semibold text-brand-gold tracking-wide mb-3">Observaciones</h3>
                      <textarea 
                        placeholder="Compañantes, novedades, etc."
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        className="w-full flex-1 min-h-[120px] bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold/50 placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  {(actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE' || selectedMember.status === 'GRANTED') ? (
                    <button 
                      onClick={() => handleRegisterAccess(false)}
                      disabled={isSubmitting}
                      className={`flex-1 ${(actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE') ? 'bg-amber-600 hover:bg-amber-500 border-amber-400' : 'bg-[#133825] hover:bg-[#1a4a31] dark:bg-[#1a4a31] dark:hover:bg-[#205b3c] border-brand-gold'} text-white font-extrabold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 tracking-wider border-2 shadow-lg cursor-pointer`}
                    >
                      {isSubmitting ? 'Registrando...' : ((actionType === 'EXIT' || selectedMember.currentLocation === 'INSIDE') ? '🚪 Registrar Salida del Club' : 'Registrar Ingreso')}
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleRegisterAccess(false)}
                        disabled={isSubmitting}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-sm tracking-wide disabled:opacity-50"
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
                        className="px-6 bg-amber-600 hover:bg-amber-500 border-2 border-amber-400 text-white font-black py-4 rounded-xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shrink-0"
                        title="Registrar Salida de la persona aunque el pase/membresía esté denegado"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>🚪 Registrar Salida</span>
                      </button>

                      <button 
                        onClick={() => {
                          if(window.confirm('¿Está seguro que desea FORZAR el ingreso de este socio/invitado a pesar de tener el acceso denegado? Esto quedará registrado.')) {
                            handleRegisterAccess(true);
                          }
                        }}
                        disabled={isSubmitting}
                        className="px-6 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold py-4 rounded-xl transition-colors text-sm flex items-center gap-2"
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
            <div className="flex-1 flex flex-col items-center justify-center opacity-90 py-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-gold/10 via-transparent to-transparent rounded-full w-full h-full max-w-3xl mx-auto opacity-60 blur-3xl pointer-events-none"></div>
              
              <div className="w-full max-w-2xl glass-panel bg-[#133825] dark:bg-[#0a2014]/90 p-12 rounded-[2rem] relative z-10 flex flex-col items-center border-2 border-brand-gold shadow-[0_0_50px_rgba(19,56,37,0.3)] dark:shadow-[0_0_50px_rgba(10,32,20,0.5)] overflow-hidden">
                
                <div className="relative mb-10">
                  <div className="absolute inset-0 border-2 border-brand-gold/80 shadow-[0_0_20px_rgba(204,161,75,0.6)] rounded-full animate-ping" style={{ animationDuration: '2.5s' }}></div>
                  <div className="absolute inset-[-30px] border-2 border-brand-gold/60 shadow-[0_0_15px_rgba(204,161,75,0.4)] rounded-full animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.8s' }}></div>
                  <div className="absolute inset-[-60px] border border-brand-gold/40 shadow-[0_0_10px_rgba(204,161,75,0.2)] rounded-full animate-ping" style={{ animationDuration: '4.5s', animationDelay: '1.6s' }}></div>
                  
                  <div className="w-40 h-40 bg-white/5 backdrop-blur-md border border-brand-gold/40 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_60px_rgba(212,175,55,0.2)]">
                    <CrestLogo size="lg" />
                  </div>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold text-brand-gold tracking-[0.1em] mb-6 drop-shadow-2xl text-center">
                  PUNTO DE CONTROL INGRESO
                </h2>
                
                <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent mb-8"></div>
                
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center max-w-md relative overflow-hidden group mb-6">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent transform -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                  <p className="text-white/80 text-sm font-light tracking-wide leading-relaxed">
                    Sistema de seguridad activo. Ingrese el <span className="text-brand-gold font-medium">ID</span>, <span className="text-brand-gold font-medium">Nombre</span> o <span className="text-brand-gold font-medium">Placa</span> del vehículo para validar el acceso.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4">
                  <button
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="w-72 h-[52px] whitespace-nowrap px-6 bg-[#133825]/40 hover:bg-brand-gold/10 border border-brand-gold/30 rounded-xl text-white/90 hover:text-white font-medium tracking-wide transition-all shadow-[0_0_15px_rgba(204,161,75,0.05)] hover:shadow-[0_0_25px_rgba(204,161,75,0.2)] flex items-center justify-center gap-3"
                  >
                    <Clock className="w-4 h-4 text-brand-gold opacity-80" />
                    Ver Historial por Socio
                  </button>

                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-72 h-[52px] whitespace-nowrap px-6 bg-[#133825]/40 hover:bg-brand-gold/10 border border-brand-gold/30 rounded-xl text-white/90 hover:text-white font-medium tracking-wide transition-all shadow-[0_0_15px_rgba(204,161,75,0.05)] hover:shadow-[0_0_25px_rgba(204,161,75,0.2)] flex items-center justify-center gap-3"
                  >
                    <Edit2 className="w-4 h-4 text-brand-gold opacity-80" />
                    Editar Accesos Recientes
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
    </div>
  );
};
