import React, { useRef, useState, useEffect } from 'react';
import {
  ShieldCheck,
  UploadCloud,
  Stamp,
  Check,
  Edit2,
  RotateCcw,
  User,
  Briefcase,
  Building2,
} from 'lucide-react';

interface DigitalSignaturePadProps {
  signerName: string;
  signerArea: string;
  signerPosition?: string;
  userId?: string;
  stampText?: string | null;
  onSignatureChange: (signatureDataUrl: string | null) => void;
  initialSignature?: string | null;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  signerName,
  signerArea,
  signerPosition,
  userId,
  stampText,
  onSignatureChange,
  initialSignature,
}) => {
  const storageKey = `chls_signature_config_${userId || 'default'}`;
  const imageStorageKey = `chls_signature_image_${userId || 'default'}`;

  const savedConfig = (() => {
    try {
      const item = localStorage.getItem(storageKey);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();

  const savedImage = (() => {
    try {
      return localStorage.getItem(imageStorageKey);
    } catch {
      return null;
    }
  })();

  const [mode, setMode] = useState<'OFFICIAL_STAMP' | 'UPLOAD_IMAGE'>(savedConfig?.mode || 'OFFICIAL_STAMP');
  const [penColor, setPenColor] = useState<string>(savedConfig?.penColor || '#1e3a8a'); // Azul notarial clásico
  const [customName, setCustomName] = useState<string>(savedConfig?.name || signerName);
  const [customPosition, setCustomPosition] = useState<string>(savedConfig?.position || signerPosition || '');
  const [customArea, setCustomArea] = useState<string>(savedConfig?.area || signerArea);
  const [isEditingInfo, setIsEditingInfo] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    (savedConfig?.mode === 'UPLOAD_IMAGE' && savedImage) ? savedImage : (initialSignature || null)
  );

  const isFirstMount = useRef(true);

  // Sincronizar si cambian los datos base del usuario autenticado y no hay personalización manual guardada
  useEffect(() => {
    if (!savedConfig) {
      setCustomName(signerName);
      setCustomPosition(signerPosition || '');
      setCustomArea(signerArea);
    }
  }, [signerName, signerPosition, signerArea, savedConfig]);

  const saveConfig = (overrides: {
    name?: string;
    position?: string;
    area?: string;
    penColor?: string;
    mode?: 'OFFICIAL_STAMP' | 'UPLOAD_IMAGE';
  } = {}) => {
    try {
      const cfg = {
        name: overrides.name !== undefined ? overrides.name : customName,
        position: overrides.position !== undefined ? overrides.position : customPosition,
        area: overrides.area !== undefined ? overrides.area : customArea,
        penColor: overrides.penColor !== undefined ? overrides.penColor : penColor,
        mode: overrides.mode !== undefined ? overrides.mode : mode,
      };
      localStorage.setItem(storageKey, JSON.stringify(cfg));
    } catch (e) {
      console.warn('Error guardando configuración de firma en localStorage:', e);
    }
  };

  // Genera automáticamente el Sello Digital Institucional Oficial en Canvas
  const generateOfficialStamp = (
    colorToUse?: string,
    stampTextOverride?: string | null,
    nameToUse?: string,
    positionToUse?: string,
    areaToUse?: string
  ) => {
    const activeColor = colorToUse || penColor;
    const activeStampText = stampTextOverride !== undefined ? stampTextOverride : stampText;
    const activeName = (nameToUse !== undefined ? nameToUse : customName) || 'RESPONSABLE DE ÁREA';
    const activePosition = (positionToUse !== undefined ? positionToUse : customPosition) || 'TITULAR DE DESPACHO';
    const activeArea = (areaToUse !== undefined ? areaToUse : customArea) || 'CLUB HÍPICO LOS SARGENTOS';

    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 165;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo limpio transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Borde doble notarial institucional con el color seleccionado
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Cabecera Institucional
    ctx.fillStyle = activeColor;
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLUB HÍPICO LOS SARGENTOS', canvas.width / 2, 27);

    ctx.font = 'italic bold 9.5px Arial, sans-serif';
    const headerSub = activeStampText
      ? `SELLO: ${activeStampText.toUpperCase()}`
      : 'VALIDACIÓN Y REGISTRO DIGITAL DE PROVEÍDO';
    ctx.fillText(headerSub, canvas.width / 2, 42);

    // Línea separadora
    ctx.beginPath();
    ctx.moveTo(30, 48);
    ctx.lineTo(canvas.width - 30, 48);
    ctx.stroke();

    // 1. Nombre del Funcionario / Firmante individual
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText(activeName.toUpperCase(), canvas.width / 2, 68);

    // 2. Cargo Oficial específico del funcionario
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText(activePosition.toUpperCase(), canvas.width / 2, 85);

    // 3. Área / Despacho
    ctx.font = '9px Arial, sans-serif';
    ctx.fillText(`ÁREA: ${activeArea.toUpperCase()}`, canvas.width / 2, 101);

    // Fecha, hora y hash criptográfico
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-BO');
    const timeStr = now.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const hash = `CHLS-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    ctx.font = 'bold 8.5px monospace';
    ctx.fillText(`FECHA: ${dateStr} ${timeStr}  |  TOKEN: ${hash}`, canvas.width / 2, 124);

    // Sello de seguridad inferior
    ctx.font = 'bold 8px Arial, sans-serif';
    ctx.fillText('🔒 FIRMA ELECTRÓNICA Y SELLO CERTIFICADO CHLS', canvas.width / 2, 143);

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewUrl(dataUrl);
    onSignatureChange(dataUrl);
  };

  const handleColorChange = (newColor: string) => {
    setPenColor(newColor);
    saveConfig({ penColor: newColor });
    if (mode === 'OFFICIAL_STAMP') {
      generateOfficialStamp(newColor, stampText);
    }
  };

  useEffect(() => {
    if (mode === 'OFFICIAL_STAMP') {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        if (initialSignature) return;
      }
      generateOfficialStamp(penColor, stampText, customName, customPosition, customArea);
    }
  }, [mode, penColor, customName, customPosition, customArea, stampText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreviewUrl(dataUrl);
        onSignatureChange(dataUrl);
        try {
          localStorage.setItem(imageStorageKey, dataUrl);
          saveConfig({ mode: 'UPLOAD_IMAGE' });
        } catch {}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetToSystem = () => {
    setCustomName(signerName);
    setCustomPosition(signerPosition || '');
    setCustomArea(signerArea);
    saveConfig({
      name: signerName,
      position: signerPosition || '',
      area: signerArea,
    });
    generateOfficialStamp(penColor, stampText, signerName, signerPosition || '', signerArea);
    setIsEditingInfo(false);
  };

  return (
    <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
      {/* Header Bar: Titulo 7, Modos & Paleta */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            7. Firma Digital & Sello Personalizado
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de modo */}
          <div className="flex items-center bg-slate-200/80 dark:bg-white/10 p-0.5 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('OFFICIAL_STAMP');
                saveConfig({ mode: 'OFFICIAL_STAMP' });
                generateOfficialStamp(penColor, stampText, customName, customPosition, customArea);
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
                setMode('UPLOAD_IMAGE');
                saveConfig({ mode: 'UPLOAD_IMAGE' });
                if (savedImage) {
                  setPreviewUrl(savedImage);
                  onSignatureChange(savedImage);
                } else {
                  setPreviewUrl(null);
                  onSignatureChange(null);
                }
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === 'UPLOAD_IMAGE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Subir Sello Personal</span>
            </button>
          </div>

          {/* Selector de Tinta Notarial */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">Tinta:</span>
            <div className="flex items-center gap-1.5">
              {[
                { color: '#1e3a8a', label: 'Azul Notarial' },
                { color: '#064e3b', label: 'Verde CHLS' },
                { color: '#0f172a', label: 'Negro Formal' },
                { color: '#b91c1c', label: 'Rojo Urgente' },
                { color: '#581c87', label: 'Púrpura Notarial' },
              ].map((c) => {
                const isSelected = penColor === c.color;
                return (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => handleColorChange(c.color)}
                    title={`${c.label} (${c.color})`}
                    className={`relative w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'scale-125 border-[#C5A059] shadow-md ring-2 ring-emerald-500/50'
                        : 'border-transparent opacity-70 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white drop-shadow-md" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-barra informativa de identidad del usuario */}
      <div className="flex items-center justify-between bg-white dark:bg-black/30 px-3 py-1.5 rounded-xl text-[11px] border border-slate-200/80 dark:border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            {customName || 'Sin nombre asignado'}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-[#C5A059]" />
            {customPosition || 'Sin cargo definido'}
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-slate-500 text-[10px] flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-400" />
            {customArea}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsEditingInfo(!isEditingInfo)}
          className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
        >
          <Edit2 className="w-3 h-3" />
          <span>{isEditingInfo ? 'Cerrar Edición' : 'Editar Nombre / Cargo'}</span>
        </button>
      </div>

      {/* Formulario desplegable para ajustar nombre y cargo específico */}
      {isEditingInfo && (
        <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nombre y Título del Firmante:
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomName(val);
                  saveConfig({ name: val });
                  generateOfficialStamp(penColor, stampText, val, customPosition, customArea);
                }}
                placeholder="Ej: Lic. Monica Iñiguez Duran"
                className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-black/60 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cargo Oficial del Firmante:
              </label>
              <input
                type="text"
                value={customPosition}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomPosition(val);
                  saveConfig({ position: val });
                  generateOfficialStamp(penColor, stampText, customName, val, customArea);
                }}
                placeholder="Ej: Secretaria de Gerencia General"
                className="w-full text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-black/60 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-slate-500 italic">
              ℹ️ Tu nombre y cargo se guardan automáticamente de forma independiente para tu usuario.
            </span>
            <button
              type="button"
              onClick={handleResetToSystem}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer datos del sistema</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area - Formato Horizontal Ejecutivo */}
      {mode === 'OFFICIAL_STAMP' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2.5 px-4">
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Sello digital individualizado para este usuario</span>
          </div>

          {previewUrl && (
            <div className="flex justify-center py-1">
              <img src={previewUrl} alt="Sello Oficial CHLS" className="h-16 sm:h-20 object-contain drop-shadow-sm" />
            </div>
          )}

          <button
            type="button"
            onClick={() => generateOfficialStamp(penColor, stampText, customName, customPosition, customArea)}
            className="text-xs text-[#C5A059] hover:underline font-bold cursor-pointer shrink-0"
          >
            🔄 Regenerar Token
          </button>
        </div>
      )}

      {mode === 'UPLOAD_IMAGE' && (
        <div className="bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3">
          {previewUrl ? (
            <div className="flex items-center justify-between gap-4">
              <img src={previewUrl} alt="Sello Personal Subido" className="h-16 object-contain" />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  onSignatureChange(null);
                  try {
                    localStorage.removeItem(imageStorageKey);
                  } catch {}
                }}
                className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
              >
                Eliminar y subir otra imagen
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <UploadCloud className="w-5 h-5 text-[#C5A059]" />
              <span>Subir imagen o escaneo de tu sello personal (PNG, JPG o WEBP)</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default DigitalSignaturePad;
