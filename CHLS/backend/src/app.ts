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

const app = express();
const accessController = new AccessController();

// Security Middlewares
app.use(helmet());
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

// Request Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

// Global Error Handler
app.use(errorHandler);

export { app };
