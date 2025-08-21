const mongoose = require('mongoose');
const crypto = require('crypto');
const multer = require('multer');
const { User } = require('./authcontroller');

// In-memory multer for now; swap to S3/GridFS as needed
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
exports.uploadAny = upload.any();

// Simple symmetric encryption with AES-256-GCM
const ENC_ALGO = 'aes-256-gcm';
const ENC_KEY = (process.env.RECORDS_SECRET || 'records_dev_secret_pad_to_32_bytes_key!!').slice(0, 32);

function encryptObject(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, Buffer.from(ENC_KEY), iv);
  const json = JSON.stringify(obj);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: enc.toString('base64'),
  };
}

function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const recordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['early', 'emergency', 'critical'], index: true },
  payloadHash: { type: String }, // integrity hash of decrypted JSON
    payload: {
      iv: String,
      tag: String,
      data: String,
    },
    files: [
      {
        name: String,
        mimetype: String,
        hash: String,
        // In production, store path or external storage reference instead of buffer
        data: Buffer,
      },
    ],
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null }, // for time-limited emergency access
  },
  { timestamps: true }
);

const Record = mongoose.models.Record || mongoose.model('Record', recordSchema);

async function ensureDoctorCanWrite(req, res, next) {
  // Only doctors can add records
  if (req.userRole !== 'doctor') return res.status(403).json({ message: 'Only doctors can add records' });
  // Ensure this doctor is primary for the patient
  const { patientId } = req.params;
  const patient = await User.findById(patientId).select('primaryDoctors');
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const isPrimary = (patient.primaryDoctors || []).some((id) => String(id) === String(req.userId));
  if (!isPrimary) return res.status(403).json({ message: 'Not authorized: not the patient\'s primary doctor' });
  next();
}

function buildPayloadFromBody(type, body) {
  if (type === 'early') {
    const { name, age, bloodGroup, allergies, conditions, emergencyContacts } = body;
    return { name, age, bloodGroup, allergies, conditions, emergencyContacts };
  }
  if (type === 'emergency') {
    const { medications, notes, recentSurgeries, accidents, historySummary } = body;
    return { medications, notes, recentSurgeries, accidents, historySummary };
  }
  if (type === 'critical') {
    const { fullEhr, chronicConditions, labs, imaging, admissions, longTermTreatments } = body;
    return { fullEhr, chronicConditions, labs, imaging, admissions, longTermTreatments };
  }
  return {};
}

async function saveRecord(req, res, type) {
  try {
    const { patientId } = req.params;
    const patient = patientId;
    const doctor = req.userId;
    // Build JSON payload from body
    const payloadObj = buildPayloadFromBody(type, req.body || {});
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payloadObj)).digest('hex');
    const encPayload = encryptObject(payloadObj);

    // Map files to hashes and buffers
    const files = (req.files || []).map((f) => ({
      name: f.originalname,
      mimetype: f.mimetype,
      hash: hashBuffer(f.buffer),
      data: f.buffer,
    }));

  const rec = new Record({ patient, doctor, type, payloadHash, payload: encPayload, files });
    if (type === 'emergency') {
      // time-limited access; store expiry for auditing/purging
      rec.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    }
    await rec.save();
    return res.json({ message: 'Record saved', recordId: rec._id });
  } catch (e) {
    console.error('saveRecord error', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

exports.addEarlyAccess = [ensureDoctorCanWrite, (req, res) => saveRecord(req, res, 'early')];
exports.addEmergencyAccess = [ensureDoctorCanWrite, (req, res) => saveRecord(req, res, 'emergency')];
exports.addCriticalAccess = [ensureDoctorCanWrite, (req, res) => saveRecord(req, res, 'critical')];
