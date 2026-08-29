import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { Search, Filter, MessageSquare, CheckCircle, RefreshCcw, Send, Clock, ArrowLeft, LayoutGrid, List, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import WhatsAppConnectorModal from '../components/WhatsAppConnectorModal';
import logoClub from '../../../assets/logo.png';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';

interface PqrsTicket {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  trackingCode: string;
  memberCode?: string;
  type: string;
  area?: string;
  applicantCondition: string;
  description: string;
  status: string;
  resolution?: string;
  createdAt: string;
  isRead?: boolean;
  priority: string;
  rating?: number;
  ratingComment?: string;
  assignedToId?: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string; email: string };
  history?: PqrsHistory[];
}

interface PqrsHistory {
  id: string;
  action: string;
  description: string;
  performedBy: string | null;
  createdAt: string;
}

const getLastNote = (ticket: PqrsTicket) => {
  if (!ticket.history || ticket.history.length <= 1) return null;
  const meaningfulHistory = ticket.history.filter(h => h.action !== 'CREADO' && h.action !== 'RECIBIDO');
  if (meaningfulHistory.length === 0) return null;
  
  const last = meaningfulHistory[0];
  if (last.description.includes('Instrucciones/Nota:')) {
    return last.description.split('Instrucciones/Nota:')[1].trim();
  }
  if (last.description.includes('Nota de Resolución:')) {
    return last.description.split('Nota de Resolución:')[1].trim();
  }
  if (last.action === 'COMENTARIO_INTERNO') {
    return last.description;
  }
  return last.description.split('\n')[0]; 
};

// Verifica si un ticket derivado ya cuenta con respuesta/acciones del usuario asignado
const hasAssignedUserResponded = (ticket: PqrsTicket) => {
  if (!ticket.assignedToId) return false;
  if (!ticket.history || ticket.history.length === 0) return false;

  // Buscar el índice del evento de derivación más reciente (el historial viene ordenado desc: índice 0 = más reciente)
  const lastDerivationIndex = ticket.history.findIndex(h => h.action === 'DERIVACION');

  if (lastDerivationIndex === -1) {
    return ticket.history.some(h => ['COMENTARIO_INTERNO', 'RESPUESTA_USUARIO', 'ESTADO_ACTUALIZADO'].includes(h.action));
  }

  // Cualquier acción ocurrida después de la última derivación (índice menor a lastDerivationIndex)
  const eventsAfterDerivation = ticket.history.slice(0, lastDerivationIndex);
  return eventsAfterDerivation.some(h => 
    ['COMENTARIO_INTERNO', 'RESPUESTA_USUARIO', 'ESTADO_ACTUALIZADO'].includes(h.action)
  );
};

