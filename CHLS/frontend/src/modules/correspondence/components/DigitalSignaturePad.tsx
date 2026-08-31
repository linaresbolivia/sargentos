import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  RotateCcw,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Stamp,
  Check,
  QrCode,
  Calendar,
  Lock,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';

interface DigitalSignaturePadProps {
  signerName: string;
  signerArea: string;
  signerPosition?: string;
  onSignatureChange: (signatureDataUrl: string | null) => void;
  initialSignature?: string | null;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  signerName,
  signerArea,
  signerPosition,
  onSignatureChange,
  initialSignature,
}) => {
  const [mode, setMode] = useState<'OFFICIAL_STAMP' | 'MANUAL_DRAW' | 'UPLOAD_IMAGE'>('OFFICIAL_STAMP');
  const [penColor, setPenColor] = useState<string>('#1e3a8a'); // Azul notarial clásico
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialSignature || null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Genera automáticamente el Sello Digital Institucional Oficial en Canvas
  const generateOfficialStamp = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo limpio semi-transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Borde doble notarial institucional
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Cabecera Institucional
    ctx.fillStyle = penColor;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLUB HÍPICO LOS SARGENTOS', canvas.width / 2, 28);

    ctx.font = 'italic bold 9px Arial, sans-serif';
    ctx.fillText('VALIDACIÓN Y REGISTRO DIGITAL DE PROVEÍDO', canvas.width / 2, 42);

    // Línea separadora
    ctx.beginPath();
    ctx.moveTo(30, 48);
    ctx.lineTo(canvas.width - 30, 48);
    ctx.stroke();

    // Datos del Firmante
    ctx.font = 'bold 12.5px Arial, sans-serif';
    ctx.fillText((signerName || 'RESPONSABLE DE ÁREA').toUpperCase(), canvas.width / 2, 70);

    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText((signerPosition || signerArea || 'GERENCIA / SECRETARÍA').toUpperCase(), canvas.width / 2, 86);

    ctx.font = '9px Arial, sans-serif';
    ctx.fillText(`ÁREA: ${signerArea.toUpperCase()}`, canvas.width / 2, 102);

    // Fecha, hora y hash criptográfico
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-BO');
    const timeStr = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const hash = `CHLS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    ctx.font = 'bold 8.5px monospace';
    ctx.fillText(`FECHA: ${dateStr} ${timeStr}  |  TOKEN: ${hash}`, canvas.width / 2, 124);

    // Sello de seguridad inferior
    ctx.font = 'bold 8px Arial, sans-serif';
    ctx.fillText('🔒 FIRMA ELECTRÓNICA Y SELLO CERTIFICADO CHLS', canvas.width / 2, 142);

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    onSignatureChange(dataUrl);
  };

  useEffect(() => {
    if (mode === 'OFFICIAL_STAMP' && !previewUrl) {
      generateOfficialStamp();
    }
  }, [mode, penColor, signerName, signerArea, signerPosition]);

  // Inicializar Canvas de dibujo manual
  useEffect(() => {
    if (mode === 'MANUAL_DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.5;
      }
    }
  }, [mode, penColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Guardar estado en historial para Deshacer
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setPreviewUrl(dataUrl);
      onSignatureChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setHistory([]);
    setPreviewUrl(null);
    onSignatureChange(null);
  };

  const undoLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = history[history.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory((prev) => prev.slice(0, prev.length - 1));

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    onSignatureChange(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreviewUrl(dataUrl);
        onSignatureChange(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-emerald-500/30 rounded-2xl p-4">
      {/* Header & Modes */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-gold" />
          <span className="text-xs font-black uppercase text-slate-800 dark:text-gray-200 tracking-wider">
            Firma Digital & Sello Institucional de Proveído
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-200 dark:bg-white/10 p-0.5 rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('OFFICIAL_STAMP');
              generateOfficialStamp();
            }}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'OFFICIAL_STAMP'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Sello Oficial CHLS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('MANUAL_DRAW');
              setPreviewUrl(null);
            }}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'MANUAL_DRAW'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Firma Manuscrita</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('UPLOAD_IMAGE');
              setPreviewUrl(null);
            }}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'UPLOAD_IMAGE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Subir Sello</span>
          </button>
        </div>
      </div>

      {/* Color Palette Selector */}
      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5">
        <span className="text-[11px] text-slate-500 font-medium">Tinta Notarial:</span>
        <div className="flex items-center gap-2">
          {[
            { color: '#1e3a8a', label: 'Azul Notarial' },
            { color: '#064e3b', label: 'Verde CHLS' },
            { color: '#0f172a', label: 'Negro Formal' },
          ].map((c) => (
            <button
              key={c.color}
              type="button"
              onClick={() => {
                setPenColor(c.color);
                if (mode === 'OFFICIAL_STAMP') generateOfficialStamp();
              }}
              title={c.label}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                penColor === c.color ? 'scale-125 border-brand-gold shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>
      </div>

      {/* Mode 1: Sello Oficial CHLS */}
      {mode === 'OFFICIAL_STAMP' && (
        <div className="space-y-2">
          {previewUrl && (
            <div className="flex justify-center p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-emerald-500/30 rounded-xl shadow-inner">
              <img src={previewUrl} alt="Sello Oficial CHLS" className="max-h-28 object-contain" />
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sello electrónico oficial generado con validez institucional
            </span>
            <button
              type="button"
              onClick={generateOfficialStamp}
              className="text-brand-gold hover:underline font-bold"
            >
              🔄 Regenerar Token
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Firma Manuscrita en Canvas */}
      {mode === 'MANUAL_DRAW' && (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl overflow-hidden bg-white dark:bg-black/40 touch-none">
            <canvas
              ref={canvasRef}
              width={460}
              height={140}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-32 cursor-crosshair"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                <PenTool className="w-5 h-5 text-slate-300 dark:text-slate-600 animate-bounce" />
                <span>Dibuja tu firma aquí con mouse o pantalla táctil</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undoLastStroke}
                disabled={history.length === 0}
                className="px-2.5 py-1 rounded-lg text-xs bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300 hover:bg-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Deshacer</span>
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={!hasDrawn}
                className="px-2.5 py-1 rounded-lg text-xs bg-red-500/15 text-red-600 hover:bg-red-500/25 disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            </div>

            {hasDrawn && (
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Firma capturada
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Subir Sello / Imagen */}
      {mode === 'UPLOAD_IMAGE' && (
        <div className="space-y-2">
          {previewUrl ? (
            <div className="flex flex-col items-center p-3 bg-white dark:bg-black/50 border border-slate-200 dark:border-emerald-500/30 rounded-xl">
              <img src={previewUrl} alt="Sello Subido" className="max-h-24 object-contain mb-2" />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  onSignatureChange(null);
                }}
                className="text-xs text-red-500 hover:underline font-bold"
              >
                Eliminar y subir otra imagen
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl bg-white/50 dark:bg-black/30 hover:border-emerald-500 transition-colors cursor-pointer">
              <UploadCloud className="w-7 h-7 text-brand-gold mb-1.5" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Subir foto o escaneo de tu sello / firma
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG o WEBP (recomendado fondo transparente)</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>
      )}
    </div>
  );
};
export default DigitalSignaturePad;
