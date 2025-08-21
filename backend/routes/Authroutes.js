const express = require('express');
const router = express.Router();
const controller = require('../controller/authcontroller');

router.post('/register/patient', controller.registerPatient);
router.post('/register/doctor', controller.registerDoctor);
router.post('/login/patient', controller.loginPatient);
router.post('/login/doctor', controller.loginDoctor);

module.exports = router;