const KanbanCard = ({ ticket, onOpen, activeTab }: { ticket: PqrsTicket, onOpen: () => void, activeTab?: string }) => {
  const lastActionDate = ticket.history && ticket.history.length > 0 ? new Date(ticket.history[0].createdAt) : new Date(ticket.createdAt);
  const daysOpen = differenceInDays(new Date(), lastActionDate);
  const isStuck = daysOpen >= 3 && ticket.status !== 'CERRADO';
  
  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'URGENTE': return 'bg-red-500 text-white animate-pulse';
      case 'ALTA': return 'bg-orange-500/20 text-orange-500 border border-orange-500/30';
      case 'MEDIA': return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
      case 'BAJA': return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border border-gray-500/30';
    }
  };

  return (
    <div 
      onClick={onOpen}
      className={`bg-white dark:bg-[#131c26]/90 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-1 ${isStuck ? 'border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{ticket.code}</span>
        {isStuck && (
          <span className="text-xs font-bold text-red-500 flex items-center gap-1">
            <AlertTriangle size={12} /> Demorado
          </span>
        )}
        {ticket.isRead === false && ticket.status !== 'CERRADO' && activeTab !== 'DERIVADOS' && (
          hasAssignedUserResponded(ticket) ? (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]">
              RESPUESTA
            </span>
          ) : (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              NUEVO
            </span>
          )
        )}
        {ticket.isRead === false && ticket.status !== 'CERRADO' && activeTab === 'DERIVADOS' && (
          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
            Esperando Respuesta
          </span>
        )}
      </div>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">{ticket.fullName}</h4>
      <p className="text-xs theme-text-muted mb-3 line-clamp-2">{ticket.description}</p>
      
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority || 'MEDIA')}`}>
          {ticket.priority || 'MEDIA'}
        </span>
        <span className="text-[10px] font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
          {ticket.type}
        </span>
      </div>
      
      <div className="flex justify-between items-center text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-white/10 pt-2 mt-2">
        <span>Hace {daysOpen} días</span>
        {ticket.assignedTo ? (
          <span className="font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded truncate max-w-[120px]">
            {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
          </span>
        ) : (
          <span className="italic text-gray-400">Sin asignar</span>
        )}
      </div>

      {getLastNote(ticket) && (
        <div className="mt-2 text-[10px] text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/5 p-2 rounded border border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-brand-gold flex items-center gap-1 mb-0.5">
            <MessageSquare size={10} /> Última Acción:
          </span>
          <span className="line-clamp-2 italic">"{getLastNote(ticket)}"</span>
        </div>
      )}

      {ticket.rating && (
        <div className="mt-2 flex items-center justify-between bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-1.5 rounded border border-yellow-500/20">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg key={star} className={`w-3 h-3 ${star <= ticket.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            ))}
          </div>
          <span className="text-[10px] font-bold">Calificación: {ticket.rating}/5</span>
        </div>
      )}
    </div>
  );
};

export const PqrsDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<PqrsTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<PqrsTicket | null>(null);
  
  // Modal state
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [closingImage, setClosingImage] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    reductionPercentage: number;
    fileName: string;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSentSuccess, setIsSentSuccess] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    condition: '',
    phone: '',
    email: '',
    type: '',
    area: '',
    description: ''
  });
  
  const { user } = useSelector((state: any) => state.auth);
  const isMainAdmin = user?.roles?.some((r: string) => ['SUPER_ADMIN', 'MODULO_PQRS'].includes(r));
  
  // Filtering & Tabs
  const [activeTab, setActiveTab] = useState<'ENTRADA' | 'PROCESO' | 'DERIVADOS' | 'ARCHIVO'>(isMainAdmin ? 'ENTRADA' : 'PROCESO');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, priorityFilter, searchTerm, itemsPerPage]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [showWaModal, setShowWaModal] = useState(false);
  const [waStatus, setWaStatus] = useState<'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING'>('DISCONNECTED');
  const [isBotActive, setIsBotActive] = useState<boolean>(true);

  const fetchWaStatus = async () => {
    try {
      const res = await api.get('/whatsapp/chls-pqrs/status');
      if (res.data && res.data.success) {
        setWaStatus(res.data.data.status);
        if (res.data.data.isBotActive !== undefined) {
          setIsBotActive(res.data.data.isBotActive);
        }
      }
    } catch (err) {
      console.error('Error fetching WA PQRS status', err);
    }
  };

  const toggleBot = async () => {
    try {
      const res = await api.post('/whatsapp/chls-pqrs/toggle-bot', { isActive: !isBotActive });
      if (res.data && res.data.success) {
        setIsBotActive(res.data.isBotActive);
        toast.success(res.data.isBotActive ? 'Bot Encendido 🤖' : 'Bot Apagado 🛑');
      }
    } catch (err) {
      toast.error('Error al cambiar el estado del bot');
    }
  };

  useEffect(() => {
    fetchWaStatus();
    const interval = setInterval(() => {
      fetchWaStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Removed default message useEffect

  const handleSaveInfo = async () => {
    if (!selectedTicket) return;
    try {
      const response = await api.put(`/pqrs/${selectedTicket.id}`, editFormData);
      if (response.data.success) {
        toast.success('Información actualizada correctamente');
        setIsEditingInfo(false);
        fetchTickets(false); // Refresh list
        setSelectedTicket(response.data.ticket); // Update selected
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar información');
    }
  };

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/pqrs');
      setTickets(response.data.tickets || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar tickets PQRS');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get('/users/staff');
      setStaffUsers(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStaffUsers();
    const interval = setInterval(() => {
      fetchTickets(false); 
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const openTicket = async (ticket: PqrsTicket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status);
    setNewPriority(ticket.priority || 'MEDIA');
    setNewAssignedTo(ticket.assignedToId || '');
    setInternalNote('');
    setClosingImage(null);
    setCompressionInfo(null);
    setIsCompressing(false);
  };

  const handleCloseModal = () => {
    setSelectedTicket(null);
  };

  const handleReceiveTicketId = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsSending(true);
    try {
      await api.put(`/pqrs/${id}/read`);
      toast.success('Correspondencia recibida');
      setTickets(prev => prev.map(t => t.id === id ? { ...t, isRead: true } : t));
      if (selectedTicket?.id === id) {
        setSelectedTicket(prev => prev ? { ...prev, isRead: true } : prev);
        await refreshSelectedTicket(id);
      }
    } catch (err) {
      console.error('Error marking as read', err);
      toast.error('Error al recibir la correspondencia');
    } finally {
      setIsSending(false);
    }
  };

  const handleReceiveTicket = () => {
    if (selectedTicket) handleReceiveTicketId(selectedTicket.id);
  };

  const refreshSelectedTicket = async (ticketId: string) => {
    try {
      const response = await api.get('/pqrs');
      const updatedTickets = response.data.tickets || [];
      setTickets(updatedTickets);
      const updatedTicket = updatedTickets.find((t: PqrsTicket) => t.id === ticketId);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
        setNewStatus(updatedTicket.status);
      }
    } catch (err) {
      console.error(err);
    }
  };


  // Removed WhatsApp responder handlers


  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    const originalSizeKb = file.size / 1024;
    const originalSizeStr = originalSizeKb > 1024 
      ? `${(originalSizeKb / 1024).toFixed(2)} MB` 
      : `${originalSizeKb.toFixed(1)} KB`;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          
          const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
          const compressedSizeKb = (base64Length * 0.75) / 1024;
          const compressedSizeStr = `${compressedSizeKb.toFixed(1)} KB`;
          const reduction = Math.max(0, Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100));

          setClosingImage(compressedDataUrl);
          setCompressionInfo({
            originalSize: originalSizeStr,
            compressedSize: compressedSizeStr,
            reductionPercentage: reduction,
            fileName: file.name
          });
          toast.success('Imagen cargada y comprimida correctamente');
        }
        setIsCompressing(false);
      };
      img.onerror = () => {
        toast.error('Error al procesar la imagen.');
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveClosingImage = () => {
    setClosingImage(null);
    setCompressionInfo(null);
  };

  const handleSaveChanges = async () => {
    if (!selectedTicket) return;

    if (isCompressing) {
      toast.error('Por favor, espera a que termine la compresión de la imagen.');
      return;
    }

    const isClosing = (newStatus === 'CERRADO' || newStatus === 'RESUELTO') && selectedTicket.status !== 'CERRADO' && selectedTicket.status !== 'RESUELTO';
    
    if (isClosing) {
      setShowCloseConfirmModal(true);
      return;
    }

    await executeSaveChanges();
  };

  const executeSaveChanges = async () => {
    if (!selectedTicket) return;
    const isClosing = (newStatus === 'CERRADO' || newStatus === 'RESUELTO') && selectedTicket.status !== 'CERRADO' && selectedTicket.status !== 'RESUELTO';

    setIsSending(true);
    try {
      let madeChanges = false;
      let noteSent = false;
      
      // Auto-change status to EN_PROGRESO if they took action on an ABIERTO ticket
      let finalStatus = newStatus;
      if (selectedTicket.status === 'ABIERTO' && (newAssignedTo !== (selectedTicket.assignedToId || '') || internalNote.trim())) {
        finalStatus = 'EN_PROGRESO';
      }

      // 1. Assign or Priority changes
      const hasAssignChanges = newPriority !== selectedTicket.priority || newAssignedTo !== (selectedTicket.assignedToId || '');
      if (hasAssignChanges) {
        await api.put(`/pqrs/${selectedTicket.id}/assign`, {
          priority: newPriority,
          assignedToId: newAssignedTo || null,
          note: internalNote.trim() // Pasa la nota aquí
        });
        if (internalNote.trim()) noteSent = true;
        madeChanges = true;
      }
      // 2. Status or Resolution changes
      const hasStatusChanges = finalStatus !== selectedTicket.status || (!noteSent && internalNote.trim()) || closingImage;
      if (hasStatusChanges) {
        await api.put(`/pqrs/${selectedTicket.id}/status`, {
          status: finalStatus,
          resolution: !noteSent ? internalNote.trim() : undefined,
          mediaBase64: isClosing ? closingImage || undefined : undefined
        });
        if (!noteSent && internalNote.trim()) noteSent = true;
        madeChanges = true;
      }

      // 3. Add Internal Note (Only if not sent yet)
      if (internalNote.trim() && !noteSent) {
        await api.post(`/pqrs/${selectedTicket.id}/note`, { note: internalNote.trim() });
        madeChanges = true;
      }

      if (!madeChanges) {
         toast('No se detectaron cambios', { icon: 'ℹ️' });
         setIsSending(false);
         return;
      }

      toast.success('Cambios guardados correctamente');
      if (isClosing) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#3B82F6']
        });
      }
      
      setInternalNote('');
      setIsSentSuccess(true);
      setShowCloseConfirmModal(false);
      setTimeout(() => setIsSentSuccess(false), 5000);
      await refreshSelectedTicket(selectedTicket.id);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar cambios');
    } finally {
      setIsSending(false);
    }
  };

  const handleUnarchive = async () => {
    if (!selectedTicket) return;
    setIsSending(true);
    try {
      await api.put(`/pqrs/${selectedTicket.id}/status`, {
        status: 'EN_PROGRESO',
        resolution: 'El ticket fue desarchivado y devuelto a proceso.'
      });
      toast.success('Ticket desarchivado correctamente');
      setNewStatus('EN_PROGRESO');
      await refreshSelectedTicket(selectedTicket.id);
    } catch (err) {
      console.error(err);
      toast.error('Error al desarchivar ticket');
    } finally {
      setIsSending(false);
    }
  };

  const exportToPDF = () => {
    if (!selectedTicket) return;
    const doc = new jsPDF();
    
    const renderPDF = (imgElement?: HTMLImageElement) => {
      if (imgElement) {
        // Calculate aspect ratio to prevent stretching
        const logoHeight = 22;
        const logoWidth = logoHeight * (imgElement.width / imgElement.height);
        
        // Right align with 14mm margin (A4 width is 210mm)
        const xPos = 210 - 14 - logoWidth;
        doc.addImage(imgElement, 'PNG', xPos, 10, logoWidth, logoHeight);
      }
      
      // Club Green Color for Title
      doc.setTextColor(29, 78, 52);
      doc.setFontSize(16);
      doc.text(`Ticket: ${selectedTicket.code}`, 14, 22);
      
      // Gray for subtitle
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(11);
      doc.text(`Solicitante: ${selectedTicket.fullName}`, 14, 30);
      
      const assignedUser = selectedTicket.assignedTo 
        ? `${selectedTicket.assignedTo.firstName} ${selectedTicket.assignedTo.lastName}` 
        : 'Sin asignar';
      doc.text(`Asignado a: ${assignedUser}`, 14, 36);

      const createdTime = new Date(selectedTicket.createdAt).getTime();
      let endTime = Date.now();
      if (selectedTicket.status === 'CERRADO' || selectedTicket.status === 'RESUELTO') {
         const closedEvent = selectedTicket.history?.find(h => h.action === 'CERRADO' || h.action === 'RESUELTO');
         if (closedEvent) endTime = new Date(closedEvent.createdAt).getTime();
      }
      const diffMs = endTime - createdTime;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      let timeStr = '';
      if (diffDays > 0) timeStr += `${diffDays} días, `;
      if (diffHours > 0 || diffDays > 0) timeStr += `${diffHours} hrs, `;
      timeStr += `${diffMins} min`;
      
      doc.text(`Tiempo transcurrido: ${timeStr}`, 14, 42);

      // Helper to strip emojis and tags for PDF rendering
      const stripDescription = (str: string) => {
        if (!str) return '';
        const clean = str.replace(/\[IMAGEN_RESPALDO\]:[^\s\n]+/g, '[Foto de Respaldo Adjunta]');
        return clean.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '');
      };

      const tableData = selectedTicket.history?.map(hist => [
        format(new Date(hist.createdAt), "dd/MM/yyyy HH:mm"),
        hist.action.replace(/_/g, ' '),
        hist.performedBy || 'Sistema',
        stripDescription(hist.description)
      ]) || [];

      autoTable(doc, {
        startY: 50,
        head: [['Fecha', 'Acción', 'Usuario', 'Descripción']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [29, 78, 52] } // Club Green for table header
      });

      doc.save(`Historial_Ticket_${selectedTicket.code}.pdf`);
    };

    const img = new Image();
    img.src = logoClub;
    img.onload = () => renderPDF(img);
    img.onerror = () => renderPDF();
  };

  const isPqrsAdmin = user?.roles?.some((r: string) => ['SUPER_ADMIN', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS'].includes(r));

  const getUnreadCount = (tab: string) => {
    if (tab === 'DERIVADOS') return 0; // Ocultar burbuja roja en Bandeja de Salida
    
    return tickets.filter(t => {
      if (t.isRead !== false) return false;
      
      if (isMainAdmin) {
        if (tab === 'ENTRADA') {
          return (!t.assignedToId || t.assignedToId === user?.id) && t.status === 'ABIERTO';
        }
        if (tab === 'PROCESO') {
          const isMineInProgress = (!t.assignedToId || t.assignedToId === user?.id) && t.status === 'EN_PROGRESO';
          const isDerivedResponded = (!!t.assignedToId && t.assignedToId !== user?.id) && hasAssignedUserResponded(t) && t.status !== 'CERRADO';
          return isMineInProgress || isDerivedResponded;
        }
        if (tab === 'ARCHIVO') return t.status === 'CERRADO';
        return false;
      } else {
        const isMine = t.assignedToId === user?.id;
        if (tab === 'PROCESO') return isMine && t.status !== 'CERRADO';
        if (tab === 'ARCHIVO') return t.status === 'CERRADO';
        return false;
      }
    }).length;
  };

  const filteredTickets = tickets.filter(t => {
    let matchTab = false;
    const isDerivedToOthers = !!t.assignedToId && t.assignedToId !== user?.id;

    if (activeTab === 'ARCHIVO') {
      matchTab = t.status === 'CERRADO';
    } else if (isMainAdmin) {
      if (activeTab === 'ENTRADA') {
        // Bandeja de Entrada: Míos o sin asignar y en estado ABIERTO
        matchTab = (!t.assignedToId || t.assignedToId === user?.id) && t.status === 'ABIERTO';
      } else if (activeTab === 'PROCESO') {
        // Bandeja en Proceso:
        // 1. Míos o sin asignar en estado EN_PROGRESO
        // 2. Tickets derivados a usuarios PQRS que YA HAN RESPONDIDO (no cerrados)
        const isMineInProgress = (!t.assignedToId || t.assignedToId === user?.id) && t.status === 'EN_PROGRESO';
        const isDerivedResponded = isDerivedToOthers && hasAssignedUserResponded(t) && t.status !== 'CERRADO';
        matchTab = isMineInProgress || isDerivedResponded;
      } else if (activeTab === 'DERIVADOS') {
        // Bandeja de Salida (Derivados): Asignados a otra persona y esperando respuesta
        matchTab = isDerivedToOthers && !hasAssignedUserResponded(t) && t.status !== 'CERRADO';
      }
    } else {
      // Usuario PQRS regular
      const isMine = t.assignedToId === user?.id;
      if (activeTab === 'PROCESO') {
        matchTab = isMine && t.status !== 'CERRADO';
      } else if (activeTab === 'DERIVADOS') {
        matchTab = isDerivedToOthers && t.status !== 'CERRADO';
      }
    }

    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchPriority = priorityFilter === 'ALL' || (t.priority || 'MEDIA') === priorityFilter;
    const matchSearch = t.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTab && matchStatus && matchPriority && matchSearch;
  });

  const sortedTickets = React.useMemo(() => {
    let sortableItems = [...filteredTickets];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'createdAt') {
          aValue = a.history && a.history.length > 0 ? new Date(a.history[0].createdAt).getTime() : new Date(a.createdAt).getTime();
          bValue = b.history && b.history.length > 0 ? new Date(b.history[0].createdAt).getTime() : new Date(b.createdAt).getTime();
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTickets, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTickets = sortedTickets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedTickets.length / itemsPerPage);

  const handleExportPDFDashboard = () => {
    if (sortedTickets.length === 0) {
      toast.error('No hay datos para exportar.');
      return;
    }
    try {
      const doc = new jsPDF('landscape');
      const renderPDF = (logoData?: HTMLImageElement | string) => {
        if (logoData) doc.addImage(logoData, 'PNG', 14, 10, 20, 20);
        doc.setFontSize(18);
        doc.text('Bandeja PQRS', 40, 20);
        doc.setFontSize(10);
        doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, 26);
        
        const tableData = sortedTickets.map(t => [
          t.code,
          format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
          t.memberCode || '-',
          t.fullName,
          t.type,
          t.status
        ]);
        autoTable(doc, {
          startY: 35,
          head: [['Código', 'Fecha', 'Cód. Socio', 'Solicitante', 'Tipo', 'Estado']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [29, 78, 52] },
          styles: { fontSize: 8 },
        });
        doc.save(`PQRS_Dashboard_${format(new Date(), 'yyyyMMdd')}.pdf`);
      };
      
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = logoClub;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          renderPDF(canvas.toDataURL('image/png'));
        } else {
          renderPDF(img);
        }
      };
      img.onerror = () => renderPDF();
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ABIERTO': return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium border border-amber-500/20">Abierto</span>;
      case 'EN_PROGRESO': return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">En Progreso</span>;
      case 'CERRADO': return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">Cerrado</span>;
      default: return <span>{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'BAJA': return <span className="text-emerald-500 dark:text-emerald-400 font-medium">Baja</span>;
      case 'MEDIA': return <span className="text-amber-500 dark:text-amber-400 font-medium">Media</span>;
      case 'ALTA': return <span className="text-orange-500 dark:text-orange-400 font-medium">Alta</span>;
      case 'URGENTE': return <span className="text-red-500 dark:text-red-400 font-bold animate-pulse">Urgente</span>;
      default: return <span>{priority}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans flex flex-col p-6 lg:p-12">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-glass-border pb-6 gap-4">
          <div className="flex items-center gap-4">
            <BackButton to="/" title="Volver al Menú Principal" />
            <CrestLogo size="sm" />
            <div>
              <h1 className="text-3xl font-bold text-brand-gold serif-brand">
                Gestión PQRS
              </h1>
              <p className="theme-text-muted text-sm mt-1">Peticiones, Quejas, Reclamos y Sugerencias de socios.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {isMainAdmin && waStatus === 'CONNECTED' && (
              <button 
                onClick={toggleBot} 
                className={`mr-2 px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 border ${isBotActive ? 'bg-emerald-100/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-100/20 shadow-emeraldGlow' : 'bg-red-100/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-100/20'}`}
                title={isBotActive ? "El bot está respondiendo automáticamente" : "El bot está pausado"}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${isBotActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {isBotActive ? 'Horse ON' : 'Horse OFF'}
              </button>
            )}
            
            {isMainAdmin && (
              <button 
                onClick={() => setShowWaModal(true)} 
                className="mr-2 px-3.5 py-2 bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold rounded-xl transition-all shadow-goldGlow flex items-center gap-2 relative text-xs"
                title={waStatus === 'CONNECTED' ? 'Módulo PQRS: WhatsApp Conectado (chls-pqrs)' : 'Módulo PQRS: Conectar WhatsApp (chls-pqrs)'}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${waStatus === 'CONNECTED' ? 'bg-green-700 animate-pulse' : waStatus === 'DISCONNECTED' ? 'bg-red-600' : 'bg-yellow-500 animate-spin'}`} />
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                <span>{waStatus === 'CONNECTED' ? 'WhatsApp PQRS: Conectado' : 'Conectar WhatsApp PQRS'}</span>
              </button>
            )}

            <button 
              onClick={() => navigate('/admin/pqrs/analytics')}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-brand-green hover:from-emerald-400 hover:to-emerald-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/30 flex items-center gap-2 text-sm uppercase tracking-wider"
            >
              📊 Indicadores Gráficos
            </button>
            <button 
              onClick={() => navigate('/admin/pqrs/reports')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-purple-400/30 flex items-center gap-2 text-sm uppercase tracking-wider"
            >
              📄 Filtrar y Exportar
            </button>
          <button onClick={() => fetchTickets()} className="glass-button-secondary flex items-center gap-2">
            <RefreshCcw size={16} /> Actualizar
          </button>
          <ThemeToggle />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {isMainAdmin && (
            <button 
              onClick={() => setActiveTab('ENTRADA')}
              className={`flex-1 relative py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'ENTRADA' ? 'border-emerald-500 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              Bandeja de Entrada
              {getUnreadCount('ENTRADA') > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                  {getUnreadCount('ENTRADA')}
                </span>
              )}
            </button>
          )}
          <button 
            onClick={() => setActiveTab('PROCESO')}
            className={`flex-1 relative py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'PROCESO' ? 'border-emerald-500 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            En Proceso
            {getUnreadCount('PROCESO') > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                {getUnreadCount('PROCESO')}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('DERIVADOS')}
            className={`flex-1 relative py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'DERIVADOS' ? 'border-emerald-500 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Bandeja de Salida
            {getUnreadCount('DERIVADOS') > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                {getUnreadCount('DERIVADOS')}
              </span>
            )}
          </button>
          {isMainAdmin && (
            <button 
              onClick={() => setActiveTab('ARCHIVO')}
              className={`flex-1 relative py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'ARCHIVO' ? 'border-emerald-500 text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              Archivados
              {tickets.filter(t => t.status === 'CERRADO').length > 0 && (
                <span className="bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {tickets.filter(t => t.status === 'CERRADO').length}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full max-w-2xl flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por código, nombre o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10"
              />
            </div>
            <div className="w-full sm:w-auto min-w-[180px]">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="glass-input w-full cursor-pointer"
              >
                <option value="ALL" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Todas las prioridades</option>
                <option value="URGENTE" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🔥 Urgente</option>
                <option value="ALTA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">⚡ Alta</option>
                <option value="MEDIA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">⚠️ Media</option>
                <option value="BAJA" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">✅ Baja</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 ml-2 border border-gray-200 dark:border-white/10">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md flex items-center transition-all ${viewMode === 'table' ? 'bg-white dark:bg-black/60 shadow-sm text-brand-gold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                title="Vista de Tabla"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md flex items-center transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-black/60 shadow-sm text-brand-gold' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                title="Vista Kanban"
              >
                <LayoutGrid size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
              <thead className="text-xs uppercase bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={() => requestSort('createdAt')}>
                    Código / Fecha {sortConfig?.key === 'createdAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={() => requestSort('memberCode')}>
                    Cód. Socio {sortConfig?.key === 'memberCode' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={() => requestSort('fullName')}>
                    Solicitante {sortConfig?.key === 'fullName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={() => requestSort('type')}>
                    Tipo / Área {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={() => requestSort('status')}>
                    Estado / Prioridad {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {currentTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-brand-green dark:text-emerald-400">{ticket.code}</div>
                        {ticket.isRead === false && ticket.status !== 'CERRADO' && activeTab !== 'DERIVADOS' && (
                          hasAssignedUserResponded(ticket) ? (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]">
                              RESPUESTA
                            </span>
                          ) : (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                              NUEVO
                            </span>
                          )
                        )}
                        {ticket.isRead === false && ticket.status !== 'CERRADO' && activeTab === 'DERIVADOS' && (
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                            Esperando Respuesta
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 opacity-70 text-xs mt-1">
                        <Clock size={12} />
                        {ticket.history && ticket.history.length > 0
                          ? format(new Date(ticket.history[0].createdAt), "dd MMM yyyy HH:mm", { locale: es })
                          : format(new Date(ticket.createdAt), "dd MMM yyyy HH:mm", { locale: es })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.memberCode ? (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded text-xs border border-emerald-500/20">{ticket.memberCode}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">{ticket.fullName}</div>
                      <div className="text-xs theme-text-muted mb-2">{ticket.applicantCondition} • {ticket.phone}</div>
                      
                      {getLastNote(ticket) && (
                        <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/5 p-2 rounded-md border border-gray-200 dark:border-gray-700 max-w-[280px]">
                          <span className="font-semibold text-brand-gold flex items-center gap-1 mb-0.5">
                            <MessageSquare size={10} /> Última Acción:
                          </span>
                          <span className="line-clamp-2 italic">"{getLastNote(ticket)}"</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{ticket.type}</div>
                      <div className="text-xs theme-text-muted">{ticket.area || 'Sin área'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="mb-1">{getStatusBadge(ticket.status)}</div>
                      <div className="text-xs theme-text-muted mt-1">
                        Prioridad: {getPriorityBadge(ticket.priority || 'MEDIA')}
                      </div>
                      {ticket.assignedTo && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate max-w-[120px]">
                          Para: {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex flex-col justify-center items-center gap-2 w-24 mx-auto">
                        <button 
                          onClick={() => openTicket(ticket)}
                          className="w-full text-emerald-400 hover:text-emerald-300 font-medium text-xs px-2 py-1.5 bg-emerald-500/10 rounded border border-emerald-500/20 text-center flex justify-center items-center"
                        >
                          Gestionar
                        </button>
                        {ticket.isRead === false && ticket.status !== 'CERRADO' && activeTab === 'PROCESO' && (
                          <button 
                            onClick={(e) => handleReceiveTicketId(ticket.id, e)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 py-1.5 rounded border border-blue-500/20 shadow-sm transition-colors flex justify-center items-center gap-1"
                            title={hasAssignedUserResponded(ticket) ? "Marcar Respuesta como Revisada" : "Acusar Recibo (Recibir Ticket)"}
                          >
                            <CheckCircle size={14} /> {hasAssignedUserResponded(ticket) ? 'Revisar' : 'Recibir'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No se encontraron tickets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {sortedTickets.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                Mostrar
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="glass-input !py-1 !px-2 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                registros (Total: {sortedTickets.length})
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-black/60 disabled:opacity-50 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-black/60 disabled:opacity-50 transition-colors"
                >
                  <ArrowLeft size={16} className="rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden h-[calc(100vh-250px)]">
          <div className="flex flex-col h-full bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
            <h3 className="font-bold text-amber-500 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div> Abiertos ({filteredTickets.filter(t => t.status === 'ABIERTO').length})
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
              {filteredTickets.filter(t => t.status === 'ABIERTO').map(ticket => (
                <KanbanCard key={ticket.id} ticket={ticket} onOpen={() => openTicket(ticket)} />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col h-full bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
            <h3 className="font-bold text-blue-500 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> En Progreso ({filteredTickets.filter(t => t.status === 'EN_PROGRESO').length})
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
              {filteredTickets.filter(t => t.status === 'EN_PROGRESO').map(ticket => (
                <KanbanCard key={ticket.id} ticket={ticket} onOpen={() => openTicket(ticket)} />
              ))}
            </div>
          </div>

          {/* CERRADO */}
          <div className="flex flex-col h-full bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10">
            <h3 className="font-bold text-emerald-500 mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div> Cerrados ({filteredTickets.filter(t => t.status === 'CERRADO').length})
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
              {filteredTickets.filter(t => t.status === 'CERRADO').map(ticket => (
                <KanbanCard key={ticket.id} ticket={ticket} onOpen={() => openTicket(ticket)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-emerald-500/20 flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-black/5 dark:bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-brand-green dark:text-white flex items-center gap-2">
                  Ticket {selectedTicket.code}
                  {getStatusBadge(selectedTicket.status)}
                </h2>
                <p className="text-sm theme-text-muted">
                  Creado el {format(new Date(selectedTicket.createdAt), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {selectedTicket.isRead === false && selectedTicket.status !== 'CERRADO' && (
                  <button 
                    onClick={handleReceiveTicket}
                    disabled={isSending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg text-sm"
                  >
                    <CheckCircle size={16} /> {hasAssignedUserResponded(selectedTicket) ? 'Marcar como Revisado' : 'Recepcionar Ticket'}
                  </button>
                )}
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors p-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {selectedTicket.status === 'CERRADO' && isPqrsAdmin && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                  <RefreshCcw className="w-5 h-5" />
                  <span className="font-medium">Este ticket se encuentra Archivado (Cerrado).</span>
                </div>
                <button
                  onClick={handleUnarchive}
                  disabled={isSending}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={16} /> {isSending ? 'Procesando...' : 'Desarchivar (Volver a En Progreso)'}
                </button>
              </div>
            )}

            {selectedTicket.isRead === false && selectedTicket.status !== 'CERRADO' && (
              <div className="mx-6 mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-blue-700 dark:text-blue-300">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {hasAssignedUserResponded(selectedTicket) 
                      ? `Nueva respuesta registrada por ${selectedTicket.assignedTo ? `${selectedTicket.assignedTo.firstName} ${selectedTicket.assignedTo.lastName}` : 'el usuario asignado'} (Pendiente de revisión)`
                      : 'Correspondencia Pendiente de Recepción'}
                  </span>
                </div>
                <button
                  onClick={handleReceiveTicket}
                  disabled={isSending}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> {hasAssignedUserResponded(selectedTicket) ? 'Marcar como Revisado' : 'Recibir Correspondencia'}
                </button>
              </div>
            )}

            <div className="p-6 flex flex-col gap-6">
              {/* TOP SECTION: Timeline & Info */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Info Panel */}
                <div className="lg:col-span-1 space-y-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 relative">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
                    <h3 className="text-lg font-semibold text-brand-green dark:text-emerald-400">Información del Caso</h3>
                    {isMainAdmin && (
                      <button
                        onClick={() => {
                          if (isEditingInfo) {
                            setIsEditingInfo(false);
                          } else {
                            setEditFormData({
                              fullName: selectedTicket.fullName,
                              condition: selectedTicket.applicantCondition,
                              phone: selectedTicket.phone,
                              email: selectedTicket.email,
                              type: selectedTicket.type,
                              area: selectedTicket.area || '',
                              description: selectedTicket.description
                            });
                            setIsEditingInfo(true);
                          }
                        }}
                        className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        {isEditingInfo ? 'Cancelar' : 'Editar'}
                      </button>
                    )}
                  </div>
                  
                  {isEditingInfo ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Solicitante</label>
                        <input
                          type="text"
                          value={editFormData.fullName}
                          onChange={e => setEditFormData({...editFormData, fullName: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Condición</label>
                        <select
                          value={editFormData.condition}
                          onChange={e => setEditFormData({...editFormData, condition: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10"
                        >
                          <option value="ASOCIADO">ASOCIADO</option>
                          <option value="CONCESIONARIO">CONCESIONARIO</option>
                          <option value="INVITADO">INVITADO</option>
                          <option value="OTROS">OTROS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Teléfono</label>
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Email</label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Tipo</label>
                        <select
                          value={editFormData.type}
                          onChange={e => setEditFormData({...editFormData, type: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10"
                        >
                          <option value="PETICION">PETICIÓN</option>
                          <option value="QUEJA">QUEJA</option>
                          <option value="RECLAMO">RECLAMO</option>
                          <option value="SUGERENCIA">SUGERENCIA</option>
                          <option value="FELICITACION">FELICITACIÓN</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Área</label>
                        <select
                          value={editFormData.area}
                          onChange={e => setEditFormData({...editFormData, area: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10"
                        >
                          <option value="Atención al Cliente">Atención al Cliente</option>
                          <option value="Mantenimiento">Mantenimiento</option>
                          <option value="Deportes">Deportes</option>
                          <option value="Alimentos y Bebidas">Alimentos y Bebidas</option>
                          <option value="Seguridad">Seguridad</option>
                          <option value="Administración">Administración</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Descripción</label>
                        <textarea
                          rows={4}
                          value={editFormData.description}
                          onChange={e => setEditFormData({...editFormData, description: e.target.value})}
                          className="w-full text-sm p-2 rounded bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 custom-scrollbar"
                        />
                      </div>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingInfo(false)}
                          className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-white/10 rounded hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveInfo}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="col-span-2">
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">Solicitante</span>
                          <span className="font-medium text-gray-900 dark:text-white text-base">{selectedTicket.fullName}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">Condición</span>
                          <span className="text-gray-900 dark:text-white">{selectedTicket.applicantCondition}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">Teléfono</span>
                          <span className="text-gray-900 dark:text-white">{selectedTicket.phone}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">Email</span>
                          <span className="text-gray-900 dark:text-white break-all">{selectedTicket.email}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">Tipo</span>
                          <span className="text-gray-900 dark:text-white">{selectedTicket.type}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-0.5">Área</span>
                          <span className="text-gray-900 dark:text-white">{selectedTicket.area || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1.5">Descripción del caso:</span>
                        <div className="p-3 bg-white dark:bg-black/30 rounded-lg border border-gray-200 dark:border-white/5 text-gray-800 dark:text-gray-300 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                          {selectedTicket.description}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Timeline Panel */}
                <div className="lg:col-span-2 space-y-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 flex flex-col h-full">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
                    <h4 className="text-lg font-semibold flex items-center gap-2 text-brand-gold">
                      <Clock size={18} /> Historial y Recorrido del Ticket
                    </h4>
                    <button onClick={exportToPDF} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded flex items-center gap-2 transition-colors shadow-sm">
                      Exportar PDF
                    </button>
                  </div>
                  
                  <div className="relative pl-6 space-y-6 overflow-y-auto custom-scrollbar pr-4 py-2 max-h-[350px]">
                    {selectedTicket.history?.map((hist, index) => {
                      const isLast = index === selectedTicket.history!.length - 1;
                      const prevEventDate = index < selectedTicket.history!.length - 1 
                        ? new Date(selectedTicket.history![index + 1].createdAt) 
                        : new Date(selectedTicket.createdAt);
                      
                      const timeSpent = formatDistance(new Date(hist.createdAt), prevEventDate, { locale: es });
                      
                      const imageMatch = hist.description.match(/\[IMAGEN_RESPALDO\]:([^\s\n]+)/);
                      const imageUrl = imageMatch ? imageMatch[1] : null;
                      const cleanDescription = hist.description.replace(/\[IMAGEN_RESPALDO\]:[^\s\n]+/g, '').trim();
                      const serverBase = (api.defaults.baseURL || '').replace('/api', '');
                      const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${serverBase}${imageUrl}`) : null;

                      return (
                        <div key={hist.id} className="relative">
                          {!isLast && (
                             <div className="absolute left-[-15px] top-6 bottom-[-30px] w-[2px] bg-gray-200 dark:bg-white/10"></div>
                          )}
                          <div className="absolute left-[-20px] top-1.5 w-3 h-3 rounded-full bg-brand-gold shadow-[0_0_8px_theme(colors.brand.gold)]"></div>
                          
                          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-white/5 shadow-sm transition-all hover:bg-white/80 dark:hover:bg-black/40">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-2">
                              <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                {hist.action.replace(/_/g, ' ')}
                              </span>
                              
                              <span className="text-[10px] text-brand-green dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap self-start">
                                ⏳ + {timeSpent}
                              </span>
                            </div>
                            
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 font-medium">
                              {format(new Date(hist.createdAt), "dd MMM yyyy HH:mm", { locale: es })} • <span className="text-blue-600 dark:text-blue-400">{hist.performedBy || 'Sistema'}</span>
                            </div>
                            
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {cleanDescription}
                            </div>

                            {fullImageUrl && (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => setPreviewModalImage(fullImageUrl)}
                                  className="group relative inline-flex items-center gap-3 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-left max-w-sm cursor-pointer shadow-sm hover:shadow-md"
                                >
                                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-emerald-500/40 bg-black/20 flex-shrink-0">
                                    <img src={fullImageUrl} alt="Respaldo" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                                      🔍
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0 pr-2">
                                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      📷 Foto de Respaldo / Solución
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 group-hover:text-emerald-500 transition-colors">
                                      Haz clic para ver en tamaño completo
                                    </span>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {(!selectedTicket.history || selectedTicket.history.length === 0) && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-8">
                        <Clock size={32} className="mb-2 opacity-20" />
                        <p className="text-sm italic">El recorrido comenzará cuando haya acciones registradas.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: Management (Only visible if ticket is NOT archived/closed) */}
              {selectedTicket.status !== 'CERRADO' && (
                <div className="grid grid-cols-1 gap-6">
                  
                  {/* Unified Management Form */}
                  <div className="bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full pointer-events-none"></div>
                    
                    <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-white/10 pb-3 mb-5 flex items-center gap-2 relative z-10">
                      <List size={20} /> Gestión Unificada del Ticket
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 relative z-10">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Estado Actual</label>
                        <select 
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          disabled={!selectedTicket.isRead && !isMainAdmin}
                          className="glass-input w-full font-medium"
                        >
                          <option value="ABIERTO">Abierto</option>
                          <option value="EN_PROGRESO">En Progreso</option>
                          {(isMainAdmin || newStatus === 'CERRADO' || selectedTicket.status === 'EN_PROGRESO') && <option value="CERRADO">Cerrado</option>}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Prioridad</label>
                        <select 
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value)}
                          disabled={!selectedTicket.isRead && !isMainAdmin}
                          className="glass-input w-full font-medium"
                        >
                          <option value="BAJA">Baja</option>
                          <option value="MEDIA">Media</option>
                          <option value="ALTA">Alta</option>
                          <option value="URGENTE">Urgente</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">Asignar a / Derivar</label>
                        <select 
                          value={newAssignedTo}
                          onChange={(e) => setNewAssignedTo(e.target.value)}
                          disabled={!selectedTicket.isRead && !isMainAdmin}
                          className="glass-input w-full font-medium"
                        >
                          <option value="">Sin Asignar</option>
                          {staffUsers.map((u: any) => (
                            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    { (newStatus === 'CERRADO' || newStatus === 'RESUELTO') && (
                      <div className="mb-4 relative z-10">
                        {!closingImage ? (
                          <div className="p-3.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20">
                            <label className="block text-xs uppercase tracking-wider font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1.5">
                              📷 Foto de Respaldo / Solución (Adjunto para WhatsApp)
                            </label>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                              Adjunta una imagen de respaldo. El sistema la optimizará automáticamente para enviarla junto al mensaje.
                            </p>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleImageFileSelected}
                              disabled={isCompressing || (!selectedTicket.isRead && !isMainAdmin)}
                              className="w-full text-xs text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                            />
                            {isCompressing && (
                              <div className="mt-2 text-xs text-blue-500 flex items-center gap-1.5 animate-pulse">
                                ⏳ Optimizando y comprimiendo imagen...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={closingImage} alt="Vista previa" className="w-12 h-12 object-cover rounded-lg border border-emerald-400/50 shadow-sm" />
                              <div>
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                  <CheckCircle size={13} className="text-emerald-500" /> Imagen comprimida y lista
                                </div>
                                {compressionInfo && (
                                  <div className="text-[11px] text-gray-600 dark:text-gray-300">
                                    <span className="font-medium">{compressionInfo.fileName}</span> • De <span className="line-through opacity-70">{compressionInfo.originalSize}</span> a <span className="font-bold text-emerald-600 dark:text-emerald-400">{compressionInfo.compressedSize}</span> ({compressionInfo.reductionPercentage}% reducción)
                                  </div>
                                )}
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={handleRemoveClosingImage}
                              className="text-xs text-red-500 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors font-medium"
                            >
                              Quitar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col flex-1 mb-6 relative z-10">
                      <label className="block text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        Acciones de Resolución o del Proceso del Caso
                      </label>
                      <textarea 
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        disabled={!selectedTicket.isRead && !isMainAdmin}
                        className="glass-input w-full resize-none flex-1 min-h-[100px] p-4 text-sm"
                        placeholder="Escribe aquí instrucciones, detalles de derivación o cómo se solucionó el problema..."
                      />
                      <span className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                        <CheckCircle size={12} /> Esta nota se registrará en el historial y quedará documentada.
                      </span>
                    </div>
                    
                    <button 
                      onClick={handleSaveChanges}
                      disabled={isSending || isSentSuccess || (!selectedTicket.isRead && !isMainAdmin)}
                      className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-3 mt-auto text-sm uppercase tracking-widest relative z-10 ${
                        isSentSuccess 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400/50' 
                          : 'bg-gradient-to-r from-emerald-500 to-brand-green hover:from-emerald-400 hover:to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/30'
                      }`}
                    >
                      {isSending ? (
                        <span className="animate-spin text-xl">⏳</span>
                      ) : (
                        <CheckCircle size={20} />
                      )}
                      {isSentSuccess ? 'ENVIADO' : (selectedTicket.status === 'CERRADO' && newStatus !== 'CERRADO' ? 'Desarchivar y Guardar' : (isMainAdmin ? 'Guardar y Enviar' : 'Enviar Respuesta al Administrador'))}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWaModal && (
        <WhatsAppConnectorModal 
          onClose={() => {
            setShowWaModal(false);
            fetchWaStatus();
          }}
          clientId="chls-pqrs"
          moduleName="Módulo PQRS & Atención al Socio"
          channelBadge="Canal 4 • PQRS"
          title="WhatsApp PQRS & Reclamos"
          subtitle="Línea oficial dedicada al seguimiento, resolución y notificación de tickets de reclamos y sugerencias de socios."
          purposeDescription="Notificar automáticamente al socio la recepción de su ticket, cambios de estado, resoluciones y respuestas directas de atención."
          successMessage="La línea de WhatsApp de PQRS está conectada. Los socios recibirán notificaciones de confirmación y resolución de sus reclamos."
        />
      )}

      {/* Confirmation Modal for Closing Ticket */}
      {showCloseConfirmModal && selectedTicket && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden text-white p-6 relative">
            
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <CheckCircle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">¿Cerrar y Solucionar Caso?</h3>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  Ticket {selectedTicket.code}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Estás a punto de marcar como <span className="text-emerald-400 font-bold">Cerrado / Resuelto</span> este caso.
            </p>

            {/* Summary Box */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2.5 mb-5 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">📲</span>
                <div>
                  <span className="font-semibold text-white">Notificación automática por WhatsApp:</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Se enviará el mensaje de confirmación al socio <strong className="text-slate-200">{selectedTicket.fullName}</strong> ({selectedTicket.phone}).</p>
                </div>
              </div>

              {internalNote.trim() && (
                <div className="flex items-start gap-2 pt-1 border-t border-white/5">
                  <span className="text-blue-400 font-bold">📝</span>
                  <div className="flex-1">
                    <span className="font-semibold text-white">Detalle de Resolución incluido:</span>
                    <p className="text-[11px] text-slate-300 italic line-clamp-2 mt-0.5">"{internalNote.trim()}"</p>
                  </div>
                </div>
              )}

              {closingImage && (
                <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                  <span className="text-emerald-400 font-bold">📷</span>
                  <div className="flex items-center gap-2">
                    <img src={closingImage} alt="Adjunto" className="w-8 h-8 rounded object-cover border border-emerald-500/40" />
                    <span className="text-[11px] text-emerald-400 font-medium">Foto de respaldo optimizada adjunta</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 pt-1 border-t border-white/5">
                <span className="text-amber-400 font-bold">⭐</span>
                <div>
                  <span className="font-semibold text-white">Encuesta de Satisfacción:</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">Se solicitará calificación del 1 al 5 al socio.</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCloseConfirmModal(false)}
                disabled={isSending}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeSaveChanges}
                disabled={isSending}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSending ? (
                  <span className="animate-spin text-sm">⏳</span>
                ) : (
                  <CheckCircle size={15} />
                )}
                {isSending ? 'Cerrando...' : 'Sí, Cerrar y Notificar'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Image Viewer Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full mb-3 text-white">
              <span className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
                📷 Foto de Respaldo del Caso ({selectedTicket?.code})
              </span>
              <button 
                onClick={() => setPreviewModalImage(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>
            <img 
              src={previewModalImage} 
              alt="Foto de Respaldo" 
              className="max-h-[80vh] w-auto max-w-full rounded-2xl border border-white/20 shadow-2xl object-contain bg-black/40"
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PqrsDashboard;
