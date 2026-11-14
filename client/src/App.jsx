import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu.jsx';
import AdminMenu from './pages/AdminMenu.jsx';
import KitchenDashboard from './pages/KitchenDashboard.jsx';
import AdminBilling from './pages/AdminBilling.jsx';
import ConfessionWall from './pages/ConfessionWall.jsx';
import AdminModeration from './pages/AdminModeration.jsx';

export default function App() {
  return <Routes><Route path="/" element={<CustomerMenu />} /><Route path="/confessions" element={<ConfessionWall />} /><Route path="/admin/menu" element={<AdminMenu />} /><Route path="/admin/kitchen" element={<KitchenDashboard />} /><Route path="/admin/billing" element={<AdminBilling />} /><Route path="/admin/moderation" element={<AdminModeration />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
