import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import medicalCard from "@/assets/medical-card.jpg";

export default function MedicalLogin() {
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isClicked, setIsClicked] = useState(false);
  const navigate = useNavigate();
  const scannerRef = useRef(null);

  // Color scheme based on role
  const color = role === 'patient' ? 'blue' : 'teal';

  // Cycle through animation phases for the scanner
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle click animation
  const handleScannerClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Welcome ${role === 'doctor' ? 'Dr.' : ''} ${form.email.split('@')[0]}!`);
      setTimeout(() => {
        if (role === 'patient') navigate('/patient-dashboard');
        else navigate('/doctor-dashboard');
      }, 1000);
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/20 p-8 border border-blue-100">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-${color}-600 to-teal-500 rounded-2xl mb-4 glow-effect`}>
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5zM6 16v-4h8v4H6z" clipRule="evenodd"/>
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">LifeLink Medical</h1>
            <p className="text-blue-700">Secure Healthcare Access Portal</p>
          </div>

          {/* Role Toggle */}
          <div className={`flex justify-center mb-8 bg-${color}-100 rounded-full p-1 relative`}>
            <div 
              className={`absolute top-1 bottom-1 bg-gradient-to-r from-${color}-600 to-teal-500 rounded-full transition-all duration-300 shadow-md ${
                role === 'patient' ? 'left-1 w-[calc(50%-4px)]' : 'right-1 w-[calc(50%-4px)]'
              }`}
            />
            <button
              onClick={() => setRole('patient')}
              className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                role === 'patient' ? 'text-white' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              👨‍⚕️ Patient
            </button>
            <button
              onClick={() => setRole('doctor')}
              className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                role === 'doctor' ? 'text-white' : 'text-teal-600 hover:text-teal-800'
              }`}
            >
              🩺 Doctor
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-800 font-medium">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder={`Enter your ${role} email`}
                required
                className={`h-12 bg-white border-2 border-${color}-200 focus:border-${color}-500 focus:ring-2 focus:ring-${color}-500/20 transition-all duration-300 text-blue-900`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-blue-800 font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className={`h-12 bg-white border-2 border-${color}-200 focus:border-${color}-500 focus:ring-2 focus:ring-${color}-500/20 transition-all duration-300 pr-12 text-blue-900`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-${color}-500 hover:text-${color}-700 transition-colors`}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="text-right">
                <a href="#" className={`text-sm text-${color}-600 hover:text-${color}-800 transition-colors`}>Forgot Password?</a>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={`w-full h-12 bg-gradient-to-r from-${color}-700 to-teal-600 hover:bg-gradient-to-r hover:from-${color}-800 hover:to-teal-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-[0.98] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Authenticating...
                </div>
              ) : (
                `Sign In as ${role === 'doctor' ? 'Doctor' : 'Patient'}`
              )}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-blue-700">
              New to LifeLink?{' '}
              <a href="#" className="text-blue-800 hover:text-blue-950 font-medium transition-colors">Create Account</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - 3D Medical Card Scanner Animation */}
      <div 
        className="w-full lg:w-1/2 bg-gradient-to-br from-blue-600 to-teal-500 relative overflow-hidden flex items-center justify-center p-8 cursor-pointer group"
        ref={scannerRef}
        onClick={handleScannerClick}
      >
        {/* Background Medical Pattern */}
        <div className="absolute inset-0 opacity-10">
          {role === 'patient' ? (
            <>
              <div className="absolute top-10 left-10 text-6xl animate-floating-medical">💊</div>
              <div className="absolute top-32 right-20 text-4xl animate-floating-medical" style={{animationDelay: '1s'}}>🩺</div>
              <div className="absolute bottom-32 left-16 text-5xl animate-floating-medical" style={{animationDelay: '2s'}}>⚕️</div>
              <div className="absolute bottom-20 right-32 text-3xl animate-floating-medical" style={{animationDelay: '1.5s'}}>🫀</div>
            </>
          ) : (
            <>
              <div className="absolute top-10 left-10 text-6xl animate-floating-medical">🩺</div>
              <div className="absolute top-32 right-20 text-4xl animate-floating-medical" style={{animationDelay: '1s'}}>💉</div>
              <div className="absolute bottom-32 left-16 text-5xl animate-floating-medical" style={{animationDelay: '2s'}}>📋</div>
              <div className="absolute bottom-20 right-32 text-3xl animate-floating-medical" style={{animationDelay: '1.5s'}}>🩻</div>
            </>
          )}
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-${color}-300/30 rounded-full animate-particle-float`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Ripple Effect on Click */}
        {isClicked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-96 bg-white/20 rounded-full animate-ripple" />
          </div>
        )}

        {/* Main 3D Scanner Machine */}
        <div className="relative z-10 w-full max-w-md transition-all duration-300 group-hover:scale-105">
          {/* Role-based Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              {role === 'doctor' ? 'Medical Professional Portal' : 'Patient Care Access'}
            </h2>
            <p className="text-white/80 text-lg">
              {role === 'doctor' 
                ? 'Advanced healthcare management system' 
                : 'Your personal health companion'
              }
            </p>
          </div>

          {/* 3D Card Scanner Animation */}
          <div className="relative perspective-1000 mb-8">
            {/* Scanner Machine Base */}
            <div className={`scanner-machine w-full h-32 relative rounded-2xl overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-${color}-700/50 shadow-2xl group-hover:shadow-[0_0_30px_10px_rgba(59,130,246,0.3)] transition-shadow duration-300 ${isClicked ? 'scale-95' : ''}`}>
              {/* Card Slot */}
              <div className="absolute top-4 left-4 right-4 h-20 bg-black/50 rounded-xl border-2 border-white/20 flex items-center justify-center">
                <div className="text-white/60 text-sm font-mono">INSERT MEDICAL CARD</div>
              </div>
              
              {/* Status Lights */}
              <div className="absolute top-2 right-2 flex space-x-2">
                <div className={`w-3 h-3 rounded-full ${animationPhase === 0 ? 'bg-red-500' : animationPhase === 1 ? 'bg-yellow-400' : 'bg-green-500'} shadow-[0_0_8px_2px_rgba(255,255,255,0.4)]`} />
                <div className={`w-3 h-3 rounded-full ${animationPhase >= 1 ? 'bg-green-500' : 'bg-gray-400'} shadow-[0_0_8px_2px_rgba(255,255,255,0.4)]`} />
              </div>

              {/* Scanner Beam */}
              {animationPhase === 1 && (
                <div className="absolute top-4 left-4 right-4 h-20 overflow-hidden rounded-xl">
                  <div className={`scanner-beam absolute inset-0 w-8 bg-gradient-to-r from-transparent via-${color}-400 to-transparent opacity-80 shadow-[0_0_20px_5px_rgba(59,130,246,0.6)]`} />
                </div>
              )}
              
              {/* LED Strip */}
              <div className={`absolute bottom-2 left-4 right-4 h-1 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full opacity-60`} />
            </div>

            {/* 3D Medical Card */}
            <div className={`absolute -top-2 left-8 right-8 transition-transform duration-300 ${isClicked ? 'scale-110' : ''}`}>
              <div className={`medical-card relative h-24 animate-card-insert transform-gpu`} style={{transformStyle: 'preserve-3d'}}>
                <img 
                  src={medicalCard} 
                  alt="Medical Insurance Card" 
                  className="w-full h-full object-cover rounded-xl shadow-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl" />
                
                {/* Holographic Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-${color}-400/30 to-transparent rounded-xl animate-pulse-glow`} />
              </div>
            </div>
          </div>

          {/* Feature List */}
          <div className="text-center text-white/80">
            <p className="text-sm">Powered by Secure Scan Technology</p>
          </div>
        </div>
      </div>
    </div>
  );
}