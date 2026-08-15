import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '@config/api';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { logout } from '@store/authSlice';
import { LogOut, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { AppDispatch } from '@store/store';
import { MassiveMemberForm } from '../components/MassiveMemberForm';
import { EditMemberForm } from '../components/EditMemberForm';

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  documentId?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  roles: Role[];
}

const MODULES_MAP: Record<string, string> = {
  MODULO_SOCIOS: 'Gestión de Socios',
  MODULO_RRHH: 'Recursos Humanos',
  MODULO_CONTRATACIONES: 'Contrataciones',
  MODULO_ALMACENES: 'Almacenes',
  MODULO_ACTIVOS_FIJOS: 'Activos Fijos',
  MODULO_CORRESPONDENCIA: 'Correspondencia',
  MODULO_CONTABILIDAD: 'Contabilidad',
  MODULO_FACTURACION: 'Facturación',
  MODULO_DIRECTORIO: 'Directorio y Gerencia',
  MODULO_PQRS: 'Gestión PQRS',
  MODULO_USUARIO_PQRS: 'Usuario PQRS',
  MODULO_WHATSAPP: 'Envío Masivo (WhatsApp)',
};

export const SuperAdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassiveFormOpen, setIsMassiveFormOpen] = useState(false);
  const [isEditMemberFormOpen, setIsEditMemberFormOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserDocumentId, setNewUserDocumentId] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [baseRole, setBaseRole] = useState<string>('STAFF');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'ALL' | 'INSTITUTIONAL' | 'MEMBER'>('ALL');

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión cerrada correctamente');
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (roleKey: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleKey) 
        ? prev.filter(r => r !== roleKey) 
        : [...prev, roleKey]
    );
  };

  const resetForm = () => {
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserFirstName('');
    setNewUserLastName('');
    setNewUserDocumentId('');
    setNewUserPhone('');
    setSelectedRoles([]);
    setBaseRole('STAFF');
    setIsActive(true);
    setEditingUserId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    resetForm();
    const isMember = user.roles.some(r => r.name === 'USER');
    
    if (isMember) {
      setSelectedMemberId(user.id);
      setIsEditMemberFormOpen(true);
    } else {
      setModalMode('edit');
      setEditingUserId(user.id);
      setNewUserEmail(user.email);
      setNewUserFirstName(user.firstName);
      setNewUserLastName(user.lastName);
      setNewUserDocumentId(user.documentId || '');
      setNewUserPhone(user.phone || '');
      setIsActive(user.isActive);

      const baseRoles = ['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
      const userBaseRole = user.roles.find(r => baseRoles.includes(r.name))?.name || 'STAFF';
      setBaseRole(userBaseRole);

      const moduleRoles = user.roles.map(r => r.name).filter(name => !baseRoles.includes(name));
      setSelectedRoles(moduleRoles);

      setIsModalOpen(true);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        email: newUserEmail,
        firstName: newUserFirstName,
        lastName: newUserLastName,
        documentId: newUserDocumentId,
        phone: newUserPhone,
        roles: [...selectedRoles, baseRole],
        isActive,
      };

      if (newUserPassword) {
        payload.password = newUserPassword;
      }

      if (modalMode === 'create') {
        await api.post('/users', payload);
      } else if (modalMode === 'edit' && editingUserId) {
        await api.put(`/users/${editingUserId}`, payload);
      }

      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar el usuario');
    }
  };

  const filteredUsers = React.useMemo(() => {
    let baseUsers = users;
    if (userTypeFilter === 'MEMBER') {
      baseUsers = baseUsers.filter(u => u.roles.some(r => r.name === 'USER'));
    } else if (userTypeFilter === 'INSTITUTIONAL') {
      baseUsers = baseUsers.filter(u => u.roles.some(r => ['STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(r.name)));
    }

    const lowerSearch = searchTerm.toLowerCase();
    return baseUsers.filter(user => {
      const matchEmail = user.email.toLowerCase().includes(lowerSearch);
      const matchName = `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerSearch);
      const matchDoc = user.documentId?.toLowerCase().includes(lowerSearch) || false;
      const matchPhone = user.phone?.toLowerCase().includes(lowerSearch) || false;
      const matchRole = user.roles.some(r => r.name.toLowerCase().includes(lowerSearch));
      return matchEmail || matchName || matchDoc || matchPhone || matchRole;
    });
  }, [users, searchTerm, userTypeFilter]);

  if (loading) {
    return <div className="min-h-screen bg-forest flex items-center justify-center"><p className="text-brand-gold">Cargando módulos...</p></div>;
  }

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <header className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-brand-gold/10 pb-6 gap-6">
          <div className="flex items-center gap-6">
            <CrestLogo size="sm" />
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-brand-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text"
                placeholder="Buscar por nombre, CI o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full theme-search-bg border border-brand-gold/20 rounded-xl pl-12 pr-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/30 transition-all shadow-inner placeholder:text-gray-500"
              />
            </div>
            <ThemeToggle />
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={() => setIsMassiveFormOpen(true)}
                className="bg-brand-gold text-black hover:bg-yellow-500 whitespace-nowrap px-6 py-3 font-bold tracking-widest text-xs uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center gap-2"
              >
                <UserPlus size={16} /> Nuevo Socio
              </button>
              <button 
                onClick={() => handleOpenCreate()}
                className="glass-button-primary whitespace-nowrap px-6 py-3 font-bold tracking-widest text-xs uppercase"
              >
                + Nuevo Usuario
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="p-3 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="glass-panel border-brand-gold/10 p-0 overflow-hidden shadow-2xl">
          <div className="px-8 py-6 border-b border-brand-gold/5 theme-header-bg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <h2 className="text-lg theme-text font-medium tracking-wide">Usuarios del Sistema</h2>
              
              {/* Segments Filter */}
              <div className="flex bg-black/5 dark:bg-black/40 rounded-lg p-1 border border-brand-gold/10">
                <button 
                  onClick={() => setUserTypeFilter('ALL')}
                  className={`px-4 py-1.5 text-xs font-semibold tracking-widest uppercase rounded-md transition-all ${userTypeFilter === 'ALL' ? 'bg-brand-gold text-brand-green-dark shadow-md' : 'theme-text-muted hover:text-brand-gold'}`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setUserTypeFilter('INSTITUTIONAL')}
                  className={`px-4 py-1.5 text-xs font-semibold tracking-widest uppercase rounded-md transition-all ${userTypeFilter === 'INSTITUTIONAL' ? 'bg-brand-gold text-brand-green-dark shadow-md' : 'theme-text-muted hover:text-brand-gold'}`}
                >
                  Institucionales
                </button>
                <button 
                  onClick={() => setUserTypeFilter('MEMBER')}
                  className={`px-4 py-1.5 text-xs font-semibold tracking-widest uppercase rounded-md transition-all ${userTypeFilter === 'MEMBER' ? 'bg-brand-gold text-brand-green-dark shadow-md' : 'theme-text-muted hover:text-brand-gold'}`}
                >
                  Socios
                </button>
              </div>
            </div>
            
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              {filteredUsers.length} Registros
            </span>
          </div>
          
          <div className="overflow-x-auto px-8 pb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="border-b theme-table-border text-[10px] uppercase tracking-widest theme-subtitle">
                    <th className="py-5 font-semibold">Usuario (Nombre y Correo)</th>
                    <th className="py-5 font-semibold">Documento / Teléfono</th>
                    {userTypeFilter !== 'MEMBER' && (
                      <th className="py-5 font-semibold">Permisos (Módulos)</th>
                    )}
                    <th className="py-5 text-right font-semibold">Nivel</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => {
                    const isSuperAdmin = user.roles.some(r => r.name === 'SUPER_ADMIN');
                    return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-5">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border transition-colors ${isSuperAdmin ? 'bg-gradient-to-br from-brand-gold to-yellow-600 text-black border-transparent' : 'theme-avatar-bg group-hover:border-brand-gold/50'}`}>
                            <span className="font-bold text-sm tracking-wider">{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="theme-text font-medium tracking-wide group-hover:text-brand-gold transition-colors">{user.firstName} {user.lastName}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="theme-text text-sm tracking-wide">{user.documentId || '-'}</div>
                        <div className="theme-text-muted text-xs mt-0.5">{user.phone || '-'}</div>
                      </td>
                      {userTypeFilter !== 'MEMBER' && (
                        <td className="py-5">
                          {isSuperAdmin ? (
                            <span className="bg-brand-gold/10 text-brand-gold text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-md border border-brand-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.1)] uppercase">ACCESO TOTAL</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {user.roles
                                .filter(r => Object.keys(MODULES_MAP).includes(r.name))
                                .map(r => (
                                  <span
                                    key={r.name}
                                    className="text-[9px] px-2.5 py-1 rounded tracking-wider uppercase font-semibold border theme-badge-bg shadow-[0_0_10px_rgba(212,175,55,0.05)]"
                                  >
                                    {MODULES_MAP[r.name]}
                                  </span>
                                ))}
                              {user.roles.filter(r => Object.keys(MODULES_MAP).includes(r.name)).length === 0 && (
                                <span className="text-[10px] theme-text-muted italic">
                                  {user.roles.some(r => r.name === 'USER') ? '-' : 'Sin módulos asignados'}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="py-5 text-right relative pr-16">
                        <span className="inline-block text-[11px] font-medium tracking-wide theme-badge-bg px-3 py-1.5 rounded-lg border">
                          {isSuperAdmin ? 'Super Admin' : (user.roles.some(r => r.name === 'ADMIN') ? 'Portería' : (user.roles.some(r => r.name === 'STAFF') ? 'Personal Adm.' : 'Socio'))}
                        </span>
                        {!user.isActive && (
                          <span className="ml-2 inline-block text-[11px] font-medium tracking-wide text-red-400 bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-800/50">
                            Inactivo
                          </span>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity theme-edit-btn border border-brand-gold/30 hover:bg-brand-gold/20 text-brand-gold p-2.5 rounded-xl shadow-lg z-10"
                          title="Editar Usuario"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Creación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center theme-search-bg backdrop-blur-md p-4">
          <div className="glass-panel border-brand-gold/30 p-8 w-full max-w-xl animate-scaleIn rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col max-h-[95vh]">
              <div className="mb-6 border-b border-brand-gold/20 pb-4 shrink-0">
                <h2 className="text-2xl font-light text-brand-gold tracking-widest serif-brand uppercase">
                  {modalMode === 'create' ? 'Alta de Usuario Institucional' : 'Editar Usuario'}
                </h2>
                <p className="text-brand-gold/50 text-[10px] tracking-widest uppercase mt-1">Gestión de Perfil Administrativo</p>
              </div>
              <form onSubmit={handleSaveUser} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto pr-2 space-y-5 custom-scrollbar pb-4">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Nombre(s)</label>
                      <input 
                        type="text" 
                        required
                        value={newUserFirstName}
                        onChange={(e) => setNewUserFirstName(e.target.value)}
                        className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Apellido(s)</label>
                      <input 
                        type="text" 
                        required
                        value={newUserLastName}
                        onChange={(e) => setNewUserLastName(e.target.value)}
                        className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Doc. Identidad / CI</label>
                      <input 
                        type="text" 
                        value={newUserDocumentId}
                        onChange={(e) => setNewUserDocumentId(e.target.value)}
                        className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Teléfono</label>
                      <input 
                        type="text" 
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Correo Electrónico (Login)</label>
                    <input 
                      type="email" 
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner"
                    />
                  </div>
                  
                  <div>
                    <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Contraseña (Login)</label>
                    <input 
                      type="password" 
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder={modalMode === 'create' ? "Dejar en blanco para generar aleatoria" : "Dejar en blanco para mantener la actual"}
                      className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner placeholder:text-gray-600"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between theme-search-bg border border-brand-gold/10 rounded-lg p-4">
                    <div>
                      <label className="block theme-title text-sm font-semibold tracking-wide">Estado de la Cuenta</label>
                      <p className="text-xs theme-text-muted mt-1">Si desactiva la cuenta, el usuario no podrá iniciar sesión.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-gold shadow-inner"></div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Rol Base (Nivel Jerárquico)</label>
                    <select 
                      value={baseRole}
                      onChange={(e) => setBaseRole(e.target.value)}
                      className="w-full theme-search-bg border border-brand-gold/20 rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-brand-gold/50 transition-all shadow-inner appearance-none"
                    >
                      <option value="STAFF" className="theme-search-bg theme-text py-2">Personal Administrativo</option>
                      <option value="ADMIN" className="theme-search-bg theme-text py-2">Administrador de Portería</option>
                      <option value="SUPER_ADMIN" className="theme-search-bg theme-text py-2">Super Administrador Maestro</option>
                    </select>
                  </div>
                  
                  <div className="pt-2">
                    <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-3 font-semibold">Módulos de la Suite</label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(MODULES_MAP).map(([key, label]) => {
                        const isSelected = selectedRoles.includes(key);
                        return (
                          <div 
                            key={key}
                            onClick={() => toggleRole(key)}
                            className={`cursor-pointer text-xs px-4 py-3 rounded-lg border transition-all duration-300 text-center select-none ${
                              isSelected 
                                ? 'bg-brand-gold text-brand-green-dark border-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.4)] font-bold' 
                                : 'theme-badge-bg theme-text-muted hover:border-brand-gold/50 hover:text-brand-gold'
                            }`}
                          >
                            {label}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 mt-2 border-t border-brand-gold/10 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-black/5 dark:bg-black/40 border border-black/10 dark:border-gray-600/50 text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-gray-800 hover:text-black dark:hover:text-white transition-all py-3 rounded-lg font-semibold uppercase text-xs tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 glass-button-primary py-3 rounded-lg font-bold uppercase text-xs tracking-widest"
                  >
                    Guardar Perfil
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* Modal Formulario Masivo de Socios */}
      {isMassiveFormOpen && (
        <MassiveMemberForm 
          onClose={() => setIsMassiveFormOpen(false)}
          onSuccess={() => {
            setIsMassiveFormOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* Modal Edición Socio */}
      {isEditMemberFormOpen && selectedMemberId && (
        <EditMemberForm 
          userId={selectedMemberId}
          onClose={() => {
            setIsEditMemberFormOpen(false);
            setSelectedMemberId(null);
          }}
          onSuccess={() => {
            setIsEditMemberFormOpen(false);
            setSelectedMemberId(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;
