import React, { useState, useRef } from 'react';
import { api } from '@config/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, CheckCircle, XCircle, LogOut, Car, AlertCircle, Clock, UserPlus, ArrowLeft } from 'lucide-react';
import { AccessLogHistory } from '../components/AccessLogHistory';
import { AccessSearchResult } from '../../../../../backend/src/modules/accessControl/application/useCases/SearchMemberForAccessUseCase';
import { useDispatch } from 'react-redux';
import { logout } from '@store/authSlice';
import { AppDispatch } from '@store/store';
import { CrestLogo } from '@shared/components/CrestLogo';
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
      setTimeout(() => {
        socioRadioRef.current?.focus();
      }, 50);
    }
  };

  const handleRegisterAccess = async (forceGranted: boolean = false) => {
    if (!selectedMember) return;
    
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

      await api.post('/access/log', {
        personId: selectedMember.personId,
        gate: 'Puerta Principal',
        method: accessMethod === 'VEHICLE' ? 'Manual' : (accessMethod === 'TAXI' ? 'Taxi' : 'Peatonal'),
        actionType: actionType || (selectedMember.currentLocation === 'INSIDE' ? 'EXIT' : 'ENTRY'),
        status: finalStatus,
        reason: selectedMember.reason,
        observation: finalObservation,
        vehiclePlate: accessMethod === 'VEHICLE' ? (vehiclePlate || undefined) : undefined,
        personType: accessPersonType
      });

      toast.success(finalStatus === 'GRANTED' 
        ? (actionType === 'EXIT' ? 'Salida Registrada' : 'Ingreso Registrado') 
        : 'Denegación Registrada');
      
      // Reset
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
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-white dark:bg-[#131c26]/80 hover:bg-gray-100 dark:hover:bg-[#1a2533] border border-gray-200 dark:border-brand-gold/30 rounded-xl text-brand-gold shadow-sm transition-all"
            title="Volver al Menú Principal"
          >
            <ArrowLeft size={20} />
          </button>
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
                    socioRadioRef.current?.focus();
                  } else if (searchResults.length === 1) {
                    handleSelectMember(searchResults[0], true);
                  } else if (searchResults.length > 1) {
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
              </div>

              {/* Bottom Row: Entry Form */}
              <div className="w-full bg-white dark:bg-[#0d2116] rounded-2xl border border-gray-200 dark:border-brand-gold/20 p-6 shadow-xl dark:shadow-[0_4px_20px_rgba(204,161,75,0.05)] transition-colors duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  {/* Left Column */}
                  <div className="flex flex-col gap-6">
                    {/* Tipo de Acceso */}
                    <div className="flex flex-col">
                      <h3 className="text-sm font-semibold text-brand-gold tracking-wide mb-3">
                        Tipo de Acceso
                      </h3>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            ref={socioRadioRef}
                            type="radio" 
                            name="accessPersonType" 
                            value="SOCIO" 
                            checked={accessPersonType === 'SOCIO'} 
                            onChange={() => setAccessPersonType('SOCIO')}
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
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            ref={guestRadioRef}
                            type="radio" 
                            name="accessPersonType" 
                            value="GUEST" 
                            checked={accessPersonType === 'GUEST'} 
                            onChange={() => setAccessPersonType('GUEST')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { 
                                e.preventDefault(); 
                                setIsGuestModalOpen(true);
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
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invitado</span>
                        </label>
                      </div>
                      
                      {accessPersonType === 'GUEST' && (
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
                  {selectedMember.status === 'GRANTED' ? (
                    <button 
                      onClick={() => handleRegisterAccess(false)}
                      disabled={isSubmitting}
                      className={`flex-1 ${actionType === 'EXIT' ? 'bg-orange-600 hover:bg-orange-500 border-orange-500/50' : 'bg-[#133825] hover:bg-[#1a4a31] dark:bg-[#1a4a31] dark:hover:bg-[#205b3c] border-brand-gold'} text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 tracking-wider border-2 shadow-[0_4px_20px_rgba(204,161,75,0.15)] hover:shadow-[0_4px_25px_rgba(204,161,75,0.3)]`}
                    >
                      {isSubmitting ? 'Registrando...' : (actionType === 'EXIT' ? 'Registrar Salida' : 'Registrar Ingreso')}
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
                        onClick={() => {
                          if(window.confirm('¿Está seguro que desea FORZAR el ingreso de este socio a pesar de tener el acceso denegado? Esto quedará registrado.')) {
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
    </div>
  );
};
