const express = require('express');
const router = express.Router();
const controller = require('../controller/authcontroller');

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

module.exports = router;
