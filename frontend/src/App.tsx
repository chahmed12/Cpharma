import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './pages/auth/ProtectedRoute';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RegistrationPending from './pages/auth/RegistrationPending';
import NotFound from './pages/NotFound';

// Pharmacien
import PharmacistDashboard from './pages/PharmacistDashboard';
import NewConsultation from './pages/NewConsultation';
import SalleAttente from './pages/SalleAttente';
import WaitingPrescription from './pages/WaitingPrescription';
import PrescriptionVerification from './pages/PrescriptionVerification';
import ConfirmationFin from './pages/ConfirmationFin';

// Médecin
import DoctorDashboard from './pages/DoctorDashboard';
import VideoCall from './pages/VideoCall';
import PrescriptionForm from './pages/PrescriptionForm';
import SignatureOrdonnance from './pages/SignatureOrdonnance';

import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/ui/Toast';

export default function App() {
  const { toasts } = useToast();
  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} />
      <Routes>

        {/* ── Routes publiques ─────────────────────── */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending" element={<RegistrationPending />} />

        {/* ── Routes pharmacien ────────────────────── */}
        <Route path="/pharmacist/dashboard"
          element={<ProtectedRoute role="PHARMACIEN"><PharmacistDashboard /></ProtectedRoute>}
        />
        <Route path="/pharmacist/new-consultation"
          element={<ProtectedRoute role="PHARMACIEN"><NewConsultation /></ProtectedRoute>}
        />
        <Route path="/pharmacist/waiting/:id"
          element={<ProtectedRoute role="PHARMACIEN"><SalleAttente /></ProtectedRoute>}
        />
        <Route path="/pharmacist/waiting-prescription/:id"
          element={<ProtectedRoute role="PHARMACIEN"><WaitingPrescription /></ProtectedRoute>}
        />
        <Route path="/pharmacist/verify/:hash"
          element={<ProtectedRoute role="PHARMACIEN"><PrescriptionVerification /></ProtectedRoute>}
        />
        <Route path="/pharmacist/confirm/:id"
          element={<ProtectedRoute role="PHARMACIEN"><ConfirmationFin /></ProtectedRoute>}
        />

        {/* ── Routes médecin ────────────────────────── */}
        <Route path="/doctor/dashboard"
          element={<ProtectedRoute role="MEDECIN"><DoctorDashboard /></ProtectedRoute>}
        />
        <Route path="/doctor/video/:id"
          element={<ProtectedRoute role="MEDECIN"><VideoCall /></ProtectedRoute>}
        />
        <Route path="/pharmacist/video/:id"
          element={<ProtectedRoute role="PHARMACIEN"><VideoCall /></ProtectedRoute>}
        />
        <Route path="/doctor/prescription/:id"
          element={<ProtectedRoute role="MEDECIN"><PrescriptionForm /></ProtectedRoute>}
        />
        <Route path="/doctor/sign/:id"
          element={<ProtectedRoute role="MEDECIN"><SignatureOrdonnance /></ProtectedRoute>}
        />

        {/* ── 404 ───────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}