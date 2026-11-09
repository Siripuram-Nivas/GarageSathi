import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import NewJobPage from './pages/NewJobPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import ServicesPage from './pages/ServicesPage';
import SettingsPage from './pages/SettingsPage';
import AiStatusPage from './pages/AiStatusPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="login" element={<LoginPage />} />
        <Route index element={<DashboardPage />} />
        <Route path="new" element={<NewJobPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ai" element={<AiStatusPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
