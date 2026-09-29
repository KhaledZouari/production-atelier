import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import ProductionFormPage from './pages/ProductionForm';
import ProductionsPage from './pages/Productions';
import EmployeesPage from './pages/Employees';
import OperationsPage from './pages/Operations';
import ReportsPage from './pages/Reports';
import AttendancePage from './pages/Attendance';
import OrdersPage from './pages/Orders';
import MesDashboardPage from './pages/MesDashboard';
import MesEfficiencyPage from './pages/MesEfficiency';
import MesBasketsPage from './pages/MesBaskets';
import MesTrackingSheetsPage from './pages/MesTrackingSheets';
import MesAlertsPage from './pages/MesAlerts';

const Private = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Private><DashboardPage /></Private>} />
          <Route path="/production/new" element={<Private roles={['admin','chef_chaine']}><ProductionFormPage /></Private>} />
          <Route path="/productions" element={<Private><ProductionsPage /></Private>} />
          <Route path="/employees" element={<Private roles={['admin']}><EmployeesPage /></Private>} />
          <Route path="/operations" element={<Private roles={['admin']}><OperationsPage /></Private>} />
          <Route path="/orders" element={<Private><OrdersPage /></Private>} />
          <Route path="/attendance" element={<Private roles={['admin','chef_chaine']}><AttendancePage /></Private>} />
          <Route path="/reports" element={<Private><ReportsPage /></Private>} />
          <Route path="/mes" element={<Private><MesDashboardPage /></Private>} />
          <Route path="/mes/efficiency" element={<Private><MesEfficiencyPage /></Private>} />
          <Route path="/mes/baskets" element={<Private><MesBasketsPage /></Private>} />
          <Route path="/mes/tracking-sheets" element={<Private><MesTrackingSheetsPage /></Private>} />
          <Route path="/mes/alerts" element={<Private><MesAlertsPage /></Private>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
