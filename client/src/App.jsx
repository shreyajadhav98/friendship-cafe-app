import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerMenu from './pages/CustomerMenu.jsx';
const AdminMenu = lazy(() => import('./pages/AdminMenu.jsx'));
const KitchenDashboard = lazy(() => import('./pages/KitchenDashboard.jsx'));
const AdminBilling = lazy(() => import('./pages/AdminBilling.jsx'));
const ConfessionWall = lazy(() => import('./pages/ConfessionWall.jsx'));
const AdminModeration = lazy(() => import('./pages/AdminModeration.jsx'));

const EventBooking = lazy(() => import('./pages/EventBooking.jsx'));
const AdminEvents = lazy(() => import('./pages/AdminEvents.jsx'));
const pageFallback = <main className="page-loading" aria-live="polite">Loading…</main>;

export default function App() {
  return <Suspense fallback={pageFallback}><Routes><Route path="/" element={<CustomerMenu />} /><Route path="/events" element={<EventBooking />} /><Route path="/confessions" element={<ConfessionWall />} /><Route path="/admin/menu" element={<AdminMenu />} /><Route path="/admin/events" element={<AdminEvents />} /><Route path="/admin/kitchen" element={<KitchenDashboard />} /><Route path="/admin/billing" element={<AdminBilling />} /><Route path="/admin/moderation" element={<AdminModeration />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>;
}
