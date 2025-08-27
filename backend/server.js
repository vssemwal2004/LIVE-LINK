require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authRoutes = require('./routes/Authroutes');
const jwt = require('jsonwebtoken');
const { User } = require('./controller/authcontroller');

const app = express();

// Configure CORS to allow requests from frontend
app.use(cors({
  origin: ['http://localhost:5173'], // Adjust to your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// MongoDB connection
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/live_link_demo';
mongoose
  .connect(MONGO)
  .then(() => console.log('Connected to Mongo'))
  .catch((e) => console.error('Mongo connection error', e));

// RFID UID Schema
const rfidSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const RFID = mongoose.model('RFID', rfidSchema);

// Endpoint to receive UID from ESP8266
app.post('/api/rfid', async (req, res) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ message: 'UID is required' });
  }
  try {
    const rfid = new RFID({ uid });
    await rfid.save();
    console.log(`Received and stored UID: ${uid}`);
    res.status(201).json({ message: 'UID stored successfully' });
  } catch (e) {
    console.error('Error storing UID:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint to get the latest UID (for frontend polling)
app.get('/api/rfid/uid', async (req, res) => {
  try {
    const latestRFID = await RFID.findOne().sort({ timestamp: -1 });
    if (!latestRFID) {
      return res.status(404).json({ message: 'No UID found' });
    }
    res.json({ uid: latestRFID.uid });
  } catch (e) {
    console.error('Error fetching UID:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple /me endpoint to validate token
app.get('/api/auth/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: 'No token' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    let q = User.findById(payload.id).select('-passwordHash -recordPinHash');
    // populate related lists depending on role
    if (payload.role === 'patient') {
      q = q.populate('primaryDoctors', 'name email medicalId');
    } else if (payload.role === 'doctor') {
      q = q.populate('primaryPatients', 'name email phone');
    }
    const user = await q;
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    return res.json({ user });
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Auth server running on ${PORT}`));