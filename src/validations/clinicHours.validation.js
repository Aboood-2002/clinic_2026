import Joi from 'joi';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const updateClinicHoursSchema = Joi.object({
  dayOfWeek: Joi.number().integer().min(0).max(6),
  openTime: Joi.string().pattern(timePattern).required(),
  closeTime: Joi.string().pattern(timePattern).required(),
  slotMinutes: Joi.number().integer().min(5).max(120).required(),
  isClosed: Joi.boolean().required(),
});
