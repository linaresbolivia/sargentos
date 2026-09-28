import React, { useState } from 'react';
import { 
  X, 
  DollarSign, 
  Calculator, 
  Download, 
  Share2, 
  FileText, 
  CheckCircle, 
  Sparkles,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import CrestLogo from '@shared/components/CrestLogo';
import toast from 'react-hot-toast';

interface QuoteSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLeadName?: string;
}

export const QuoteSimulatorModal: React.FC<QuoteSimulatorModalProps> = ({
  isOpen,
  onClose,
  initialLeadName = '',
}) => {
  const [prospectName, setProspectName] = useState(initialLeadName);
  const [category, setCategory] = useState<'FAM' | 'IND' | 'JMA' | 'DEP' | 'PRE'>('FAM');
  const [totalAmount, setTotalAmount] = useState<number>(69600); // 10,000 USD in BOB
  const [downPayment, setDownPayment] = useState<number>(15000);
  const [monthsTerm, setMonthsTerm] = useState<number>(60);
  const [paymentMode, setPaymentMode] = useState<'CREDITO' | 'CONTADO'>('CREDITO');

  if (!isOpen) return null;

  // 60/40 Split Calculations
  const incomeFeeAmount = Number((totalAmount * 0.60).toFixed(2)); // 60% Facturado
  const cdpAmount = Number((totalAmount * 0.40).toFixed(2));       // 40% Recibo Oficial
  const financedAmount = Math.max(0, totalAmount - downPayment);
  const effectiveTerm = paymentMode === 'CONTADO' ? 1 : monthsTerm;
  const monthlyInstallment = paymentMode === 'CONTADO' ? financedAmount : Math.round(financedAmount / (monthsTerm || 60));
  const monthlySocialFee = category === 'DEP' ? 400 : 880;

  // Generate formal luxury quotation PDF
  const handleDownloadPdf = () => {
    try {
      toast.loading('Generando cotización formal personalizada...', { id: 'quote-pdf' });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background accent
      pdf.setFillColor(250, 249, 245);
      pdf.rect(0, 0, 210, 297, 'F');

      // Top Gold Bar
      pdf.setFillColor(212, 175, 55);
      pdf.rect(0, 0, 210, 8, 'F');

      // Title & Header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(20, 30, 25);
      pdf.text('CLUB HÍPICO LOS SARGENTOS', 20, 25);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 100, 40);
      pdf.text('PROPUESTA ECONÓMICA DE ADMISIÓN & MEMBRESÍA 2026', 20, 32);

      // Date & Code
      const today = new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Fecha: ${today}`, 145, 25);
      pdf.text(`Ref: COT-CHLS-${Math.floor(1000 + Math.random() * 9000)}`, 145, 30);

      // Separator
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.line(20, 38, 190, 38);

      // Prospect Details Box
      pdf.setFillColor(240, 238, 230);
      pdf.roundedRect(20, 43, 170, 22, 3, 3, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(20, 20, 20);
      pdf.text(`Postulante Titular: ${prospectName || 'Socio Propietario Selecto'}`, 25, 52);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Categoría Postulada: ${category === 'FAM' ? 'Socio Familiar (FAM)' : category === 'IND' ? 'Socio Individual (IND)' : category === 'JMA' ? 'Junior Mayor (JMA)' : 'Socio Deportivo (DEP)'}`, 25, 60);

      // Financial Breakdown Section
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(150, 110, 20);
      pdf.text('DESGLOSE ESTRUCTURAL DE ADQUISICIÓN (60/40 CDP)', 20, 78);

      // Table Box
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(20, 83, 170, 95, 3, 3, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(20, 83, 170, 95);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(40, 40, 40);

      pdf.text('Valor Total de Membresía:', 25, 95);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Bs ${totalAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 140, 95);

      pdf.setFont('helvetica', 'normal');
      pdf.text('• 60% Derecho de Ingreso (Sujeto a Factura Ley):', 30, 105);
      pdf.text(`Bs ${incomeFeeAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 140, 105);

      pdf.text('• 40% Cuota de Participación Patrimonial CDP (Recibo Oficial):', 30, 115);
      pdf.text(`Bs ${cdpAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 140, 115);

      pdf.line(25, 122, 185, 122);

      pdf.text('Cuota Inicial Abonada al Ingreso:', 25, 132);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(20, 100, 60);
      pdf.text(`Bs ${downPayment.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 140, 132);

      pdf.setTextColor(40, 40, 40);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Saldo Financiado a ${effectiveTerm} meses:`, 25, 142);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Bs ${financedAmount.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 140, 142);

      pdf.text('Cuota Fija Mensual de Adquisición:', 25, 155);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(180, 120, 20);
      pdf.text(`Bs ${monthlyInstallment.toLocaleString('es-BO')} / mes`, 140, 155);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`+ Cuota Social de Mantenimiento: Bs ${monthlySocialFee}.00 / mes`, 25, 168);

      // Benefits Highlights
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(20, 30, 25);
      pdf.text('PRIVILEGIOS & DERECHOS DE MEMBRESÍA', 20, 192);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(60, 60, 60);
      const benefits = [
        '• Acceso irrestricto a Picaderos, Canchas de Tenis, Pádel, Frontón y Gimnasio.',
        '• Uso libre de la Piscina Semiolímpica Climatizada (30°C), Jacuzzi (41°C) y Complejo de Saunas.',
        '• Inclusión de cónyuge e hijos menores de 25 años como beneficiarios directos.',
        '• Tarifas preferenciales en Escuelas Deportivas y alquiler de Salones de Convenciones.',
        '• Título de Copropiedad Patrimonial (CDP) con derecho a voz y voto en Asambleas.',
      ];
      benefits.forEach((b, idx) => {
        pdf.text(b, 20, 202 + idx * 7);
      });

      // Signature & Footer
      pdf.line(20, 255, 80, 255);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Eduardo (Ventas & Admisiones)', 20, 260);
      pdf.text('Club Hípico Los Sargentos', 20, 264);

      pdf.line(130, 255, 190, 255);
      pdf.text('Firma de Conformidad del Postulante', 130, 260);
      pdf.text(`CI: ${prospectName || ''}`, 130, 264);

      pdf.save(`Cotizacion_Membresia_${(prospectName || 'Prospecto').replace(/\s+/g, '_')}.pdf`);
      toast.success('¡Cotización oficial en PDF descargada con éxito!', { id: 'quote-pdf' });
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF de cotización', { id: 'quote-pdf' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/40 rounded-3xl p-6 shadow-2xl space-y-6 text-gray-900 dark:text-white my-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-gold/20 text-brand-gold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold serif-brand text-gray-900 dark:text-white">
                Cotizador Financiero de Membresía (60/40 CDP)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Simula planes de pago con desglose legal estatutario y exporta en PDF
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Nombre del Prospecto</label>
              <input
                type="text"
                placeholder="Ej: Lic. Marcelo Gutiérrez"
                value={prospectName}
                onChange={(e) => setProspectName(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Categoría de Membresía</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs font-semibold outline-none"
              >
                <option value="FAM">Socio Familiar (FAM) - Cuota Social Bs 880</option>
                <option value="IND">Socio Individual (IND) - Cuota Social Bs 880</option>
                <option value="JMA">Socio Junior Mayor (JMA) - Cuota Social Bs 880</option>
                <option value="DEP">Socio Deportivo (DEP) - Cuota Social Bs 400</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Valor Total Membresía (Bs)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Cuota Inicial (Bs)</label>
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-amber-700 dark:text-brand-gold text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Modalidad</label>
              <select
                value={paymentMode}
                onChange={(e: any) => setPaymentMode(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none font-semibold"
              >
                <option value="CREDITO">Venta a Crédito</option>
                <option value="CONTADO">Venta al Contado</option>
              </select>
            </div>
          </div>

          {paymentMode === 'CREDITO' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold text-[10px]">
                  Plazo de Financiamiento: <strong className="text-brand-gold">{monthsTerm} Meses</strong>
                </label>
                <span className="text-[10px] text-gray-500">Hasta 60 meses</span>
              </div>
              <input
                type="range"
                min={12}
                max={60}
                step={6}
                value={monthsTerm}
                onChange={(e) => setMonthsTerm(parseInt(e.target.value))}
                className="w-full accent-brand-gold h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* 60/40 Live Preview Card */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/60 border border-gray-200 dark:border-brand-gold/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold">60% Derecho Ingreso</p>
              <p className="text-sm font-black text-blue-700 dark:text-blue-300 mt-1">Bs {incomeFeeAmount.toLocaleString()}</p>
              <span className="text-[9px] text-gray-500">Sujeto a Factura</span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold">40% Cuota Patrimonial</p>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-1">Bs {cdpAmount.toLocaleString()}</p>
              <span className="text-[9px] text-gray-500">Recibo Oficial CDP</span>
            </div>

            <div className="p-2 rounded-xl bg-amber-500/10 border border-brand-gold/40">
              <p className="text-[10px] text-amber-700 dark:text-brand-gold uppercase font-bold">Cuota Fija Mensual</p>
              <p className="text-sm font-black text-amber-800 dark:text-brand-gold mt-1">Bs {monthlyInstallment.toLocaleString()}</p>
              <span className="text-[9px] text-gray-500">{effectiveTerm} cuotas</span>
            </div>

            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-bold">Cuota Social Mensual</p>
              <p className="text-sm font-black text-purple-700 dark:text-purple-300 mt-1">Bs {monthlySocialFee}</p>
              <span className="text-[9px] text-gray-500">Mantenimiento</span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold"
          >
            Cerrar
          </button>

          <button
            onClick={handleDownloadPdf}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar Propuesta en PDF
          </button>
        </div>

      </div>
    </div>
  );
};
export default QuoteSimulatorModal;
