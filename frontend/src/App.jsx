import React from 'react'
import { Link, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import Login from '../auth/login.jsx'
import Register from '../auth/register.jsx'
import Patient from './pages/Patient'
import Doctor from './pages/Doctor'
import PatientSearch from './pages/PatientSearch'
import PatientEdit from './pages/PatientEdit'
import Proposals from './pages/Proposals'
import CriticalRequests from './pages/CriticalRequests'
import PatientRecords from './pages/PatientRecords'
import PublicEarly from './pages/PublicEarly'

function App() {
  return (
    <div className="app-container">
      <div className="auth-form">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/patient" element={<Patient />} />
          <Route path="/patient/records" element={<PatientRecords />} />
          <Route path="/doctor" element={<Doctor />} />
          <Route path="/doctor/patient-search" element={<PatientSearch />} />
          <Route path="/doctor/patient-edit" element={<PatientEdit />} />
          <Route path="/doctor/proposals" element={<Proposals />} />
          <Route path="/doctor/critical-requests" element={<CriticalRequests />} />
          <Route path="/public/early/:cardNumber" element={<PublicEarly />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App