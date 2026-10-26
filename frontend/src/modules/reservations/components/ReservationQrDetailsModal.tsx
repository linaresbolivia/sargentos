import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  MessageSquare, 
  Share2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Calendar, 
  User, 
  FileText, 
  UploadCloud, 
  ExternalLink,
  ShieldCheck,
  Eye,
  Pencil,
  Send,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { compressImage } from '@shared/utils/imageCompressor';
import qrPagosImg from '../../../assets/qr-pagos.jpg';

interface Court {
  id: string;
  name: string;
  sport: string;
}

interface Reservation {
  id: string;
  code?: string | null;
  courtId: string;
  court?: Court;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reservationType: string;
  playerType?: string;
  guestsCount?: number;
  playerNames?: string | null;
  courtFee?: number;
  guestFee?: number;
  totalPrice?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentReceiptUrl?: string | null;
  title?: string | null;
  notes?: string | null;
  memberCode?: string | null;
  memberName: string;
  memberPhone?: string | null;
}

interface ReservationQrDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onUploadReceipt?: (reservationId: string, fileOrBase64: string | File) => Promise<void> | void;
  onVerifyPayment?: (reservationId: string) => Promise<void> | void;
  onEdit?: (reservation: Reservation) => void;
  isStaffView?: boolean;
}

