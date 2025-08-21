const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  medicalId: String, // present for doctors
  cardNumber: String, // present for patients
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['patient', 'doctor'] },
  // relations
  primaryDoctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }], // for patients
  primaryPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }], // for doctors
});

// Ensure a doctor's medicalId is unique among doctors
// Partial index avoids applying to patients with no medicalId
try {
  userSchema.index(
    { role: 1, medicalId: 1 },
    { unique: true, partialFilterExpression: { role: 'doctor', medicalId: { $type: 'string' } } }
  );
  userSchema.index(
    { role: 1, cardNumber: 1 },
    { unique: true, partialFilterExpression: { role: 'patient', cardNumber: { $type: 'string' } } }
  );
} catch (_) {
  // ignore redefinition in hot reload
}

const User = mongoose.models.User || mongoose.model('User', userSchema);

exports.registerPatient = async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  // generate unique card number for patient
  let cardNumber;
  for (let i = 0; i < 7; i++) {
    const candidate = 'PT' + Math.floor(10_0000_0000 + Math.random() * 89_9999_9999).toString(); // PT + 10-digit number
    // Ensure uniqueness among patients
    const taken = await User.exists({ role: 'patient', cardNumber: candidate });
    if (!taken) {
      cardNumber = candidate;
      break;
    }
  }
  if (!cardNumber) return res.status(500).json({ message: 'Could not generate card number' });

  const u = new User({ name, phone, email, passwordHash: hash, role: 'patient', cardNumber, primaryDoctors: [] });
  await u.save();
  return res.json({ message: 'Patient registered', user: { id: u._id, name: u.name, email: u.email, cardNumber: u.cardNumber } });
};

exports.registerDoctor = async (req, res) => {
  const { name, phone, medicalId, email, password } = req.body;
  if (!name || !phone || !medicalId || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ name, phone, medicalId, email, passwordHash: hash, role: 'doctor', primaryPatients: [] });
  await u.save();
  return res.json({ message: 'Doctor registered', user: { id: u._id, name: u.name, email: u.email } });
};

exports.loginPatient = async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email, role: 'patient' });
  if (!u) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, u.passwordHash || '');
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  return res.json({ message: 'Login OK', user: { id: u._id, name: u.name, role: u.role, cardNumber: u.cardNumber }, token });
};

exports.loginDoctor = async (req, res) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email, role: 'doctor' });
  if (!u) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, u.passwordHash || '');
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
  return res.json({ message: 'Login OK', user: { id: u._id, name: u.name, role: u.role }, token });
};

// Middleware to protect routes
exports.authRequired = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Find doctor by medical ID
exports.findDoctorByMedicalId = async (req, res) => {
  const { medicalId } = req.params;
  if (!medicalId) return res.status(400).json({ message: 'medicalId is required' });
  const doc = await User.findOne({ role: 'doctor', medicalId });
  if (!doc) return res.status(404).json({ message: 'Doctor not found' });
  return res.json({ doctor: { id: doc._id, name: doc.name, email: doc.email, medicalId: doc.medicalId } });
};

