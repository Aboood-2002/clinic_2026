import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler'
import { io } from '../socket/socket.js';

export const addToQueue = asyncHandler(async (req, res) => {
  const { patientId, reason, priority = 'normal' } = req.body;
  const visitType = priority === 'consultation' ? 'consultation' : 'examination';

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required' });
  }

  const validPriorities = ['normal', 'high', 'urgent', 'consultation', 'examination'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority' });
  }

  try {
    //Get today's date range to reset positions daily
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const maxPosition = await prisma.queue.aggregate({
      where: { 
        status: { in: ['waiting', 'in_progress'] },
        queuedAt: {
          gte: today,
          lt: tomorrow,
        }
      },
      _max: { position: true },
    });
    const position = (maxPosition._max.position || 0) + 1;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create queue entry
      const queueEntry = await tx.queue.create({
        data: {
          patientId,
          position,
          reason: reason || null,
          priority,
          status: 'waiting',
        },
        include: {
          patient: { select: { name: true, phone: true, nationalID: true, age: true, gender: true } },
        },
      });

      // 2. Auto-create pending visit
      const visit = await tx.visit.create({
        data: {
          patientId,
          doctorUsername: "Dr. Khaled El Banna",
          status: 'pending',
          chiefComplaint: reason || null,
          visitType,
        },
      });

      return { queueEntry, visit };
    });

    res.status(201).json({
      message: 'Patient added to queue and visit created',
      queue: result.queueEntry,
      visit: result.visit,
      prescription: null,
    });
    io.emit('queueUpdated');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add to queue' });
  }
});

