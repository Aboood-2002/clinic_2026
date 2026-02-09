import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPatientId() {
  try {
    console.log('🔄 Resetting Patient ID sequence...');

    // Delete all patients (be careful - this deletes all patient data!)
    await prisma.patient.deleteMany({});
    console.log('✅ Deleted all patients');

    // Reset the SQLite autoincrement sequence
    await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name='Patient'`;
    console.log('✅ Reset Patient ID sequence to start from 1');

    console.log('🎉 Patient ID will now start from 1 for new patients!');
  } catch (error) {
    console.error('❌ Error resetting Patient ID:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPatientId();

