import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserController } from '../UserController';

const prisma = new PrismaClient();
const userController = new UserController(prisma);

const userRouter = userController.router;

export { userRouter };
