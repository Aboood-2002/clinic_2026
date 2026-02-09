import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler';

const DEFAULT_HOURS = [
  { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
  { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
  { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
  { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
  { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
  { dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
  { dayOfWeek: 6, openTime: '09:00', closeTime: '17:00', slotMinutes: 20, isClosed: false },
];

const ensureDefaults = async () => {
  const existing = await prisma.clinicHours.findMany();
  const existingDays = new Set(existing.map(h => h.dayOfWeek));
  const missing = DEFAULT_HOURS.filter(h => !existingDays.has(h.dayOfWeek));
  if (missing.length === 0) return existing;

  await prisma.clinicHours.createMany({ data: missing });
  return prisma.clinicHours.findMany();
};

export const getClinicHours = asyncHandler(async (_req, res) => {
  const hours = await ensureDefaults();
  res.json(hours.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
});

export const updateClinicHours = asyncHandler(async (req, res) => {
  const { dayOfWeek } = req.params;
  const day = parseInt(dayOfWeek, 10);
  if (Number.isNaN(day) || day < 0 || day > 6) {
    return res.status(400).json({ error: 'Invalid dayOfWeek' });
  }

  const { openTime, closeTime, slotMinutes, isClosed } = req.body;

  const updated = await prisma.clinicHours.upsert({
    where: { dayOfWeek: day },
    update: {
      openTime,
      closeTime,
      slotMinutes,
      isClosed,
    },
    create: {
      dayOfWeek: day,
      openTime,
      closeTime,
      slotMinutes,
      isClosed,
    },
  });

  res.json(updated);
});
