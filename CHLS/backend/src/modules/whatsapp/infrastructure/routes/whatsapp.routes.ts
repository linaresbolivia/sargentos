import { Router } from 'express';
import { WhatsappController } from '../controllers/WhatsappController';
import multer from 'multer';
import path from 'path';

const router = Router();
const whatsappController = new WhatsappController();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../../../tmp');
    if (!require('fs').existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Legacy routes (default to 'chls-masivo')
router.get('/status', whatsappController.getStatus.bind(whatsappController));
router.post('/start', whatsappController.startSession.bind(whatsappController));
router.post('/logout', whatsappController.logout.bind(whatsappController));
router.post('/send-bulk', upload.single('image'), whatsappController.sendBulk.bind(whatsappController));

// New Client-specific routes
router.get('/:clientId/status', whatsappController.getStatus.bind(whatsappController));
router.post('/:clientId/start', whatsappController.startSession.bind(whatsappController));
router.post('/:clientId/logout', whatsappController.logout.bind(whatsappController));
router.post('/:clientId/send-bulk', upload.single('image'), whatsappController.sendBulk.bind(whatsappController));
router.post('/:clientId/toggle-bot', whatsappController.toggleBot.bind(whatsappController));

// CRM Routes
router.get('/:clientId/chats', whatsappController.getChats.bind(whatsappController));
router.get('/:clientId/chats/:chatId/messages', whatsappController.getChatMessages.bind(whatsappController));
router.post('/:clientId/send', whatsappController.sendMessage.bind(whatsappController));

export default router;
