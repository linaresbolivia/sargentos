import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import { 
  Send, Check, CheckCheck, User, Search, Bot, UserCheck, 
  PauseCircle, PlayCircle, Sparkles, CreditCard, Clock, Phone, 
  ChevronRight, Shield, AlertCircle, RotateCw
} from 'lucide-react';
import { api, getSocketUrl } from '../../../config/api';

interface MemberInfo {
  id: string;
  fullName: string;
  documentId: string;
  membershipNumber: string;
  membershipType: string;
  membershipStatus: string;
  totalDebt: number;
}

interface Chat {
  id: string;
  phone: string;
  phoneFormatted?: string;
  contactName: string | null;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  isHumanHandoff?: boolean;
  botState?: string;
  member?: MemberInfo | null;
}

interface Message {
  id: string;
  chatId: string;
  content: string;
  fromMe: boolean;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: string;
}

const QUICK_REPLIES = [
  {
    title: '👋 Saludo Oficial',
    text: '¡Hola! Estimado(a) socio(a), le saluda el equipo de Atención al Socio del Club Hípico Los Sargentos. ¿En qué podemos colaborarle?'
  },
  {
    title: '🎾 Reservas Canchas',
    text: 'Para reservas de Tenis y Frontón comuníquese con secretaría deportiva al +591 76753734 / 76753758. Para Pádel al +591 76753744 y Racquetball al +591 76753743.'
  },
  {
    title: '🏊‍♂️ Horarios Piscina',
    text: 'El Área Húmeda atiende de Martes a Viernes de 06:00 a 22:00, Sábados y Domingos de 07:00 a 20:00 y Feriados de 08:00 a 20:00. Lunes cerrado por mantenimiento.'
  },
  {
    title: '💳 Pagos y Glosa',
    text: 'Puede realizar su pago por transferencia bancaria o QR oficial indicando obligatoriamente su N° de Acción en la glosa y enviando su comprobante por este chat.'
  },
  {
    title: '✅ Solicitud Registrada',
    text: 'Hemos registrado su solicitud y sus respaldos. Nuestro equipo administrativo la procesará a la brevedad posible.'
  }
];

