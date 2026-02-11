import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { getRevenueReport } from '../controllers/reports.controller.js';

const router = express.Router();

router.get(
  '/revenue',
  authenticate,
  authorize(['admin', 'doctor', 'receptionist']),
  getRevenueReport
);

export default router;
