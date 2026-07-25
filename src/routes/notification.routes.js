const { Router } = require('express');
const controller = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

router.get('/token', controller.generateToken);
router.post('/send', authMiddleware, controller.send);
router.get('/unread', authMiddleware, controller.getUnread);
router.get('/all', authMiddleware, controller.getAll);
router.patch('/:id/read', authMiddleware, controller.markRead);
router.patch('/read-all', authMiddleware, controller.markAllRead);

module.exports = router;
