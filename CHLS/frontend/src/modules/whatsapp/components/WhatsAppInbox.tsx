import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { format } from 'date-fns';
import { Send, Check, CheckCheck, User, Search } from 'lucide-react';
import { api } from '../../../config/api';

interface Chat {
  id: string;
  phone: string;
  contactName: string | null;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

interface Message {
  id: string;
  chatId: string;
  content: string;
  fromMe: boolean;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  timestamp: string;
}

export const WhatsAppInbox: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Socket and fetch chats
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:5000`, { withCredentials: true });

    fetchChats();

    newSocket.on('whatsapp:new_message', (data: { chat: Chat; message: Message }) => {
      setChats(prev => {
        const existing = prev.find(c => c.id === data.chat.id);
        if (existing) {
          return [data.chat, ...prev.filter(c => c.id !== data.chat.id)];
        }
        return [data.chat, ...prev];
      });

      if (activeChat && data.chat.id === activeChat.id) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    newSocket.on('whatsapp:message_ack', (data: { phone: string; status: string }) => {
      setMessages(prev => 
        prev.map(m => {
          // If we had a way to match message ID it would be better, but we assume last messages
          // For now, we update any message that is 'SENT' or 'DELIVERED'
          if (m.status !== 'READ' && m.fromMe) {
            return { ...m, status: data.status as any };
          }
          return m;
        })
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [activeChat]);

  const fetchChats = async () => {
    try {
      const res = await api.get('/whatsapp/chats');
      setChats(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (chat: Chat) => {
    try {
      const res = await api.get(`/whatsapp/chats/${chat.id}/messages`);
      setMessages(res.data.data);
      // Mark as read locally
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

    const text = inputText;
    setInputText('');

    try {
      await api.post('/whatsapp/send', {
        phone: activeChat.phone,
        text
      });
      // The socket will broadcast the new message back to us
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  const formatTime = (iso: string) => {
    return format(new Date(iso), 'HH:mm');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/@c\.us|@g\.us|@lid|@s\.whatsapp\.net/g, '');
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'SENT': return <Check size={14} className="text-gray-400" />;
      case 'DELIVERED': return <CheckCheck size={14} className="text-gray-400" />;
      case 'READ': return <CheckCheck size={14} className="text-blue-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-[80vh] w-full rounded-2xl overflow-hidden border border-glass-border shadow-2xl bg-white/60 dark:bg-[#0a110d] backdrop-blur-md">
      {/* Sidebar - Chat List */}
      <div className="w-1/3 border-r border-glass-border flex flex-col bg-white/40 dark:bg-[#0d1611]">
        <div className="p-4 bg-white/50 dark:bg-[#111c15] border-b border-glass-border">
          <h2 className="text-xl font-bold text-[#d4af37]">Chats</h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar chat..." 
              className="w-full bg-white dark:bg-[#16241a] theme-text rounded-lg pl-10 pr-4 py-2 outline-none focus:ring-1 focus:ring-brand-gold border border-glass-border dark:border-transparent placeholder-gray-400"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => handleChatSelect(chat)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 border-b border-glass-border ${activeChat?.id === chat.id ? 'bg-black/5 dark:bg-[#16241a]' : 'hover:bg-black/5 dark:hover:bg-[#131f17]'}`}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                <User className="text-[#d4af37]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-brand-green dark:text-white font-medium truncate">{chat.contactName || formatPhone(chat.phone)}</h3>
                  {chat.lastMessageAt && (
                    <span className="text-xs text-gray-500">{formatTime(chat.lastMessageAt)}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-400 truncate">{chat.lastMessage}</p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-brand-gold text-white dark:text-[#0a110d] text-xs font-bold px-2 py-0.5 rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-transparent dark:bg-black/20" style={{ backgroundImage: 'radial-gradient(circle at center, transparent 0%, transparent 100%)' }}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white/50 dark:bg-[#111c15] border-b border-glass-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center">
                <User className="text-[#d4af37]" />
              </div>
              <div>
                <h3 className="text-brand-green dark:text-white font-medium">{activeChat.contactName || formatPhone(activeChat.phone)}</h3>
                <p className="text-xs text-emerald-400">{formatPhone(activeChat.phone)}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md backdrop-blur-sm ${msg.fromMe ? 'bg-brand-green dark:bg-brand-gold text-white dark:text-[#0a110d] rounded-br-none' : 'bg-white dark:bg-[#16241a] theme-text rounded-bl-none border border-glass-border'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className={`text-[10px] ${msg.fromMe ? 'text-white/80 dark:text-[#0a110d]/70' : 'theme-text-muted'}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.fromMe && renderStatus(msg.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/50 dark:bg-[#111c15] border-t border-glass-border flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-white dark:bg-[#0a110d] theme-text border border-glass-border rounded-full px-6 py-3 outline-none focus:border-brand-gold transition-colors placeholder-gray-400"
              />
              <button 
                onClick={handleSend}
                className="w-12 h-12 rounded-full bg-brand-green dark:bg-brand-gold text-white dark:text-[#0a110d] flex items-center justify-center hover:opacity-90 transition-transform active:scale-95 flex-shrink-0"
              >
                <Send size={20} className="ml-1" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-24 h-24 rounded-full bg-emerald-900/20 flex items-center justify-center mb-4 border border-emerald-900/30">
              <Search className="text-[#d4af37]" size={40} />
            </div>
            <p className="text-lg">Selecciona un chat para comenzar a enviar mensajes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInbox;
