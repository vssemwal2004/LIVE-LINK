const express = require('express');
const router = express.Router();
const { authRequired } = require('../controller/authcontroller');
const recordsController = require('../controller/recordscontroller');

// Doctor adds details for a patient (multipart)
router.post('/:patientId/early', authRequired, recordsController.uploadAny, recordsController.addEarlyAccess);
router.post('/:patientId/emergency', authRequired, recordsController.uploadAny, recordsController.addEmergencyAccess);
router.post('/:patientId/critical', authRequired, recordsController.uploadAny, recordsController.addCriticalAccess);

module.exports = router;