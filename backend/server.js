require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authRoutes = require('./routes/Authroutes');
const jwt = require('jsonwebtoken');
const { User } = require('./controller/authcontroller');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/live_link_demo';
mongoose
	.connect(MONGO)
	.then(() => console.log('Connected to Mongo'))
	.catch((e) => console.error('Mongo connection error', e));

app.use('/api/auth', authRoutes);

// simple /me endpoint to validate token
app.get('/api/auth/me', async (req, res) => {
	const auth = req.headers.authorization;
	if (!auth) return res.status(401).json({ message: 'No token' });
	const token = auth.split(' ')[1];
	try {
		const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
		let q = User.findById(payload.id).select('-passwordHash');
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Auth server running on ${PORT}`));
