export interface DigitalDocument {
  id: string;
  title: string;
  slug?: string | null;
  summary: string;
  content: string;
  category: 'REPORTES' | 'ESTATUTOS' | 'CONVOCATORIAS' | 'FORMULARIOS' | 'MANUALES' | 'MEMORIAS' | string;
  type: 'DOCUMENTO_OFICIAL' | 'REPORTE' | 'ESTATUTO' | 'REGLAMENTO' | 'CONVOCATORIA' | 'FORMULARIO' | string;
  coverImageUrl?: string | null;
  isPinned: boolean;
  isPublished: boolean;
  authorName: string;
  publishedAt: string;
  viewCount: number;
  downloadCount: number;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: string | null;
  attachmentType?: string | null;
  attachments?: Array<{
    name: string;
    url: string;
    size?: string;
    type?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Alias for backward compatibility
export type ClubPost = DigitalDocument;

export type DocumentCategoryFilter = 
  | 'TODOS'
  | 'REPORTES'
  | 'ESTATUTOS'
  | 'CONVOCATORIAS'
  | 'FORMULARIOS'
  | 'MANUALES'
  | 'MEMORIAS';

export type CategoryFilter = DocumentCategoryFilter;
