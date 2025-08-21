const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  medicalId: String, // present for doctors
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
  const u = new User({ name, phone, email, passwordHash: hash, role: 'patient', primaryDoctors: [] });
  await u.save();
  return res.json({ message: 'Patient registered', user: { id: u._id, name: u.name, email: u.email } });
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
  return res.json({ message: 'Login OK', user: { id: u._id, name: u.name, role: u.role }, token });
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
