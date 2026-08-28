import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Printer, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  User, 
  FileText,
  Sparkles,
  CheckCircle2,
  Phone,
  Send
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import CrestLogo from '@shared/components/CrestLogo';
import { VipPass, commercialApi } from '../services/commercialApi';
import toast from 'react-hot-toast';

interface VipPassTicketModalProps {
  pass: VipPass | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VipPassTicketModal: React.FC<VipPassTicketModalProps> = ({ pass, isOpen, onClose }) => {
  const ticketCardRef = useRef<HTMLDivElement | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  if (!isOpen || !pass) return null;

  const formatVipDateText = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '';
    const dateStr = (typeof dateInput === 'string' ? dateInput : new Date(dateInput).toISOString()).split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const localDate = new Date(y, m, d);
      return localDate.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return new Date(dateInput).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const allowedAreasList = (pass.allowedAreas || '').split(',').map((a) => a.trim());
  const fromDate = formatVipDateText(pass.validFrom);
  const untilDate = formatVipDateText(pass.validUntil);

  // Download ticket as high-resolution PNG image
  const handleDownloadImage = async () => {
    if (!ticketCardRef.current) return;
    try {
      toast.loading('Generando tarjeta de invitación VIP en alta resolución...', { id: 'ticket-dl' });
      const canvas = await html2canvas(ticketCardRef.current, {
        scale: 3,
        backgroundColor: '#0a100d',
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `Pase_VIP_${pass.code}_${pass.guestFullName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('¡Tarjeta VIP descargada con éxito!', { id: 'ticket-dl' });
    } catch (err) {
      console.error(err);
      toast.error('Error al generar imagen de la tarjeta', { id: 'ticket-dl' });
    }
  };

  // Download ticket as official PDF
  const handleDownloadPdf = async () => {
    if (!ticketCardRef.current) return;
    try {
      toast.loading('Generando credencial VIP en formato PDF...', { id: 'ticket-pdf' });
      const canvas = await html2canvas(ticketCardRef.current, {
        scale: 2.5,
        backgroundColor: '#0a100d',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5',
      });

      const imgWidth = 138;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.setFillColor(10, 16, 13);
      pdf.rect(0, 0, 148, 210, 'F');
      pdf.addImage(imgData, 'PNG', 5, 10, imgWidth, imgHeight);
      pdf.save(`Credencial_VIP_${pass.code}.pdf`);

      toast.success('¡Credencial PDF descargada correctamente!', { id: 'ticket-pdf' });
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF', { id: 'ticket-pdf' });
    }
  };

  // Direct WhatsApp dispatch via CHLS WhatsApp Comercial Server (with captured VIP Card PNG)
  const handleSendDirectWhatsApp = async () => {
    if (!pass) return;
    if (!pass.phone) {
      toast.error('Este pase VIP no tiene un número de celular registrado');
      handleShareWhatsApp();
      return;
    }

    try {
      setIsSendingWhatsApp(true);
      toast.loading('Generando pase en alta definición y despachando por WhatsApp Comercial...', { id: 'send-wa' });

      let base64Image: string | undefined = undefined;
      if (ticketCardRef.current) {
        const canvas = await html2canvas(ticketCardRef.current, {
          scale: 2.5,
          backgroundColor: '#0a100d',
          useCORS: true,
        });
        base64Image = canvas.toDataURL('image/png');
      }

      const res = await commercialApi.sendPassWhatsApp(pass.id, base64Image);
      if (res.success) {
        toast.success(`¡Pase VIP enviado exitosamente por WhatsApp Comercial a ${pass.guestFullName}!`, { id: 'send-wa' });
      } else {
        toast.error(res.message || 'Línea no vinculada. Abriendo WhatsApp Web...', { id: 'send-wa' });
        handleShareWhatsApp();
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'WhatsApp Comercial no está conectado aún. Abriendo WhatsApp Web...';
      toast.error(errMsg, { id: 'send-wa' });
      // Smart Fallback: Open WhatsApp Web/App immediately so the message is NEVER lost!
      setTimeout(() => {
        handleShareWhatsApp();
      }, 600);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Share via WhatsApp Web / App as fallback link
  const handleShareWhatsApp = () => {
    const areaLabels = allowedAreasList.join(', ');
    const docText = pass.documentId ? pass.documentId : 'ci';
    const dateText = fromDate === untilDate ? fromDate : `Del ${fromDate} al ${untilDate}`;
    const message = `🏛️ *CLUB HÍPICO LOS SARGENTOS*
🌟 *Pase de Cortesía VIP*

Señor (a): *${pass.guestFullName}*, es un honor invitarl@ a conocer y disfrutar de nuestras instalaciones.

🎟️ *Código de Pase VIP:* ${pass.code}
📅 *Fecha Autorizada:* ${dateText}
⏰ *Horario Autorizado:* ${pass.timeStart} a ${pass.timeEnd} hrs
📍 *Áreas Autorizadas:* ${areaLabels}
👥 *Acompañantes Autorizados:* ${pass.maxUses}
👤 *Ejecutivo:* ${pass.hostSellerName}

Al llegar al *Ingreso Principal*, por favor presente su documento de identidad (*${docText}*) y el *Código de Pase VIP* para su ingreso preferencial.

_¡Esperamos disfrute de nuestras instalaciones durante su estadía!_`;

    const encodedMessage = encodeURIComponent(message);
    const phone = pass.phone ? pass.phone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phone
      ? `https://wa.me/${phone.startsWith('591') ? phone : '591' + phone}?text=${encodedMessage}`
      : `https://api.whatsapp.com/send?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0a100d] border border-brand-gold/40 rounded-3xl p-6 shadow-[0_0_60px_rgba(212,175,55,0.25)] space-y-6 text-white my-8">
        
        {/* Top Header Actions */}
        <div className="flex justify-between items-center border-b border-brand-gold/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-brand-gold/20 text-brand-gold">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold serif-brand text-brand-gold">
              Tarjeta de Invitación & Pase VIP
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- TICKET CARD DESIGN (RENDERED FOR DOWNLOAD/PRINT) --- */}
        <div 
          ref={ticketCardRef}
          className="relative bg-gradient-to-br from-[#06120e] via-[#091f16] to-[#040907] border-2 border-brand-gold/60 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-white"
        >
          {/* Gold Decorative Corner Brackets */}
          <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-brand-gold"></div>
          <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-brand-gold"></div>
          <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-brand-gold"></div>
          <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-brand-gold"></div>

          {/* Watermark Crest */}
          <div className="absolute right-[-30px] bottom-[-30px] opacity-10 pointer-events-none w-64 h-64">
            <CrestLogo size="xl" />
          </div>

          {/* Ticket Header */}
          <div className="flex justify-between items-start border-b border-brand-gold/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/50 border border-brand-gold/30">
                <CrestLogo size="sm" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold">
                  CLUB HÍPICO LOS SARGENTOS
                </p>
                <h2 className="text-base sm:text-lg font-extrabold serif-brand text-white tracking-tight">
                  PASE DE CORTESÍA VIP
                </h2>
                <span className="text-[10px] text-gray-400">Admisión de Nuevos Socios</span>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-gold text-black uppercase tracking-wider shadow-md">
                {pass.code}
              </span>
              <p className="text-[9px] text-brand-gold font-bold mt-1">👥 {pass.maxUses} Acompañantes</p>
            </div>
          </div>

          {/* Guest Name & QR Section */}
          <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            
            {/* Left: Guest Details */}
            <div className="sm:col-span-2 space-y-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Invitado de Honor:</p>
                <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-500 serif-brand">
                  {pass.guestFullName}
                </h3>
                {pass.documentId && (
                  <p className="text-xs text-gray-300 font-mono">
                    CI / Doc: <strong className="text-white">{pass.documentId}</strong>
                  </p>
                )}
              </div>

              {/* Validity Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-black/40 p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand-gold shrink-0" />
                  <div>
                    <p className="text-[9px] text-gray-400">Fecha Autorizada:</p>
                    <p className="font-bold text-[11px] text-gray-200">{fromDate === untilDate ? fromDate : `${fromDate} al ${untilDate}`}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-gold shrink-0" />
                  <div>
                    <p className="text-[9px] text-gray-400">Horario:</p>
                    <p className="font-bold text-[11px] text-gray-200">{pass.timeStart} - {pass.timeEnd}</p>
                  </div>
                </div>
              </div>

              {/* Host Seller & Companions */}
              <div className="text-[11px] text-gray-400 flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Anfitrión: <strong className="text-gray-200">{pass.hostSellerName}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-brand-gold/20 text-brand-gold font-bold text-[10px]">
                    👥 {pass.maxUses} Acompañantes Autorizados
                  </span>
                </div>
              </div>
            </div>

            {/* Right: QR Code */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white text-black shadow-2xl border-2 border-brand-gold/80">
              <QRCodeSVG 
                value={pass.code} 
                size={110} 
                level="H" 
                includeMargin={true}
              />
              <span className="text-[8px] font-mono font-black tracking-widest uppercase text-gray-800 mt-1">
                VALIDACIÓN EN INGRESO
              </span>
            </div>

          </div>

          {/* Allowed Areas Grid */}
          <div className="border-t border-brand-gold/30 pt-3">
            <p className="text-[10px] text-brand-gold uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Áreas Autorizadas para esta Visita:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allowedAreasList.map((area, index) => (
                <span 
                  key={index}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-brand-gold/15 text-brand-gold border border-brand-gold/40 shadow-sm"
                >
                  ✓ {area}
                </span>
              ))}
            </div>
          </div>

          {/* Footer Warning */}
          <div className="mt-4 pt-2 border-t border-white/10 text-[9px] text-gray-400 flex justify-between items-center">
            <span>Pase personal e intransferible. Válido con CI.</span>
            <span className="text-brand-gold font-mono font-bold">CHLS • EXPERIENCIA VIP</span>
          </div>
        </div>

        {/* --- ACTION BUTTONS --- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <button
            onClick={handleDownloadImage}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Imagen PNG
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Credencial PDF
          </button>

          <button
            onClick={handleSendDirectWhatsApp}
            disabled={isSendingWhatsApp}
            className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
            title="Envío automático desde el servidor WhatsApp Comercial (Canal 5)"
          >
            <Send className="w-3.5 h-3.5 text-amber-300" />
            {isSendingWhatsApp ? 'Enviando...' : 'WhatsApp Directo'}
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="px-3 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Abrir aplicación WhatsApp Web / App en celular o PC"
          >
            <Share2 className="w-3.5 h-3.5" /> Abrir WhatsApp
          </button>
        </div>

      </div>
    </div>
  );
};
export default VipPassTicketModal;
