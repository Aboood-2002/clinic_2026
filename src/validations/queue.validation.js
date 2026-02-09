import Joi from 'joi';

export const addToQueueSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    'any.required': 'patientId is required',
    'number.base': 'patientId must be a number',
  }),
  reason: Joi.string().max(200).optional().allow(''),
  priority: Joi.string().valid('normal', 'high', 'urgent', 'consultation', 'examination').default('normal'),
});