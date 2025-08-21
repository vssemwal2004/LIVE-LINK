import React, { useState, useEffect, useRef } from 'react';

const MedicalLogin = () => {
  const [userType, setUserType] = useState('patient');
  const [isAnimating, setIsAnimating] = useState(true);
  const animationRef = useRef(null);

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#E8F5E8]">
      {/* Left Panel - Login Form */}
      <div className="w-full md:w-2/5 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/20 p-10 border border-blue-100">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-blue-900 mb-3">LifeLink Medical</h1>
            <p className="text-blue-700 text-lg">Secure access to your healthcare portal</p>
          </div>

          <div className="mb-8 flex bg-blue-100 rounded-xl p-1.5">
            <button
              onClick={() => setUserType('patient')}
              className={`flex-1 py-4 px-6 rounded-xl transition-all duration-300 ${userType === 'patient' ? 'bg-white shadow-md text-blue-800 font-semibold' : 'text-blue-600'}`}
            >
              Patient Login
            </button>
            <button
              onClick={() => setUserType('doctor')}
              className={`flex-1 py-4 px-6 rounded-xl transition-all duration-300 ${userType === 'doctor' ? 'bg-white shadow-md text-blue-800 font-semibold' : 'text-blue-600'}`}
            >
              Doctor Login
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-md font-semibold text-blue-800 mb-2">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  className="w-full px-5 py-4 rounded-xl border-2 border-blue-200 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900" 
                  placeholder="name@example.com"
                />
                <div className="absolute right-4 top-4 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-md font-semibold text-blue-800 mb-2">Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  className="w-full px-5 py-4 rounded-xl border-2 border-blue-200 focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 text-blue-900" 
                  placeholder="••••••••"
                />
                <div className="absolute right-4 top-4 text-blue-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
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
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-blue-300 rounded"
                />
                <label htmlFor="remember" className="ml-3 block text-md text-blue-800">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-md font-medium text-blue-600 hover:text-blue-900 transition-colors">
                Forgot password?
              </a>
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-blue-700 to-teal-600 text-white py-4 rounded-xl font-semibold shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-1"
            >
              Sign In
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-blue-700 text-md">
              Don't have an account?{' '}
              <a href="/register" className="font-semibold text-blue-800 hover:text-blue-950 transition-colors">
                Create new account
              </a>
            </p>
          </div>
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
          <div className="absolute bottom-20 right-44 w-2 h-2 bg-teal-500/30 rounded-full animate-particle-float animation-delay-1500"></div>
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

export default MedicalLogin;