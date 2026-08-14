import { Router } from 'express';
import { ReservationsController } from '../ReservationsController';

const router = Router();
const controller = new ReservationsController();

// Public/Member routes
router.get('/courts', controller.getCourts.bind(controller));
router.get('/', controller.getReservations.bind(controller));
router.post('/', controller.createReservation.bind(controller));

// Admin routes
router.put('/:id/status', controller.updateReservationStatus.bind(controller));

export default router;
