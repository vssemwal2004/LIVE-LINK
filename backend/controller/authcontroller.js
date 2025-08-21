const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  medicalId: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: String,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const jwt = require('jsonwebtoken');

exports.registerPatient = async (req, res) => {
  const { name, phone, email, password } = req.body;
  if (!name || !phone || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ name, phone, email, passwordHash: hash, role: 'patient' });
  await u.save();
  return res.json({ message: 'Patient registered', user: { id: u._id, name: u.name, email: u.email } });
};

exports.registerDoctor = async (req, res) => {
  const { name, phone, medicalId, email, password } = req.body;
  if (!name || !phone || !medicalId || !email || !password) return res.status(400).json({ message: 'Missing fields' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ name, phone, medicalId, email, passwordHash: hash, role: 'doctor' });
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

exports.User = User;
