const express = require('express');
const router = express.Router();
const controller = require('../controller/authcontroller');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/register/patient', controller.registerPatient);
router.post('/register/doctor', controller.registerDoctor);
router.post('/login/patient', controller.loginPatient);
router.post('/login/doctor', controller.loginDoctor);

// doctor search
router.get('/doctor/by-medical/:medicalId', controller.authRequired, controller.findDoctorByMedicalId);
// add primary doctor for a patient
router.post('/patient/add-primary-doctor', controller.authRequired, controller.addPrimaryDoctor);
// remove primary doctor for a patient
router.delete('/patient/primary-doctor/:medicalId', controller.authRequired, controller.removePrimaryDoctor);

// doctor adds patient records (encrypted) with optional files
router.post(
	'/doctor/patient/:patientId/records',
	controller.authRequired,
	upload.array('files', 10),
	controller.createPatientRecord
);

// access requests and retrieval
router.post('/doctor/patient/:patientId/access-request', controller.authRequired, controller.createAccessRequest);
router.post('/doctor/access-request/:id/approve', controller.authRequired, controller.approveAccessRequest);
router.get('/doctor/patient/:patientId/records', controller.authRequired, controller.getPatientRecords);

module.exports = router;
