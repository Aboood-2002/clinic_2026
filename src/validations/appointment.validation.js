import Joi from 'joi';

export const createAppointmentSchema = Joi.object({
  patientId: Joi.number().integer().positive().required(),
  scheduledAt: Joi.date().iso().required(),
  visitType: Joi.string().valid('consultation', 'examination').default('consultation'),
  isNewPatient: Joi.boolean().default(false),
  notes: Joi.string().max(500).optional().allow(''),
});

export const updateAppointmentSchema = Joi.object({
  scheduledAt: Joi.date().iso().optional(),
  visitType: Joi.string().valid('consultation', 'examination').optional(),
  isNewPatient: Joi.boolean().optional(),
  notes: Joi.string().max(500).optional().allow(''),
  status: Joi.string().valid('booked', 'checked_in', 'cancelled', 'completed', 'no_show').optional(),
});
