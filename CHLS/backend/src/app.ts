import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { logger } from '@config/logger';
import { errorHandler } from '@shared/infrastructure/error.middleware';
import { authRouter } from '@modules/auth/infrastructure/routes/auth.routes';
import { memberRouter } from '@modules/members/infrastructure/routes/member.routes';
import { userRouter } from '@modules/users/infrastructure/routes/user.routes';
import whatsappRoutes from './modules/whatsapp/infrastructure/routes/whatsapp.routes';
import pqrsRoutes from './modules/pqrs/infrastructure/routes/pqrs.routes';
import reservationsRoutes from './modules/reservations/infrastructure/routes/reservations.routes';
import { AccessController } from '@modules/accessControl/infrastructure/controllers/AccessController';
import { CommercialController } from '@modules/commercial/infrastructure/controllers/CommercialController';
import { CorrespondenceController } from '@modules/correspondence/infrastructure/CorrespondenceController';
import { ElectionController } from '@modules/elections/infrastructure/ElectionController';

import path from 'path';

const app = express();
const accessController = new AccessController();
const commercialController = new CommercialController();
const correspondenceController = new CorrespondenceController();
const electionController = new ElectionController();

// Static uploads serving
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5000, // Limit each IP to 5000 requests per `window`
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde.',
  },
});
app.use('/api', limiter);

// Request Parsing (Increased payload limit to 200mb for high definition magazine PDFs)
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// HTTP Request Logger Middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Base API Router
app.use('/api/auth', authRouter);
app.use('/api/members', memberRouter);
app.use('/api/users', userRouter);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/pqrs', pqrsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/access', accessController.router);
app.use('/api/commercial', commercialController.router);
app.use('/api/correspondence', correspondenceController.router);
app.use('/api/elections', electionController.router);

// Global Error Handler
app.use(errorHandler);

export { app };
