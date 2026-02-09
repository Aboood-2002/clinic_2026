// import prisma from '../prismaClient.js';
// import asyncHandler from 'express-async-handler'



// // CREATE PRESCRIPTION (empty or with meds)
// export const createPrescription = asyncHandler(async (req, res) => {
//   const { visitId, additionalNotes, medications } = req.body;

//   // Allow empty medications (doctor can add later)
//   if (!visitId) {
//     return res.status(400).json({ error: 'visitId is required' });
//   }

//   try {
//     const prescription = await prisma.prescription.create({
//       data: {
//         visitId,
//         additionalNotes: additionalNotes || null,
//         medications: medications && medications.length > 0
//           ? {
//               create: medications.map(med => ({
//                 name: med.name,
//                 dosage: med.dosage || null,
//                 frequency: med.frequency || null,
//                 duration: med.duration || null,
//                 instructions: med.instructions || null,
//               })),
//             }
//           : undefined,
//       },
//       include: {
//         visit: {
//           include: {
//             patient: {
//               select: {
//                 name: true,
//                 nationalId: true,
//                 phone: true,
//                 age: true,
//                 gender: true,
//                 email: true,
//               },
//             },
//           },
//         },
//         medications: true,
//       },
//     });

//     // Attach doctorUsername for frontend/print
//     const response = {
//       ...prescription,
//       doctorName: prescription.visit.doctorUsername || 'Dr. Unknown',
//     };

//     res.status(201).json(response);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET ALL PRESCRIPTIONS (list view) with pagination
// export const getAllPrescriptions = asyncHandler(async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const [prescriptions, total] = await Promise.all([
//       prisma.prescription.findMany({
//         include: {
//           visit: {
//             include: {
//               patient: { select: { name: true } },
//             },
//           },
//           _count: { select: { medications: true } },
//         },
//         orderBy: { prescribedAt: 'desc' },
//         skip,
//         take: limit,
//       }),
//       prisma.prescription.count(),
//     ]);

//     const formatted = prescriptions.map(p => ({
//       id: p.id,
//       date: p.prescribedAt,
//       patientName: p.visit.patient.name,
//       doctorName: p.visit.doctorUsername || 'Dr. Unknown',
//       medicationCount: p._count.medications,
//       additionalNotes: p.additionalNotes,
//     }));

//     res.json({
//       data: formatted,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET PATIENT PRESCRIPTIONS (by patient ID)
// export const getPatientPrescriptions = asyncHandler(async (req, res) => {
//   try {
//     const patientId = parseInt(req.params.patientId);

//     const prescriptions = await prisma.prescription.findMany({
//       where: {
//         visit: {
//           patientId: patientId,
//         },
//       },
//       include: {
//         visit: {
//           include: {
//             patient: { select: { name: true } },
//           },
//         },
//         _count: { select: { medications: true } },
//       },
//       orderBy: { prescribedAt: 'desc' },
//     });

//     const formatted = prescriptions.map(p => ({
//       id: p.id,
//       date: p.prescribedAt,
//       patientName: p.visit.patient.name,
//       doctorName: p.visit.doctorUsername || 'Dr. Unknown',
//       medicationCount: p._count.medications,
//       additionalNotes: p.additionalNotes,
//     }));

//     res.json(formatted);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // GET SINGLE PRESCRIPTION (for edit/print)
// export const getPrescription = asyncHandler(async (req, res) => {
//   try {
//     const prescription = await prisma.prescription.findUnique({
//       where: { id: parseInt(req.params.id) },
//       include: {
//         visit: {
//           include: {
//             patient: {
//               select: {
//                 name: true,
//                 nationalID: true,
//                 phone: true,
//                 age: true,
//                 gender: true,
//               },
//             },
//           },
//         },
//         medications: true,
//       },
//     });

//     if (!prescription) {
//       return res.status(404).json({ error: 'Prescription not found' });
//     }

//     // Attach doctor name for frontend/print
//     const response = {
//       ...prescription,
//       doctorName: prescription.visit.doctorUsername || 'Dr. Unknown',
//     };

//     res.json(response);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // UPDATE PRESCRIPTION
// export const updatePrescription = asyncHandler(async (req, res) => {
//   const { additionalNotes, medications } = req.body;

//   try {
//     // Delete old medications
//     await prisma.medication.deleteMany({
//       where: { prescriptionId: parseInt(req.params.id) },
//     });

//     const updated = await prisma.prescription.update({
//       where: { id: parseInt(req.params.id) },
//       data: {
//         additionalNotes: additionalNotes || null,
//         medications: medications && medications.length > 0
//           ? { create: medications }
//           : undefined,
//       },
//       include: {
//         visit: {
//           include: {
//             patient: {
//               select: {
//                 name: true,
//                 nationalID: true,
//                 phone: true,
//               },
//             },
//           },
//         },
//         medications: true,
//       },
//     });

