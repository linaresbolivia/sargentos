import { Router } from 'express';
import { ReservationsController } from '../ReservationsController';

const router = Router();
const controller = new ReservationsController();

// Public / Member routes
router.get('/courts', controller.getCourts.bind(controller));
router.get('/timeline', controller.getTimeline.bind(controller));
router.get('/my-reservations', controller.getMyReservations.bind(controller));
router.get('/guests/search', controller.searchGuests.bind(controller));
router.post('/guests', controller.createOrUpdateGuest.bind(controller));
router.get('/members/search', controller.searchMembers.bind(controller));
router.post('/cancel/:id', controller.cancelMyReservation.bind(controller));
router.post('/:id/receipt', controller.uploadPaymentReceipt.bind(controller));
router.get('/', controller.getReservations.bind(controller));
router.post('/', controller.createReservation.bind(controller));

// Admin / Staff routes
router.post('/courts', controller.createCourt.bind(controller));
router.put('/courts/:id', controller.updateCourt.bind(controller));
router.post('/block', controller.createContinuousBlock.bind(controller));
router.delete('/recurring/:groupId', controller.deleteRecurringGroup.bind(controller));
router.put('/:id/status', controller.updateReservationStatus.bind(controller));
router.put('/:id/payment-status', controller.updatePaymentStatus.bind(controller));
router.put('/:id', controller.updateReservation.bind(controller));
router.delete('/:id', controller.deleteReservation.bind(controller));

export default router;


