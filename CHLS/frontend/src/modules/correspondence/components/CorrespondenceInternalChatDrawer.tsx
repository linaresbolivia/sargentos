import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { api } from '@config/api';
import { io } from 'socket.io-client';
import {
  X,
  Send,
  MessageSquare,
  Hash,
  Building2,
  User,
  FileText,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Paperclip,
  ChevronRight,
  Minimize2,
  Maximize2,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  UploadCloud,
  Search,
  Smile,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';
import CrestLogo from '@shared/components/CrestLogo';

interface ChatMessage {
  id: string;
  channel: string;
  senderUserId: string;
  senderName: string;
  senderArea: string;
  message: string;
  routeSheetCode?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

interface CorrespondenceInternalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRouteSheetByCode?: (hrCode: string) => void;
  currentRouteSheet?: RouteSheetItem | null;
}

const CHAT_CHANNELS = [
  { id: 'GENERAL', label: 'Coordinación General', icon: '🌐', desc: 'Comunicaciones entre todas las áreas' },
  { id: 'SECRETARIA', label: 'Secretaría & Gerencia', icon: '🏛️', desc: 'Despacho institucional y radicaciones' },
  { id: 'TESORERIA', label: 'Tesorería & Pagos', icon: '💰', desc: 'Facturas, cheques y descargos' },
  { id: 'CONTRATACIONES', label: 'Compras & Almacén', icon: '📦', desc: 'Cotizaciones, licitaciones y pedidos' },
  { id: 'CASETA', label: 'Caseta de Ingreso', icon: '🚪', desc: 'Recepción de correspondencia y facturas en puerta' },
  { id: 'LEGAL', label: 'Asesoría Legal', icon: '⚖️', desc: 'Contratos, dictámenes y resoluciones' },
  { id: 'HIPICA', label: 'Comisión Hípica', icon: '🐴', desc: 'Área ecuestre, caballerizas y torneos' },
  { id: 'DEPORTES', label: 'Deportes & Tenis', icon: '🎾', desc: 'Torneos, canchas y actividades deportivas' },
  { id: 'MANTENIMIENTO', label: 'Mantenimiento & Obras', icon: '🛠️', desc: 'Reparaciones, proyectos e infraestructura' },
  { id: 'RRHH', label: 'Recursos Humanos', icon: '👥', desc: 'Personal, contratos y asistencias' },
];

const PRESET_QUICK_MESSAGES = [
  'Hoja de Ruta radicada y enviada a su despacho 👍',
  'Favor remitir antecedentes o cotizaciones 📑',
  'Factura verificada para programación de pago 💰',
  'URGENTE: Requiere visto bueno de Gerencia ⚠️',
  'Trámite concluido y archivado correctamente ✅',
  'Revisar documentación digitalizada adjunta 📎',
];

const EMOJI_PICKER_QUICK = ['👍', '📑', '💰', '⚠️', '✅', '🚀', '⚖️', '🐴', '✍️', '👀', '📌', '🤝'];

export const CorrespondenceInternalChatDrawer: React.FC<CorrespondenceInternalChatDrawerProps> = ({
  isOpen,
  onClose,
  onSelectRouteSheetByCode,
  currentRouteSheet,
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [activeChannel, setActiveChannel] = useState('GENERAL');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedHrCode, setAttachedHrCode] = useState<string>(currentRouteSheet?.hrCode || '');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync attached HR code if currentRouteSheet changes
  useEffect(() => {
    if (currentRouteSheet?.hrCode) {
      setAttachedHrCode(currentRouteSheet.hrCode);
    }
  }, [currentRouteSheet]);

  // Fetch messages when channel changes or modal opens
  const fetchMessages = async (channel: string) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/correspondence/chat/messages?channel=${channel}`);
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages(activeChannel);
    }
  }, [isOpen, activeChannel]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime Socket listener
  useEffect(() => {
    const socket = io(window.location.origin || 'http://localhost:5000');

    const handleIncomingMessage = (newMsg: ChatMessage) => {
      if (newMsg.channel === activeChannel || activeChannel === 'ALL') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    socket.on('correspondence:chat:message', handleIncomingMessage);

    return () => {
      socket.disconnect();
    };
  }, [activeChannel]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error('El archivo no puede exceder 25 MB');
        return;
      }
      setAttachedFile(file);
      toast.success(`Archivo adjunto: ${file.name}`);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > 25 * 1024 * 1024) {
        toast.error('El archivo no puede exceder 25 MB');
        return;
      }
      setAttachedFile(file);
      toast.success(`Archivo adjunto: ${file.name}`);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    setIsSending(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      let fileSize = null;

      // 1. If file attached, upload first
      if (attachedFile) {
        const formData = new FormData();
        formData.append('file', attachedFile);

        const uploadRes = await api.post('/correspondence/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data.success) {
          fileUrl = uploadRes.data.data.fileUrl;
          fileName = uploadRes.data.data.fileName;
          fileType = uploadRes.data.data.mimeType;
          fileSize = uploadRes.data.data.fileSize;
        }
      }

      // 2. Send message
      const response = await api.post('/correspondence/chat/messages', {
        channel: activeChannel,
        message: inputText.trim(),
        routeSheetCode: attachedHrCode.trim() || null,
        senderArea: 'SECRETARIA_GENERAL',
        fileUrl,
        fileName,
        fileType,
        fileSize,
      });

      if (response.data.success) {
        setInputText('');
        setAttachedFile(null);
        setShowEmojis(false);
        if (fileInputRef.current) fileInputRef.current.value = '';

        const createdMsg = response.data.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMsg.id)) return prev;
          return [...prev, createdMsg];
        });
      }
    } catch {
      toast.error('Error al enviar mensaje o transferir archivo');
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (mime?: string | null, name?: string | null) => {
    return !!(mime?.includes('image') || name?.match(/\.(jpg|jpeg|png|webp|gif)$/i));
  };

  const getFileIcon = (mime?: string | null, name?: string | null) => {
    if (isImageFile(mime, name)) {
      return <ImageIcon className="w-4 h-4 text-cyan-400" />;
    }
    if (mime?.includes('sheet') || mime?.includes('excel') || name?.match(/\.(xls|xlsx|csv)$/i)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    if (name?.match(/\.(zip|rar|7z)$/i)) {
      return <FileArchive className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-brand-gold" />;
  };

  const getChannelInfo = CHAT_CHANNELS.find((c) => c.id === activeChannel) || CHAT_CHANNELS[0];

  const filteredMessages = messages.filter((m) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      m.message.toLowerCase().includes(term) ||
      m.senderName.toLowerCase().includes(term) ||
      (m.routeSheetCode && m.routeSheetCode.toLowerCase().includes(term)) ||
      (m.fileName && m.fileName.toLowerCase().includes(term))
    );
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDropFile}
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex justify-end animate-fadeIn"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 border-4 border-dashed border-emerald-400 animate-pulse">
          <UploadCloud className="w-20 h-20 text-emerald-400 mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Suelta el archivo para transferirlo al canal #{getChannelInfo.label}
          </h2>
          <p className="text-sm text-emerald-200 mt-2 font-medium">
            Soporta PDFs, Excel, Word, Imágenes o Comprobantes (hasta 25 MB)
          </p>
        </div>
      )}

      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Drawer Panel */}
      <div
        className={`bg-[#f8fafc] dark:bg-[#07110c] border-l-2 border-emerald-500/40 h-full shadow-[0_0_80px_rgba(16,185,129,0.3)] flex flex-col justify-between transition-all duration-300 ${
          isExpanded ? 'w-full max-w-5xl' : 'w-full max-w-2xl sm:max-w-3xl'
        }`}
      >
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-emerald-500/30 flex justify-between items-center bg-white/90 dark:bg-[#091810] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                  <span>Chat Interno & Transferencia de Archivos</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Intercomunicador departamental oficial del Club Hípico Los Sargentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              title="Buscar en mensajes"
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showSearch
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 border-transparent'
              }`}
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Contraer' : 'Expandir'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors hidden sm:inline-flex cursor-pointer"
            >
              {isExpanded ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Channel Selector Bar (Organizado en 2 Filas con barra de desplazamiento visible) */}
        <div className="bg-slate-100/95 dark:bg-[#060e0a] p-3 border-b border-emerald-500/20 shrink-0">
          <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-emerald-500/60 scrollbar-track-slate-200 dark:scrollbar-track-black/40">
            {CHAT_CHANNELS.map((ch) => {
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-xs whitespace-nowrap transition-all cursor-pointer select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/30 scale-[1.02] border border-emerald-400 font-black'
                      : 'bg-white dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:border-emerald-500/50 border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm">{ch.icon}</span>
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar (Collapsible) */}
        {showSearch && (
          <div className="p-3 bg-white dark:bg-[#07110c] border-b border-emerald-500/30 flex items-center gap-2 animate-fadeIn shrink-0">
            <Search className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
            <input
              type="text"
              placeholder={`Buscar en #${getChannelInfo.label} (texto, remitente o Hoja de Ruta)...`}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white outline-none font-medium"
              autoFocus
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="text-xs font-bold text-slate-400 hover:text-red-500 mr-2"
              >
                Limpiar
              </button>
            )}
          </div>
        )}

        {/* Active Channel Subheader Banner */}
        <div className="px-6 py-2 bg-emerald-500/10 dark:bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
            <Hash className="w-3.5 h-3.5" />
            <span>Canal: <strong>{getChannelInfo.label}</strong> — {getChannelInfo.desc}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-medium">
            {filteredMessages.length} {filteredMessages.length === 1 ? 'mensaje' : 'mensajes'}
          </span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">
              Cargando mensajes del canal...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {searchFilter ? 'No se encontraron mensajes con ese criterio' : `No hay mensajes aún en #${getChannelInfo.label}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                Inicia la conversación entre departamentos, transfiere archivos o consulta el estado de una Hoja de Ruta.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = currentUser?.id === msg.senderUserId;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Sender Header */}
                  <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-[10px]">
                      {msg.senderName.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-black text-slate-800 dark:text-gray-200">
                      {isMe ? 'Tú' : msg.senderName}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold uppercase">
                      ({msg.senderArea})
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 space-y-2.5 shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#0c1a13] border-2 border-slate-200/80 dark:border-emerald-500/30 text-slate-900 dark:text-white rounded-tl-none'
                    }`}
                  >
                    {/* Message text */}
                    {msg.message && (
                      <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    )}

                    {/* Attached Image Preview */}
                    {msg.fileUrl && isImageFile(msg.fileType, msg.fileName) && (
                      <div className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-sm max-w-sm">
                        <a
                          href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative group"
                        >
                          <img
                            src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                            alt={msg.fileName || 'Imagen adjunta'}
                            className="w-full max-h-60 object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-1.5">
                            <ExternalLink className="w-4 h-4" />
                            <span>Ver Imagen Completa</span>
                          </div>
                        </a>
                      </div>
                    )}

                    {/* Attached Document File Card (PDF, Excel, etc.) */}
                    {msg.fileUrl && !isImageFile(msg.fileType, msg.fileName) && (
                      <a
                        href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.02] ${
                          isMe
                            ? 'bg-black/20 border-white/20 text-white hover:bg-black/30'
                            : 'bg-slate-50 dark:bg-black/40 border-emerald-500/40 text-slate-900 dark:text-white hover:border-emerald-400'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                          {getFileIcon(msg.fileType, msg.fileName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-black text-xs">
                            {msg.fileName || 'Archivo adjunto'}
                          </span>
                          {msg.fileSize && (
                            <span className="text-[10px] opacity-80 font-mono block">
                              {formatFileSize(msg.fileSize)}
                            </span>
                          )}
                        </div>
                        <Download className="w-4 h-4 text-brand-gold shrink-0" />
                      </a>
                    )}

                    {/* Attached Route Sheet Badge (Clickable) */}
                    {msg.routeSheetCode && (
                      <button
                        type="button"
                        onClick={() => onSelectRouteSheetByCode && onSelectRouteSheetByCode(msg.routeSheetCode!)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black transition-all shadow-xs cursor-pointer ${
                          isMe
                            ? 'bg-black/30 border-white/30 text-emerald-200 hover:bg-black/40'
                            : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-500/30'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-gold" />
                        <span>Expediente: <strong>{msg.routeSheetCode}</strong></span>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    )}

                    {/* Status Checkmark */}
                    <div className={`flex justify-end items-center gap-1 text-[9.5px] ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                      <CheckCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Message Chips (Organizado en 2 Filas con barra de desplazamiento visible) */}
        <div className="px-4 py-2.5 bg-slate-100/95 dark:bg-[#060e0a] border-t border-emerald-500/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-black uppercase text-emerald-800 dark:text-brand-gold tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
              <span>Respuestas Rápidas:</span>
            </div>
            <div className="flex-1 grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-emerald-500/60 scrollbar-track-slate-200 dark:scrollbar-track-black/40">
              {PRESET_QUICK_MESSAGES.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setInputText(quick)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-gray-200 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-800 dark:hover:text-white whitespace-nowrap transition-all shadow-xs cursor-pointer select-none"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Emojis Selector (Collapsible) */}
        {showEmojis && (
          <div className="px-5 py-2 bg-white dark:bg-[#07110c] border-t border-emerald-500/20 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 animate-fadeIn">
            {EMOJI_PICKER_QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setInputText((prev) => prev + emoji)}
                className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Message, File Upload & Attached HR Footer */}
        <div className="p-4 sm:p-5 bg-white/95 dark:bg-[#091810] border-t-2 border-emerald-500/30 space-y-3 shrink-0">
          
          {/* Top Pill Controls: Attached HR & Attached File */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            {/* Reference HR input pill */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 dark:text-gray-400 text-[11px] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-brand-gold" />
                <span>Hoja de Ruta (Opcional):</span>
              </span>
              <input
                type="text"
                placeholder="Ej. 08-193"
                value={attachedHrCode}
                onChange={(e) => setAttachedHrCode(e.target.value)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl text-xs font-mono font-bold text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 w-36 shadow-xs"
              />
              {attachedHrCode && (
                <button
                  type="button"
                  onClick={() => setAttachedHrCode('')}
                  className="text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Attached File Pill */}
            {attachedFile && (
              <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold shadow-xs animate-fadeIn">
                {getFileIcon(attachedFile.type, attachedFile.name)}
                <span className="truncate max-w-[160px]">{attachedFile.name}</span>
                <span className="text-[10.5px] text-slate-500 dark:text-gray-400 font-mono">({formatFileSize(attachedFile.size)})</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-slate-400 hover:text-red-500 cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.zip"
          />

          <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
            {/* Emoji Toggle Button */}
            <button
              type="button"
              onClick={() => setShowEmojis(!showEmojis)}
              title="Emojis rápidos"
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                showEmojis
                  ? 'bg-amber-400 text-slate-950 border-amber-500 scale-105'
                  : 'bg-slate-100 dark:bg-black/40 border-slate-300 dark:border-emerald-500/30 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
              }`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar Archivo / Documento (PDF, Imagen, Excel, etc.)"
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                attachedFile
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 scale-105'
                  : 'bg-slate-100 dark:bg-black/40 border-slate-300 dark:border-emerald-500/30 text-slate-700 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-white'
              }`}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea
              rows={2}
              placeholder={`Escribe un mensaje o adjunta un archivo en #${getChannelInfo.label}... (Enter para enviar)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-3 text-xs sm:text-sm text-slate-950 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs resize-none"
            />

            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !attachedFile)}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Send className="w-5 h-5 text-slate-950" />
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
export default CorrespondenceInternalChatDrawer;