//     const response = {
//       ...updated,
//       doctorName: updated.visit.doctorUsername || 'Dr. Unknown',
//     };

//     res.json(response);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // DELETE PRESCRIPTION
// export const deletePrescription = asyncHandler(async (req, res) => {
//   try {
//     await prisma.prescription.delete({
//       where: { id: parseInt(req.params.id) },
//     });
//     res.json({ message: 'Prescription deleted' });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler'



// CREATE PRESCRIPTION (empty or with meds)
export const createPrescription = asyncHandler(async (req, res) => {
  const { visitId, additionalNotes, medications, consultationDate } = req.body;

  // Allow empty medications (doctor can add later)
  if (!visitId) {
    return res.status(400).json({ error: 'visitId is required' });
  }

  try {
    const prescription = await prisma.prescription.create({
      data: {
        visitId,
        additionalNotes: additionalNotes || null,
        consultationDate: consultationDate ? new Date(consultationDate) : undefined,
        medications: medications && medications.length > 0
          ? {
              create: medications.map(med => ({
                name: med.name,
                dosage: med.dosage || null,
                frequency: med.frequency || null,
                duration: med.duration || null,
                instructions: med.instructions || null,
              })),
            }
          : undefined,
      },
      include: {
        visit: {
          include: {
            patient: {
              select: {
                name: true,
                nationalId: true,
                phone: true,
                age: true,
                gender: true,
                email: true,
              },
            },
          },
        },
        medications: true,
      },
    });

    // Attach doctorUsername for frontend/print
    const response = {
      ...prescription,
      doctorName: prescription.visit.doctorUsername || 'Dr. Unknown',
    };

    res.status(201).json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// GET ALL PRESCRIPTIONS (list view) with pagination
export const getAllPrescriptions = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        include: {
          visit: {
            include: {
              patient: { select: { name: true } },
            },
          },
          _count: { select: { medications: true } },
        },
        orderBy: { prescribedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.prescription.count(),
    ]);

    const formatted = prescriptions.map(p => ({
      id: p.id,
      date: p.consultationDate,
      consultationDate: p.consultationDate,
      patientName: p.visit.patient.name,
      doctorName: p.visit.doctorUsername || 'Dr. Unknown',
      medicationCount: p._count.medications,
      additionalNotes: p.additionalNotes,
    }));

    res.json({
      data: formatted,
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

// GET PATIENT PRESCRIPTIONS (by patient ID)
export const getPatientPrescriptions = asyncHandler(async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);

    const prescriptions = await prisma.prescription.findMany({
      where: {
        visit: {
          patientId: patientId,
        },
      },
      include: {
        visit: {
          include: {
            patient: { select: { name: true } },
          },
        },
        _count: { select: { medications: true } },
      },
      orderBy: { prescribedAt: 'desc' },
    });

    const formatted = prescriptions.map(p => ({
      id: p.id,
      date: p.consultationDate,
      consultationDate: p.consultationDate,
      patientName: p.visit.patient.name,
      doctorName: p.visit.doctorUsername || 'Dr. Unknown',
      medicationCount: p._count.medications,
      additionalNotes: p.additionalNotes,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET SINGLE PRESCRIPTION (for edit/print)
export const getPrescription = asyncHandler(async (req, res) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        visit: {
          include: {
            patient: {
              select: {
                name: true,
                nationalID: true,
                phone: true,
                age: true,
                gender: true,
              },
            },
          },
        },
        medications: true,
      },
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Attach doctor name for frontend/print
    const response = {
      ...prescription,
      doctorName: prescription.visit.doctorUsername || 'Dr. Unknown',
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE PRESCRIPTION
export const updatePrescription = asyncHandler(async (req, res) => {
  const { additionalNotes, medications, consultationDate } = req.body;

  try {
    // Delete old medications
    await prisma.medication.deleteMany({
      where: { prescriptionId: parseInt(req.params.id) },
    });

    const updated = await prisma.prescription.update({
      where: { id: parseInt(req.params.id) },
      data: {
        additionalNotes: additionalNotes || null,
        consultationDate: consultationDate === null
          ? null
          : consultationDate
            ? new Date(consultationDate)
            : undefined,
        medications: medications && medications.length > 0
          ? { create: medications }
          : undefined,
      },
      include: {
        visit: {
          include: {
            patient: {
              select: {
                name: true,
                nationalID: true,
                phone: true,
              },
            },
          },
        },
        medications: true,
      },
    });

    const response = {
      ...updated,
      doctorName: updated.visit.doctorUsername || 'Dr. Unknown',
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE PRESCRIPTION
export const deletePrescription = asyncHandler(async (req, res) => {
  try {
    await prisma.prescription.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Prescription deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
