import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import {
  FileText,
  Download,
  Search,
  Pin,
  Plus,
  Edit2,
  Trash2,
  X,
  BookOpen,
  Layers,
  FileDown,
  RefreshCw,
  LayoutGrid,
  List,
  Upload,
  ChevronRight,
  FileSpreadsheet,
  FileCheck2,
  ShieldCheck,
  FileBox,
  ScrollText,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { DigitalDocument, DocumentCategoryFilter } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const MemberNewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Privilegios para administración de la biblioteca digital
  const isStaffOrAdmin = useMemo(() => {
    if (!user) return false;
    const roles = user.roles || [];
    return (
      roles.includes('ADMIN') ||
      roles.includes('SUPER_ADMIN') ||
      roles.includes('MODULO_DIRECTORIO') ||
      roles.includes('MODULO_CORRESPONDENCIA') ||
      roles.includes('MODULO_SOCIOS')
    );
  }, [user]);

  const [documents, setDocuments] = useState<DigitalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategoryFilter>('TODOS');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Modal de vista/detalle del documento
  const [inspectingDoc, setInspectingDoc] = useState<DigitalDocument | null>(null);

  // Modal de subida / edición de documento (Staff)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DigitalDocument | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  // Campos del formulario
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('ESTATUTOS');
  const [formType, setFormType] = useState('DOCUMENTO_OFICIAL');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAuthor, setFormAuthor] = useState('Secretaría General CHLS');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [formAttachmentFile, setFormAttachmentFile] = useState<File | null>(null);
  const [formCoverFile, setFormCoverFile] = useState<File | null>(null);
  const [formExistingAttachment, setFormExistingAttachment] = useState<{
    name?: string | null;
    url?: string | null;
    size?: string | null;
    type?: string | null;
  } | null>(null);

  // Cargar documentos
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/news');
      if (res.data?.success) {
        setDocuments(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching digital library:', err);
      toast.error('No se pudo cargar la biblioteca digital');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Filtrado reactivo de la biblioteca
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== 'TODOS' && doc.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesSummary = doc.summary.toLowerCase().includes(q);
        const matchesContent = doc.content.toLowerCase().includes(q);
        const matchesAttachment = doc.attachmentName?.toLowerCase().includes(q);
        const matchesAuthor = doc.authorName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesContent && !matchesAttachment && !matchesAuthor) {
          return false;
        }
      }

      return true;
    });
  }, [documents, selectedCategory, searchQuery]);

  // Documento supremo / destacado
  const featuredDoc = useMemo(() => {
    return documents.find((d) => d.isPinned && d.isPublished);
  }, [documents]);

  const regularDocs = useMemo(() => {
    if (selectedCategory === 'TODOS' && featuredDoc && !searchQuery) {
      return filteredDocs.filter((d) => d.id !== featuredDoc.id);
    }
    return filteredDocs;
  }, [filteredDocs, featuredDoc, selectedCategory, searchQuery]);

  // Descarga directa del archivo oficial
  const handleDownload = async (e: React.MouseEvent, doc: DigitalDocument) => {
    e.stopPropagation();
    if (!doc.attachmentUrl) {
      toast.error('Este registro no contiene archivo adjunto para descargar');
      return;
    }

    try {
      api.post(`/news/${doc.id}/download`).catch(() => {});
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? { ...item, downloadCount: item.downloadCount + 1 } : item))
      );

      const link = document.createElement('a');
      link.href = doc.attachmentUrl.startsWith('http')
        ? doc.attachmentUrl
        : `${api.defaults.baseURL?.replace('/api', '') || 'http://localhost:5000'}${doc.attachmentUrl}`;
      link.download = doc.attachmentName || `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Descargando: ${doc.attachmentName || 'Documento Oficial'}`);
    } catch (err) {
      toast.error('Error al iniciar la descarga');
    }
  };

  // Abrir inspector del documento
  const handleInspectDoc = async (doc: DigitalDocument) => {
    setInspectingDoc(doc);
    try {
      const res = await api.get(`/news/${doc.id}`);
      if (res.data?.success) {
        setInspectingDoc(res.data.data);
        setDocuments((prev) =>
          prev.map((item) => (item.id === doc.id ? { ...item, viewCount: item.viewCount + 1 } : item))
        );
      }
    } catch (e) {
      // ignore
    }
  };

  // Abrir editor
  const handleOpenEditor = (docToEdit?: DigitalDocument) => {
    if (docToEdit) {
      setEditingDoc(docToEdit);
      setFormTitle(docToEdit.title);
      setFormCategory(docToEdit.category);
      setFormType(docToEdit.type);
      setFormSummary(docToEdit.summary);
      setFormContent(docToEdit.content);
      setFormAuthor(docToEdit.authorName);
      setFormIsPinned(docToEdit.isPinned);
      setFormIsPublished(docToEdit.isPublished);
      setFormExistingAttachment({
        name: docToEdit.attachmentName,
        url: docToEdit.attachmentUrl,
        size: docToEdit.attachmentSize,
        type: docToEdit.attachmentType
      });
    } else {
      setEditingDoc(null);
      setFormTitle('');
      setFormCategory('ESTATUTOS');
      setFormType('DOCUMENTO_OFICIAL');
      setFormSummary('');
      setFormContent('');
      setFormAuthor('Secretaría General CHLS');
      setFormIsPinned(false);
      setFormIsPublished(true);
      setFormExistingAttachment(null);
    }
    setFormAttachmentFile(null);
    setFormCoverFile(null);
    setIsEditorOpen(true);
  };

  // Guardar documento
  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSummary.trim()) {
      toast.error('Complete el título y la descripción del documento');
      return;
    }

    try {
      setSavingDoc(true);
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('category', formCategory);
      formData.append('type', formType);
      formData.append('summary', formSummary.trim());
      formData.append('content', formContent.trim() || formSummary.trim());
      formData.append('authorName', formAuthor.trim() || 'Secretaría General CHLS');
      formData.append('isPinned', String(formIsPinned));
      formData.append('isPublished', String(formIsPublished));

      if (formAttachmentFile) {
        formData.append('attachment', formAttachmentFile);
      }
      if (formCoverFile) {
        formData.append('coverImage', formCoverFile);
      }

      if (editingDoc) {
        const res = await api.put(`/news/${editingDoc.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.success) {
          toast.success('Documento actualizado en la biblioteca');
          setIsEditorOpen(false);
          fetchDocuments();
        }
      } else {
        const res = await api.post('/news', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.success) {
          toast.success('Documento incorporado a la biblioteca');
          setIsEditorOpen(false);
          fetchDocuments();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar el documento');
    } finally {
      setSavingDoc(false);
    }
  };

  // Eliminar documento
  const handleDeleteDoc = async (doc: DigitalDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`¿Eliminar "${doc.title}" de la biblioteca digital?`)) return;

    try {
      const res = await api.delete(`/news/${doc.id}`);
      if (res.data?.success) {
        toast.success('Documento eliminado');
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        if (inspectingDoc?.id === doc.id) setInspectingDoc(null);
      }
    } catch (err) {
      toast.error('No se pudo eliminar el documento');
    }
  };

  // Categorías
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'REPORTES': return 'Reportes & Balances';
      case 'ESTATUTOS': return 'Estatutos & Reglamentos';
      case 'CONVOCATORIAS': return 'Convocatorias & Resoluciones';
      case 'FORMULARIOS': return 'Formularios & Solicitudes';
      case 'MANUALES': return 'Manuales & Normativas';
      case 'MEMORIAS': return 'Memorias & Actas';
      default: return category;
    }
  };

  return (
    <div className="min-h-screen bg-[#030906] text-emerald-50 font-sans transition-colors duration-300 selection:bg-emerald-500/30 selection:text-white flex flex-col justify-between relative overflow-hidden">
      
      {/* Dynamic Ambient Emerald Glows */}
      <div className="fixed top-0 left-1/4 w-[650px] h-[380px] bg-emerald-500/12 rounded-full blur-[140px] pointer-events-none -z-0"></div>
      <div className="fixed bottom-0 right-1/4 w-[550px] h-[380px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none -z-0"></div>

      {/* ========================================================= */}
      {/* TOP MODERN EMERALD HEADER                                 */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-[#041209]/95 border-b border-emerald-500/25 transition-all shadow-lg shadow-emerald-950/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0">
            <BackButton />
            <CrestLogo size="md" className="w-11 h-13 sm:w-12 sm:h-14 shrink-0 drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]" />
            <div className="border-l-2 border-emerald-500/40 pl-3.5 sm:pl-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,1)]"></span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
                    CLUB INTELIGENTE
                  </span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 tracking-wider">
                  SISTEMA
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-300 mt-1.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-brand-gold font-extrabold uppercase text-[11px] sm:text-xs tracking-wide">
                  <BookOpen className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                  <span>Biblioteca Digital</span>
                </div>
                <span className="text-emerald-700 hidden sm:inline">&bull;</span>
                <span className="text-emerald-400/80 font-mono text-[11px] sm:text-xs hidden sm:inline">
                  Repositorio Institucional CHLS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isStaffOrAdmin && (
              <button
                onClick={() => handleOpenEditor()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black transition-all shadow-md shadow-emerald-500/25 hover:scale-105"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Subir Documento</span>
              </button>
            )}

            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 transition-all shadow-sm"
              >
                <span>Acceso Socios</span>
              </button>
            )}

            <ThemeToggle />

            <button
              onClick={fetchDocuments}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 hover:text-white hover:border-emerald-400/50 transition-colors"
              title="Actualizar biblioteca"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================= */}
      {/* MAIN CONTAINER                                            */}
      {/* ========================================================= */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 pb-16 space-y-8 flex-1">
        
        {/* ========================================================= */}
        {/* FEATURED / KEY DOCUMENT BANNER (Glowing Emerald)          */}
        {/* ========================================================= */}
        {featuredDoc && selectedCategory === 'TODOS' && !searchQuery && (
          <section
            onClick={() => handleInspectDoc(featuredDoc)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-[#061d12] via-[#04140c] to-[#020a06] border-2 border-emerald-500/40 hover:border-emerald-400 transition-all duration-300 shadow-2xl shadow-emerald-950/40 hover:shadow-[0_0_40px_rgba(16,185,129,0.22)] p-6 sm:p-8"
          >
            {/* Ambient Radial Flare */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl group-hover:bg-emerald-400/25 transition-all pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono uppercase font-bold tracking-wider shadow-sm">
                    <Pin className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                    DOCUMENTO NORMATIVO SUPREMO
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400/80 uppercase font-semibold">
                    {getCategoryLabel(featuredDoc.category)}
                  </span>
                  <span className="text-emerald-700">&bull;</span>
                  <span className="text-[11px] text-emerald-300/80 font-mono">
                    {featuredDoc.attachmentSize || 'PDF'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors leading-tight">
                  {featuredDoc.title}
                </h2>

                <p className="text-xs sm:text-sm text-emerald-100/80 line-clamp-2 leading-relaxed">
                  {featuredDoc.summary}
                </p>

                <div className="flex items-center gap-3 text-xs text-emerald-400/70 font-mono pt-1">
                  <span>{featuredDoc.authorName}</span>
                  <span>&bull;</span>
                  <span>{featuredDoc.downloadCount} descargas</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="relative z-10 flex items-center gap-3 shrink-0">
                <button
                  onClick={(e) => handleDownload(e, featuredDoc)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black hover:scale-105 transition-all shadow-lg shadow-emerald-500/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Archivo Oficial</span>
                </button>

                <div className="w-9 h-9 rounded-full border border-emerald-500/40 bg-emerald-950/40 flex items-center justify-center text-emerald-300 group-hover:text-white group-hover:border-emerald-400 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* SEARCH & DOCUMENT CATEGORY FILTERS                        */}
        {/* ========================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            {/* Minimalist Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-emerald-400/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar estatuto, reglamento, formulario, convocatoria..."
                className="w-full pl-9 pr-8 py-2.5 rounded-full bg-[#06180f]/90 border border-emerald-500/30 text-xs sm:text-sm text-emerald-100 placeholder-emerald-500/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400/60 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Switcher & Document Counter */}
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
              <span className="text-emerald-400/80 font-mono text-[11px]">
                {filteredDocs.length} {filteredDocs.length === 1 ? 'documento' : 'documentos oficiales'}
              </span>

              <div className="flex items-center p-0.5 rounded-full bg-[#06160e] border border-emerald-500/30">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`p-1.5 rounded-full transition-all ${
                    viewMode === 'GRID'
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                      : 'text-emerald-400/60 hover:text-emerald-200'
                  }`}
                  title="Vista en tarjetas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('LIST')}
                  className={`p-1.5 rounded-full transition-all ${
                    viewMode === 'LIST'
                      ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                      : 'text-emerald-400/60 hover:text-emerald-200'
                  }`}
                  title="Vista en directorio"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Clean Category Filter Tabs in Emerald Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'TODOS', label: 'Todos los Documentos' },
              { id: 'REPORTES', label: 'Reportes & Balances' },
              { id: 'ESTATUTOS', label: 'Estatutos & Reglamentos' },
              { id: 'CONVOCATORIAS', label: 'Convocatorias & Resoluciones' },
              { id: 'FORMULARIOS', label: 'Formularios & Solicitudes' },
              { id: 'MANUALES', label: 'Manuales & Normativas' },
              { id: 'MEMORIAS', label: 'Memorias & Actas' }
            ].map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as DocumentCategoryFilter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                      : 'bg-[#06160e]/80 text-emerald-300/80 border-emerald-500/20 hover:border-emerald-400/60 hover:text-emerald-100 hover:bg-emerald-950/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DOCUMENT REPOSITORY LIST / GRID                           */}
        {/* ========================================================= */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-emerald-400/80 font-mono tracking-wider">CARGANDO BIBLIOTECA DIGITAL...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-[#06160e]/80 border border-emerald-500/25 p-8 sm:p-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
              <BookOpen className="w-8 h-8 text-emerald-400" />
            </div>
            {documents.length === 0 ? (
              <div className="space-y-2">
                <p className="text-lg font-black text-white">
                  Biblioteca Digital Lista y Vacía
                </p>
                <p className="text-xs sm:text-sm text-emerald-400/70 max-w-md mx-auto leading-relaxed">
                  No hay documentos registrados actualmente. Todo está preparado para comenzar a cargar los documentos oficiales del Club.
                </p>
                {isStaffOrAdmin && (
                  <div className="pt-3">
                    <button
                      onClick={() => handleOpenEditor()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black transition-all shadow-lg shadow-emerald-500/30 hover:scale-105"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Subir Primer Documento</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  No se encontraron documentos con los filtros seleccionados
                </p>
                <p className="text-xs text-emerald-400/60 max-w-sm mx-auto">
                  Intenta seleccionar otra categoría o cambiar tu término de búsqueda.
                </p>
              </div>
            )}
          </div>
        ) : viewMode === 'GRID' ? (
          /* ========================================================= */
          /* 1. DOCUMENT CARDS GRID (Emerald Modern)                   */
          /* ========================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {regularDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleInspectDoc(doc)}
                className="group relative cursor-pointer bg-gradient-to-b from-[#071d12] via-[#05140d] to-[#030c08] rounded-3xl border border-emerald-500/30 hover:border-emerald-400/80 transition-all duration-300 p-5 flex flex-col justify-between space-y-4 hover:shadow-[0_15px_35px_rgba(16,185,129,0.22)] hover:-translate-y-1.5 overflow-hidden"
              >
                {/* Ambient Radial Flare in Card */}
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all pointer-events-none"></div>

                <div className="space-y-3.5 relative z-10">
                  {/* Top Header: Icon & Category */}
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-transform">
                      {doc.category === 'REPORTES' ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                      ) : doc.category === 'FORMULARIOS' ? (
                        <FileCheck2 className="w-5 h-5 text-emerald-300" />
                      ) : doc.category === 'ESTATUTOS' ? (
                        <ScrollText className="w-5 h-5 text-brand-gold" />
                      ) : (
                        <FileText className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {doc.attachmentType || 'PDF'}
                      </span>
                      {doc.isPinned && (
                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                          Fijado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider block font-semibold">
                      {getCategoryLabel(doc.category)}
                    </span>
                    <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2">
                      {doc.title}
                    </h3>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-emerald-100/75 line-clamp-2 leading-relaxed font-normal">
                    {doc.summary}
                  </p>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs relative z-10">
                  <div className="text-[11px] font-mono text-emerald-400/70">
                    <span>{doc.attachmentSize || 'Documento Oficial'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isStaffOrAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEditor(doc)}
                          className="p-1 text-emerald-400/70 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDoc(doc, e)}
                          className="p-1 text-emerald-400/70 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={(e) => handleDownload(e, doc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 hover:bg-emerald-400 text-emerald-300 hover:text-black transition-all border border-emerald-500/40 hover:border-emerald-400 shadow-xs"
                      title="Descargar archivo oficial"
                    >
                      <Download className="w-3 h-3" />
                      <span>Descargar</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* ========================================================= */
          /* 2. DOCUMENT DIRECTORY TABLE LIST (Emerald Modern)         */
          /* ========================================================= */
          <div className="bg-[#06150e]/90 rounded-3xl border border-emerald-500/25 overflow-hidden shadow-xl divide-y divide-emerald-500/15">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleInspectDoc(doc)}
                className="p-4 sm:p-5 hover:bg-emerald-500/10 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    {doc.category === 'REPORTES' ? (
                      <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
                    ) : doc.category === 'FORMULARIOS' ? (
                      <FileCheck2 className="w-5 h-5 text-emerald-300" />
                    ) : (
                      <FileText className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-300">
                        {getCategoryLabel(doc.category)}
                      </span>
                      <span className="text-emerald-700">&bull;</span>
                      <span className="text-[11px] font-mono text-emerald-400/80">
                        {doc.attachmentSize || doc.attachmentType || 'PDF'}
                      </span>
                      {doc.isPinned && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-brand-gold/20 text-brand-gold font-bold">
                          Destacado
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {doc.title}
                    </h4>

                    <p className="text-xs text-emerald-200/60 line-clamp-1">
                      {doc.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] font-mono text-emerald-400/70 hidden md:inline">
                    {doc.downloadCount} descargas
                  </span>

                  <button
                    onClick={(e) => handleDownload(e, doc)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 hover:bg-emerald-400 text-emerald-300 hover:text-black border border-emerald-500/40 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar {doc.attachmentType || 'PDF'}</span>
                  </button>

                  {isStaffOrAdmin && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEditor(doc)}
                        className="p-1.5 text-emerald-400/70 hover:text-white"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteDoc(doc, e)}
                        className="p-1.5 text-emerald-400/70 hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* DOCUMENT INSPECTOR MODAL (Detalle del Documento)          */}
      {/* ========================================================= */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-xl my-auto bg-[#06170f] rounded-3xl border-2 border-emerald-500/40 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Top Bar */}
            <div className="px-6 py-4 border-b border-emerald-500/20 flex items-center justify-between bg-black/20">
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                {getCategoryLabel(inspectingDoc.category)}
              </span>

              <button
                onClick={() => setInspectingDoc(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400 hover:text-white hover:bg-emerald-950/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-xs text-emerald-100/90">
              
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold">
                  DOCUMENTO INSTITUCIONAL OFICIAL &bull; {inspectingDoc.attachmentType || 'PDF'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
                  {inspectingDoc.title}
                </h2>
                <div className="flex items-center gap-3 text-emerald-400/70 font-mono text-[11px]">
                  <span>{inspectingDoc.authorName}</span>
                  <span>&bull;</span>
                  <span>{inspectingDoc.attachmentSize}</span>
                  <span>&bull;</span>
                  <span>{inspectingDoc.downloadCount} descargas</span>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border-l-4 border-emerald-400 text-xs sm:text-sm text-emerald-200 leading-relaxed font-medium">
                {inspectingDoc.summary}
              </div>

              {/* Content / Scope */}
              <div className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed whitespace-pre-line space-y-3">
                {inspectingDoc.content}
              </div>

              {/* Download Callout Box */}
              {inspectingDoc.attachmentUrl && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <FileDown className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {inspectingDoc.attachmentName || 'Documento Oficial CHLS'}
                      </h4>
                      <p className="text-[10px] text-emerald-400/70 font-mono">
                        Formato: {inspectingDoc.attachmentType || 'PDF'} {inspectingDoc.attachmentSize ? `• ${inspectingDoc.attachmentSize}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDownload(e, inspectingDoc)}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:scale-105 transition-all shrink-0 shadow-md shadow-emerald-500/25"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-emerald-500/20 flex justify-between items-center text-xs bg-black/20">
              <span className="text-emerald-400/60 font-mono text-[11px]">
                Biblioteca Digital &bull; Club Hípico Los Sargentos
              </span>
              <button
                onClick={() => setInspectingDoc(null)}
                className="font-bold text-emerald-300 hover:text-white"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* UPLOAD / EDIT DOCUMENT MODAL (Staff & Admin)              */}
      {/* ========================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-lg my-auto bg-[#06170f] rounded-3xl border-2 border-emerald-500/40 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-4 border-b border-emerald-500/20 flex items-center justify-between bg-black/20">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {editingDoc ? 'Editar Documento' : 'Subir Documento Oficial'}
                </h3>
                <span className="text-[10px] font-mono text-emerald-400/80">
                  Biblioteca digital de socios
                </span>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400 hover:text-white hover:bg-emerald-950/40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div>
                <label className="font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
                  Nombre del Documento *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="ej. Estatuto Orgánico Oficial CHLS 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04120a] border border-emerald-500/30 text-white focus:outline-none focus:border-emerald-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
                    Categoría Documental
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#04120a] border border-emerald-500/30 text-white text-xs focus:outline-none"
                  >
                    <option value="REPORTES">REPORTES & BALANCES</option>
                    <option value="ESTATUTOS">ESTATUTOS & REGLAMENTOS</option>
                    <option value="CONVOCATORIAS">CONVOCATORIAS & RESOLUCIONES</option>
                    <option value="FORMULARIOS">FORMULARIOS & SOLICITUDES</option>
                    <option value="MANUALES">MANUALES & NORMATIVAS</option>
                    <option value="MEMORIAS">MEMORIAS & ACTAS</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
                    Autor / Emisor
                  </label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="Secretaría General CHLS"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#04120a] border border-emerald-500/30 text-white text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
                  Descripción / Alcance del Documento *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Breve explicación del propósito y alcance del documento para el socio..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04120a] border border-emerald-500/30 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-emerald-300 uppercase tracking-wider block mb-1">
                  Detalles o Articulado (Opcional)
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Resumen del índice, artículos principales o requisitos asociados..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#04120a] border border-emerald-500/30 text-white text-xs focus:outline-none"
                />
              </div>

              {/* Archivo Adjunto */}
              <div className="p-3.5 rounded-xl bg-[#04120a] border border-emerald-500/30 space-y-2">
                <span className="font-bold text-emerald-300 block flex items-center gap-1.5">
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  Archivo para Descarga (PDF, Word, Excel)
                </span>
                
                {formExistingAttachment?.url && !formAttachmentFile && (
                  <p className="text-[11px] text-emerald-400 truncate font-mono">
                    Archivo cargado: {formExistingAttachment.name} ({formExistingAttachment.size})
                  </p>
                )}

                <input
                  type="file"
                  onChange={(e) => setFormAttachmentFile(e.target.files?.[0] || null)}
                  className="text-xs text-emerald-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-emerald-200">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Fijar como Destacado</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-emerald-200">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Habilitar para Descarga de Socios</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-400/80 hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-500/25"
                >
                  {savingDoc ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingDoc ? 'Guardar Cambios' : 'Subir a Biblioteca'}</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full py-8 text-center text-xs text-emerald-500/60 border-t border-emerald-500/20 bg-[#020704]">
        <span>Club Hípico Los Sargentos &bull; Biblioteca Digital Oficial</span>
      </footer>

    </div>
  );
};
export default MemberNewsPage;
