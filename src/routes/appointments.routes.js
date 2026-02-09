import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../validations/appointment.validation.js';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  checkInAppointment,
} from '../controllers/appointments.controller.js';

const router = express.Router();

router.get('/', authenticate, getAppointments);
router.get('/:id', authenticate, getAppointmentById);
router.post('/', authenticate, authorize(['admin', 'reception', 'receptionist']), validate(createAppointmentSchema), createAppointment);
router.patch('/:id', authenticate, authorize(['admin', 'reception', 'receptionist']), validate(updateAppointmentSchema), updateAppointment);
router.patch('/:id/cancel', authenticate, authorize(['admin', 'reception', 'receptionist']), cancelAppointment);
router.patch('/:id/check-in', authenticate, authorize(['admin', 'reception', 'receptionist']), checkInAppointment);

export default router;
