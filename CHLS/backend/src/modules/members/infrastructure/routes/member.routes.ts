import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { MemberController } from '../controllers/MemberController';

const router = Router();
const prisma = new PrismaClient();
const memberController = new MemberController(prisma);

// Re-export the router from the controller
router.use('/', memberController.router);

export { router as memberRouter };
