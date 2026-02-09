import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler'





export const getAllVisits = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        include: {
          patient: { select: { name: true, phone: true, age: true, gender: true } },
        },
        orderBy: { visitDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.visit.count(),
    ]);

    res.json({
      data: visits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



export const getVisit = asyncHandler(async (req, res) => {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        patient: true,
        prescriptions: {
          include: {
            medications: true,
          },
        },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    res.json(visit);
  } catch (error) {
    console.error('Get single visit error:', error);
    res.status(500).json({ error: error.message });
  }
})


// export const updateAVisit = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const { chiefComplaint, diagnosis, notes, status } = req.body;

//   try {
//     const updatedVisit = await prisma.visit.update({
//       where: { id: parseInt(id) },
//       data: {
//         chiefComplaint,
//         diagnosis,
//         notes,
//         status: status || 'completed',
//       },
//       include: {
//         patient: { 
//           select: { 
//             name: true, 
//             phone: true 
//           } 
//         },
//         prescriptions: {
//           include: { medications: true },
//         },
//       },
//     });

//     res.json(updatedVisit);
//   } catch (error) {
//     console.error('Update visit error:', error);
//     res.status(500).json({ error: error.message });
//   }
// })

export const updateAVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { chiefComplaint, diagnosis, notes, status, visitType } = req.body;

  try {
    const updatedVisit = await prisma.visit.update({
      where: { id: parseInt(id) },
      data: {
        chiefComplaint,
        diagnosis,
        notes,
        status: status || 'completed',
        visitType,
      },
      include: {
        patient: { 
          select: { 
            name: true, 
            phone: true 
          } 
        },
        prescriptions: {
          include: { medications: true },
        },
      },
    });

    res.json(updatedVisit);
  } catch (error) {
    console.error('Update visit error:', error);
    res.status(500).json({ error: error.message });
  }
})

export const deleteVisit = asyncHandler(async (req, res) => {
  try {
    await prisma.visit.delete({ 
      where: { id: parseInt(req.params.id) } 
    });
    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error('Delete visit error:', error);
    res.status(500).json({ error: error.message });
  }
})




// ---Later---
// GET visits for a patient
// router.get('/patient/:patientId', authenticate, async (req, res) => {
//   const { patientId } = req.params;
//   try {
//     const visits = await prisma.visit.findMany({
//       where: { patientId: parseInt(patientId) },
//       include: {
//         prescriptions: { include: { medications: true } },
//       },
//       orderBy: { visitDate: 'desc' },
//     });
//     res.json(visits);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });