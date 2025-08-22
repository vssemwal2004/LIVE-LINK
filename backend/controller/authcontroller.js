const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;
  supabase = createClient(process.env.SUPABASE_URL, serviceKey);
  }
} catch (_) {}

// Supabase helpers: ensure bucket exists and retry uploads
async function ensureSupabaseBucket(bucket, isPublic) {
  if (!supabase) return false;
  try {
    // Try to create (idempotent). If it already exists, treat as success.
    const { error } = await supabase.storage.createBucket(bucket, { public: !!isPublic });
    if (error) {
      const msg = String(error?.message || '').toLowerCase();
      const code = String(error?.statusCode || error?.status || '');
      if (msg.includes('already exists') || code === '409') {
        return true;
      }
      if (code === '403' || msg.includes('row-level security')) {
        console.warn('ensureSupabaseBucket: create failed due to RLS (needs service role key). Set SUPABASE_SERVICE_KEY or create the bucket manually.');
      } else {
        console.warn('ensureSupabaseBucket: create failed', error);
      }
      return false;
    }
    return true;
  } catch (e) {
    console.warn('ensureSupabaseBucket: exception', e);
    return false;
  }
}

async function uploadWithEnsure(bucket, path, buffer, contentType) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const tryUpload = async () => supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: false });
  let { data, error } = await tryUpload();
  if (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('bucket') && msg.includes('not found')) {
      const isPublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
      const ok = await ensureSupabaseBucket(bucket, isPublic);
      if (ok) {
        ({ data, error } = await tryUpload());
      }
    }
  }
  return { data, error };
}

// Proactively ensure the bucket exists on module load (best effort)
(async () => {
  try {
    if (supabase) {
      const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
      const isPublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
      await ensureSupabaseBucket(bucket, isPublic);
    }
  } catch (_) {}
})();

// Sanitize filenames for storage keys
function safeFileName(name = '') {
  try {
    // Keep alnum, dot, dash, underscore; replace others with '_'
    const base = String(name).split(/[\\/]/).pop();
    return base.replace(/[^a-zA-Z0-9._-]/g, '_');
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

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

// Find patient by card number (for doctor search)
exports.findPatientByCard = async (req, res) => {
  const { cardNumber } = req.params;
  if (!cardNumber) return res.status(400).json({ message: 'cardNumber is required' });
  const pat = await User.findOne({ role: 'patient', cardNumber }).select('name email cardNumber');
  if (!pat) return res.status(404).json({ message: 'Patient not found' });
  return res.json({ patient: { id: pat._id, name: pat.name, email: pat.email, cardNumber: pat.cardNumber } });
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
        // or Supabase path
        path: String,
      },
    ],
    sections: [
      {
        label: String,
        enc: { iv: String, tag: String, data: String },
        files: [
          {
            name: String,
            mime: String,
            enc: { iv: String, tag: String, data: String },
            path: String,
          },
        ],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
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

    // Only primary doctor can add critical tier records
    if (accessTier === 'critical') {
      const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
      if (!isPrimary) return res.status(403).json({ message: 'Only the primary doctor can file critical details' });
    }

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

    // Handle files (upload to Supabase if available, else encrypt into DB)
    const files = [];
    for (const f of req.files || []) {
      if (supabase) {
        const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
  const path = `${patient._id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
        const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
        if (error) {
          console.error('Supabase upload error', error);
          return res.status(500).json({ message: 'File upload failed: ' + (error?.message || 'unknown') });
        }
        files.push({ name: f.originalname, mime: f.mimetype, path });
      } else {
        const encFile = encryptJson({ name: f.originalname, mime: f.mimetype, data: f.buffer.toString('base64') });
        files.push({ name: f.originalname, mime: f.mimetype, enc: encFile });
      }
    }

  const rec = new PatientRecord({ patient: patient._id, createdBy: doctor._id, accessTier, enc, files });
    await rec.save();
    return res.json({ message: 'Record added', recordId: rec._id });
  } catch (e) {
    console.error('createPatientRecord error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Primary doctor can upsert a single record per (patient, tier)
exports.upsertPrimaryRecord = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can edit records' });
    const { patientId, tier } = req.params;
    if (!['early', 'emergency', 'critical'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });
    const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can edit' });

    // Allow JSON or plain text in `data`; fallback to { text: <raw> }
    let payload = {};
    if (req.body && typeof req.body.data === 'string') {
      const raw = req.body.data;
      try { payload = JSON.parse(raw); }
      catch { payload = { text: raw }; }
    } else {
      payload = req.body || {};
    }
    const enc = encryptJson(payload || {});

  // files
    const files = [];
    for (const f of req.files || []) {
      if (supabase) {
        const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
  const path = `${patient._id}/${tier}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
    const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
    if (error) return res.status(500).json({ message: 'File upload failed: ' + (error?.message || 'unknown') });
        files.push({ name: f.originalname, mime: f.mimetype, path });
      } else {
        const encFile = encryptJson({ name: f.originalname, mime: f.mimetype, data: f.buffer.toString('base64') });
        files.push({ name: f.originalname, mime: f.mimetype, enc: encFile });
      }
    }

    const existing = await PatientRecord.findOne({ patient: patient._id, createdBy: doctor._id, accessTier: tier });
    if (existing) {
      existing.enc = enc;
      if (files.length) existing.files = files; // overwrite files if provided
      await existing.save();
      return res.json({ message: 'Record updated', recordId: existing._id });
    } else {
      const rec = new PatientRecord({ patient: patient._id, createdBy: doctor._id, accessTier: tier, enc, files });
      await rec.save();
      return res.json({ message: 'Record created', recordId: rec._id });
    }
  } catch (e) {
    console.error('upsertPrimaryRecord error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Append a new section (box) to an existing primary record
exports.addRecordSection = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can edit records' });
    const { patientId, tier } = req.params;
    const { label } = req.body || {};
    if (!label) return res.status(400).json({ message: 'label is required' });
    if (!['early', 'emergency', 'critical'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });
    const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can edit' });

    // Accept JSON or plain text (wrap as { text }) for consistency
    let payload = {};
    if (req.body && typeof req.body.data === 'string') {
      const raw = req.body.data;
      try { payload = JSON.parse(raw); }
      catch { payload = { text: raw }; }
    } else {
      payload = req.body || {};
    }
    const enc = encryptJson(payload || {});

  const files = [];
    for (const f of req.files || []) {
      if (supabase) {
        const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
  const path = `${patient._id}/${tier}/sections/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
    const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
    if (error) return res.status(500).json({ message: 'File upload failed: ' + (error?.message || 'unknown') });
        files.push({ name: f.originalname, mime: f.mimetype, path });
      } else {
        const encFile = encryptJson({ name: f.originalname, mime: f.mimetype, data: f.buffer.toString('base64') });
        files.push({ name: f.originalname, mime: f.mimetype, enc: encFile });
      }
    }

    const rec = await PatientRecord.findOne({ patient: patient._id, createdBy: doctor._id, accessTier: tier });
    if (!rec) return res.status(404).json({ message: 'Record not found' });
    rec.sections.push({ label, enc, files, updatedAt: new Date() });
    await rec.save();
    return res.json({ message: 'Section added', recordId: rec._id, sections: rec.sections.map((s)=>({ label: s.label, createdAt: s.createdAt })) });
  } catch (e) {
    console.error('addRecordSection error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getPrimaryRecord = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
    const { patientId, tier } = req.params;
    if (!['early', 'emergency', 'critical'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });
    const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor' });

    const rec = await PatientRecord.findOne({ patient: patient._id, createdBy: doctor._id, accessTier: tier });
    if (!rec) return res.json({ record: null });

    const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
    const usePublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
    const mapFiles = async (arr = []) => Promise.all(arr.map(async (f) => {
      if (f.path && supabase) {
        if (usePublic) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(f.path);
          return { name: f.name, mime: f.mime, url: pub?.publicUrl || null };
        } else {
          const ttl = parseInt(process.env.SUPABASE_SIGNED_TTL || '600', 10);
          const { data } = await supabase.storage.from(bucket).createSignedUrl(f.path, ttl);
          return { name: f.name, mime: f.mime, url: data?.signedUrl || null };
        }
      }
      if (f.enc) {
        const dec = decryptJson(f.enc);
        return { name: f.name, mime: f.mime, dataBase64: dec.data };
      }
      if (f.url) return { name: f.name, mime: f.mime, url: f.url };
      return { name: f.name, mime: f.mime };
    }));

    const result = {
      id: rec._id,
      accessTier: rec.accessTier,
      createdAt: rec.createdAt,
      data: decryptJson(rec.enc),
      files: await mapFiles(rec.files),
      sections: await Promise.all((rec.sections||[]).map(async (s) => ({
        id: s._id,
        label: s.label,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        data: decryptJson(s.enc),
        files: await mapFiles(s.files)
      })))
    };
    return res.json({ record: result });
  } catch (e) {
    console.error('getPrimaryRecord error', e);
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
    proofs: [
      {
        name: String,
        mime: String,
  url: String,
  path: String,
      },
    ],
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
    let proofs = [];
    if (tier === 'emergency') {
      // must have at least 3 files
      const fs = req.files || [];
      if (fs.length < 3) return res.status(400).json({ message: 'Upload minimum 3 documents for emergency access' });
      if (!supabase) return res.status(500).json({ message: 'File storage not configured' });
      const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
      for (const f of fs) {
  const path = `access-proofs/${patient._id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
        const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
        if (error) {
          console.error('Supabase upload error', error);
          return res.status(500).json({ message: 'Proof upload failed: ' + (error?.message || 'unknown') });
        }
        proofs.push({ name: f.originalname, mime: f.mimetype, path });
      }
      status = 'approved';
      expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    } else if (tier === 'critical') {
      // Require exactly 3 proof documents (min 3, max 3) for critical requests; stays pending for primary approval
      const fs = req.files || [];
      if (fs.length < 3) return res.status(400).json({ message: 'Upload minimum 3 documents for critical access' });
      if (fs.length > 3) return res.status(400).json({ message: 'Maximum 3 documents allowed for critical access' });
      if (!supabase) return res.status(500).json({ message: 'File storage not configured' });
      const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
      for (const f of fs) {
        const path = `access-proofs/${patient._id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
        const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
        if (error) {
          console.error('Supabase upload error', error);
          return res.status(500).json({ message: 'Proof upload failed: ' + (error?.message || 'unknown') });
        }
        proofs.push({ name: f.originalname, mime: f.mimetype, path });
      }
    }

    const ar = new AccessRequest({ patient: patient._id, requesterDoctor: doctor._id, tier, status, expiresAt, proofs });
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

// Primary doctor rejects critical access
exports.rejectAccessRequest = async (req, res) => {
  try {
    const approver = await User.findById(req.userId);
    if (!approver || approver.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can reject' });
    const { id } = req.params;
    const ar = await AccessRequest.findById(id).populate('patient requesterDoctor');
    if (!ar) return res.status(404).json({ message: 'Request not found' });
    if (ar.tier !== 'critical') return res.status(400).json({ message: 'Only critical requests can be rejected here' });
    const isPrimary = await User.exists({ _id: ar.patient._id, primaryDoctors: approver._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can reject' });
    ar.status = 'rejected';
    ar.expiresAt = undefined;
    await ar.save();
    return res.json({ message: 'Rejected', request: { id: ar._id, status: ar.status } });
  } catch (e) {
    console.error('rejectAccessRequest error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// List pending critical access requests for a primary doctor
exports.listCriticalRequests = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
    const pats = await User.find({ role: 'patient', primaryDoctors: doctor._id }).select('_id name cardNumber');
    const patIds = pats.map((p) => p._id);
    if (patIds.length === 0) return res.json({ requests: [] });
    const reqs = await AccessRequest.find({ patient: { $in: patIds }, tier: 'critical', status: 'pending' })
      .populate('patient', 'name cardNumber')
      .populate('requesterDoctor', 'name email');

    const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
    const usePublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
    const mapProof = async (p) => {
      if (p?.path && supabase) {
        if (usePublic) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(p.path);
          return { name: p.name, mime: p.mime, url: pub?.publicUrl || null };
        } else {
          const ttl = parseInt(process.env.SUPABASE_SIGNED_TTL || '600', 10);
          const { data } = await supabase.storage.from(bucket).createSignedUrl(p.path, ttl);
          return { name: p.name, mime: p.mime, url: data?.signedUrl || null };
        }
      }
      if (p?.url) return { name: p.name, mime: p.mime, url: p.url };
      return { name: p?.name, mime: p?.mime };
    };

    const out = await Promise.all(
      reqs.map(async (r) => ({
        id: r._id,
        createdAt: r.createdAt,
        patient: { id: r.patient._id, name: r.patient.name, cardNumber: r.patient.cardNumber },
        requester: { id: r.requesterDoctor._id, name: r.requesterDoctor.name },
        proofs: await Promise.all((r.proofs || []).map(mapProof)),
      }))
    );
    return res.json({ requests: out });
  } catch (e) {
    console.error('listCriticalRequests error', e);
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
    const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
    const usePublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
    const mapFiles = async (arr = []) => Promise.all(arr.map(async (f) => {
      if (f.path && supabase) {
        if (usePublic) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(f.path);
          return { name: f.name, mime: f.mime, url: pub?.publicUrl || null };
        } else {
          const ttl = parseInt(process.env.SUPABASE_SIGNED_TTL || '600', 10);
          const { data } = await supabase.storage.from(bucket).createSignedUrl(f.path, ttl);
          return { name: f.name, mime: f.mime, url: data?.signedUrl || null };
        }
      }
      if (f.url) return { name: f.name, mime: f.mime, url: f.url };
      if (f.enc) {
        const dec = decryptJson(f.enc);
        return { name: f.name, mime: f.mime, dataBase64: dec.data };
      }
      return { name: f.name, mime: f.mime };
    }));
    const result = await Promise.all(filtered.map(async (r) => ({
      id: r._id,
      accessTier: r.accessTier,
      createdAt: r.createdAt,
      data: decryptJson(r.enc),
      files: await mapFiles(r.files || []),
      sections: await Promise.all((r.sections || []).map(async (s) => ({
        id: s._id,
        label: s.label,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        data: decryptJson(s.enc),
        files: await mapFiles(s.files || [])
      })))
    })));

    return res.json({ records: result });
  } catch (e) {
    console.error('getPatientRecords error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// --- Edit Proposals (non-primary edits pending approval) ---
const editProposalSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // doctor
    tier: { type: String, enum: ['early', 'emergency', 'critical'], default: 'early' },
    enc: { iv: String, tag: String, data: String },
    files: [
      { name: String, mime: String, enc: { iv: String, tag: String, data: String }, path: String }
    ],
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  },
  { timestamps: true }
);
const EditProposal = mongoose.models.EditProposal || mongoose.model('EditProposal', editProposalSchema);

// Create or update a proposal from a doctor for a patient (one pending per doctor/patient/tier)
exports.createEditProposal = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can propose edits' });
    const { patientId } = req.params;
    const tier = (req.body?.tier || 'early').toLowerCase();
    if (!['early','emergency','critical'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });

    // Block non-primary doctors from proposing critical tier changes
    if (tier === 'critical') {
      const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
      if (!isPrimary) return res.status(403).json({ message: 'Critical details can only be filed by the primary doctor' });
    }

    // Accept JSON or plain text
    let payload = {};
    if (req.body && typeof req.body.data === 'string') {
      const raw = req.body.data;
      try { payload = JSON.parse(raw); }
      catch { payload = { text: raw }; }
    } else {
      payload = req.body || {};
    }
    const enc = encryptJson(payload || {});

    // files (optional)
    const files = [];
    for (const f of (req.files || [])) {
      if (supabase) {
        const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
        const path = `proposals/${patient._id}/${tier}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
        const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
        if (error) return res.status(500).json({ message: 'File upload failed: ' + (error?.message || 'unknown') });
        files.push({ name: f.originalname, mime: f.mimetype, path });
      } else {
        const encFile = encryptJson({ name: f.originalname, mime: f.mimetype, data: f.buffer.toString('base64') });
        files.push({ name: f.originalname, mime: f.mimetype, enc: encFile });
      }
    }

    let prop = await EditProposal.findOne({ patient: patient._id, proposedBy: doctor._id, tier, status: 'pending' });
    if (prop) {
      prop.enc = enc;
      if (files.length) prop.files = files;
      await prop.save();
    } else {
      prop = new EditProposal({ patient: patient._id, proposedBy: doctor._id, tier, enc, files, status: 'pending' });
      await prop.save();
    }
    return res.json({ message: 'Proposal saved', proposalId: prop._id, status: prop.status });
  } catch (e) {
    console.error('createEditProposal error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get the requesting doctor's latest proposal for a patient+tier
exports.getMyEditProposal = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
    const { patientId } = req.params;
    const tier = (req.query?.tier || 'early').toLowerCase();
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });

    const prop = await EditProposal.findOne({ patient: patient._id, proposedBy: doctor._id, tier }).sort({ updatedAt: -1 });
    if (!prop) return res.json({ proposal: null });

    const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
    const usePublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
    const mapFiles = async (arr = []) => Promise.all(arr.map(async (f) => {
      if (f.path && supabase) {
        if (usePublic) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(f.path);
          return { name: f.name, mime: f.mime, url: pub?.publicUrl || null };
        } else {
          const ttl = parseInt(process.env.SUPABASE_SIGNED_TTL || '600', 10);
          const { data } = await supabase.storage.from(bucket).createSignedUrl(f.path, ttl);
          return { name: f.name, mime: f.mime, url: data?.signedUrl || null };
        }
      }
      if (f.enc) {
        const dec = decryptJson(f.enc);
        return { name: f.name, mime: f.mime, dataBase64: dec.data };
      }
      if (f.url) return { name: f.name, mime: f.mime, url: f.url };
      return { name: f.name, mime: f.mime };
    }));

    return res.json({ proposal: {
      id: prop._id,
      status: prop.status,
      tier: prop.tier,
      createdAt: prop.createdAt,
      data: decryptJson(prop.enc),
      files: await mapFiles(prop.files)
    }});
  } catch (e) {
    console.error('getMyEditProposal error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// List pending proposals for a primary doctor (their primary patients)
exports.listPendingProposals = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
    // find primary patients of this doctor
    const pats = await User.find({ role: 'patient', primaryDoctors: doctor._id }).select('_id name email cardNumber');
    const patIds = pats.map(p => p._id);
    const props = await EditProposal.find({ patient: { $in: patIds }, status: 'pending' }).populate('proposedBy', 'name email').populate('patient', 'name email cardNumber');

    const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
    const usePublic = (process.env.SUPABASE_PUBLIC || 'true').toLowerCase() === 'true';
    const mapFiles = async (arr = []) => Promise.all(arr.map(async (f) => {
      if (f.path && supabase) {
        if (usePublic) {
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(f.path);
          return { name: f.name, mime: f.mime, url: pub?.publicUrl || null };
        } else {
          const ttl = parseInt(process.env.SUPABASE_SIGNED_TTL || '600', 10);
          const { data } = await supabase.storage.from(bucket).createSignedUrl(f.path, ttl);
          return { name: f.name, mime: f.mime, url: data?.signedUrl || null };
        }
      }
      if (f.enc) { const dec = decryptJson(f.enc); return { name: f.name, mime: f.mime, dataBase64: dec.data }; }
      if (f.url) return { name: f.name, mime: f.mime, url: f.url };
      return { name: f.name, mime: f.mime };
    }));

    const out = await Promise.all(props.map(async (p) => ({
      id: p._id,
      patient: { id: p.patient._id, name: p.patient.name, cardNumber: p.patient.cardNumber },
      proposedBy: { id: p.proposedBy._id, name: p.proposedBy.name },
      tier: p.tier,
      createdAt: p.createdAt,
      data: decryptJson(p.enc),
      files: await mapFiles(p.files)
    })));
    return res.json({ proposals: out });
  } catch (e) {
    console.error('listPendingProposals error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Approve a proposal (primary doctor only) -> write to official record and mark approved
exports.approveProposal = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
    const { id } = req.params;
    const prop = await EditProposal.findById(id).populate('patient');
    if (!prop) return res.status(404).json({ message: 'Proposal not found' });
    // verify primary doctor of the patient
    const isPrimary = await User.exists({ _id: prop.patient._id, primaryDoctors: doctor._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can approve' });

    // Apply to PatientRecord as current doctor-owned record (upsert)
    const tier = prop.tier || 'early';
    const existing = await PatientRecord.findOne({ patient: prop.patient._id, createdBy: doctor._id, accessTier: tier });
    if (existing) {
      existing.enc = prop.enc; // already encrypted
      if ((prop.files||[]).length) existing.files = prop.files;
      await existing.save();
    } else {
      const rec = new PatientRecord({ patient: prop.patient._id, createdBy: doctor._id, accessTier: tier, enc: prop.enc, files: prop.files||[] });
      await rec.save();
    }

    prop.status = 'approved';
    await prop.save();
    return res.json({ message: 'Proposal approved' });
  } catch (e) {
    console.error('approveProposal error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.rejectProposal = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors' });
    const { id } = req.params;
    const prop = await EditProposal.findById(id).populate('patient');
    if (!prop) return res.status(404).json({ message: 'Proposal not found' });
    const isPrimary = await User.exists({ _id: prop.patient._id, primaryDoctors: doctor._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can reject' });
    prop.status = 'rejected';
    await prop.save();
    return res.json({ message: 'Proposal rejected' });
  } catch (e) {
    console.error('rejectProposal error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Update an existing section (primary doctor only)
exports.updateRecordSection = async (req, res) => {
  try {
    const doctor = await User.findById(req.userId);
    if (!doctor || doctor.role !== 'doctor') return res.status(403).json({ message: 'Only doctors can edit records' });
    const { patientId, tier, sectionId } = req.params;
    const { label } = req.body || {};
    if (!['early', 'emergency', 'critical'].includes(tier)) return res.status(400).json({ message: 'Invalid tier' });
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') return res.status(404).json({ message: 'Patient not found' });
    const isPrimary = await User.exists({ _id: patient._id, primaryDoctors: doctor._id });
    if (!isPrimary) return res.status(403).json({ message: 'Only primary doctor can edit' });

    const rec = await PatientRecord.findOne({ patient: patient._id, createdBy: doctor._id, accessTier: tier });
    if (!rec) return res.status(404).json({ message: 'Record not found' });
    const s = rec.sections.id(sectionId);
    if (!s) return res.status(404).json({ message: 'Section not found' });

    if (typeof label === 'string') s.label = label;
    // parse data: accept JSON or raw text
    let payload = {};
    if (req.body && typeof req.body.data === 'string') {
      const raw = req.body.data;
      try { payload = JSON.parse(raw); }
      catch { payload = { text: raw }; }
    } else {
      payload = req.body || {};
    }
    s.enc = encryptJson(payload || {});

    // optional file replacement if files provided
    const incoming = req.files || [];
    if (incoming.length > 0) {
      const files = [];
      if (supabase) {
        const bucket = process.env.SUPABASE_BUCKET || 'patient-records';
        for (const f of incoming) {
          const path = `${patient._id}/${tier}/sections/${s._id}-${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(f.originalname)}`;
          const { error } = await uploadWithEnsure(bucket, path, f.buffer, f.mimetype);
          if (error) return res.status(500).json({ message: 'File upload failed: ' + (error?.message || 'unknown') });
          files.push({ name: f.originalname, mime: f.mimetype, path });
        }
      } else {
        for (const f of incoming) {
          const encFile = encryptJson({ name: f.originalname, mime: f.mimetype, data: f.buffer.toString('base64') });
          files.push({ name: f.originalname, mime: f.mimetype, enc: encFile });
        }
      }
      s.files = files;
    }

    s.updatedAt = new Date();
    await rec.save();
    return res.json({ message: 'Section updated' });
  } catch (e) {
    console.error('updateRecordSection error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};
