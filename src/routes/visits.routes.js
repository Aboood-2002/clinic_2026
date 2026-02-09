// routes/visits.routes.js
import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import {getAllVisits,getVisit,updateAVisit,deleteVisit} from '../controllers/visits.controller.js'

const router = express.Router();


// GET all visits (for doctors & admins - dashboard/overview)
router.get('/', authenticate,getAllVisits );

// GET all visits for a specific patient (used in patient details page)
//router.get('/patient/:patientId', authenticate,);

// GET single visit by ID
router.get('/:id', authenticate,getVisit);

// UPDATE visit (doctor can update diagnosis/notes, receptionist can update status)
router.put('/:id', authenticate,updateAVisit);

// DELETE visit (admin only)
router.delete('/:id', authenticate, authorize(['admin','doctor']),deleteVisit);

export default router;