import { Request, Response, Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GetUsersUseCase } from '../application/useCases/GetUsersUseCase';
import { CreateUserUseCase } from '../application/useCases/CreateUserUseCase';
import { UpdateUserRolesUseCase } from '../application/useCases/UpdateUserRolesUseCase';
import { UpdateUserUseCase } from '../application/useCases/UpdateUserUseCase';
import { authenticate, authorize } from '@modules/auth/infrastructure/middlewares/auth.middleware';

export class UserController {
  public router = Router();
  private getUsersUseCase: GetUsersUseCase;
  private createUserUseCase: CreateUserUseCase;
  private updateUserRolesUseCase: UpdateUserRolesUseCase;
  private updateUserUseCase: UpdateUserUseCase;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.getUsersUseCase = new GetUsersUseCase(prisma);
    this.createUserUseCase = new CreateUserUseCase(prisma);
    this.updateUserRolesUseCase = new UpdateUserRolesUseCase(prisma);
    this.updateUserUseCase = new UpdateUserUseCase(prisma);

    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Only SUPER_ADMIN can manage users. We can add a role check middleware later, 
    // but for now we'll check it in the route manually if needed, or assume 'authenticate' is enough.
    // Ideally we should verify if the user has 'superadmin:access'.
    this.router.get('/staff', authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS']), this.getStaffUsers.bind(this));
    this.router.get('/', authenticate, authorize(['SUPER_ADMIN']), this.getUsers.bind(this));
    this.router.post('/', authenticate, authorize(['SUPER_ADMIN']), this.createUser.bind(this));
    this.router.put('/:id', authenticate, authorize(['SUPER_ADMIN']), this.updateUser.bind(this));
    this.router.put('/:id/roles', authenticate, authorize(['SUPER_ADMIN']), this.updateUserRoles.bind(this));
  }

  private async getUsers(req: Request, res: Response) {
    try {
      const users = await this.getUsersUseCase.execute();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getStaffUsers(req: Request, res: Response) {
    try {
      // Get all active users who can handle PQRS cases
      const staff = await this.prisma.user.findMany({
        where: { 
          isActive: true,
          roles: {
            some: {
              name: {
                in: ['SUPER_ADMIN', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS']
              }
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          roles: {
            select: { name: true }
          }
        }
      });
      res.json(staff);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async createUser(req: Request, res: Response) {
    try {
      const user = await this.createUserUseCase.execute(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await this.updateUserUseCase.execute(id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async updateUserRoles(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await this.updateUserRolesUseCase.execute(id, req.body);
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