export const ReservationQrDetailsModal: React.FC<ReservationQrDetailsModalProps> = ({
  isOpen,
  onClose,
  reservation,
  onUploadReceipt,
  onVerifyPayment,
  onEdit,
  isStaffView = false
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingReceiptBase64, setPendingReceiptBase64] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{ originalSizeKb: number; compressedSizeKb: number } | null>(null);
  const [showReuploadForm, setShowReuploadForm] = useState(false);

  if (!isOpen || !reservation) return null;

  const resCode = reservation.code || reservation.id?.slice(0, 8).toUpperCase() || 'RES';
  const courtName = reservation.court?.name || 'Cancha Asignada';
  const rawSport = reservation.court?.sport || 'Deporte';
  const specificDiscipline = reservation.title?.includes('Wally') || reservation.notes?.includes('Wally')
    ? 'Wally'
    : reservation.title?.includes('Racquet') || reservation.notes?.includes('Racquet')
    ? 'Racquet'
    : reservation.title?.includes('Futsal') || reservation.notes?.includes('Futsal')
    ? 'Polifuncional - Futsal'
    : reservation.title?.includes('Volleyball') || reservation.notes?.includes('Volleyball')
    ? 'Polifuncional - Volleyball'
    : reservation.title?.includes('Basketball') || reservation.notes?.includes('Basketball')
    ? 'Polifuncional - Basketball'
    : null;
  const sport = specificDiscipline || rawSport;
  const totalAmount = reservation.totalPrice ?? (reservation.courtFee ?? 0) + (reservation.guestFee ?? 0);
  const isVerified = reservation.paymentStatus === 'VERIFIED' || (reservation.status === 'APPROVED' && totalAmount === 0);
  const isPaid = reservation.paymentStatus === 'PAID';
  const isExempt = reservation.paymentStatus === 'EXEMPT' || totalAmount === 0;

  // Generar texto exacto formateado para WhatsApp (Corto y directo)
  let modalityLabel = 'Familiar';
  if (reservation.playerType === 'GUESTS') {
    modalityLabel = `Invitados (${reservation.guestsCount || 1})`;
  } else if (reservation.playerType === 'MEMBERS') {
    modalityLabel = 'Entre Socios';
  }
  const companionsText = reservation.playerNames ? `\n📝 *Acompañantes:* ${reservation.playerNames}` : '';

  const waMessageText = isExempt
    ? `🐴 *CLUB HÍPICO LOS SARGENTOS*
✅ *Confirmación de Turno Deportivo*

Estimado(a) socio(a) *${reservation.memberName}*, su reserva ha sido confirmada exitosamente:

📌 *Cancha:* ${courtName} (${sport})
📅 *Fecha:* ${reservation.date}
⏰ *Horario:* ${reservation.startTime} a ${reservation.endTime}
👥 *Modalidad:* ${modalityLabel}${companionsText}
🎫 *Código de Reserva:* *#${resCode}*

Por favor presente su Código de Socio o Cuota de Participación al ingresar al club.${reservation.playerNames?.includes('Pase #') ? '\n\n🎫 *Nota de Caseta:* Estimado socio gracias por su preferencia, por favor no olvide dejar su pase de invitado a caseta. Gracias.' : ''} ¡Esperamos que disfrute de su jornada deportiva! 🥇✨`
    : `🐴 *CLUB HÍPICO LOS SARGENTOS*
🟡 *Pre-Reserva Registrada*

Estimado(a) socio(a) *${reservation.memberName}*, se ha registrado su pre-reserva:

📌 *Cancha:* ${courtName} (${sport})
📅 *Fecha:* ${reservation.date}
⏰ *Horario:* ${reservation.startTime} a ${reservation.endTime}
👥 *Modalidad:* ${modalityLabel}${companionsText}
💰 *Total a Pagar:* *Bs. ${totalAmount}*
🎫 *Código / Glosa:* *#${resCode}*

*Instrucciones de Pago:*
1. Escanee el código QR oficial y realice la transferencia bancaria.
2. ⚠️ Coloque en la glosa de su transferencia el código: *#${resCode}*
3. Adjunte su comprobante en el sistema para consolidar su turno.

¡Quedamos a su grata disposición en el Club! 🏆✨`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(resCode);
    setCopiedCode(true);
    toast.success(`Código #${resCode} copiado`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(waMessageText);
    setCopiedMessage(true);
    toast.success('Mensaje oficial de WhatsApp copiado');
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const rawPhone = reservation.memberPhone ? reservation.memberPhone.replace(/[\s\-\(\)\+]/g, '') : '';
    const cleanPhone = rawPhone ? (rawPhone.startsWith('591') ? rawPhone : `591${rawPhone}`) : '';
    const encoded = encodeURIComponent(waMessageText);
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = qrPagosImg;
    link.download = `QR-Pago-CHLS-${resCode}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Descargando QR oficial de pagos');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const result = await compressImage(file);
      setPendingReceiptBase64(result.dataUrl);
      setCompressionStats({
        originalSizeKb: result.originalSizeKb,
        compressedSizeKb: result.compressedSizeKb
      });
      toast.success('Imagen optimizada y lista para enviar');
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la imagen');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleSendPendingReceipt = async () => {
    if (!pendingReceiptBase64 || !onUploadReceipt) return;
    try {
      setIsUploading(true);
      await onUploadReceipt(reservation.id, pendingReceiptBase64);
      setPendingReceiptBase64(null);
      setCompressionStats(null);
      setShowReuploadForm(false);
      toast.success('¡Comprobante enviado y validado con éxito!');
    } catch (err) {
      toast.error('Error al enviar el comprobante');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-[#0c1812] border-2 border-slate-200 dark:border-brand-gold/50 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl dark:shadow-[0_0_60px_rgba(204,161,75,0.25)] space-y-5 relative max-h-[92vh] overflow-y-auto my-auto text-slate-800 dark:text-gray-200">
        
        {/* Header con botón cerrar */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-brand-gold/20 pb-4">
          <div className="flex items-center gap-3">
            <CrestLogo size="md" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-brand-gold block">
                {isVerified ? 'Reserva Consolidada' : 'Pre-Reserva • Información & QR'}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white serif-brand">
                Comprobante de Turno
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badge de Estado del Turno */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 flex-wrap gap-2">
          <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">Estado del Turno:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
            isVerified
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shadow-sm'
              : isPaid
              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40'
              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse'
          }`}>
            {isVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>🟢 Reserva Consolidada</span>
              </>
            ) : isPaid ? (
              <>
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>🔵 Comprobante en Validación</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>🟡 Pre-Reserva (Pendiente de Pago)</span>
              </>
            )}
          </span>
        </div>

        {/* Desglose de Datos del Turno */}
        <div className="bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200 dark:border-brand-gold/25 space-y-2.5 text-xs shadow-inner">
          
          <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-white/10">
            <span className="text-slate-500 dark:text-gray-400 font-medium">Código de Reserva:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm text-amber-800 dark:text-brand-gold bg-amber-100 dark:bg-brand-gold/15 px-2.5 py-0.5 rounded-lg border border-amber-300 dark:border-brand-gold/30">
                #{resCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1 rounded-lg bg-slate-200/70 hover:bg-slate-300 dark:bg-white/5 dark:hover:bg-white/15 text-amber-800 dark:text-brand-gold transition-colors"
                title="Copiar código de reserva"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-gray-400">Espacio / Cancha:</span>
            <strong className="text-slate-900 dark:text-white text-right">{courtName} <span className="text-amber-700 dark:text-brand-gold">({sport})</span></strong>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-gray-400">Fecha del Turno:</span>
            <span className="text-slate-900 dark:text-white font-mono font-semibold">{reservation.date}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-gray-400">Horario Asignado:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{reservation.startTime} - {reservation.endTime}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-gray-400">Socio Titular:</span>
            <span className="text-slate-900 dark:text-white font-semibold text-right">
              {reservation.memberName} {reservation.memberCode && reservation.memberCode !== 'ADMIN_BLOCK' ? `(#${reservation.memberCode})` : ''}
            </span>
          </div>

          {reservation.memberPhone && (
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-gray-400">WhatsApp de Contacto:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold">{reservation.memberPhone}</span>
            </div>
          )}

          {reservation.playerNames && (
            <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200 dark:border-white/5">
              <span className="text-slate-500 dark:text-gray-400 text-xs flex items-center justify-between">
                <span>Acompañantes / Invitados ({reservation.guestsCount || 1}):</span>
              </span>
              <div className="text-slate-800 dark:text-gray-200 text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                {reservation.playerNames}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/10">
            <span className="text-slate-600 dark:text-gray-400 font-bold uppercase text-[11px]">Total a Pagar:</span>
            <span className="text-base font-black font-mono text-amber-800 dark:text-brand-gold bg-amber-100 dark:bg-brand-gold/10 px-3 py-0.5 rounded-xl border border-amber-300 dark:border-brand-gold/30">
              {isExempt ? 'Bs. 0 (Cortesía Socio)' : `Bs. ${totalAmount}`}
            </span>
          </div>
        </div>

        {/* CASO 1: RESERVA DE CORTESÍA (FAMILIA / ENTRE SOCIOS - BS. 0) */}
        {isExempt && (
          <div className="p-4 bg-emerald-50 dark:bg-gradient-to-b dark:from-[#0b2918] dark:via-[#071d11] dark:to-[#041009] border-2 border-emerald-400 dark:border-emerald-500/50 rounded-2xl space-y-2.5 text-center shadow-lg animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                ¡Turno 100% Confirmado y Habilitado!
              </h4>
              <p className="text-xs text-slate-700 dark:text-emerald-300/90 max-w-sm mx-auto">
                Tu reserva no tiene costo (Cortesía de Socio). Presenta tu Código de Socio / Cuota de Participación o tu código <strong className="text-slate-900 dark:text-white font-mono">#{resCode}</strong> en caseta o garita al ingresar.
              </p>
              {reservation.playerNames?.includes('Pase #') && (
                <div className="mt-2 p-2.5 rounded-xl bg-white/80 dark:bg-black/50 border border-emerald-300 dark:border-emerald-500/40 text-[11px] text-emerald-900 dark:text-emerald-200">
                  🎫 <strong>Recordatorio:</strong> Estimado socio gracias por su preferencia, por favor no olvide dejar su pase de invitado a caseta. Gracias.
                </div>
              )}
            </div>
          </div>
        )}

        {/* CASO 2: PRE-RESERVA CON PAGO REQUERIDO (INVITADOS / ARANCELES) */}
        {!isExempt && (
          <>
            {/* Sección de QR Oficial de Pago */}
            <div className="p-4 bg-slate-50 dark:bg-black/60 rounded-2xl border-2 border-amber-300 dark:border-brand-gold/40 space-y-3 text-center shadow-lg animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-800 dark:text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-600 dark:text-brand-gold" />
                  QR Oficial de Pago & Transferencia
                </span>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="text-[10px] text-amber-800 dark:text-brand-gold hover:text-amber-900 dark:hover:text-white hover:underline flex items-center gap-1 font-bold bg-amber-100 dark:bg-brand-gold/15 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-brand-gold/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar QR
                </button>
              </div>

              {/* Imagen QR Oficial */}
              <div className="relative inline-block p-2 bg-white rounded-2xl shadow-xl border-2 border-amber-300 dark:border-brand-gold/40">
                <img 
                  src={qrPagosImg} 
                  alt="QR Oficial de Pagos CHLS" 
                  className="w-44 sm:w-48 h-auto rounded-xl object-contain mx-auto"
                />
              </div>

              {/* Alerta de Glosa Importante */}
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 text-[11px] text-left space-y-1.5">
                <p className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ⚠️ Colocar en la glosa de tu transferencia:
                </p>
                <div className="flex items-center justify-between bg-white dark:bg-black/70 p-2 rounded-xl border border-amber-300 dark:border-amber-500/40">
                  <span className="font-mono font-black text-sm text-amber-800 dark:text-brand-gold">
                    #{resCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-brand-gold/20 dark:hover:bg-brand-gold/30 text-amber-900 dark:text-brand-gold text-xs font-bold border border-amber-300 dark:border-brand-gold/40 transition-colors"
                  >
                    {copiedCode ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sección Comprobante Adjunto y Envío Directo */}
            <div className="p-4 bg-slate-50 dark:bg-gradient-to-b dark:from-[#081e13] dark:to-[#04100a] rounded-2xl border-2 border-slate-200 dark:border-emerald-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-[#00ff87] uppercase tracking-wider flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Comprobante de Pago / Transferencia
                </span>
                {reservation.paymentReceiptUrl && !showReuploadForm && (
                  <button
                    type="button"
                    onClick={() => setShowReuploadForm(true)}
                    className="text-[10px] text-amber-700 dark:text-brand-gold hover:text-amber-900 dark:hover:text-white font-bold flex items-center gap-1 transition-colors underline"
                  >
                    <RefreshCw className="w-3 h-3" /> Reenviar / Cambiar
                  </button>
                )}
              </div>

              {/* Si ya existe comprobante subido y no estamos en modo reenvío */}
              {reservation.paymentReceiptUrl && !showReuploadForm && !pendingReceiptBase64 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-gray-300">
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Comprobante Registrado
                    </span>
                    <span className="text-slate-500 dark:text-gray-500 text-[10px]">Guardado en el sistema</span>
                  </div>
                  <div className="max-h-48 overflow-auto rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-white dark:bg-black/70 p-2 flex items-center justify-center">
                    <img 
                      src={reservation.paymentReceiptUrl} 
                      alt="Comprobante de Pago" 
                      className="max-h-44 max-w-full rounded-lg object-contain"
                    />
                  </div>
                </div>
              ) : (
                /* Formulario para seleccionar y enviar el comprobante */
                <div className="space-y-3">
                  {pendingReceiptBase64 ? (
                    /* Vista previa de imagen comprimida lista para enviar */
                    <div className="space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-800 dark:text-brand-gold font-bold flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Comprobante Optimizado:
                        </span>
                        {compressionStats && (
                          <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-500/30 font-bold">
                            ⚡ {compressionStats.originalSizeKb} KB ➔ {compressionStats.compressedSizeKb} KB
                          </span>
                        )}
                      </div>

                      <div className="max-h-44 overflow-auto rounded-xl border-2 border-emerald-400 dark:border-emerald-500/50 bg-white dark:bg-black/80 p-2 flex items-center justify-center">
                        <img 
                          src={pendingReceiptBase64} 
                          alt="Vista Previa Comprobante" 
                          className="max-h-40 max-w-full rounded-lg object-contain"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={handleSendPendingReceipt}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-gradient-to-r dark:from-emerald-500 dark:via-[#00ff87] dark:to-emerald-500 dark:hover:from-emerald-400 dark:hover:to-[#00ff87] dark:text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md dark:shadow-[0_0_20px_rgba(0,255,135,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              <span>Enviando Comprobante...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              <span>Enviar Comprobante Ahora</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => {
                            setPendingReceiptBase64(null);
                            setCompressionStats(null);
                            setShowReuploadForm(false);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 font-bold text-xs transition-colors"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Botón para seleccionar comprobante */
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-black/50 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-xs text-center sm:text-left">
                        <p className="font-bold text-slate-900 dark:text-white">¿Realizaste el pago por QR o Transferencia?</p>
                        <p className="text-[10px] text-slate-500 dark:text-gray-400">Adjunta la captura/foto para enviar y validar tu reserva</p>
                      </div>

                      <label className={`cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 dark:from-brand-gold dark:to-amber-500 text-white dark:text-black font-black text-xs flex items-center gap-2 shadow-md transition-all hover:scale-105 shrink-0 ${isCompressing ? 'opacity-60 pointer-events-none' : ''}`}>
                        {isCompressing ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>Optimizando...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-4 h-4" />
                            <span>Adjuntar Comprobante</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileSelect}
                          disabled={isCompressing || isUploading}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Sección Mensaje Oficial para WhatsApp */}
        <div className="bg-slate-50 dark:bg-black/30 rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Mensaje Oficial de Reserva (WhatsApp)
            </span>
            <button
              type="button"
              onClick={() => setShowFullMessage(!showFullMessage)}
              className="text-[10px] text-amber-700 dark:text-brand-gold hover:underline font-bold"
            >
              {showFullMessage ? 'Ocultar texto' : 'Ver texto'}
            </button>
          </div>

          {showFullMessage && (
            <div className="bg-white dark:bg-black/60 p-3 rounded-xl border border-slate-200 dark:border-white/10 font-mono text-[11px] text-slate-800 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {waMessageText}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? '¡Copiado!' : 'Copiar Mensaje'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="py-2 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Acciones para Staff/Admin si aplica */}
        {isStaffView && !isVerified && onVerifyPayment && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onVerifyPayment(reservation.id);
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Validar Pago & Consolidar Turno Ahora</span>
            </button>
          </div>
        )}

        {/* Botón Editar Reserva (en el mismo entorno de reserva) */}
        {onEdit && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onEdit(reservation);
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-brand-gold/20 dark:hover:bg-brand-gold/30 border border-amber-300 dark:border-brand-gold/50 text-amber-900 dark:text-brand-gold font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Pencil className="w-4 h-4" />
              <span>Editar Reserva (Horario, Cancha o Jugadores)</span>
            </button>
          </div>
        )}

        {/* Botón Finalizar */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
