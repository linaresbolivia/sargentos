import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@config/api';
import {
  getOrganigramNodeForUser,
  DEFAULT_ORGANIGRAM_NODES,
} from '@modules/correspondence/utils/organigramWorkflowService';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { logout } from '@store/authSlice';
import {
  LogOut,
  User,
  UserPlus,
  Users,
  AtSign,
  ShieldCheck,
  Shield,
  Key,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  Edit3,
  Download,
  Building2,
  Sparkles,
  MessageSquare,
  FileText,
  CalendarCheck,
  Package,
  Layers,
  Briefcase,
  DollarSign,
  Send,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Sliders,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppDispatch } from '@store/store';
import { MassiveMemberForm } from '../components/MassiveMemberForm';
import { EditMemberForm } from '../components/EditMemberForm';
import * as XLSX from 'xlsx';

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

export interface ModuleDefinition {
  key: string;
  label: string;
  category: 'ADMIN' | 'OPERACIONES' | 'DEPORTES' | 'GESTION';
  icon: any;
  color: string;
  description: string;
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  { key: 'MODULO_SOCIOS', label: 'Gestión de Socios & Padrón', category: 'GESTION', icon: Users, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', description: 'Padrón oficial 360°, cobranzas, carnetización' },
  { key: 'MODULO_CORRESPONDENCIA', label: 'Correspondencia & Hojas de Ruta', category: 'ADMIN', icon: FileText, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', description: 'Digitalización eco-híbrida, sellos y trazabilidad QR' },
  { key: 'MODULO_CONTROL_ACCESO', label: 'Control de Acceso & Portería', category: 'OPERACIONES', icon: ShieldCheck, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', description: 'Puntos de control: Caseta Principal, Piscina, Gimnasio' },
  { key: 'MODULO_WHATSAPP', label: 'Call Center & WhatsApp 24/7', category: 'OPERACIONES', icon: Send, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', description: 'Atención automatizada y difusión masiva a socios' },
  { key: 'MODULO_PQRS', label: 'Administración PQRS', category: 'GESTION', icon: MessageSquare, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30', description: 'Gestión y respuesta de requerimientos y reclamos' },
  { key: 'MODULO_USUARIO_PQRS', label: 'Funcionario / Atendedor PQRS', category: 'OPERACIONES', icon: MessageSquare, color: 'text-teal-400 bg-teal-400/10 border-teal-400/30', description: 'Bandeja operativa de atención de casos' },
  { key: 'MODULO_COMERCIAL', label: 'Módulo Comercial & Pases VIP', category: 'GESTION', icon: Sparkles, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', description: 'CRM de postulación, revista 3D y pases VIP con QR' },
  { key: 'MODULO_CANCHAS', label: 'Gestión de Canchas & Deportes', category: 'DEPORTES', icon: CalendarCheck, color: 'text-green-500 bg-green-500/10 border-green-500/30', description: 'Reserva y aprobación de tenis, pádel, frontón' },
  { key: 'MODULO_DIRECTORIO', label: 'Directorio & Gerencia General', category: 'ADMIN', icon: Building2, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30', description: 'Informes ejecutivos, visto bueno y asambleas' },
  { key: 'MODULO_FACTURACION', label: 'Facturación & Cobranzas', category: 'ADMIN', icon: DollarSign, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30', description: 'Facturación de caseta, cuotas y recibos' },
  { key: 'MODULO_CONTABILIDAD', label: 'Contabilidad & Finanzas', category: 'ADMIN', icon: Layers, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30', description: 'Estados financieros, balance y auditoría' },
  { key: 'MODULO_CONTRATACIONES', label: 'Contrataciones & Licitaciones', category: 'ADMIN', icon: Briefcase, color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30', description: 'Adquisiciones institucionales y contratos' },
  { key: 'MODULO_ALMACENES', label: 'Almacenes & Suministros', category: 'OPERACIONES', icon: Package, color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', description: 'Inventario, insumos deportivos y despacho' },
  { key: 'MODULO_ACTIVOS_FIJOS', label: 'Activos Fijos & Infraestructura', category: 'OPERACIONES', icon: Building2, color: 'text-rose-400 bg-rose-400/10 border-rose-400/30', description: 'Mantenimiento de infraestructura y bienes' },
  { key: 'MODULO_RRHH', label: 'Recursos Humanos & Talento', category: 'ADMIN', icon: Users, color: 'text-pink-400 bg-pink-400/10 border-pink-400/30', description: 'Personal, marcaciones, contratos y planillas' },
];

export const PROFILE_PRESETS = [
  {
    id: 'SUPER_ADMIN_TI',
    name: '🛡️ Super Administrador TI',
    description: 'Acceso Total a todos los módulos y seguridad',
    baseRole: 'SUPER_ADMIN',
    modules: SYSTEM_MODULES.map(m => m.key),
  },
  {
    id: 'DIRECTORIO_GERENCIA',
    name: '🏛️ Directorio / Gerencia General',
    description: 'Visto Bueno, Hojas de Ruta, Reportes y PQRS',
    baseRole: 'STAFF',
    modules: ['MODULO_DIRECTORIO', 'MODULO_CORRESPONDENCIA', 'MODULO_PQRS'],
  },
  {
    id: 'SECRETARIA_GENERAL',
    name: '📑 Secretaría General & Despacho',
    description: 'Correspondencia, Hojas de Ruta, Padrón, PQRS y WhatsApp',
    baseRole: 'STAFF',
    modules: ['MODULO_CORRESPONDENCIA', 'MODULO_SOCIOS', 'MODULO_PQRS', 'MODULO_WHATSAPP', 'MODULO_USUARIO_PQRS'],
  },
  {
    id: 'TESORERIA_FINANZAS',
    name: '💰 Tesorería & Finanzas',
    description: 'Facturación, Contabilidad, Correspondencia y Socios',
    baseRole: 'STAFF',
    modules: ['MODULO_FACTURACION', 'MODULO_CONTABILIDAD', 'MODULO_CORRESPONDENCIA', 'MODULO_SOCIOS'],
  },
  {
    id: 'CASETA_PORTERIA',
    name: '🚪 Caseta de Entrada / Guardia',
    description: 'Control de Acceso + Recepción de Facturas de Puerta',
    baseRole: 'ADMIN',
    modules: ['MODULO_CONTROL_ACCESO', 'MODULO_CORRESPONDENCIA'],
  },
  {
    id: 'CALLCENTER_PQRS',
    name: '💬 Atención al Socio / Call Center',
    description: 'WhatsApp 24/7, Recepción PQRS y Consulta Socios',
    baseRole: 'STAFF',
    modules: ['MODULO_WHATSAPP', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS', 'MODULO_SOCIOS'],
  },
  {
    id: 'COMERCIAL_VIP',
    name: '🎫 Comercial & Pases VIP',
    description: 'Emisión Pases VIP, CRM y Revista 3D',
    baseRole: 'STAFF',
    modules: ['MODULO_COMERCIAL', 'MODULO_SOCIOS'],
  },
  {
    id: 'DEPORTES_HIPICA',
    name: '🐎 Comisión Hípica & Deportes',
    description: 'Reserva de Canchas, Picaderos y Correspondencia',
    baseRole: 'STAFF',
    modules: ['MODULO_CANCHAS', 'MODULO_CORRESPONDENCIA'],
  },
  {
    id: 'ALMACEN_MANTENIMIENTO',
    name: '📦 Almacenes & Activos Fijos',
    description: 'Suministros, Activos y Contrataciones',
    baseRole: 'STAFF',
    modules: ['MODULO_ALMACENES', 'MODULO_ACTIVOS_FIJOS', 'MODULO_CONTRATACIONES', 'MODULO_CORRESPONDENCIA'],
  },
  {
    id: 'RRHH',
    name: '👔 Recursos Humanos',
    description: 'Gestión de Talento y Correspondencia',
    baseRole: 'STAFF',
    modules: ['MODULO_RRHH', 'MODULO_CORRESPONDENCIA'],
  },
];

export const SuperAdminDashboard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMassiveFormOpen, setIsMassiveFormOpen] = useState(false);
  const [isEditMemberFormOpen, setIsEditMemberFormOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form Fields
  const [newUsername, setNewUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserDocumentId, setNewUserDocumentId] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [baseRole, setBaseRole] = useState<string>('STAFF');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [selectedOrganigramNodeId, setSelectedOrganigramNodeId] = useState<string>('');
  const [userPosition, setUserPosition] = useState<string>('');

  // Quick Password Reset Modal
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<
    'ALL' | 'INSTITUTIONAL' | 'DIRECTORIO' | 'SECRETARIA' | 'FINANZAS' | 'PORTERIA' | 'MEMBER' | 'INACTIVE'
  >('ALL');

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión cerrada correctamente');
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Listen to searchParams (e.g. ?tab=INSTITUTIONAL&create=staff from correspondence config)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['ALL', 'INSTITUTIONAL', 'DIRECTORIO', 'SECRETARIA', 'FINANZAS', 'PORTERIA', 'MEMBER', 'INACTIVE'].includes(tab)) {
      setUserTypeFilter(tab as any);
    }
    if (searchParams.get('create') === 'staff') {
      handleOpenCreate();
    }
  }, [searchParams]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error al cargar la lista de usuarios');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Module
  const toggleRole = (roleKey: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  // Apply Preset
  const handleApplyPreset = (preset: typeof PROFILE_PRESETS[0]) => {
    setBaseRole(preset.baseRole);
    setSelectedRoles(preset.modules);
    toast.success(`Plantilla "${preset.name}" aplicada ⚡`);
  };

  // Username change handler: auto-syncs official email
  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    setNewUsername(clean);
    if (!newUserEmail || newUserEmail.endsWith('@sargentos.com.bo') || newUserEmail.endsWith('@chls.bo')) {
      setNewUserEmail(clean ? `${clean}@sargentos.com.bo` : '');
    }
  };

  // Select Organigram Node / Department
  const handleSelectOrganigramNode = (nodeId: string) => {
    setSelectedOrganigramNodeId(nodeId);
    if (!nodeId) return;

    const node = DEFAULT_ORGANIGRAM_NODES.find((n) => n.id === nodeId);
    if (node) {
      if (!userPosition || DEFAULT_ORGANIGRAM_NODES.some((n) => n.title === userPosition || n.manager === userPosition)) {
        setUserPosition(node.title || node.manager || '');
      }

      if (node.email) {
        setNewUserEmail(node.email);
        const prefix = node.email.split('@')[0];
        setNewUsername(prefix);
      }

      // Auto-assign roles for this area in correspondence
      const newRoles = new Set(selectedRoles);
      newRoles.add('MODULO_CORRESPONDENCIA');

      if (node.type === 'GERENCIA') {
        newRoles.add('MODULO_DIRECTORIO');
        newRoles.add('MODULO_PQRS');
      } else if (node.type === 'SECRETARIA') {
        newRoles.add('MODULO_SOCIOS');
        newRoles.add('MODULO_PQRS');
        newRoles.add('MODULO_WHATSAPP');
        newRoles.add('MODULO_USUARIO_PQRS');
      } else if (node.type === 'FINANZAS') {
        newRoles.add('MODULO_FACTURACION');
        newRoles.add('MODULO_CONTABILIDAD');
      } else if (node.type === 'COMPRAS') {
        newRoles.add('MODULO_CONTRATACIONES');
      } else if (node.type === 'OPERACIONES') {
        if (node.id.includes('mantenimiento') || node.id.includes('piscinero')) {
          newRoles.add('MODULO_ACTIVOS_FIJOS');
        } else if (node.id.includes('almacen')) {
          newRoles.add('MODULO_ALMACENES');
          newRoles.add('MODULO_ACTIVOS_FIJOS');
        } else if (node.id.includes('rrhh')) {
          newRoles.add('MODULO_RRHH');
        } else if (node.id.includes('sistemas')) {
          newRoles.add('MODULO_CONTROL_ACCESO');
          newRoles.add('MODULO_PQRS');
        }
      } else if (node.type === 'RECEPCION') {
        newRoles.add('MODULO_CONTROL_ACCESO');
        newRoles.add('MODULO_PQRS');
      }

      setSelectedRoles(Array.from(newRoles));
      toast.success(`Área "${node.title}" seleccionada. Módulos asignados ⚡`);
    }
  };

  // Generate Random Secure Password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'CHLS-';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const resetForm = () => {
    setNewUsername('');
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
    setShowPassword(false);
    setSelectedOrganigramNodeId('');
    setUserPosition('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setNewUserPassword(generateRandomPassword());
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    resetForm();
    const isMember = user.roles.some((r) => r.name === 'USER');

    if (isMember) {
      setSelectedMemberId(user.id);
      setIsEditMemberFormOpen(true);
    } else {
      setModalMode('edit');
      setEditingUserId(user.id);

      const loginPrefix = user.email.includes('@') ? user.email.split('@')[0] : user.email;
      setNewUsername(loginPrefix);
      setNewUserEmail(user.email);
      setNewUserFirstName(user.firstName);
      setNewUserLastName(user.lastName);
      setNewUserDocumentId(user.documentId || '');
      setNewUserPhone(user.phone || '');
      setIsActive(user.isActive);

      const matchedNode = getOrganigramNodeForUser(user);
      if (matchedNode) {
        setSelectedOrganigramNodeId(matchedNode.id);
        setUserPosition(matchedNode.title || matchedNode.manager || '');
      } else {
        setSelectedOrganigramNodeId('');
        setUserPosition('');
      }

      const baseRoles = ['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
      const userBaseRole = user.roles.find((r) => baseRoles.includes(r.name))?.name || 'STAFF';
      setBaseRole(userBaseRole);

      const moduleRoles = user.roles.map((r) => r.name).filter((name) => !baseRoles.includes(name));
      setSelectedRoles(moduleRoles);

      setIsModalOpen(true);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const finalRoles = new Set([...selectedRoles, baseRole]);
      if (baseRole !== 'USER') {
        finalRoles.add('MODULO_CORRESPONDENCIA');
      }

      let finalEmail = newUserEmail.trim();
      if (!finalEmail && newUsername.trim()) {
        finalEmail = `${newUsername.trim().toLowerCase()}@sargentos.com.bo`;
      } else if (finalEmail && !finalEmail.includes('@')) {
        finalEmail = `${finalEmail.toLowerCase()}@sargentos.com.bo`;
      }

      if (!finalEmail) {
        toast.error('Por favor ingresa el Nombre de Usuario o Correo');
        return;
      }

      const payload: any = {
        email: finalEmail,
        firstName: newUserFirstName.trim(),
        lastName: newUserLastName.trim(),
        documentId: newUserDocumentId.trim() || null,
        phone: newUserPhone.trim() || null,
        roles: Array.from(finalRoles),
        isActive,
      };

      if (newUserPassword && newUserPassword.trim() !== '') {
        payload.password = newUserPassword.trim();
      }

      if (modalMode === 'create') {
        await api.post('/users', payload);
        toast.success(`¡Usuario ${newUsername || payload.firstName} creado exitosamente! 👤✨`);
      } else if (modalMode === 'edit' && editingUserId) {
        await api.put(`/users/${editingUserId}`, payload);
        toast.success(`Perfil de ${payload.firstName} actualizado correctamente ⚙️`);
      }

      setIsModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error?.response?.data?.error || 'Error al guardar el usuario');
    }
  };

  // Quick Toggle Active State
  const handleToggleActive = async (user: User) => {
    try {
      const newStatus = !user.isActive;
      await api.put(`/users/${user.id}`, { isActive: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      toast.success(
        newStatus
          ? `Cuenta de ${user.firstName} activada ✓`
          : `Cuenta de ${user.firstName} suspendida ⛔`
      );
    } catch {
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (user: User) => {
    setResetTargetUser(user);
    setNewResetPassword(generateRandomPassword());
    setIsResetPasswordModalOpen(true);
  };

  // Submit Password Reset
  const handleConfirmResetPassword = async () => {
    if (!resetTargetUser || !newResetPassword.trim()) return;
    setIsResetting(true);
    try {
      await api.put(`/users/${resetTargetUser.id}`, { password: newResetPassword.trim() });
      toast.success(`Contraseña actualizada con éxito para ${resetTargetUser.email} 🔑`);
      setIsResetPasswordModalOpen(false);
      setResetTargetUser(null);
    } catch {
      toast.error('Error al restablecer la contraseña');
    } finally {
      setIsResetting(false);
    }
  };

  // Copy credentials message
  const handleCopyCredentials = () => {
    if (!resetTargetUser) return;
    const msg = `*CLUB HÍPICO LOS SARGENTOS — CREDENCIALES DE ACCESO*\n\nEstimado(a) ${resetTargetUser.firstName} ${resetTargetUser.lastName},\nSe han generado tus credenciales institucionales para el ingreso a la Suite CHLS:\n\n👤 *Usuario / Login:* ${resetTargetUser.email}\n🔑 *Contraseña:* ${newResetPassword}\n🌐 *Enlace de Acceso:* ${window.location.origin}/login\n\n_Por favor guarda este mensaje en un lugar seguro._`;
    navigator.clipboard.writeText(msg);
    toast.success('¡Credenciales copiadas al portapapeles! Listas para enviar por WhatsApp o correo 📋');
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredUsers.map((u) => {
      const isSuper = u.roles.some((r) => r.name === 'SUPER_ADMIN');
      const isMem = u.roles.some((r) => r.name === 'USER');
      const baseR = isSuper ? 'SUPER ADMIN' : isMem ? 'SOCIO' : 'PERSONAL STAFF';
      const modulos = u.roles
        .filter((r) => r.name.startsWith('MODULO_'))
        .map((r) => r.name.replace('MODULO_', ''))
        .join(', ');

      return {
        'Nombre Completo': `${u.firstName} ${u.lastName}`.trim(),
        'Correo / Login': u.email,
        'Documento / CI': u.documentId || '-',
        Teléfono: u.phone || '-',
        'Rol Base': baseR,
        'Módulos Asignados': isSuper ? 'ACCESO TOTAL' : modulos || 'Ninguno',
        Estado: u.isActive ? 'ACTIVO' : 'INACTIVO / SUSPENDIDO',
        'Fecha de Creación': new Date(u.createdAt).toLocaleDateString('es-BO'),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios_CHLS');
    XLSX.writeFile(workbook, `Padrón_Usuarios_CHLS_${Date.now()}.xlsx`);
    toast.success('Padrón de usuarios exportado a Excel exitosamente 📊');
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = users.length;
    const staff = users.filter((u) => !u.roles.some((r) => r.name === 'USER')).length;
    const members = users.filter((u) => u.roles.some((r) => r.name === 'USER')).length;
    const superAdmins = users.filter((u) => u.roles.some((r) => r.name === 'SUPER_ADMIN')).length;
    const inactive = users.filter((u) => !u.isActive).length;

    return { total, staff, members, superAdmins, inactive };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    let base = users;

    if (userTypeFilter === 'MEMBER') {
      base = base.filter((u) => u.roles.some((r) => r.name === 'USER'));
    } else if (userTypeFilter === 'INSTITUTIONAL') {
      base = base.filter((u) => !u.roles.some((r) => r.name === 'USER'));
    } else if (userTypeFilter === 'DIRECTORIO') {
      base = base.filter((u) => u.roles.some((r) => r.name === 'MODULO_DIRECTORIO' || r.name === 'SUPER_ADMIN'));
    } else if (userTypeFilter === 'SECRETARIA') {
      base = base.filter((u) => u.roles.some((r) => r.name === 'MODULO_CORRESPONDENCIA'));
    } else if (userTypeFilter === 'FINANZAS') {
      base = base.filter((u) => u.roles.some((r) => r.name === 'MODULO_FACTURACION' || r.name === 'MODULO_CONTABILIDAD'));
    } else if (userTypeFilter === 'PORTERIA') {
      base = base.filter((u) => u.roles.some((r) => r.name === 'ADMIN' || r.name === 'MODULO_CONTROL_ACCESO'));
    } else if (userTypeFilter === 'INACTIVE') {
      base = base.filter((u) => !u.isActive);
    }

    if (!searchTerm.trim()) return base;

    const lower = searchTerm.toLowerCase().trim();
    return base.filter((u) => {
      const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(lower);
      const matchEmail = u.email.toLowerCase().includes(lower);
      const matchDoc = u.documentId?.toLowerCase().includes(lower) || false;
      const matchPhone = u.phone?.toLowerCase().includes(lower) || false;
      const matchRole = u.roles.some((r) => r.name.toLowerCase().includes(lower));
      return matchName || matchEmail || matchDoc || matchPhone || matchRole;
    });
  }, [users, searchTerm, userTypeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-brand-gold font-bold text-sm tracking-widest uppercase">
            Cargando Plataforma de Usuarios...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#07110c] to-slate-950 text-slate-100 relative overflow-hidden font-sans pb-16">
      
      {/* Glows de Fondo */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-white/10 gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BackButton to="/" title="Volver al Portal Principal" />
            <CrestLogo size="sm" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Gestión de Usuarios & Perfiles
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Gobierno de personal administrativo, jefaturas de área, portería y padrón de socios del Club.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={() => setIsMassiveFormOpen(true)}
              className="bg-brand-gold hover:bg-yellow-500 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-brand-gold/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nuevo Socio</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-emerald-500/25 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-slate-950" />
              <span>+ Funcionario / Staff</span>
            </button>

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 5 KPI Metric Cards con Resplandor Vibrante acorde a su color */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          
          {/* 1. Total Usuarios - Azul Radiante */}
          <div className="bg-gradient-to-br from-blue-950/40 via-slate-900/80 to-slate-950 border border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(59,130,246,0.18)] hover:shadow-[0_0_35px_rgba(59,130,246,0.32)] transition-all duration-300 group hover:-translate-y-0.5">
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.35)] group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white group-hover:text-blue-200 transition-colors">{metrics.total}</div>
              <div className="text-[11px] font-bold text-blue-300/80 uppercase tracking-wider">Total Usuarios</div>
            </div>
          </div>

          {/* 2. Personal / Staff - Verde Esmeralda Radiante */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-950 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(16,185,129,0.18)] hover:shadow-[0_0_35px_rgba(16,185,129,0.32)] transition-all duration-300 group hover:-translate-y-0.5">
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.35)] group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white group-hover:text-emerald-200 transition-colors">{metrics.staff}</div>
              <div className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider">Personal / Staff</div>
            </div>
          </div>

          {/* 3. Socios del Club - Oro Lujo Radiante */}
          <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-950 border border-amber-500/35 hover:border-amber-400/70 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(212,175,55,0.22)] hover:shadow-[0_0_35px_rgba(212,175,55,0.4)] transition-all duration-300 group hover:-translate-y-0.5">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-brand-gold shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white group-hover:text-amber-200 transition-colors">{metrics.members}</div>
              <div className="text-[11px] font-bold text-amber-300/80 uppercase tracking-wider">Socios del Club</div>
            </div>
          </div>

          {/* 4. SuperAdmins TI - Púrpura Real Radiante */}
          <div className="bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-950 border border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.18)] hover:shadow-[0_0_35px_rgba(168,85,247,0.32)] transition-all duration-300 group hover:-translate-y-0.5">
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.35)] group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white group-hover:text-purple-200 transition-colors">{metrics.superAdmins}</div>
              <div className="text-[11px] font-bold text-purple-300/80 uppercase tracking-wider">SuperAdmins TI</div>
            </div>
          </div>

          {/* 5. Inactivos / Bloq. - Carmesí / Rose Radiante */}
          <div className="bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-950 border border-rose-500/30 hover:border-rose-400/60 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(244,63,94,0.18)] hover:shadow-[0_0_35px_rgba(244,63,94,0.32)] transition-all duration-300 group hover:-translate-y-0.5 col-span-2 sm:col-span-1">
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.35)] group-hover:scale-105 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-black text-white group-hover:text-rose-200 transition-colors">{metrics.inactive}</div>
              <div className="text-[11px] font-bold text-rose-300/80 uppercase tracking-wider">Inactivos / Bloq.</div>
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          
          {/* Controls Bar: Search, Segments & Quick Staff Creation */}
          <div className="p-5 border-b border-white/10 bg-white/[0.01] flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo, CI, teléfono o rol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 font-medium focus:ring-2 focus:ring-brand-gold focus:border-brand-gold outline-none shadow-inner"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segment Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 scrollbar-none flex-wrap sm:flex-nowrap">
              {[
                { id: 'ALL', label: `Todos (${metrics.total})` },
                { id: 'INSTITUTIONAL', label: `💼 Personal Staff (${metrics.staff})` },
                { id: 'DIRECTORIO', label: '🏛️ Directorio' },
                { id: 'SECRETARIA', label: '📑 Secretaría' },
                { id: 'FINANZAS', label: '💰 Finanzas' },
                { id: 'PORTERIA', label: '🚪 Portería' },
                { id: 'MEMBER', label: `🎾 Socios (${metrics.members})` },
                { id: 'INACTIVE', label: `🚫 Inactivos (${metrics.inactive})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setUserTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    userTypeFilter === tab.id
                      ? 'bg-brand-gold text-slate-950 shadow-md font-black'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Direct CTA Button to create Staff */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
                title="Crear nuevo usuario para funcionario institucional / personal staff"
              >
                <Shield className="w-4 h-4 text-slate-950" />
                <span>+ Crear Funcionario / Staff</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-white/10">
                <tr>
                  <th className="py-4 px-6">Usuario Institucional / Socio</th>
                  <th className="py-4 px-4">Documento / Teléfono</th>
                  <th className="py-4 px-4">Nivel Jerárquico</th>
                  <th className="py-4 px-4">Módulos Asignados</th>
                  <th className="py-4 px-4 text-center">Estado</th>
                  <th className="py-4 px-6 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-white">
                          No se encontraron usuarios con los criterios de búsqueda.
                        </p>
                        <p className="text-xs text-slate-500">
                          {userTypeFilter === 'INSTITUTIONAL'
                            ? 'No hay funcionarios registrados en este filtro. Puedes crear uno inmediatamente.'
                            : 'Intenta ajustar tus términos de búsqueda o crear un nuevo usuario.'}
                        </p>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5 text-slate-950" />
                            <span>+ Registrar Nuevo Funcionario / Staff</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSuperAdmin = user.roles.some((r) => r.name === 'SUPER_ADMIN');
                    const isMember = user.roles.some((r) => r.name === 'USER');
                    const isAdminGuard = user.roles.some((r) => r.name === 'ADMIN');
                    const isStaff = user.roles.some((r) => r.name === 'STAFF');

                    const userModules = user.roles.filter((r) => r.name.startsWith('MODULO_'));
                    const orgNode = !isMember ? getOrganigramNodeForUser(user) : undefined;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        {/* 1. Name & Avatar */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-md ${
                                isSuperAdmin
                                  ? 'bg-gradient-to-br from-brand-gold to-yellow-600 text-slate-950'
                                  : isMember
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-white/10 text-white border border-white/15'
                              }`}
                            >
                              {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                              {user.lastName ? user.lastName.charAt(0).toUpperCase() : ''}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white text-sm group-hover:text-brand-gold transition-colors truncate">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-slate-400 text-xs font-mono truncate">{user.email}</div>
                              {orgNode && (
                                <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5 truncate">
                                  <Building2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span>{orgNode.title}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Doc & Phone */}
                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-slate-200">{user.documentId || '—'}</div>
                          <div className="text-slate-400 text-[11px]">{user.phone || '—'}</div>
                        </td>

                        {/* 3. Level */}
                        <td className="py-4 px-4">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 bg-brand-gold/15 text-brand-gold border border-brand-gold/40 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              <ShieldCheck className="w-3 h-3" />
                              SuperAdmin
                            </span>
                          ) : isMember ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              Socio Titular
                            </span>
                          ) : isAdminGuard ? (
                            <span className="inline-flex items-center gap-1 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              Portería / Guardia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                              Personal Staff
                            </span>
                          )}
                        </td>

                        {/* 4. Modules */}
                        <td className="py-4 px-4">
                          {isSuperAdmin ? (
                            <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-md border border-brand-gold/30 uppercase tracking-wider">
                              ✨ ACCESO GLOBAL (15 Módulos)
                            </span>
                          ) : isMember ? (
                            <span className="text-[11px] text-slate-400 italic">Portal del Socio CHLS</span>
                          ) : userModules.length === 0 ? (
                            <span className="text-[11px] text-slate-500 italic">Sin módulos específicos</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {userModules.slice(0, 3).map((r) => {
                                const mod = SYSTEM_MODULES.find((m) => m.key === r.name);
                                return (
                                  <span
                                    key={r.name}
                                    className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                                      mod?.color || 'text-slate-300 bg-white/5 border-white/10'
                                    }`}
                                  >
                                    {mod?.label.split(' ')[0] || r.name.replace('MODULO_', '')}
                                  </span>
                                );
                              })}
                              {userModules.length > 3 && (
                                <span className="text-[9px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                  +{userModules.length - 3} más
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Active Switch */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              user.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                            }`}
                            title="Haz clic para cambiar estado"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.isActive ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                            ></span>
                            <span>{user.isActive ? 'Activo' : 'Suspendido'}</span>
                          </button>
                        </td>

                        {/* 6. Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenResetPassword(user)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-brand-gold border border-white/10 transition-colors cursor-pointer"
                              title="Restablecer Contraseña"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(user)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/10 transition-colors cursor-pointer"
                              title="Editar Perfil & Módulos"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: ALTA & EDICIÓN DE USUARIO INSTITUCIONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-950 border border-emerald-500/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between max-h-[92vh] animate-fadeIn text-slate-100">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>
                      {modalMode === 'create' ? 'Alta de Funcionario / Usuario Institucional' : 'Editar Perfil & Permisos'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Asignación de credenciales, nivel jerárquico y activación de módulos de la Suite CHLS.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Presets Rápidos de 1 Toque */}
              <div>
                <label className="block text-xs font-black uppercase text-brand-gold tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-gold" />
                  <span>Plantillas de Perfil Automático (1 Toque)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {PROFILE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-brand-gold/15 hover:border-brand-gold/50 text-[11px] font-bold text-left transition-all cursor-pointer flex flex-col justify-between group"
                    >
                      <span className="text-white group-hover:text-brand-gold font-bold line-clamp-1">
                        {p.name}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 font-mono">
                        {p.modules.length} Módulos
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Cargo Institucional en el Organigrama & Despacho Oficial */}
              <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900/70 to-slate-950 p-5 rounded-2xl border-2 border-emerald-500/40 space-y-4 shadow-lg shadow-emerald-950/30">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-2 tracking-wider">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>1. Cargo Institucional en el Organigrama (¿Qué puesto ocupará?)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Puesto de Organigrama
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Selecciona el despacho al que pertenece este puesto. Esto define a qué áreas puede derivar o de quiénes puede recibir Hojas de Ruta en el Organigrama.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Área / Despacho Oficial (Organigrama) <span className="text-emerald-400">*</span>
                    </label>
                    <select
                      value={selectedOrganigramNodeId}
                      onChange={(e) => handleSelectOrganigramNode(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Seleccionar Área del Organigrama --</option>
                      {DEFAULT_ORGANIGRAM_NODES.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title} — ({node.subtitle || node.manager})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Cargo / Puesto Formal en el Organigrama <span className="text-emerald-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Responsable de Archivo Central, Jefe de Mantenimiento..."
                      value={userPosition}
                      onChange={(e) => setUserPosition(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {selectedOrganigramNodeId && (
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Habilitado para derivar y recepcionar con SLA según conexiones del organigrama.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Funcionario Titular (La Persona Física que ocupa el cargo) */}
              <div className="bg-gradient-to-br from-blue-950/30 via-slate-900/60 to-slate-950 p-5 rounded-2xl border border-blue-500/30 space-y-4 shadow-lg shadow-blue-950/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase text-blue-400 flex items-center gap-2 tracking-wider">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>2. Funcionario Asignado (¿Quién es la persona que ocupa este cargo?)</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-300 bg-blue-500/20 border border-blue-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Datos del Personal
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Nombre(s) de la Persona <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Carlos"
                      value={newUserFirstName}
                      onChange={(e) => setNewUserFirstName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Apellido(s) de la Persona <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pérez Rodríguez"
                      value={newUserLastName}
                      onChange={(e) => setNewUserLastName(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Documento / C.I. (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 4892110 LP"
                      value={newUserDocumentId}
                      onChange={(e) => setNewUserDocumentId(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Teléfono / WhatsApp Corporativo (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 77218940"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Cuenta de Usuario del Sistema & Login (El Usuario con el que ingresará) */}
              <div className="bg-gradient-to-br from-amber-950/40 via-slate-900/80 to-slate-950 p-5 rounded-2xl border-2 border-brand-gold/60 space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.18)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase text-brand-gold flex items-center gap-2 tracking-wider">
                    <User className="w-4 h-4 text-brand-gold" />
                    <span>3. Cuenta de Usuario del Sistema (¿Con qué USUARIO iniciará sesión?)</span>
                  </span>
                  <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/20 border border-brand-gold/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Credenciales de Login
                  </span>
                </div>

                <div className="p-3 bg-brand-gold/10 rounded-xl border border-brand-gold/25 flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    <strong>Definición de Usuario:</strong> Aquí se define el <strong>Nombre de Usuario</strong> con el que este funcionario ingresará a la plataforma. Puede ser el alias del cargo (ej. <code>archivo</code>, <code>mantenimiento</code>) o el usuario personal (ej. <code>jcperez</code>, <code>cgonzales</code>).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CAMPO USUARIO PRINCIPAL */}
                  <div>
                    <label className="block text-xs font-black uppercase text-brand-gold mb-1 tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Nombre de Usuario (Login) *</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="ej. archivo, cgonzales, secretaria, jcperez"
                        value={newUsername}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="w-full bg-slate-900 border-2 border-brand-gold/60 focus:border-brand-gold rounded-xl px-3.5 py-2.5 text-sm text-brand-gold font-mono font-black outline-none focus:ring-2 focus:ring-brand-gold shadow-inner"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      El funcionario puede escribir solo este nombre de usuario para iniciar sesión.
                    </p>
                  </div>

                  {/* CORREO INSTITUCIONAL */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <AtSign className="w-3 h-3 text-slate-400" />
                        <span>Correo Electrónico Oficial *</span>
                      </label>
                      {newUsername && (
                        <span className="text-[10px] text-brand-gold/80 font-mono">
                          Auto-sincronizado
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="ej. archivo@sargentos.com.bo"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-brand-gold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Se utiliza para recepción de notificaciones y login con correo completo.
                    </p>
                  </div>
                </div>

                {/* CONTRASEÑA */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      {modalMode === 'create' ? 'Contraseña Inicial *' : 'Nueva Contraseña (Opcional)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewUserPassword(generateRandomPassword())}
                      className="text-[10px] text-brand-gold hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Generar Clave Aleatoria</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={modalMode === 'create' ? 'Contraseña generada...' : 'Dejar en blanco para conservar contraseña actual'}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white font-mono font-bold outline-none focus:ring-2 focus:ring-brand-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Nivel Jerárquico & Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 space-y-2">
                  <label className="block text-xs font-black uppercase text-slate-300">
                    4. Rol Base Institucional
                  </label>
                  <select
                    value={baseRole}
                    onChange={(e) => setBaseRole(e.target.value)}
                    className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold outline-none focus:ring-2 focus:ring-brand-gold cursor-pointer"
                  >
                    <option value="STAFF">Personal Administrativo / Jefatura (STAFF)</option>
                    <option value="ADMIN">Administrador de Operaciones / Portería (ADMIN)</option>
                    <option value="SUPER_ADMIN">Super Administrador Maestro TI (SUPER_ADMIN)</option>
                  </select>
                </div>

                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-black uppercase text-white">
                      Estado de Cuenta
                    </label>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isActive ? 'Permite inicio de sesión activo' : 'Cuenta suspendida temporalmente'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                  </label>
                </div>
              </div>

              {/* Matriz de Módulos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-300 block">
                    5. Matriz de Módulos Autorizados ({selectedRoles.length} Seleccionados)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoles(SYSTEM_MODULES.map((m) => m.key))}
                      className="text-[10px] text-brand-gold hover:underline font-bold cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRoles([])}
                      className="text-[10px] text-slate-400 hover:underline font-bold cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {SYSTEM_MODULES.map((mod) => {
                    const isSelected = selectedRoles.includes(mod.key);
                    const IconComponent = mod.icon;

                    return (
                      <div
                        key={mod.key}
                        onClick={() => toggleRole(mod.key)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                isSelected ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {mod.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer"
                >
                  {modalMode === 'create' ? 'Crear Usuario Institucional' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESETEO RÁPIDO DE CONTRASEÑA */}
      {isResetPasswordModalOpen && resetTargetUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-950 border border-amber-500/30 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 animate-fadeIn text-slate-100 space-y-5">
            
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  Restablecer Contraseña
                </h3>
                <p className="text-xs text-slate-400">{resetTargetUser.firstName} {resetTargetUser.lastName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Nueva Contraseña Temporal
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-brand-gold font-mono font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewResetPassword(generateRandomPassword())}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Generar otra contraseña"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full bg-white/5 hover:bg-white/10 text-brand-gold border border-brand-gold/30 rounded-xl py-2 px-3 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Mensaje Formal para WhatsApp</span>
              </button>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsResetPasswordModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                disabled={isResetting}
                className="bg-brand-gold hover:bg-yellow-500 text-slate-950 font-black px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isResetting ? 'Guardando...' : 'Aplicar Contraseña'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: ALTA MASIVA DE SOCIOS */}
      {isMassiveFormOpen && (
        <MassiveMemberForm
          onClose={() => setIsMassiveFormOpen(false)}
          onSuccess={() => {
            setIsMassiveFormOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* MODAL 4: EDICIÓN DE SOCIO */}
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
