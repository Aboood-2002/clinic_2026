// import Joi from 'joi';

// const medicationSchema = Joi.object({
//   name: Joi.string().required(),
//   dosage: Joi.string().optional().allow(''),
//   frequency: Joi.string().optional().allow(''),
//   duration: Joi.string().optional().allow(''),
//   instructions: Joi.string().optional().allow(''),
// });

// export const createPrescriptionSchema = Joi.object({
//   visitId: Joi.number().integer().positive().required(),
//   additionalNotes: Joi.string().max(1000).optional().allow(''),
//   medications: Joi.array().items(medicationSchema).min(1).required().messages({
//     'array.min': 'At least one medication is required',
//   }),
// });

import Joi from 'joi';

const medicationSchema = Joi.object({
  name: Joi.string().required(),
  dosage: Joi.string().optional().allow(''),
  frequency: Joi.string().optional().allow(''),
  duration: Joi.string().optional().allow(''),
  instructions: Joi.string().optional().allow(''),
});

export const createPrescriptionSchema = Joi.object({
  visitId: Joi.number().integer().positive().required(),
  additionalNotes: Joi.string().max(1000).optional().allow(''),
  consultationDate: Joi.date().iso().optional(),
  medications: Joi.array().items(medicationSchema).min(1).required().messages({
    'array.min': 'At least one medication is required',
  }),
});
