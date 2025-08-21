import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '/src/App.css'; // Ensure Tailwind is included in your project setup

export default function Login() {
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast({});
    setLoading(true);
    try {
      const url = `http://localhost:5000/api/auth/login/${role}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.message || 'Login failed' });
      } else {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setToast({ type: 'success', message: 'Login successful' })
        setTimeout(() => {
          if (role === 'patient') navigate('/patient');
          else navigate('/doctor');
        }, 700);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#E8F5E8]">
      {/* Left Panel - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 bg-white md:bg-transparent">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 md:backdrop-blur-md md:bg-white/30 md:shadow-lg">
          {/* Logo Area */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4CAF50] to-[#81C784] bg-clip-text text-transparent">
              LifeLink
              <span className="ml-2 text-[#4CAF50]">✚</span>
            </h1>
            <p className="text-sm text-[#66BB6A] mt-2">Secure Medical Data Management</p>
          </div>

          {/* Role Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex bg-[#F5F5F5] rounded-full p-1">
              <button
                onClick={() => setRole('patient')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${role === 'patient' ? 'bg-[#4CAF50] text-white' : 'text-[#2E7D32]'}`}
              >
                👨‍⚕️ Patient
              </button>
              <button
                onClick={() => setRole('doctor')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${role === 'doctor' ? 'bg-[#4CAF50] text-white' : 'text-[#2E7D32]'}`}
              >
                🩺 Doctor
              </button>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#2E7D32]">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:border-[#4CAF50] focus:ring-2 focus:ring-[#4CAF50]/20 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2E7D32]">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:border-[#4CAF50] focus:ring-2 focus:ring-[#4CAF50]/20 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#66BB6A]"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <a href="/forgot-password" className="block text-right text-sm text-[#4CAF50] hover:underline mt-2">
                Forgot Password?
              </a>
            </div>
            {toast.message && (
              <div
                className={`p-3 rounded-xl text-sm ${toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}
              >
                {toast.message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#4CAF50] to-[#81C784] text-white py-3 rounded-xl font-medium hover:shadow-lg hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Logging...
                </span>
              ) : (
                'Sign In to LifeLink'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Animation & Description */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#4CAF50] to-[#81C784] p-8 flex items-center justify-center relative overflow-hidden">
        {/* Background Texture (Placeholder) */}
        <div className="absolute inset-0 opacity-15 bg-[url('/path-to-medical-cross-pattern.png')] bg-repeat"></div>
        {/* Floating Particles (Placeholder) */}
        <div className="absolute inset-0 animate-float">
          <div className="w-2 h-2 bg-[#66BB6A] rounded-full absolute top-10 left-20"></div>
          <div className="w-3 h-3 bg-[#66BB6A] rounded-full absolute bottom-20 right-30"></div>
        </div>

        {/* Card Content */}
        <div className="relative z-10 text-center text-white animate-float-card">
          <div className="mb-6">
            {/* Placeholder for 3D Icon */}
            <div className="w-24 h-24 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              {role === 'doctor' ? '🩺' : '❤️'}
            </div>
            <h2 className="text-2xl font-semibold">
              For {role === 'doctor' ? 'Medical Professionals' : 'Patients'}
            </h2>
            <p className="text-sm mt-2">
              {role === 'doctor'
                ? 'Access comprehensive patient records, manage appointments, and ensure secure data management.'
                : 'View your medical records, connect with healthcare providers, and track your health journey.'}
            </p>
          </div>
          <ul className="text-sm space-y-2">
            {role === 'doctor' ? (
              <>
                <li>✓ Patient Records Access</li>
                <li>✓ Appointment Scheduling</li>
                <li>✓ Prescription Management</li>
                <li>✓ Medical History Tracking</li>
              </>
            ) : (
              <>
                <li>✓ Personal Health Dashboard</li>
                <li>✓ Doctor Communication</li>
                <li>✓ Appointment Booking</li>
                <li>✓ Medical Report Access</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}