export const getAllQueues = asyncHandler(async (req, res) => {
  try {
    const queue = await prisma.queue.findMany({
      where: { status: { in: ['waiting', 'in_progress'] } },
      include: {
        patient: { select: { name: true, phone: true, age: true, gender: true, nationalID: true } },
      },
      orderBy: [
        { priority: 'desc' },  // urgent > high > normal
        { position: 'asc' },
      ],
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET QUEUE STATS
export const getQueueStats = asyncHandler(async (req, res) => {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = await prisma.queue.groupBy({
      by: ['status', 'priority'],
      where: {
        queuedAt: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['waiting', 'in_progress', 'completed'] },
      },
      _count: {
        _all: true,
      },
    });

    // Transform to frontend format
    const result = {
      total: 0,
      waiting: 0,
      inProgress: 0,
      completed: 0,
      consultationTotal: 0,
      visitTotal: 0,
      completedConsultations: 0,
      completedVisits: 0,
    };

    stats.forEach(stat => {
      const count = stat._count._all;
      result.total += count;
      if (stat.status === 'waiting') result.waiting += count;
      if (stat.status === 'in_progress') result.inProgress += count;
      if (stat.status === 'completed') result.completed += count;
      if (stat.priority === 'consultation') result.consultationTotal += count;
      if (stat.priority !== 'consultation') result.visitTotal += count;
      if (stat.status === 'completed' && stat.priority === 'consultation') result.completedConsultations += count;
      if (stat.status === 'completed' && stat.priority !== 'consultation') result.completedVisits += count;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// START VISIT
export const updateStartQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.queue.update({
      where: { id: parseInt(id) },
      data: { status: 'in_progress' },
      include: { patient: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// COMPLETE VISIT
export const updateCompleteQueue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const queueId = parseInt(id);

  if (isNaN(queueId)) {
    return res.status(400).json({ error: 'Invalid queue ID' });
  }

  try {
    // Use a transaction to update both queue and visit atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the queue entry to find its position
      const queueEntry = await tx.queue.findUnique({
        where: { id: queueId },
        include: { patient: { select: { id: true, name: true } } },
      });

      if (!queueEntry) {
        throw new Error('Queue entry not found');
      }

      const completedPosition = queueEntry.position;

      // 2. Update queue status to 'completed'
      const updatedQueue = await tx.queue.update({
        where: { id: queueId },
        data: { status: 'completed' },
        include: { patient: { select: { id: true, name: true } } },
      });

      // 3. Recalculate positions for remaining entries
      // Get all queue entries with position greater than the completed one
      const remainingQueues = await tx.queue.findMany({
        where: {
          status: { in: ['waiting', 'in_progress'] },
          position: { gt: completedPosition }
        },
        orderBy: { position: 'asc' }
      });

      // Update each position to be one less
      for (const q of remainingQueues) {
        await tx.queue.update({
          where: { id: q.id },
          data: { position: q.position - 1 }
        });
      }

      // 4. Find the associated pending visit for this patient
      // (Most recent pending visit — safe for one-doctor clinic)
      const pendingVisit = await tx.visit.findFirst({
        where: {
          patientId: queueEntry.patientId,
          status: 'pending',
        },
        orderBy: { visitDate: 'desc' },
      });

      let updatedVisit = null;
      let createdPrescription = null;

      // 5. If a pending visit exists → mark it as completed and align visit type with queue priority
      if (pendingVisit) {
        const resolvedVisitType = queueEntry.priority === 'consultation' ? 'consultation' : 'examination';
        updatedVisit = await tx.visit.update({
          where: { id: pendingVisit.id },
          data: { status: 'completed', visitType: resolvedVisitType },
          include: {
            patient: { select: { name: true } },
          },
        });

        const existingPrescription = await tx.prescription.findFirst({
          where: { visitId: pendingVisit.id },
        });
        if (!existingPrescription) {
          createdPrescription = await tx.prescription.create({
            data: {
              visitId: pendingVisit.id,
              additionalNotes: null,
            },
          });
        }

        await tx.appointment.updateMany({
          where: { visitId: pendingVisit.id },
          data: { status: 'completed' },
        });
      }

      return { updatedQueue, updatedVisit, createdPrescription };
    });

    // Emit Socket.io event to update waiting room display
    io.emit('queue-updated');

    res.json({
      message: 'Queue and visit completed successfully',
      queue: result.updatedQueue,
      visit: result.updatedVisit || null, // null if no pending visit found
      prescription: result.createdPrescription || null,
    });
  } catch (error) {
    console.error('Complete queue error:', error);
    res.status(500).json({ error: 'Failed to complete queue and visit' });
  }
});



export const deleteFromQueue = asyncHandler(async (req, res) => {
  const queueId = parseInt(req.params.id);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const queueEntry = await tx.queue.findUnique({
        where: { id: queueId },
        include: { patient: true },
      });

      if (!queueEntry) throw new Error('Queue entry not found');

      const deletedPosition = queueEntry.position;

      // 1. Delete queue entry
      await tx.queue.delete({ where: { id: queueId } });

      // 2. Recalculate positions for remaining entries
      // Get all queue entries with position greater than the deleted one
      const remainingQueues = await tx.queue.findMany({
        where: {
          status: { in: ['waiting', 'in_progress'] },
          position: { gt: deletedPosition }
        },
        orderBy: { position: 'asc' }
      });

      // Update each position to be one less
      for (const q of remainingQueues) {
        await tx.queue.update({
          where: { id: q.id },
          data: { position: q.position - 1 }
        });
      }

      // 3. Find associated visit
      const visit = await tx.visit.findFirst({
        where: {
          patientId: queueEntry.patientId,
          status: { in: ['pending', 'in_progress'] },
        },
        orderBy: { visitDate: 'desc' },
      });

      if (visit) {
        // 4. Delete associated prescription
        await tx.prescription.deleteMany({
          where: { visitId: visit.id },
        });

        // 5. Update visit status to 'cancelled' (don't delete)
        const updatedVisit = await tx.visit.update({
          where: { id: visit.id },
          data: { status: 'cancelled' },
        });

        return updatedVisit;
      }

      return null;
    });

    // Emit Socket.io event to update waiting room display
    io.emit('queue-updated');

    res.json({
      message: 'Patient removed from queue, prescription deleted, and visit cancelled',
      cancelledVisit: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove from queue' });
  }
});
