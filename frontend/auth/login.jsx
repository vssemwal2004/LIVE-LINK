import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../src/apiBase';

const Login = () => {
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [toast, setToast] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const animationRef = useRef(null);
  const navigate = useNavigate();

  // Continuous animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const startAnimation = () => {
      if (animationRef.current) {
        const elements = animationRef.current.querySelectorAll('[data-animate]');
        elements.forEach(el => {
          el.style.animation = 'none';
          setTimeout(() => {
            el.style.animation = '';
          }, 10);
        });
      }
    };

    const interval = setInterval(startAnimation, 5000);
    return () => clearInterval(interval);
  }, [isAnimating]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast({});
    setLoading(true);
    try {
  const url = `${API_BASE}/api/auth/login/${role}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.message || 'Login failed' });
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToast({ type: 'success', message: 'Login successful' });
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
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-indigo-50 to-teal-50 overflow-hidden">
      {/* Left Panel - Login Form */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl shadow-blue-500/20 p-6 border border-blue-100">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-blue-900 mb-2">LifeLink Medical</h1>
            <p className="text-blue-700 text-sm">Secure access to your healthcare portal</p>
          </div>

          <div className="mb-4 flex bg-blue-100 rounded-lg p-1">
            <button
              onClick={() => setRole('patient')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${role === 'patient' ? 'bg-white shadow-sm text-blue-800 font-semibold' : 'text-blue-600'}`}
            >
              Patient Login
            </button>
            <button
              onClick={() => setRole('doctor')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all duration-300 ${role === 'doctor' ? 'bg-white shadow-sm text-blue-800 font-semibold' : 'text-blue-600'}`}
            >
              Doctor Login
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">Email Address</label>
              <div className="relative">
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm"
                  placeholder="name@example.com"
                />
                <div className="absolute right-3 top-3 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-800 mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900 text-sm"
                  placeholder="••••••••"
                />
                <div className="absolute right-3 top-3 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-blue-800">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-900 transition-colors">
                Forgot password?
              </a>
            </div>

            {toast.message && (
              <div className={`p-3 mb-3 rounded-lg ${toast.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'} text-sm`}>
                {toast.message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-blue-700 to-teal-600 text-white py-3 rounded-lg font-semibold shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1 text-sm"
            >
              {loading ? 'Logging...' : 'Sign In'}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-blue-700 text-sm">
              Don't have an account?{' '}
              <button onClick={() => navigate('/register')} className="font-semibold text-blue-800 hover:text-blue-950 transition-colors">
                Create new account
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - 3D Animation */}
      <div className="hidden md:flex md:w-3/5 items-center justify-center p-10 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400/20 rounded-full animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/20 rounded-full animate-pulse animation-delay-1000"></div>
          <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full animate-pulse animation-delay-2000"></div>
        </div>

        {/* Floating medical icons */}
        <div className="absolute top-24 left-24 animate-float">
          <div className="w-14 h-14 bg-blue-200/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        </div>

        <div className="absolute bottom-32 right-32 animate-float animation-delay-1000">
          <div className="w-14 h-14 bg-teal-200/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/3 animate-float animation-delay-2000">
          <div className="w-12 h-12 bg-blue-300/60 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        <div className="absolute top-40 right-40 animate-float animation-delay-1500">
          <div className="w-10 h-10 bg-teal-300/60 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
        </div>

        {/* Main 3D Card Scanner Animation */}
        <div ref={animationRef} className="relative w-full h-full max-w-2xl max-h-[600px] flex items-center justify-center">
          {/* Scanner Machine */}
          <div className="absolute w-96 h-80 bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl shadow-2xl z-10 border-2 border-gray-700/50">
            {/* Card Slot */}
            <div className="absolute w-72 h-52 bg-gray-800/90 left-1/2 -translate-x-1/2 top-6 rounded-xl border-2 border-gray-600/70 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 to-gray-700/30"></div>
              
              {/* Scanning Beam */}
              <div 
                data-animate
                className="absolute w-full h-1.5 bg-blue-400 top-1/2 shadow-[0_0_25px_8px_rgba(59,130,246,0.6)] rounded-full animate-scan-beam"
              ></div>
              
              {/* LED Indicators */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]"></div>
                <div 
                  data-animate
                  className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(245,158,11,0.6)] animation-delay-1000"
                ></div>
                <div 
                  data-animate
                  className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_2px_rgba(16,185,129,0.6)] animation-delay-2000"
                ></div>
              </div>

              {/* Scanner Text */}
              <div className="absolute bottom-4 left-4 text-xs text-gray-400 font-medium">
                MEDICAL ID SCANNER v2.1
              </div>
            </div>
            
            {/* Scanner Details */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-8 bg-gray-800 rounded-lg border border-gray-700"></div>
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-1 bg-gray-600 rounded-full"></div>
          </div>

          {/* Medical Card */}
          <div 
            data-animate
            className="absolute w-64 h-44 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 rounded-2xl shadow-2xl z-20 animate-card-insert preserve-3d"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/15 to-transparent"></div>
            <div className="absolute inset-0 rounded-2xl border border-white/10"></div>
            
            {/* Card Chip */}
            <div className="absolute top-6 left-6 w-10 h-8 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-md shadow-md"></div>
            
            {/* Card Lines */}
            <div className="absolute top-20 left-6 w-48 h-1 bg-white/50 rounded-full"></div>
            <div className="absolute top-24 left-6 w-40 h-1 bg-white/40 rounded-full"></div>
            <div className="absolute top-28 left-6 w-44 h-1 bg-white/30 rounded-full"></div>
            
            {/* Medical Symbol */}
            <div className="absolute bottom-6 right-6 w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>

            {/* Card Text */}
            <div className="absolute top-10 left-6 text-xs text-white/80 font-medium tracking-wider">
              MEDICAL ID CARD
            </div>
            <div className="absolute bottom-6 left-6 text-xs text-white/60">
              •••• •••• •••• 1234
            </div>
            
            {/* Shimmer Effect */}
            <div 
              data-animate
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer rounded-2xl"
            ></div>

            {/* Holographic Effect */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-400/30 to-blue-500/30 rounded-full blur-md"></div>
          </div>

          {/* Floating Particles */}
          <div className="absolute -top-10 left-20 w-4 h-4 bg-blue-400/30 rounded-full animate-particle-float"></div>
          <div className="absolute top-40 right-28 w-3 h-3 bg-teal-400/40 rounded-full animate-particle-float animation-delay-1000"></div>
          <div className="absolute bottom-32 left-40 w-5 h-5 bg-blue-500/20 rounded-full animate-particle-float animation-delay-2000"></div>
          <div className="absolute bottom-20 right-44 w-2 h-2 bg-teal-家人/30 rounded-full animate-particle-float animation-delay-1500"></div>
        </div>
      </div>

      {/* Mobile message */}
      <div className="md:hidden fixed inset-0 bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center p-8 text-white text-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 shadow-2xl">
          <h2 className="text-3xl font-bold mb-6">Enhanced Experience Available</h2>
          <p className="text-xl">For the full 3D medical card animation experience, please view on a larger screen.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;