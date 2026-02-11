import prisma from '../prismaClient.js';
import asyncHandler from 'express-async-handler';

const parseFee = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getFees = () => {
  return {
    consultationFee: parseFee(process.env.CONSULTATION_FEE, 0),
    examinationFee: parseFee(process.env.EXAMINATION_FEE, 0),
  };
};

const buildSummary = async (start, end) => {
  const { consultationFee, examinationFee } = getFees();

  const counts = await prisma.visit.groupBy({
    by: ['visitType'],
    where: {
      status: 'completed',
      visitDate: {
        gte: start,
        lt: end,
      },
    },
    _count: {
      _all: true,
    },
  });

  let consultationCount = 0;
  let examinationCount = 0;

  for (const row of counts) {
    if (row.visitType === 'consultation') consultationCount = row._count._all;
    if (row.visitType === 'examination') examinationCount = row._count._all;
  }

  const consultationRevenue = consultationCount * consultationFee;
  const examinationRevenue = examinationCount * examinationFee;

  return {
    start,
    end,
    consultationCount,
    examinationCount,
    consultationFee,
    examinationFee,
    consultationRevenue,
    examinationRevenue,
    totalRevenue: consultationRevenue + examinationRevenue,
  };
};

const getStartOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getStartOfWeek = (date, weekStart) => {
  const start = getStartOfDay(date);
  const day = start.getDay();
  const offset = (day - weekStart + 7) % 7;
  start.setDate(start.getDate() - offset);
  return start;
};

const getStartOfMonth = (date) => {
  const start = getStartOfDay(date);
  start.setDate(1);
  return start;
};

export const getRevenueReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const weekStartRaw = req.query.weekStart;
  const weekStart = Number.isInteger(Number(weekStartRaw))
    ? Math.min(6, Math.max(0, Number(weekStartRaw)))
    : 0; // 0 = Sunday, 1 = Monday, ...

  const dayStart = getStartOfDay(now);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const weekStartDate = getStartOfWeek(now, weekStart);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 7);

  const monthStart = getStartOfMonth(now);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const [daily, weekly, monthly] = await Promise.all([
    buildSummary(dayStart, dayEnd),
    buildSummary(weekStartDate, weekEndDate),
    buildSummary(monthStart, monthEnd),
  ]);

  res.json({
    generatedAt: now,
    weekStart,
    daily,
    weekly,
    monthly,
  });
});
