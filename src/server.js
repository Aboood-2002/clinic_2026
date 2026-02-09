import express from 'express';
import cors from 'cors';
import http from 'http';
import { initSocket } from './socket/socket.js';

import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patients.routes.js';
import visitRoutes from './routes/visits.routes.js';
import queuesRoutes from './routes/queues.routes.js';
import prescriptionsRoutes from './routes/prescriptions.routes.js';
import clinicHoursRoutes from './routes/clinicHours.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import { notFound, errorHandler } from "./middlewares/errors.middleware.js"

import dotenv from 'dotenv';

dotenv.config()


const app = express();

const server = http.createServer(app);
initSocket(server); // ← This sets up io and attaches it

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/queues', queuesRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/clinic-hours', clinicHoursRoutes);
app.use('/api/appointments', appointmentsRoutes);

// Error handler middleware

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
