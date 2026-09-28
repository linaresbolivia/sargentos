import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MemberController } from '../controllers/MemberController';
import { MemberAdminController } from '../controllers/MemberAdminController';

const router = Router();
const prisma = new PrismaClient();
const memberController = new MemberController(prisma);
const memberAdminController = new MemberAdminController(prisma);

// Re-export routes
router.use('/', memberController.router);
router.use('/', memberAdminController.router);

export { router as memberRouter };

