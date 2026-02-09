import Joi from 'joi';

export const createPatientSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Name must be at least 3 characters',
    'any.required': 'Name is required',
  }),
  age: Joi.number().integer().min(0).max(120).optional().allow(null),
  dateOfBirth: Joi.date().iso().optional().allow(null),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional().allow(null),
  phone: Joi.string().pattern(/^01[0-9]{9}$/).required().messages({
    'string.pattern.base': 'Phone must be a valid Egyptian mobile number (01xxxxxxxxx)',
    'any.required': 'Phone is required',
  }),
  address: Joi.string().max(200).optional().allow(null),
  email: Joi.string().email().optional().allow(null),
  bloodType: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional().allow(null),
  nationalID: Joi.string().optional().allow(null),
});

export const updatePatientSchema = createPatientSchema.fork(
  ['name', 'phone'], // these become optional on update
  (schema) => schema.optional()
);
