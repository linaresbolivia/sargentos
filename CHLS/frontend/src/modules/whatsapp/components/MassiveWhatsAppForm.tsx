import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Send, Image as ImageIcon, Link, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../../config/api';
import qrPagosUrl from '../../../assets/qr-pagos.jpg';

const DEFAULT_TEXT = `🐴 Club Hípico Los Sargentos

Estimado(a) Socio(a):
👤 {nombre}

📋 Le recordamos que actualmente registra saldos pendientes correspondientes a conceptos como: cuota social, título, manutención, veterinaria y/o escuelas.

🏇 Para mantener sus beneficios y servicios activos, le invitamos a realizar la regularización de su cuenta a la brevedad, mediante nuestros canales de pago habituales:

📲 QR del Club: Encontrará el código QR en la imagen adjunta.
📌 (Si realiza el pago por QR, no olvide registrar en "Motivo" su número de socio: {codigo})
🔄 Débitos automáticos.
🏦 Cuentas bancarias habilitadas: Banco Sol, BMSC, Banco BISA y BNB.

✅ Si ya realizó el pago, por favor omita este mensaje.
🧾 Si requiere la emisión de su factura, envíenos el comprobante de pago al canal de Atención al Socio indicado abajo.

⚠️ IMPORTANTE: Este es un mensaje automatizado y no debe ser respondido directamente.

💬 Para consultas, envío de comprobantes o asistencia, comuníquese con Atención al Socio mediante el siguiente enlace:`;

const DEFAULT_LINK = 'https://api.whatsapp.com/send?phone=59176753741';

interface Contact {
  codigo?: string;
  nombre: string;
  telefono: string;
}

export default function MassiveWhatsAppForm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [link, setLink] = useState(DEFAULT_LINK);
  const [image, setImage] = useState<File | null>(null);
  
  const loadDefaultImage = () => {
    fetch(qrPagosUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'qr-pagos.jpg', { type: 'image/jpeg' });
        setImage(file);
      })
      .catch(err => console.error('Error loading default QR image', err));
  };

  useEffect(() => {
    loadDefaultImage();
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; fail: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((row: any) => ({
          codigo: row.codigo || row.Codigo || row.code || row.Code || '',
          nombre: row.nombre || row.Nombre || row.name || row.Name || 'Socio',
          telefono: row.telefono || row.Telefono || row.phone || row.Phone || ''
        })).filter(c => c.telefono);
        setContacts(parsed);
      },
      error: (err) => {
        setError(`Error procesando CSV: ${err.message}`);
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contacts.length === 0) {
      setError('Por favor carga un archivo con contactos.');
      return;
    }
    if (!text.trim()) {
      setError('El texto del mensaje no puede estar vacío.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('contacts', JSON.stringify(contacts));
      formData.append('text', text);
      if (link) formData.append('link', link);
      if (image) formData.append('image', image);

      const res = await api.post('/whatsapp/send-bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        setResult({
          success: res.data.data.successCount,
          fail: res.data.data.failCount
        });
        // Reset form except contacts if they want to send another message
        setText(DEFAULT_TEXT);
        setLink(DEFAULT_LINK);
        loadDefaultImage();
      } else {
        setError(res.data.message || 'Error desconocido.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: List Upload */}
      <div className="bg-glass-bg border border-glass-border rounded-2xl p-6 shadow-glass flex flex-col">
        <h3 className="text-xl font-bold text-brand-gold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Listado de Socios (CSV)
        </h3>
        
        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-glass-border rounded-xl p-8 text-center hover:bg-white/5 transition-colors group cursor-pointer"
          >
            <Upload className="w-10 h-10 text-brand-gold mx-auto mb-3 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            <p className="text-brand-green dark:text-white font-medium">Sube tu archivo CSV</p>
            <p className="text-sm theme-text-muted mt-1">Puede contener columnas "codigo", "nombre" y "telefono"</p>
          </button>
        </div>

        <div className="flex-1 bg-black/20 rounded-xl p-4 overflow-y-auto max-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-300">Contactos cargados</h4>
            <span className="text-sm bg-brand-gold/20 text-brand-gold px-2 py-1 rounded-md font-bold">
              {contacts.length}
            </span>
          </div>
          
          {contacts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm italic py-8">
              Aún no hay contactos cargados.
            </div>
          ) : (
            <ul className="space-y-2">
              {contacts.slice(0, 50).map((c, i) => (
                <li key={i} className="flex justify-between bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg text-sm">
                  <span className="theme-text font-medium">
                    {c.codigo && <span className="text-brand-gold mr-2 text-xs">[{c.codigo}]</span>}
                    {c.nombre}
                  </span>
                  <span className="text-brand-green dark:text-brand-gold font-mono">{c.telefono}</span>
                </li>
              ))}
              {contacts.length > 50 && (
                <li className="text-center text-gray-500 text-xs pt-2">
                  ... y {contacts.length - 50} más
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Right Column: Message Crafting */}
      <div className="bg-glass-bg border border-glass-border rounded-2xl p-6 shadow-glass">
        <h3 className="text-xl font-bold text-brand-gold mb-6 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Redactar Mensaje
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium theme-text-muted dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] mb-2">Imagen (Opcional)</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={imageInputRef}
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex items-center gap-2 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 theme-title px-4 py-2 rounded-lg transition-colors border border-glass-border"
              >
                <ImageIcon className="w-4 h-4" />
                {image ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
              </button>
              {image && <span className="text-sm text-brand-gold truncate max-w-[200px]">{image.name}</span>}
              {image && (
                <button type="button" onClick={() => setImage(null)} className="text-red-400 text-sm hover:underline">
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-muted dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] mb-2">Mensaje</label>
            <textarea
              className="w-full glass-input resize-none text-brand-green dark:text-white"
              rows={5}
              placeholder="Hola {nombre}, este es un mensaje importante..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <p className="text-xs theme-text-muted mt-1">Usa <code className="text-brand-green dark:text-brand-gold bg-black/5 dark:bg-black/30 px-1 py-0.5 rounded">{`{nombre}`}</code> y <code className="text-brand-green dark:text-brand-gold bg-black/5 dark:bg-black/30 px-1 py-0.5 rounded">{`{codigo}`}</code> para insertar datos del socio.</p>
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-muted dark:text-white dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] mb-2">Enlace (Opcional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="w-4 h-4 text-gray-500" />
              </div>
              <input
                type="url"
                className="w-full glass-input pl-10 pr-4 py-3 text-brand-green dark:text-white"
                placeholder="https://ejemplo.com"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <p className="text-xs theme-text-muted mt-2">Este enlace se adjuntará automáticamente al final del mensaje.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                Envío Finalizado
              </div>
              <p>Exitosos: {result.success}</p>
              <p className={result.fail > 0 ? 'text-red-400' : ''}>Fallidos: {result.fail}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || contacts.length === 0 || !text.trim()}
            className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold py-4 rounded-xl transition-all shadow-goldGlow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-brand-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando Mensajes...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Iniciar Envío Masivo
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
