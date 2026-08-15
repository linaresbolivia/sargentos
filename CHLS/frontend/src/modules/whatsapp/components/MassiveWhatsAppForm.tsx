import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  const [fileName, setFileName] = useState<string | null>(null);
  
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setError('El archivo no contiene hojas de cálculo.');
        return;
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        setError('El archivo está vacío o no contiene filas de datos.');
        setContacts([]);
        return;
      }

      // Helper to find column matching any candidate keywords
      const findField = (row: any, candidates: string[]) => {
        const keys = Object.keys(row);
        for (const candidate of candidates) {
          const matchingKey = keys.find(k => {
            const norm = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            return norm === candidate || norm.includes(candidate);
          });
          if (matchingKey && row[matchingKey] !== undefined && String(row[matchingKey]).trim() !== '') {
            return String(row[matchingKey]).trim();
          }
        }
        return '';
      };

      const parsed: Contact[] = rawRows.map((row: any) => {
        const codigo = findField(row, ['codigo', 'cod', 'socio', 'nro', 'num', 'id', 'numerosocio', 'nrosocio', 'codsocio', 'accion']);
        const nombre = findField(row, ['nombre', 'name', 'socio', 'titular', 'cliente', 'completo', 'nombres', 'fullname', 'persona']) || 'Socio';
        let telefono = findField(row, ['telefono', 'celular', 'phone', 'telf', 'tel', 'movil', 'cel', 'contacto', 'whatsapp', 'numero', 'telfs', 'telefonos']);

        // Format clean phone number
        telefono = telefono.replace(/\s+/g, '').replace(/[-()]/g, '');

        return {
          codigo,
          nombre,
          telefono
        };
      }).filter(c => c.telefono && c.telefono.length >= 7);

      if (parsed.length === 0) {
        setError('No se encontraron registros válidos con número de teléfono. Asegúrate de que el Excel contenga una columna "telefono" o "celular".');
        setContacts([]);
      } else {
        setContacts(parsed);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error al procesar archivo:', err);
      setError(`Error al leer el archivo Excel/CSV: ${err?.message || 'Formato no soportado'}`);
      setContacts([]);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      <div className="bg-white dark:bg-[#07170e]/80 border border-gray-200 dark:border-glass-border rounded-2xl p-6 shadow-lg dark:shadow-glass flex flex-col backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-brand-gold-dark dark:text-brand-gold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Listado de Socios (Excel / CSV)
          </h3>
          {fileName && (
            <span className="text-xs font-mono bg-brand-gold/10 text-brand-gold-dark dark:text-brand-gold px-2.5 py-1 rounded-full border border-brand-gold/30 truncate max-w-[180px]">
              📁 {fileName}
            </span>
          )}
        </div>
        
        <div className="mb-6">
          <input
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 dark:border-glass-border rounded-xl p-8 text-center bg-gray-50/70 hover:bg-gray-100/90 dark:bg-black/20 dark:hover:bg-white/5 transition-all group cursor-pointer"
          >
            <Upload className="w-10 h-10 text-brand-gold-dark dark:text-brand-gold mx-auto mb-3 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            <p className="text-gray-900 dark:text-white font-semibold">Sube tu archivo Excel (.xlsx / .xls) o CSV</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detecta automáticamente columnas como "nombre", "telefono", "celular" y "codigo"
            </p>
          </button>
        </div>

        {error && contacts.length === 0 && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-200/80 dark:border-white/5 rounded-xl p-4 overflow-y-auto max-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Contactos cargados</h4>
            <span className="text-sm bg-brand-gold/20 text-brand-gold-dark dark:text-brand-gold px-2.5 py-1 rounded-md font-bold">
              {contacts.length}
            </span>
          </div>
          
          {contacts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm italic py-8">
              Aún no hay contactos cargados.
            </div>
          ) : (
            <ul className="space-y-2">
              {contacts.slice(0, 50).map((c, i) => (
                <li key={i} className="flex justify-between items-center bg-white dark:bg-white/5 border border-gray-200/60 dark:border-transparent px-3 py-2 rounded-lg text-sm shadow-sm dark:shadow-none">
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    {c.codigo && <span className="text-brand-gold-dark dark:text-brand-gold mr-2 text-xs font-mono font-bold">[{c.codigo}]</span>}
                    {c.nombre}
                  </span>
                  <span className="text-brand-green dark:text-brand-gold font-mono font-semibold">{c.telefono}</span>
                </li>
              ))}
              {contacts.length > 50 && (
                <li className="text-center text-gray-500 dark:text-gray-400 text-xs pt-2">
                  ... y {contacts.length - 50} más
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Right Column: Message Crafting */}
      <div className="bg-white dark:bg-[#07170e]/80 border border-gray-200 dark:border-glass-border rounded-2xl p-6 shadow-lg dark:shadow-glass backdrop-blur-md">
        <h3 className="text-xl font-bold text-brand-gold-dark dark:text-brand-gold mb-6 flex items-center gap-2">
          <Send className="w-5 h-5" />
          Redactar Mensaje
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Imagen (Opcional)</label>
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
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white px-4 py-2 rounded-lg transition-colors border border-gray-300 dark:border-glass-border font-medium text-sm"
              >
                <ImageIcon className="w-4 h-4" />
                {image ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
              </button>
              {image && <span className="text-sm font-medium text-brand-gold-dark dark:text-brand-gold truncate max-w-[200px]">{image.name}</span>}
              {image && (
                <button type="button" onClick={() => setImage(null)} className="text-red-500 hover:text-red-600 dark:text-red-400 text-sm font-medium hover:underline">
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Mensaje</label>
            <textarea
              className="w-full bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-glass-border rounded-xl p-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-black/50 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all resize-none"
              rows={6}
              placeholder="Hola {nombre}, este es un mensaje importante..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Usa <code className="text-brand-gold-dark dark:text-brand-gold bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 px-1 py-0.5 rounded font-mono font-medium">{`{nombre}`}</code> y <code className="text-brand-gold-dark dark:text-brand-gold bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 px-1 py-0.5 rounded font-mono font-medium">{`{codigo}`}</code> para insertar datos del socio.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Enlace (Opcional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="url"
                className="w-full bg-gray-50 dark:bg-black/30 border border-gray-300 dark:border-glass-border rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-black/50 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all"
                placeholder="https://ejemplo.com"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">Este enlace se adjuntará automáticamente al final del mensaje.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-500/10 border border-green-500/30 text-emerald-700 dark:text-green-400 px-4 py-3 rounded-xl flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                Envío Finalizado
              </div>
              <p>Exitosos: {result.success}</p>
              <p className={result.fail > 0 ? 'text-red-500 dark:text-red-400' : ''}>Fallidos: {result.fail}</p>
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
