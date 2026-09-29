import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { mark, daily, byEmployee } from '../controllers/attendanceController.js';

const router = Router();
router.post('/', auth(['admin', 'chef_chaine']), mark);
router.get('/daily', auth(), daily);
router.get('/employee/:employeeId', auth(), byEmployee);

export default router;
