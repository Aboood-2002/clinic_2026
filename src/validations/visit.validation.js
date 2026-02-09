// import Joi from 'joi';

// export const updateVisitSchema = Joi.object({
//   chiefComplaint: Joi.string().max(500).optional().allow(''),
//   diagnosis: Joi.string().max(500).optional().allow(''),
//   notes: Joi.string().max(1000).optional().allow(''),
//   status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
// });

import Joi from 'joi';

export const updateVisitSchema = Joi.object({
  chiefComplaint: Joi.string().max(500).optional().allow(''),
  diagnosis: Joi.string().max(500).optional().allow(''),
  notes: Joi.string().max(1000).optional().allow(''),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
  visitType: Joi.string().valid('consultation', 'examination').optional(),
});