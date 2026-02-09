import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateClinicHoursSchema } from '../validations/clinicHours.validation.js';
import { getClinicHours, updateClinicHours } from '../controllers/clinicHours.controller.js';

const router = express.Router();

router.get('/', authenticate, getClinicHours);
router.put('/:dayOfWeek', authenticate, authorize(['admin', 'reception', 'receptionist', 'doctor']), validate(updateClinicHoursSchema), updateClinicHours);

export default router;
