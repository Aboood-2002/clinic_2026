import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler';
import { io } from '../socket/socket.js';

const parseTimeToMinutes = (time) => {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const getDayRange = (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const getClinicHoursForDate = async (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const dayOfWeek = date.getDay();
  let hours = await prisma.clinicHours.findUnique({ where: { dayOfWeek } });
  if (!hours) {
    hours = await prisma.clinicHours.create({
      data: {
        dayOfWeek,
        openTime: '09:00',
        closeTime: '17:00',
        slotMinutes: 20,
        isClosed: false,
      },
    });
  }
  return hours;
};

const validateWithinHours = (scheduledAt, hours, durationMinutes) => {
  if (!hours || hours.isClosed) return { ok: false, error: 'Clinic is closed for this day' };

  const openMinutes = parseTimeToMinutes(hours.openTime);
  const closeMinutes = parseTimeToMinutes(hours.closeTime);
  if (openMinutes === null || closeMinutes === null) {
    return { ok: false, error: 'Clinic hours are not configured' };
  }

  const startMinutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
  const endMinutes = startMinutes + durationMinutes;

  if (startMinutes < openMinutes || endMinutes > closeMinutes) {
    return { ok: false, error: 'Appointment time is outside clinic hours' };
  }

  const slotMinutes = hours.slotMinutes || durationMinutes;
  if ((startMinutes - openMinutes) % slotMinutes !== 0) {
    return { ok: false, error: 'Appointment time is not aligned to slot duration' };
  }

  return { ok: true };
};

const ensureNoOverlap = async (dateStr, scheduledAt, durationMinutes, excludeId = null) => {
  const range = getDayRange(dateStr);
  if (!range) return { ok: false, error: 'Invalid appointment date' };

  const dayAppointments = await prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: range.start, lt: range.end },
      status: { not: 'cancelled' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const start = scheduledAt.getTime();
  const end = start + durationMinutes * 60 * 1000;

  const hasOverlap = dayAppointments.some((appt) => {
    const apptStart = new Date(appt.scheduledAt).getTime();
    const apptEnd = apptStart + (appt.durationMinutes || durationMinutes) * 60 * 1000;
    return start < apptEnd && end > apptStart;
  });

  if (hasOverlap) {
    return { ok: false, error: 'Appointment time is already booked' };
  }
  return { ok: true };
};

export const getAppointments = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) {
    const all = await prisma.appointment.findMany({
      include: { patient: { select: { id: true, name: true, nationalID: true, phone: true } } },
      orderBy: { scheduledAt: 'asc' },
    });
    return res.json(all);
  }

  const range = getDayRange(date);
  if (!range) return res.status(400).json({ error: 'Invalid date' });

  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: range.start, lt: range.end } },
    include: { patient: { select: { id: true, name: true, nationalID: true, phone: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(appointments);
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointment = await prisma.appointment.findUnique({
    where: { id: parseInt(id, 10) },
    include: { patient: { select: { id: true, name: true, nationalID: true, phone: true } } },
  });
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  res.json(appointment);
});

export const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, scheduledAt, visitType = 'consultation', isNewPatient = false, notes } = req.body;
  if (!patientId || !scheduledAt) {
    return res.status(400).json({ error: 'patientId and scheduledAt are required' });
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ error: 'Invalid scheduledAt' });
  }

  const hours = await getClinicHoursForDate(scheduledAt);
  if (!hours) return res.status(400).json({ error: 'Clinic hours not configured' });

  const durationMinutes = hours.slotMinutes || 20;
  const withinHours = validateWithinHours(scheduledDate, hours, durationMinutes);
  if (!withinHours.ok) return res.status(400).json({ error: withinHours.error });

  const overlapCheck = await ensureNoOverlap(scheduledAt, scheduledDate, durationMinutes);
  if (!overlapCheck.ok) return res.status(409).json({ error: overlapCheck.error });

  const appointment = await prisma.appointment.create({
    data: {
      patientId: parseInt(patientId, 10),
      scheduledAt: scheduledDate,
      durationMinutes,
      visitType,
      status: 'booked',
      isNewPatient: Boolean(isNewPatient),
      notes: notes || null,
    },
    include: { patient: { select: { id: true, name: true, nationalID: true, phone: true } } },
  });

  res.status(201).json(appointment);
});

export const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointmentId = parseInt(id, 10);

  const existing = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!existing) return res.status(404).json({ error: 'Appointment not found' });

  const { scheduledAt, visitType, isNewPatient, notes, status } = req.body;
  let updateData = {};

  if (typeof visitType !== 'undefined') updateData.visitType = visitType;
  if (typeof isNewPatient !== 'undefined') updateData.isNewPatient = Boolean(isNewPatient);
  if (typeof notes !== 'undefined') updateData.notes = notes || null;
  if (typeof status !== 'undefined') updateData.status = status;

  if (scheduledAt) {
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduledAt' });
    }
    const hours = await getClinicHoursForDate(scheduledAt);
    if (!hours) return res.status(400).json({ error: 'Clinic hours not configured' });

    const durationMinutes = hours.slotMinutes || existing.durationMinutes || 20;
    const withinHours = validateWithinHours(scheduledDate, hours, durationMinutes);
    if (!withinHours.ok) return res.status(400).json({ error: withinHours.error });

    const overlapCheck = await ensureNoOverlap(scheduledAt, scheduledDate, durationMinutes, appointmentId);
    if (!overlapCheck.ok) return res.status(409).json({ error: overlapCheck.error });

    updateData = { ...updateData, scheduledAt: scheduledDate, durationMinutes };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
    include: { patient: { select: { id: true, name: true, nationalID: true, phone: true } } },
  });
  res.json(updated);
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointmentId = parseInt(id, 10);

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'cancelled' },
  });
  res.json(updated);
});

export const checkInAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const appointmentId = parseInt(id, 10);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

  if (appointment.status === 'cancelled') {
    return res.status(400).json({ error: 'Cancelled appointments cannot be checked in' });
  }
  if (appointment.queueId) {
    return res.json({ message: 'Appointment already checked in', appointment });
  }

  const today = new Date();
  const scheduledDate = new Date(appointment.scheduledAt);
  if (scheduledDate.toDateString() !== today.toDateString()) {
    return res.status(400).json({ error: 'Check-in is only allowed on the appointment day' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const maxPosition = await tx.queue.aggregate({
      where: {
        status: { in: ['waiting', 'in_progress'] },
        queuedAt: { gte: dayStart, lt: dayEnd },
      },
      _max: { position: true },
    });
    const position = (maxPosition._max.position || 0) + 1;

    const queueEntry = await tx.queue.create({
      data: {
        patientId: appointment.patientId,
        position,
        reason: appointment.notes || null,
        priority: appointment.visitType,
        status: 'waiting',
      },
      include: { patient: { select: { name: true, phone: true, nationalID: true, age: true, gender: true } } },
    });

    const visit = await tx.visit.create({
      data: {
        patientId: appointment.patientId,
        doctorUsername: 'Dr. Khaled El Banna',
        status: 'pending',
        chiefComplaint: appointment.notes || null,
        visitType: appointment.visitType,
      },
    });

    const updatedAppointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: 'checked_in', queueId: queueEntry.id, visitId: visit.id },
    });

    return { queueEntry, visit, updatedAppointment };
  });

  res.json({
    message: 'Appointment checked in and added to queue',
    appointment: result.updatedAppointment,
    queue: result.queueEntry,
    visit: result.visit,
  });
  io.emit('queueUpdated');
});
