import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import PatrolsPage from './pages/PatrolsPage';
import PatrolDetailPage from './pages/PatrolDetailPage';
import ProfilePage from './pages/ProfilePage';
import OfficersPage from './pages/OfficersPage';
import OfficerDetailPage from './pages/OfficerDetailPage';
import OfficerFormPage from './pages/OfficerFormPage';
import AssignPatrolPage from './pages/AssignPatrolPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import IncidentFormPage from './pages/IncidentFormPage';
import PatrolRoutesPage from './pages/PatrolRoutesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AISchedulerPage from './pages/AISchedulerPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes within MainLayout */}
          <Route element={<ProtectedRoute roles={['admin', 'manager', 'officer']} />}>
            <Route element={<MainLayout />}>
              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Patrols */}
              <Route path="/patrols" element={<PatrolsPage />} />
              <Route path="/patrols/:id" element={<PatrolDetailPage />} />
              <Route path="/my-patrols" element={<PatrolsPage officerOnly={true} />} />
              
              {/* Incidents */}
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/incidents/new" element={<IncidentFormPage />} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              
              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />
              
              {/* Settings and Profile */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          
          {/* Admin and Manager only routes */}
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            <Route element={<MainLayout />}>
              <Route path="/officers" element={<OfficersPage />} />
              <Route path="/officers/:id" element={<OfficerDetailPage />} />
              <Route path="/officers/add" element={<OfficerFormPage />} />
              <Route path="/officers/:id/edit" element={<OfficerFormPage />} />
              <Route path="/assign-patrol" element={<AssignPatrolPage />} />
              <Route path="/patrols/:id/edit" element={<AssignPatrolPage />} />
              <Route path="/patrols/:id/assign-officers" element={<AssignPatrolPage assignOfficersOnly />} />
              <Route path="/patrols/:id/checkpoints" element={<AssignPatrolPage checkpointsOnly />} />
              <Route path="/patrol-routes" element={<PatrolRoutesPage />} />
              <Route path="/incidents/:id/edit" element={<IncidentFormPage />} />
              <Route path="/ai-scheduler" element={<AISchedulerPage />} />
            </Route>
          </Route>
          
          {/* 404 route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
