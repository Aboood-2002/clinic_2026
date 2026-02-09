import express from 'express';
import { getPatients, createPatient,getPatientById,updatePatient,deletePatient } from '../controllers/patients.controller.js';
import  { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createPatientSchema,
  updatePatientSchema,
} from '../validations/patient.validation.js';
const router = express.Router();

router.get('/',authenticate,getPatients);


router.post('/',authenticate,validate(createPatientSchema),createPatient);


router.get('/:id',authenticate,getPatientById);


router.put('/:id',authenticate,validate(updatePatientSchema),updatePatient)


router.delete('/:id',authenticate,authorize(['admin','doctor']),deletePatient)

export default router;
