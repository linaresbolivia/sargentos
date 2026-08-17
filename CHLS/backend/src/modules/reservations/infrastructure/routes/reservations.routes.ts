import { Router } from 'express';
import { ReservationsController } from '../ReservationsController';

const router = Router();
const controller = new ReservationsController();

// Public / Member routes
router.get('/courts', controller.getCourts.bind(controller));
router.get('/timeline', controller.getTimeline.bind(controller));
router.get('/my-reservations', controller.getMyReservations.bind(controller));
router.post('/cancel/:id', controller.cancelMyReservation.bind(controller));
router.get('/', controller.getReservations.bind(controller));
router.post('/', controller.createReservation.bind(controller));

// Admin / Staff routes
router.post('/block', controller.createContinuousBlock.bind(controller));
router.delete('/recurring/:groupId', controller.deleteRecurringGroup.bind(controller));
router.put('/:id/status', controller.updateReservationStatus.bind(controller));
router.delete('/:id', controller.deleteReservation.bind(controller));

export default router;

