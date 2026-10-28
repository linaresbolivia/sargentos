import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { NewsService } from '../application/NewsService';
import { logger } from '@config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads', 'news');
const docsDir = path.join(process.cwd(), 'uploads', 'documents');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // If it's a PDF, spreadsheet or document, save into uploads/documents or uploads/news
    if (file.mimetype.includes('pdf') || file.mimetype.includes('sheet') || file.mimetype.includes('word') || file.mimetype.includes('officedocument')) {
      cb(null, docsDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const unique = `${Date.now()}_${cleanName}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for high quality official docs
});

export class NewsController {
  public router: Router;
  private newsService: NewsService;

  constructor(private prisma: PrismaClient = new PrismaClient()) {
    this.router = Router();
    this.newsService = new NewsService(prisma);
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Public / Socio endpoints
    this.router.get('/', this.getPosts.bind(this));
    this.router.get('/seed', this.seedPosts.bind(this));
    this.router.post('/seed', this.seedPosts.bind(this));
    this.router.get('/:id', this.getPostById.bind(this));
    this.router.post('/:id/download', this.incrementDownload.bind(this));

    // Administrative / Staff endpoints (with upload handling)
    this.router.post('/upload', upload.single('file'), this.uploadFile.bind(this));
    this.router.post(
      '/',
      upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'attachment', maxCount: 1 }
      ]),
      this.createPost.bind(this)
    );
    this.router.put(
      '/:id',
      upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'attachment', maxCount: 1 }
      ]),
      this.updatePost.bind(this)
    );
    this.router.delete('/:id', this.deletePost.bind(this));
  }

  /**
   * Helper to format file size in readable units
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Helper to determine file extension type
   */
  private getFileType(filename: string, mimetype?: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.pdf') return 'PDF';
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') return 'EXCEL';
    if (ext === '.docx' || ext === '.doc') return 'WORD';
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) return 'IMAGEN';
    if (['.zip', '.rar', '.7z'].includes(ext)) return 'ZIP';
    return 'DOCUMENTO';
  }

  private async getPosts(req: Request, res: Response): Promise<void> {
    try {
      const { category, type, search, isPublished, onlyPinned } = req.query;

      const posts = await this.newsService.getPosts({
        category: category ? String(category) : undefined,
        type: type ? String(type) : undefined,
        search: search ? String(search) : undefined,
        isPublished: isPublished !== undefined ? isPublished === 'true' : true,
        onlyPinned: onlyPinned === 'true'
      });

      res.status(200).json({ success: true, data: posts, total: posts.length });
    } catch (error: any) {
      logger.error('Error al listar noticias y documentos:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al obtener publicaciones' });
    }
  }

  private async getPostById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await this.newsService.getPostById(id);
      if (!post) {
        res.status(404).json({ success: false, message: 'Publicación no encontrada' });
        return;
      }
      res.status(200).json({ success: true, data: post });
    } catch (error: any) {
      logger.error('Error al obtener detalle de publicación:', error);
      res.status(500).json({ success: false, message: error.message || 'Error interno' });
    }
  }

  private async incrementDownload(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await this.newsService.incrementDownload(id);
      res.status(200).json({ success: true, data: { downloadCount: post.downloadCount } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Error al registrar descarga' });
    }
  }

  private async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se envió ningún archivo' });
        return;
      }

      const file = req.file;
      const isDoc = file.mimetype.includes('pdf') || file.mimetype.includes('sheet') || file.mimetype.includes('word');
      const relativePath = isDoc
        ? `/uploads/documents/${file.filename}`
        : `/uploads/news/${file.filename}`;

      res.status(200).json({
        success: true,
        data: {
          url: relativePath,
          filename: file.originalname,
          size: this.formatFileSize(file.size),
          type: this.getFileType(file.originalname, file.mimetype)
        }
      });
    } catch (error: any) {
      logger.error('Error al subir archivo:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al procesar archivo' });
    }
  }

  private async createPost(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      let coverImageUrl = body.coverImageUrl;
      if (files?.coverImage && files.coverImage[0]) {
        coverImageUrl = `/uploads/news/${files.coverImage[0].filename}`;
      }

      let attachmentUrl = body.attachmentUrl;
      let attachmentName = body.attachmentName;
      let attachmentSize = body.attachmentSize;
      let attachmentType = body.attachmentType;

      if (files?.attachment && files.attachment[0]) {
        const att = files.attachment[0];
        const isDoc = att.mimetype.includes('pdf') || att.mimetype.includes('sheet') || att.mimetype.includes('word');
        attachmentUrl = isDoc
          ? `/uploads/documents/${att.filename}`
          : `/uploads/news/${att.filename}`;
        attachmentName = att.originalname;
        attachmentSize = this.formatFileSize(att.size);
        attachmentType = this.getFileType(att.originalname, att.mimetype);
      }

      let attachments = [];
      if (body.attachments) {
        try {
          attachments = typeof body.attachments === 'string' ? JSON.parse(body.attachments) : body.attachments;
        } catch (e) {
          attachments = [];
        }
      }

      const post = await this.newsService.createPost({
        title: body.title,
        summary: body.summary,
        content: body.content,
        category: body.category || 'INSTITUCIONAL',
        type: body.type || 'NOTICIA',
        coverImageUrl,
        isPinned: body.isPinned === true || body.isPinned === 'true',
        isPublished: body.isPublished === undefined ? true : (body.isPublished === true || body.isPublished === 'true'),
        authorName: body.authorName || 'Directorio CHLS',
        attachmentUrl,
        attachmentName,
        attachmentSize,
        attachmentType,
        attachments
      });

      res.status(201).json({ success: true, data: post, message: 'Publicación creada exitosamente' });
    } catch (error: any) {
      logger.error('Error al crear publicación:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al guardar publicación' });
    }
  }

  private async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const body = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      const updateData: any = {};
      if (body.title) updateData.title = body.title;
      if (body.summary) updateData.summary = body.summary;
      if (body.content) updateData.content = body.content;
      if (body.category) updateData.category = body.category;
      if (body.type) updateData.type = body.type;
      if (body.authorName) updateData.authorName = body.authorName;
      if (body.isPinned !== undefined) updateData.isPinned = body.isPinned === true || body.isPinned === 'true';
      if (body.isPublished !== undefined) updateData.isPublished = body.isPublished === true || body.isPublished === 'true';

      if (files?.coverImage && files.coverImage[0]) {
        updateData.coverImageUrl = `/uploads/news/${files.coverImage[0].filename}`;
      } else if (body.coverImageUrl !== undefined) {
        updateData.coverImageUrl = body.coverImageUrl;
      }

      if (files?.attachment && files.attachment[0]) {
        const att = files.attachment[0];
        const isDoc = att.mimetype.includes('pdf') || att.mimetype.includes('sheet') || att.mimetype.includes('word');
        updateData.attachmentUrl = isDoc
          ? `/uploads/documents/${att.filename}`
          : `/uploads/news/${att.filename}`;
        updateData.attachmentName = att.originalname;
        updateData.attachmentSize = this.formatFileSize(att.size);
        updateData.attachmentType = this.getFileType(att.originalname, att.mimetype);
      } else if (body.attachmentUrl !== undefined) {
        updateData.attachmentUrl = body.attachmentUrl;
        updateData.attachmentName = body.attachmentName;
        updateData.attachmentSize = body.attachmentSize;
        updateData.attachmentType = body.attachmentType;
      }

      if (body.attachments) {
        try {
          updateData.attachments = typeof body.attachments === 'string' ? JSON.parse(body.attachments) : body.attachments;
        } catch (e) {
          // ignore
        }
      }

      const post = await this.newsService.updatePost(id, updateData);
      res.status(200).json({ success: true, data: post, message: 'Publicación actualizada exitosamente' });
    } catch (error: any) {
      logger.error('Error al actualizar publicación:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al actualizar publicación' });
    }
  }

  private async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.newsService.deletePost(id);
      res.status(200).json({ success: true, message: 'Publicación eliminada correctamente' });
    } catch (error: any) {
      logger.error('Error al eliminar publicación:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al eliminar publicación' });
    }
  }

  private async seedPosts(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.newsService.seedDefaultPosts();
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      logger.error('Error al sembrar publicaciones:', error);
      res.status(500).json({ success: false, message: error.message || 'Error al ejecutar semillero' });
    }
  }
}
