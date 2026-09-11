import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Save,
  Sliders,
  Users,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Upload,
  ArrowUp,
  ArrowDown,
  RotateCcw
} from 'lucide-react';
import { CandidateDto, ElectionStatsDto } from '../types/election.types';
import { CrestLogo } from '@shared/components/CrestLogo';
import { compressImage } from '@shared/utils/imageCompressor';

interface CandidateParametrizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  candidates: CandidateDto[];
  stats: ElectionStatsDto | null;
  onUpdated: (newStats: ElectionStatsDto) => void;
}

export const CandidateParametrizationModal: React.FC<CandidateParametrizationModalProps> = ({
  isOpen,
  onClose,
  electionId,
  candidates,
  stats,
  onUpdated,
}) => {
  // New candidate form
  const [newFullName, setNewFullName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Editing candidate state
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editOrderIndex, setEditOrderIndex] = useState<number>(1);

  // Settings state
  const [maxSelections, setMaxSelections] = useState(stats?.maxSelectionsPerBallot || 5);
  const [electionTitle, setElectionTitle] = useState(stats?.electionTitle || '');
  const [isSaving, setIsSaving] = useState(false);

  // File input refs for uploading photos from computer
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image file selection for new candidate with instant high-quality compression
  const handleNewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const toastId = toast.loading('Optimizando fotografía...');
        const { dataUrl, compressedSizeKb, originalSizeKb } = await compressImage(file, 640, 640, 0.85);
        setNewPhotoUrl(dataUrl);
        toast.dismiss(toastId);
        toast.success(`Foto optimizada (${originalSizeKb} KB → ${compressedSizeKb} KB).`);
      } catch (err) {
        toast.error('No se pudo procesar la fotografía.');
      } finally {
        e.target.value = '';
      }
    }
  };

  // Handle local image file selection for editing candidate with instant high-quality compression
  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const toastId = toast.loading('Optimizando fotografía...');
        const { dataUrl, compressedSizeKb, originalSizeKb } = await compressImage(file, 640, 640, 0.85);
        setEditPhotoUrl(dataUrl);
        toast.dismiss(toastId);
        toast.success(`Foto optimizada (${originalSizeKb} KB → ${compressedSizeKb} KB).`);
      } catch (err) {
        toast.error('No se pudo procesar la fotografía.');
      } finally {
        e.target.value = '';
      }
    }
  };

  // Start editing a candidate
  const startEdit = (cand: CandidateDto) => {
    setEditingCandidateId(cand.id);
    setEditFullName(cand.fullName);
    setEditPhotoUrl(cand.photoUrl || '');
    setEditOrderIndex(cand.orderIndex);
  };

  const cancelEdit = () => {
    setEditingCandidateId(null);
    setEditFullName('');
    setEditPhotoUrl('');
  };

  // Save edited candidate
  const handleSaveEdit = async () => {
    if (!editingCandidateId) return;
    if (!editFullName.trim()) {
      toast.error('El nombre del postulante no puede estar vacío.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await axios.post('/api/elections/candidate', {
        electionId,
        candidate: {
          id: editingCandidateId,
          fullName: editFullName.trim(),
          photoUrl: editPhotoUrl.trim() || null,
          orderIndex: Number(editOrderIndex),
        },
      });

      if (res.data.success) {
        toast.success(`Postulante "${editFullName}" actualizado.`);
        cancelEdit();
        if (res.data.data?.stats) {
          onUpdated(res.data.data.stats);
        } else {
          const statsRes = await axios.get(`/api/elections/results?electionId=${electionId}`);
          if (statsRes.data.success) onUpdated(statsRes.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar postulante.');
    } finally {
      setIsSaving(false);
    }
  };

  // Add new candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      toast.error('Ingresa el nombre completo del postulante.');
      return;
    }
    if (candidates.length >= 15) {
      toast.error('Límite alcanzado: el sistema admite hasta 15 postulantes.');
      return;
    }

    try {
      setIsSaving(true);
      const res = await axios.post('/api/elections/candidate', {
        electionId,
        candidate: {
          fullName: newFullName.trim(),
          photoUrl: newPhotoUrl.trim() || null,
          orderIndex: candidates.length + 1,
        },
      });

      if (res.data.success) {
        toast.success(`Postulante "${newFullName}" agregado.`);
        setNewFullName('');
        setNewPhotoUrl('');
        if (res.data.data?.stats) {
          onUpdated(res.data.data.stats);
        } else {
          const statsRes = await axios.get(`/api/elections/results?electionId=${electionId}`);
          if (statsRes.data.success) onUpdated(statsRes.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al agregar postulante.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete candidate
  const handleDeleteCandidate = async (candidateId: string, fullName: string) => {
    const confirmDelete = window.confirm(`¿Deseas eliminar a "${fullName}" de la papeleta?`);
    if (!confirmDelete) return;

    try {
      setIsSaving(true);
      const res = await axios.delete(`/api/elections/candidate/${candidateId}`);
      if (res.data.success) {
        toast.success(`Postulante eliminado.`);
        if (editingCandidateId === candidateId) cancelEdit();
        if (res.data.stats) {
          onUpdated(res.data.stats);
        } else {
          const statsRes = await axios.get(`/api/elections/results?electionId=${electionId}`);
          if (statsRes.data.success) onUpdated(statsRes.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar postulante.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save general settings
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      const res = await axios.post('/api/elections/settings', {
        electionId,
        settings: {
          title: electionTitle,
          maxSelectionsPerBallot: Number(maxSelections),
        },
      });

      if (res.data.success) {
        toast.success('Parámetros guardados correctamente.');
        onUpdated(res.data.data.stats);
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar configuración.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border-2 border-brand-gold/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#06150d] via-[#0a2c1b] to-[#040f09] border-b border-brand-gold/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CrestLogo size="sm" className="w-10 h-12 shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold block">
                COMITÉ ELECTORAL • CHLS 360°
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
                Parametrización de Elección & Postulantes
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-gray-200">
          {/* General Election Settings */}
          <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-brand-gold flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>Reglas de la Boleta y Convocatoria</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-300 block mb-1 font-semibold">
                  Título de la Elección
                </label>
                <input
                  type="text"
                  value={electionTitle}
                  onChange={(e) => setElectionTitle(e.target.value)}
                  placeholder="Elecciones Ordinarias de Directorio 2026 - 2028"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 block mb-1 font-semibold">
                  Máximo de Postulantes a Marcar por Boleta
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-brand-gold outline-none"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Permite validar que el socio no marque más de {maxSelections} postulantes simultáneamente.
                </span>
              </div>
            </div>
          </div>

          {/* Form to Add a New Candidate (up to 15) */}
          <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Agregar Nuevo Postulante ({candidates.length} / 15)</span>
              </h3>
              <span className="text-xs text-gray-400">Capacidad parametrizada: hasta 15</span>
            </div>

            <form onSubmit={handleAddCandidate} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Nombre y Apellidos completos"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-emerald-400 outline-none"
                />
              </div>

              <div className="sm:col-span-5 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="URL o sube foto desde tu equipo"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-sm focus:border-emerald-400 outline-none"
                />
                <input
                  type="file"
                  ref={newFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewFileChange}
                />
                <button
                  type="button"
                  onClick={() => newFileInputRef.current?.click()}
                  title="Seleccionar foto desde la computadora"
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white border border-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-xs hidden md:inline">Foto</span>
                </button>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving || candidates.length >= 15}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Registered Candidates with INLINE EDITING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">
                Postulantes Registrados en la Papeleta ({candidates.length})
              </h3>
              <span className="text-xs text-brand-gold">
                Haz clic en el botón ✏️ para editar cualquier nombre, foto u orden
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {candidates.map((cand) => {
                const isEditing = editingCandidateId === cand.id;

                if (isEditing) {
                  return (
                    <div
                      key={cand.id}
                      className="p-4 bg-gradient-to-br from-[#0c2417] to-slate-900 rounded-2xl border-2 border-brand-gold shadow-2xl space-y-3 animate-in zoom-in-95 duration-150"
                    >
                      <div className="flex items-center justify-between border-b border-brand-gold/30 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-brand-gold flex items-center gap-1">
                          <Edit2 className="w-3.5 h-3.5" />
                          Editando Postulante #{cand.orderIndex}
                        </span>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Editing fields */}
                      <div className="flex items-start gap-4">
                        {/* Preview and photo changer */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="w-16 h-20 bg-slate-950 rounded-xl overflow-hidden border-2 border-brand-gold shadow-md relative">
                            {editPhotoUrl ? (
                              <img
                                src={editPhotoUrl}
                                alt="Vista previa"
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-white/30 text-[9px] p-1">
                                <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
                                <span>Sin Foto</span>
                              </div>
                            )}
                          </div>

                          <input
                            type="file"
                            ref={editFileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleEditFileChange}
                          />
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            Cambiar Foto
                          </button>
                        </div>

                        {/* Text inputs */}
                        <div className="flex-1 space-y-2.5">
                          <div>
                            <label className="text-[11px] text-gray-300 block font-bold mb-0.5">
                              Nombre y Apellidos
                            </label>
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-brand-gold/50 text-white text-xs font-black focus:border-brand-gold outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-gray-300 block font-bold mb-0.5">
                                N° de Orden
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={15}
                                value={editOrderIndex}
                                onChange={(e) => setEditOrderIndex(Number(e.target.value))}
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/20 text-white text-xs font-bold outline-none"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] text-gray-300 block font-bold mb-0.5">
                                URL Fotografía
                              </label>
                              <input
                                type="text"
                                placeholder="/elections/foto.jpg"
                                value={editPhotoUrl}
                                onChange={(e) => setEditPhotoUrl(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/20 text-white text-xs outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // Normal candidate card view with Edit & Delete buttons
                return (
                  <div
                    key={cand.id}
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-800 rounded-2xl border border-white/10 hover:border-brand-gold/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-16 bg-slate-900 rounded-xl overflow-hidden border-2 border-[#c5a059] shrink-0 shadow-md">
                        {cand.photoUrl ? (
                          <img
                            src={cand.photoUrl}
                            alt={cand.fullName}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-white/30 font-bold p-1 text-center">
                            <CrestLogo size="sm" className="w-6 h-6 opacity-30 mb-0.5" />
                            <span className="text-[9px]">#{cand.orderIndex}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-brand-gold font-mono font-bold uppercase tracking-wider bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                            Postulante #{cand.orderIndex}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors mt-0.5">
                          {cand.fullName}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                          <span className="text-emerald-400 font-mono font-bold">
                            {cand.votesCount} votos
                          </span>
                          <span>•</span>
                          <span className="text-white font-mono font-bold">
                            {cand.votesPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* EDIT BUTTON */}
                      <button
                        onClick={() => startEdit(cand)}
                        title="Editar nombre, foto u orden"
                        className="flex items-center gap-1 px-3 py-2 bg-brand-gold/15 hover:bg-brand-gold text-brand-gold hover:text-black border border-brand-gold/30 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {/* DELETE BUTTON */}
                      <button
                        onClick={() => handleDeleteCandidate(cand.id, cand.fullName)}
                        title="Eliminar de la papeleta"
                        className="p-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold uppercase cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-black rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-gold/20 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Parámetros</span>
          </button>
        </div>
      </div>
    </div>
  );
};
