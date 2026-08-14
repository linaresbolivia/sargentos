import { Router } from 'express';
import { PqrsController } from '../PqrsController';
import { authenticate } from '@modules/auth/infrastructure/middlewares/auth.middleware';

const router = Router();
const controller = new PqrsController();

// Public route to submit PQRS
router.post('/', controller.createTicket.bind(controller));
router.get('/track/:code', controller.trackTicket.bind(controller));

// Admin routes (Protected)
router.use(authenticate);

router.get('/', controller.getTickets.bind(controller));
router.put('/:id', controller.updateTicket.bind(controller));
router.put('/:id/status', controller.updateTicketStatus.bind(controller));
router.put('/:id/assign', controller.assignTicket.bind(controller));
router.put('/:id/read', controller.markAsRead.bind(controller));
router.post('/:id/reply', controller.replyViaWhatsApp.bind(controller));
router.post('/:id/note', controller.addInternalNote.bind(controller));

export default router;
