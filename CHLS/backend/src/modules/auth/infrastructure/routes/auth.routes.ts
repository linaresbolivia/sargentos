import { Router } from 'express';
import { validateRequest } from '@shared/infrastructure/validation.middleware';
import { registerSchema, loginSchema } from '../controllers/schemas';

// Repositories
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { PrismaUserTokenRepository } from '../repositories/PrismaUserTokenRepository';

// Services
import { Argon2HashService } from '../services/Argon2HashService';
import { JwtTokenService } from '../services/JwtTokenService';

// Use Cases
import { RegisterUseCase } from '../../application/useCases/RegisterUseCase';
import { LoginUseCase } from '../../application/useCases/LoginUseCase';
import { RefreshTokenUseCase } from '../../application/useCases/RefreshTokenUseCase';
import { LogoutUseCase } from '../../application/useCases/LogoutUseCase';

// Controllers
import { RegisterController } from '../controllers/RegisterController';
import { LoginController } from '../controllers/LoginController';
import { RefreshTokenController } from '../controllers/RefreshTokenController';
import { LogoutController } from '../controllers/LogoutController';

// Middlewares
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Dependencias
const userRepository = new PrismaUserRepository();
const userTokenRepository = new PrismaUserTokenRepository();
const hashService = new Argon2HashService();
const tokenService = new JwtTokenService();

const registerUseCase = new RegisterUseCase(
  userRepository,
  userTokenRepository,
  hashService,
  tokenService
);
const loginUseCase = new LoginUseCase(
  userRepository,
  userTokenRepository,
  hashService,
  tokenService
);
const refreshTokenUseCase = new RefreshTokenUseCase(
  userRepository,
  userTokenRepository,
  tokenService
);
const logoutUseCase = new LogoutUseCase(userTokenRepository);

const registerController = new RegisterController(registerUseCase);
const loginController = new LoginController(loginUseCase);
const refreshTokenController = new RefreshTokenController(refreshTokenUseCase);
const logoutController = new LogoutController(logoutUseCase);

// Rutas
router.post('/register', validateRequest(registerSchema), (req, res) =>
  registerController.execute(req, res)
);

router.post('/login', validateRequest(loginSchema), (req, res) =>
  loginController.execute(req, res)
);

router.post('/refresh', (req, res) =>
  refreshTokenController.execute(req, res)
);

router.post('/logout', (req, res) =>
  logoutController.execute(req, res)
);

// Get current logged-in user profile (for test/debug)
router.get('/me', authenticate, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'No autorizado' });
    return;
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      email: user.email.value,
      isActive: user.isActive,
      roles: user.roles.map(r => r.name),
      permissions: user.permissions,
    },
  });
});

export { router as authRouter };
