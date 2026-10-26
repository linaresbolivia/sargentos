import React, { useState } from 'react';
import { Layers, Link2, Unlink, Eye, FileText, ChevronDown, ChevronUp, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { RouteSheetItem, FusedRouteSheetSummary } from '../types/correspondence.types';

interface FusedBundleBreakdownSectionProps {
  currentItem: RouteSheetItem;
  onSelectSheet?: (sheetId: string) => void;
  onUnlinkSheet?: (target: {
    childId: string;
    childHrCode: string;
    parentHrCode?: string;
    childReference: string;
  }) => void;
  canUnlink?: boolean;
}

export const FusedBundleBreakdownSection: React.FC<FusedBundleBreakdownSectionProps> = ({
  currentItem,
  onSelectSheet,
  onUnlinkSheet,
  canUnlink = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const isFusedParent = Boolean(
    currentItem.fusedRouteSheets && currentItem.fusedRouteSheets.length > 0
  );
  const isFusedChild = Boolean(
    currentItem.parentRouteSheetId ||
    currentItem.parentRouteSheet ||
    currentItem.currentArea?.startsWith('FUSIONADO EN') ||
    currentItem.aiSummary?.startsWith('FUSIONADO')
  );

  if (!isFusedParent && !isFusedChild) {
    return null;
  }

  // 1. Resolver los datos de la Hoja de Ruta Matriz
  const matrizData: FusedRouteSheetSummary = isFusedParent
    ? {
        id: currentItem.id,
        hrCode: currentItem.hrCode,
        reference: currentItem.reference,
        currentArea: currentItem.currentArea,
        status: currentItem.status,
        pageCount: currentItem.pageCount || 1,
        senderName: currentItem.senderName,
        senderArea: currentItem.senderArea,
        cite: currentItem.cite,
        createdAt: currentItem.createdAt,
      }
    : {
        id: currentItem.parentRouteSheet?.id || currentItem.parentRouteSheetId || '',
        hrCode: currentItem.parentRouteSheet?.hrCode || 'MATRIZ',
        reference: currentItem.parentRouteSheet?.reference || 'Expediente Principal',
        currentArea: currentItem.parentRouteSheet?.currentArea || currentItem.currentArea,
        status: currentItem.parentRouteSheet?.status || currentItem.status,
        pageCount: currentItem.parentRouteSheet?.pageCount || 1,
        senderName: currentItem.parentRouteSheet?.senderName || 'Remitente Matriz',
        senderArea: currentItem.parentRouteSheet?.senderArea,
        cite: currentItem.parentRouteSheet?.cite,
        createdAt: currentItem.parentRouteSheet?.createdAt,
      };

  // 2. Resolver la lista de Hojas de Ruta Fusionadas / Secundarias
  let fusedList: FusedRouteSheetSummary[] = [];

  if (isFusedParent) {
    fusedList = currentItem.fusedRouteSheets || [];
  } else {
    // Si estamos viendo una secundaria:
    // Si la matriz trajo sus fusedRouteSheets en el include, las usamos todas (incluyendo esta y sus hermanas)
    if (currentItem.parentRouteSheet?.fusedRouteSheets && currentItem.parentRouteSheet.fusedRouteSheets.length > 0) {
      fusedList = currentItem.parentRouteSheet.fusedRouteSheets;
    } else {
      // Fallback: al menos la secundaria actual
      fusedList = [
        {
          id: currentItem.id,
          hrCode: currentItem.hrCode,
          reference: currentItem.reference,
          currentArea: currentItem.currentArea,
          status: currentItem.status,
          pageCount: currentItem.pageCount || 1,
          senderName: currentItem.senderName,
          senderArea: currentItem.senderArea,
          cite: currentItem.cite,
          createdAt: currentItem.createdAt,
        },
      ];
    }
  }

  // Totales consolidados
  const totalFusedSheets = fusedList.length;
  const totalSheetsInBundle = 1 + totalFusedSheets;
  const matrizPages = matrizData.pageCount || 1;
  const fusedPagesSum = fusedList.reduce((acc, curr) => acc + (curr.pageCount || 1), 0);
  const totalPagesConsolidated = matrizPages + fusedPagesSum;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECIBIDO':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
      case 'DERIVADO':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'EN_PROCESO':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      case 'OBSERVADO':
        return 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
      case 'CONCLUIDO':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 via-slate-50/50 to-teal-500/10 dark:from-[#061710] dark:via-[#091f16] dark:to-[#04120c] border-2 border-emerald-500/40 dark:border-emerald-600/50 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4 animate-fadeIn transition-all">
      {/* Barra Superior del Desglose: Título, Totales y Botón de Colapsar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3.5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/25 to-emerald-500/25 text-amber-900 dark:text-amber-300 rounded-2xl border border-amber-500/40 shrink-0 shadow-sm">
            <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Desglose de Expediente Consolidado</span>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                  {totalSheetsInBundle} trámites unificados
                </span>
              </h3>
              {isFusedParent ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  👑 Viendo Hoja Matriz
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-purple-500/20 text-purple-900 dark:text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  🔗 Viendo Hoja Fusionada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-emerald-300/80 mt-0.5">
              Acumulación por conexidad: <strong>1 Matriz Principal</strong> +{' '}
              <strong>{totalFusedSheets} Trámite(s) Acumulado(s)</strong>. Total fojas:{' '}
              <strong className="text-amber-700 dark:text-amber-400 font-mono">{totalPagesConsolidated} fojas</strong>.
              Todas las derivaciones y archivo viajan en bloque sincronizado.
            </p>
          </div>
        </div>

        {/* Botón para expandir/colapsar desglose */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/80 dark:bg-black/30 hover:bg-emerald-500/10 text-slate-700 dark:text-emerald-200 border border-slate-200 dark:border-emerald-700/40 transition-colors cursor-pointer self-end sm:self-center"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 text-emerald-500" />
              <span>Ocultar Desglose</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 text-emerald-500" />
              <span>Ver Desglose Completo</span>
            </>
          )}
        </button>
      </div>

      {/* Contenido Completo del Desglose */}
      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* ======================================================== */}
          {/* 1. SECCIÓN: HOJA DE RUTA MATRIZ (Trámite Conductor) */}
          {/* ======================================================== */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <span>👑</span>
                <span>EXPEDIENTE MATRIZ (TRÁMITE PRINCIPAL / CONDUCTOR)</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                1 de {totalSheetsInBundle} trámites
              </span>
            </div>

            <div
              className={`rounded-2xl p-3.5 sm:p-4 border-2 transition-all ${
                matrizData.id === currentItem.id
                  ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                  : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 hover:border-amber-500/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Fila con Código HR, Badges y CITE */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-amber-950 dark:text-amber-200 bg-amber-500/25 px-2.5 py-0.5 rounded-lg border border-amber-500/40 tracking-wider">
                      {matrizData.hrCode}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                      MATRIZ PRINCIPAL
                    </span>
                    {matrizData.id === currentItem.id ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/30">
                        📍 Trámite en Pantalla
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-gray-400">
                        (Expediente Padre)
                      </span>
                    )}
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-gray-300">
                      CITE: {matrizData.cite || 'S/N'}
                    </span>
                    <span className="text-[10.5px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                      {matrizData.pageCount || 1} fojas
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(matrizData.status)}`}>
                      {matrizData.status}
                    </span>
                  </div>

                  {/* Asunto / Referencia */}
                  <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase leading-snug">
                    {matrizData.reference}
                  </p>

                  {/* Metadatos: Remitente, Ubicación, Fecha */}
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] text-slate-600 dark:text-gray-300 pt-0.5">
                    <span>
                      Remite:{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {matrizData.senderName}
                      </strong>
                      {matrizData.senderArea ? ` (${matrizData.senderArea})` : ''}
                    </span>
                    <span>
                      Ubicación actual:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-300">
                        {matrizData.currentArea}
                      </strong>
                    </span>
                    {matrizData.createdAt && (
                      <span className="text-slate-500 dark:text-gray-400 font-mono">
                        Ingreso: {formatDate(matrizData.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acción si no estamos viendo la matriz */}
                {matrizData.id !== currentItem.id && onSelectSheet && (
                  <button
                    type="button"
                    onClick={() => onSelectSheet(matrizData.id)}
                    className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md shadow-amber-950/20 cursor-pointer self-start sm:self-center"
                    title={`Ver expediente completo de la Hoja de Ruta Matriz ${matrizData.hrCode}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver Expediente Matriz</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. SECCIÓN: HOJAS DE RUTA FUSIONADAS / ACUMULADAS */}
          {/* ======================================================== */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>
                  HOJAS DE RUTA FUSIONADAS Y ACUMULADAS ({totalFusedSheets} ANTECEDENTES CONEXOS)
                </span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {totalFusedSheets} de {totalSheetsInBundle} trámites
              </span>
            </div>

            {fusedList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-dashed border-slate-300 dark:border-white/10 text-center text-xs text-slate-500">
                No hay Hojas de Ruta secundarias acumuladas a este expediente.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {fusedList.map((fused, index) => {
                  const isCurrentView = fused.id === currentItem.id;
                  return (
                    <div
                      key={fused.id || index}
                      className={`rounded-2xl p-3 sm:p-3.5 border-2 transition-all ${
                        isCurrentView
                          ? 'bg-purple-500/10 dark:bg-purple-950/25 border-purple-500/60 shadow-md ring-1 ring-purple-500/30'
                          : 'bg-white/80 dark:bg-black/30 border-slate-200 dark:border-white/10 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          {/* Fila con Código HR, Badges y CITE */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black text-purple-950 dark:text-purple-200 bg-purple-500/20 px-2.5 py-0.5 rounded-lg border border-purple-500/30">
                              {fused.hrCode}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-900 dark:text-teal-300 border border-teal-500/25">
                              FUSIONADA #{index + 1}
                            </span>
                            {isCurrentView && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-500/30">
                                📍 Trámite en Pantalla
                              </span>
                            )}
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-gray-300">
                              CITE: {fused.cite || 'S/N'}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                              {fused.pageCount || 1} foja(s)
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(fused.status)}`}>
                              {fused.status}
                            </span>
                          </div>

                          {/* Asunto / Referencia Desglosada */}
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-snug">
                            {fused.reference}
                          </p>

                          {/* Metadatos */}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[10.5px] text-slate-500 dark:text-gray-400">
                            <span>
                              Remite:{' '}
                              <strong className="text-slate-700 dark:text-gray-200">
                                {fused.senderName || '—'}
                              </strong>
                              {fused.senderArea ? ` (${fused.senderArea})` : ''}
                            </span>
                            <span>
                              Área:{' '}
                              <strong className="text-emerald-700 dark:text-emerald-400">
                                {fused.currentArea}
                              </strong>
                            </span>
                            {fused.createdAt && (
                              <span className="font-mono">
                                Ingreso: {formatDate(fused.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botones de Acción para esta Hoja Fusionada */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          {!isCurrentView && onSelectSheet && (
                            <button
                              type="button"
                              onClick={() => onSelectSheet(fused.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 transition-colors cursor-pointer"
                              title={`Inspeccionar trazabilidad y proveídos de ${fused.hrCode}`}
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Ver Hoja</span>
                            </button>
                          )}

                          {canUnlink && onUnlinkSheet && (
                            <button
                              type="button"
                              onClick={() =>
                                onUnlinkSheet({
                                  childId: fused.id,
                                  childHrCode: fused.hrCode,
                                  parentHrCode: matrizData.hrCode,
                                  childReference: fused.reference,
                                })
                              }
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 transition-colors cursor-pointer"
                              title={`Desvincular ${fused.hrCode} de este paquete`}
                            >
                              <Unlink className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Desvincular</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FusedBundleBreakdownSection;