export const WhatsAppInbox: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'needs_agent' | 'bot'>('all');
  const [showMemberDrawer, setShowMemberDrawer] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(getSocketUrl(), { 
      withCredentials: true 
    });

    fetchChats();

    socket.on('whatsapp:new_message', (data: { chat: Chat; message: Message }) => {
      fetchChats();

      if (activeChat && (data.chat.id === activeChat.id || data.chat.phone === activeChat.phone)) {
        setMessages(prev => {
          // Reemplazar mensaje temporal idéntico enviado recientemente
          const tempIdx = prev.findIndex(m => m.id.startsWith('temp-') && m.content.trim() === data.message.content.trim());
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = data.message;
            return updated;
          }
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    socket.on('whatsapp:handoff_change', (data: { phone: string; isHumanHandoff: boolean }) => {
      setChats(prev => prev.map(c => c.phone.includes(data.phone) || data.phone.includes(c.phone) ? { ...c, isHumanHandoff: data.isHumanHandoff } : c));
      setActiveChat(prev => (prev && (prev.phone.includes(data.phone) || data.phone.includes(prev.phone))) ? { ...prev, isHumanHandoff: data.isHumanHandoff } : prev);
    });

    socket.on('whatsapp:message_ack', (data: { phone: string; status: string }) => {
      setMessages(prev => 
        prev.map(m => {
          if (m.status !== 'READ' && m.fromMe) {
            return { ...m, status: data.status as any };
          }
          return m;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [activeChat]);

  const fetchChats = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.get('/whatsapp/chats');
      if (res.data && res.data.success) {
        setChats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchMessages = async (chat: Chat) => {
    try {
      const res = await api.get(`/whatsapp/chats/${chat.id}/messages`);
      if (res.data && res.data.success) {
        setMessages(res.data.data);
      } else if (Array.isArray(res.data)) {
        setMessages(res.data);
      }
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
    fetchMessages(chat);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !activeChat) return;

    const text = inputText.trim();
    setInputText('');
    setShowQuickReplies(false);

    // Mensaje optimista para actualización instantánea
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      chatId: activeChat.id,
      content: text,
      fromMe: true,
      status: 'SENT',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c));

    try {
      const res = await api.post('/whatsapp/send', {
        phone: activeChat.phone,
        text
      });
      if (res.data?.data) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data.data : m));
      }
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  const handleToggleHandoff = async () => {
    if (!activeChat) return;
    setActionLoading(true);
    const newStatus = !activeChat.isHumanHandoff;

    try {
      await api.post(`/whatsapp/chats/${activeChat.phone}/toggle-handoff`, {
        isHandoff: newStatus
      });

      setActiveChat(prev => prev ? { ...prev, isHumanHandoff: newStatus } : null);
      setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, isHumanHandoff: newStatus } : c));
    } catch (err) {
      console.error('Error toggling handoff', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return format(new Date(iso), 'HH:mm');
    } catch {
      return '';
    }
  };

  const cleanDisplayPhone = (chat: Chat) => {
    if (chat.phoneFormatted) return chat.phoneFormatted;
    const clean = chat.phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
    if (clean.startsWith('591') && clean.length === 11) {
      return `+591 ${clean.substring(3, 7)} ${clean.substring(7)}`;
    }
    if (clean.length === 8) {
      return `+591 ${clean.substring(0, 4)} ${clean.substring(4)}`;
    }
    return `+${clean}`;
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'SENT': return <Check size={14} className="text-gray-400" />;
      case 'DELIVERED': return <CheckCheck size={14} className="text-gray-400" />;
      case 'READ': return <CheckCheck size={14} className="text-blue-400" />;
      default: return null;
    }
  };

  // Filtrado de chats
  const filteredChats = chats.filter(chat => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (chat.contactName && chat.contactName.toLowerCase().includes(term)) ||
      chat.phone.includes(term) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (filterTab === 'needs_agent') return chat.isHumanHandoff === true;
    if (filterTab === 'bot') return chat.isHumanHandoff !== true;
    return true;
  });

  const needsAgentCount = chats.filter(c => c.isHumanHandoff).length;

  return (
    <div className="flex h-[82vh] w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-glass-border shadow-2xl bg-white/70 dark:bg-[#0a110d] backdrop-blur-xl">
      
      {/* ========================================================================= */}
      {/* SIDEBAR: LISTA DE CHATS */}
      {/* ========================================================================= */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-glass-border flex flex-col bg-white/60 dark:bg-[#0d1611]">
        
        {/* Header & Filtros */}
        <div className="p-4 bg-white/80 dark:bg-[#111c15] border-b border-gray-200 dark:border-glass-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-brand-gold flex items-center gap-2">
              <Phone className="w-5 h-5 text-brand-gold" />
              Bandeja de Entrada
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchChats} 
                disabled={isRefreshing}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-brand-gold transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                title="Recargar conversaciones"
              >
                <RotateCw size={15} />
              </button>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold font-bold border border-brand-gold/20">
                {chats.length} chats
              </span>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar socio, teléfono o acción..." 
              className="w-full bg-gray-100 dark:bg-[#16241a] text-gray-900 dark:text-white rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-brand-gold border border-gray-200 dark:border-transparent placeholder-gray-400"
            />
          </div>

          {/* Pestañas de Filtro */}
          <div className="flex gap-1 bg-gray-100 dark:bg-black/30 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                filterTab === 'all' 
                  ? 'bg-white dark:bg-brand-gold dark:text-brand-green text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterTab('needs_agent')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                filterTab === 'needs_agent' 
                  ? 'bg-amber-500 text-white shadow-sm font-bold' 
                  : 'text-gray-500 hover:text-amber-500'
              }`}
            >
              🛎️ Asesor
              {needsAgentCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {needsAgentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterTab('bot')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                filterTab === 'bot' 
                  ? 'bg-white dark:bg-brand-gold dark:text-brand-green text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🤖 En Bot
            </button>
          </div>
        </div>
        
        {/* Lista Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-glass-border">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No se encontraron conversaciones.
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = activeChat?.id === chat.id;
              const isHandoff = chat.isHumanHandoff;

              return (
                <div 
                  key={chat.id} 
                  onClick={() => handleChatSelect(chat)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-brand-gold/10 dark:bg-brand-gold/15 border-l-4 border-brand-gold' 
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 relative ${
                    isHandoff 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                      : 'bg-brand-green/10 dark:bg-emerald-900/40 text-brand-gold'
                  }`}>
                    {isHandoff ? <AlertCircle size={20} /> : <User size={20} />}
                    {isHandoff && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {chat.contactName && !chat.contactName.startsWith('+') 
                          ? chat.contactName 
                          : cleanDisplayPhone(chat)}
                      </h3>
                      {chat.lastMessageAt && (
                        <span className="text-[10px] text-gray-400">{formatTime(chat.lastMessageAt)}</span>
                      )}
                    </div>

                    {chat.contactName && !chat.contactName.startsWith('+') && (
                      <p className="text-[10px] text-gray-400 font-mono -mt-0.5 mb-0.5 truncate">
                        {cleanDisplayPhone(chat)}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[170px]">
                        {chat.lastMessage || 'Sin mensajes'}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        {isHandoff ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            🛎️ Asesor
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            🤖 Bot
                          </span>
                        )}

                        {chat.unreadCount > 0 && (
                          <span className="bg-brand-gold text-white dark:text-brand-green text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-sm">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CHAT AREA */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-black/20">
        {activeChat ? (
          <>
            {/* Top Bar del Chat Activo */}
            <div className="p-3.5 px-6 bg-white/90 dark:bg-[#111c15] border-b border-gray-200 dark:border-glass-border flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-green/10 dark:bg-emerald-900/40 flex items-center justify-center text-brand-gold">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {activeChat.contactName || cleanDisplayPhone(activeChat)}
                    {activeChat.member && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold font-bold border border-brand-gold/30">
                        Socio #{activeChat.member.membershipNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span>{cleanDisplayPhone(activeChat)}</span>
                    <span>•</span>
                    <span className={activeChat.isHumanHandoff ? 'text-amber-500 font-semibold' : 'text-emerald-500'}>
                      {activeChat.isHumanHandoff ? '🛎️ En atención con Asesor Humano' : '🤖 Atendido por Bot 24/7'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Botones de Control de Atención */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleHandoff}
                  disabled={actionLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    activeChat.isHumanHandoff
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                  title={activeChat.isHumanHandoff ? 'Devolver el control al Bot' : 'Pausar el bot para responder manualmente'}
                >
                  {activeChat.isHumanHandoff ? (
                    <>
                      <PlayCircle size={15} />
                      Reanudar Bot
                    </>
                  ) : (
                    <>
                      <PauseCircle size={15} />
                      Pausar Bot y Atender
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowMemberDrawer(!showMemberDrawer)}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                    showMemberDrawer 
                      ? 'bg-brand-gold text-brand-green border-brand-gold' 
                      : 'bg-white dark:bg-[#16241a] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-glass-border'
                  }`}
                  title="Ver Ficha del Socio"
                >
                  <Shield size={16} />
                </button>
              </div>
            </div>

            {/* Layout Cuerpo: Mensajes + Ficha Socio */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Mensajes */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm text-xs sm:text-sm ${
                        msg.fromMe 
                          ? 'bg-brand-green dark:bg-brand-gold text-white dark:text-brand-green font-medium rounded-br-none' 
                          : 'bg-white dark:bg-[#16241a] text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-glass-border'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                          <span>{formatTime(msg.timestamp)}</span>
                          {msg.fromMe && renderStatus(msg.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Plantillas Rápidas Desplegables */}
                {showQuickReplies && (
                  <div className="p-3 bg-white/95 dark:bg-[#111c15] border-t border-gray-200 dark:border-glass-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {QUICK_REPLIES.map((qr, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setInputText(qr.text);
                          setShowQuickReplies(false);
                        }}
                        className="text-left p-2 rounded-xl bg-gray-50 dark:bg-black/30 hover:bg-brand-gold/10 border border-gray-200 dark:border-glass-border text-xs transition-colors"
                      >
                        <p className="font-bold text-brand-gold-dark dark:text-brand-gold">{qr.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{qr.text}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Input de Mensaje */}
                <div className="p-3 bg-white/90 dark:bg-[#111c15] border-t border-gray-200 dark:border-glass-border flex items-center gap-2">
                  <button
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className="p-2.5 rounded-xl bg-gray-100 dark:bg-[#16241a] text-brand-gold hover:bg-brand-gold/20 transition-all border border-gray-200 dark:border-glass-border"
                    title="Plantillas Rápidas"
                  >
                    <Sparkles size={18} />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder={activeChat.isHumanHandoff ? "Escribe una respuesta como asesor..." : "Escribe un mensaje..."}
                    className="flex-1 bg-white dark:bg-[#0a110d] text-gray-900 dark:text-white border border-gray-200 dark:border-glass-border rounded-xl px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-brand-gold transition-colors placeholder-gray-400"
                  />
                  
                  <button 
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="w-10 h-10 rounded-xl bg-brand-gold hover:bg-brand-gold-light text-brand-green flex items-center justify-center transition-all disabled:opacity-40 shadow-sm flex-shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Ficha Socio (Derecha) */}
              {showMemberDrawer && (
                <div className="w-72 border-l border-gray-200 dark:border-glass-border bg-white/70 dark:bg-[#0d1611] p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar text-xs">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-glass-border pb-2">
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-brand-gold" />
                        Ficha del Socio
                      </h4>
                      <span className="text-[10px] text-gray-400">{activeChat.member ? 'Registrado' : 'No Socio'}</span>
                    </div>

                    {activeChat.member ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase">Nombre Completo</p>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{activeChat.member.fullName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 dark:bg-black/30 p-2 rounded-lg border border-gray-200 dark:border-glass-border">
                            <p className="text-[10px] text-gray-400">N° Acción</p>
                            <p className="font-bold text-brand-gold">{activeChat.member.membershipNumber}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-black/30 p-2 rounded-lg border border-gray-200 dark:border-glass-border">
                            <p className="text-[10px] text-gray-400">Carnet (CI)</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{activeChat.member.documentId}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-black/30 p-2 rounded-lg border border-gray-200 dark:border-glass-border">
                          <p className="text-[10px] text-gray-400">Tipo de Membresía</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{activeChat.member.membershipType}</p>
                        </div>

                        <div className="p-2.5 rounded-xl border bg-brand-gold/5 border-brand-gold/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">Estado de Cuotas</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              activeChat.member.totalDebt === 0 
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                                : 'bg-red-500/20 text-red-600 dark:text-red-400'
                            }`}>
                              {activeChat.member.totalDebt === 0 ? 'Al Día' : 'Con Saldo'}
                            </span>
                          </div>
                          <p className="text-base font-extrabold text-gray-900 dark:text-white">
                            Bs. {activeChat.member.totalDebt.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                          <User size={24} />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400">Número no vinculado a una acción de socio.</p>
                        <p className="text-[11px] text-gray-400">Atendido como consulta general o visitante.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-glass-border text-center">
                    <p className="text-[10px] text-gray-400">
                      Línea Central Club Hípico Los Sargentos
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-brand-gold/10 flex items-center justify-center mb-4 border border-brand-gold/20 text-brand-gold">
              <Bot size={36} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Centro de Atención Call Center</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              Selecciona una conversación de la izquierda para ver el historial, atender solicitudes o gestionar las derivaciones del bot.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