// Patient adds a primary doctor by medicalId (only one allowed)
exports.addPrimaryDoctor = async (req, res) => {
  const { medicalId } = req.body || {};
  if (!medicalId) return res.status(400).json({ message: 'medicalId is required' });
  try {
    // Ensure the caller is a patient
    const patient = await User.findById(req.userId);
    if (!patient || patient.role !== 'patient') return res.status(403).json({ message: 'Only patients can add a primary doctor' });

    const doctor = await User.findOne({ role: 'doctor', medicalId });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Prevent a patient from adding themselves (in case of test data overlap)
    if (String(doctor._id) === String(patient._id)) {
      return res.status(400).json({ message: 'You cannot add yourself as a doctor' });
    }

    // Enforce only one primary doctor: block if already set
    if (Array.isArray(patient.primaryDoctors) && patient.primaryDoctors.length > 0) {
      return res.status(400).json({ message: 'Primary doctor already set. Remove the current one to add another.' });
    }

    // Link the new doctor <-> patient
    await User.updateOne({ _id: patient._id }, { $addToSet: { primaryDoctors: doctor._id } });
    await User.updateOne({ _id: doctor._id }, { $addToSet: { primaryPatients: patient._id } });

    const updatedPatient = await User.findById(patient._id).populate('primaryDoctors', 'name email medicalId');
    return res.json({ message: 'Doctor added as primary', primaryDoctors: updatedPatient.primaryDoctors });
  } catch (e) {
    console.error('addPrimaryDoctor error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Patient removes their primary doctor by medicalId
exports.removePrimaryDoctor = async (req, res) => {
  const { medicalId } = req.params || {};
  if (!medicalId) return res.status(400).json({ message: 'medicalId is required' });
  try {
    const patient = await User.findById(req.userId);
    if (!patient || patient.role !== 'patient') return res.status(403).json({ message: 'Only patients can remove a primary doctor' });

    const doctor = await User.findOne({ role: 'doctor', medicalId });
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    // Remove links on both sides
    await User.updateOne({ _id: patient._id }, { $pull: { primaryDoctors: doctor._id } });
    await User.updateOne({ _id: doctor._id }, { $pull: { primaryPatients: patient._id } });

    const updatedPatient = await User.findById(patient._id).populate('primaryDoctors', 'name email medicalId');
    return res.json({ message: 'Primary doctor removed', primaryDoctors: updatedPatient.primaryDoctors });
  } catch (e) {
    console.error('removePrimaryDoctor error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.User = User;

// --- Patient Records (encrypted) ---
const patientRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // doctor
    accessTier: { type: String, enum: ['early', 'emergency', 'critical'], required: true },
    // encrypted blob: we store ciphertext + iv + authTag; metadata minimal
    enc: {
      iv: String,
      tag: String,
      data: String,
    },
    files: [
      {
        name: String,
        mime: String,
        // store encrypted base64 payloads
        enc: {
          iv: String,
          tag: String,
          data: String,
        },
      },
    ],
  },
  { timestamps: true }
);

const PatientRecord = mongoose.models.PatientRecord || mongoose.model('PatientRecord', patientRecordSchema);

// simple AES-GCM encryption utilities
function getKey() {
  const key = (process.env.RECORDS_KEY || 'records_dev_key_32_bytes_records_dev_').slice(0, 32);
  return Buffer.from(key.padEnd(32, '0'));
}
function encryptJson(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(obj));
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString('base64'), tag: tag.toString('base64'), data: enc.toString('base64') };
}
function decryptJson(enc) {
  const iv = Buffer.from(enc.iv, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const data = Buffer.from(enc.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString('utf8'));
}

exports.createPatientRecord = async (req, res) => {
  try {
    // only doctors
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can add records' });

    const { patientId } = req.params;
    const { accessTier, name, age, bloodGroup, allergies, conditions, emergencyContacts, medications, criticalNotes, surgeries, historySummary } = req.body;
    if (!patientId || !accessTier) return res.status(400).json({ message: 'patientId and accessTier are required' });
    if (!['early', 'emergency', 'critical'].includes(accessTier)) return res.status(400).json({ message: 'Invalid accessTier' });

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });

    // Encrypt structured data according to access tier
    let payload = {};
    if (accessTier === 'early') {
      payload = { name, age, bloodGroup, allergies, conditions, emergencyContacts };
    } else if (accessTier === 'emergency') {
      payload = { medications, criticalNotes, surgeries, historySummary };
    } else if (accessTier === 'critical') {
      payload = { fullProfile: { medications, criticalNotes, surgeries, historySummary } };
    }

    const enc = encryptJson(payload);

    // Encrypt files (if any)
    const files = (req.files || []).map((f) => {
      const encFile = encryptJson({ name: f.originalname, mime: f.mimetype, data: f.buffer.toString('base64') });
      return { name: f.originalname, mime: f.mimetype, enc: encFile };
    });

    const rec = new PatientRecord({ patient: patient._id, createdBy: doctor._id, accessTier, enc, files });
    await rec.save();
    return res.json({ message: 'Record added', recordId: rec._id });
  } catch (e) {
    console.error('createPatientRecord error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// --- Access Requests ---
const accessRequestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tier: { type: String, enum: ['emergency', 'critical'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const AccessRequest = mongoose.models.AccessRequest || mongoose.model('AccessRequest', accessRequestSchema);

// Doctor creates an access request
exports.createAccessRequest = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can request access' });
    const { patientId } = req.params;
    const { tier } = req.body || {};
    if (!patientId || !tier) return res.status(400).json({ message: 'patientId and tier are required' });
    if (!['emergency', 'critical'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });

    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });

    let status = 'pending';
    let expiresAt = undefined;
    if (tier === 'emergency') {
      status = 'approved';
      expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }

    const ar = new AccessRequest({ patient: patient._id, requesterDoctor: doctor._id, tier, status, expiresAt });
    await ar.save();

    // TODO: notify primary doctor via email
    console.log(`[notify] Access request ${ar._id} for ${tier} by Dr.${doctor.name} for patient ${patient.name}`);

    return res.json({ message: 'Access request created', request: { id: ar._id, status: ar.status, expiresAt: ar.expiresAt } });
  } catch (e) {
    console.error('createAccessRequest error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Primary doctor approves critical access
exports.approveAccessRequest = async (req, res) => {
  try {
    const approver = await User.findById(req.userId);
    if (!approver || approver.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can approve' });
    const { id } = req.params;
    const ar = await AccessRequest.findById(id).populate('patient requesterDoctor');
    if (!ar) return res.status(404).json({ message: 'Request not found' });
    if (ar.tier !== 'critical') return res.status(400).json({ message: 'Only critical requests need approval' });

    // verify approver is a primary doctor of the patient
    const isPrimary = await User.exists({ _id: ar.patient._id, primaryDoctors: approver._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can approve' });

    ar.status = 'approved';
    ar.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours validity
    await ar.save();
    return res.json({ message: 'Approved', request: { id: ar._id, status: ar.status, expiresAt: ar.expiresAt } });
  } catch (e) {
    console.error('approveAccessRequest error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Retrieve records with access control
exports.getPatientRecords = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can view records' });
    const { patientId } = req.params;
    const { tier } = req.query;
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });

    // Access rules
    let allowedTiers = new Set();
    if (tier) {
      if (!['early', 'emergency', 'critical'].includes(String(tier))) return res.status(400).json({ message: 'Invalid tier' });
    }

    // Early: visible to any registered doctor
    allowedTiers.add('early');

    const now = new Date();
    const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
    if (isPrimary) {
      // Primary doctor can view all tiers
      allowedTiers.add('emergency');
      allowedTiers.add('critical');
    } else {
      // Non-primary: must have approved requests within time
      const reqs = await AccessRequest.find({ patient: patient._id, requesterDoctor: doctor._id, status: 'approved', expiresAt: { $gt: now } });
      for (const r of reqs) allowedTiers.add(r.tier);
    }

    const q = { patient: patient._id };
    if (tier) q.accessTier = tier;
    const recs = await PatientRecord.find(q).sort({ createdAt: -1 });

    const filtered = recs.filter((r) => allowedTiers.has(r.accessTier));
    const result = filtered.map((r) => ({
      id: r._id,
      accessTier: r.accessTier,
      createdAt: r.createdAt,
      data: decryptJson(r.enc),
      files: (r.files || []).map((f) => {
        const dec = decryptJson(f.enc);
        return { name: f.name, mime: f.mime, dataBase64: dec.data };
      })
    }));

    return res.json({ records: result });
  } catch (e) {
    console.error('getPatientRecords error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};
