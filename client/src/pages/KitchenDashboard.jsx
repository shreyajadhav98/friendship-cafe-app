import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { io } from 'socket.io-client';
import { API_ROOT, apiRequest } from '../api';
import { getLocalizedMenuField } from '../menuLocalization';

const SOCKET_URL = API_ROOT || undefined;
const columns = [
  { status: 'Received', action: 'Start preparing', next: 'Preparing' },
  { status: 'Preparing', action: 'Mark ready', next: 'Ready' },
  { status: 'Ready', action: 'Complete order', next: 'Completed' },
  { status: 'Completed', action: '', next: '' }
];

export default function KitchenDashboard() {
  const { language, t } = useLanguage();
  const [token, setToken] = useState(() => sessionStorage.getItem('cafeAdminToken') || '');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState('');
  const [pendingEventIds, setPendingEventIds] = useState(() => new Set());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    apiRequest('/api/auth/me', { token }).then(() => Promise.all([apiRequest('/api/orders', { token }), apiRequest('/api/events?status=Pending&upcoming=true', { token })])).then(([orderData, eventData]) => { if (active) { setOrders((current) => { const merged = new Map((orderData.orders || []).map((order) => [order.orderId, order])); current.forEach((order) => merged.set(order.orderId, order)); return [...merged.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }); setPendingEventIds(new Set((eventData.bookings || []).map((booking) => booking._id))); } }).catch(() => { if (active) { sessionStorage.removeItem('cafeAdminToken'); setToken(''); setError('Your admin session expired. Sign in again.'); } });
    socket.on('connect', () => { if (active) { setConnected(true); setError(''); } });
    socket.on('disconnect', () => { if (active) setConnected(false); });
    socket.on('connect_error', (err) => { if (active) { setConnected(false); setError(err.message || 'Could not connect to the live kitchen.'); } });
    socket.on('newOrderReceived', (order) => { if (active) setOrders((current) => [order, ...current.filter((entry) => entry.orderId !== order.orderId)]); });
    socket.on('orderStatusUpdated', (order) => { if (active) setOrders((current) => current.map((entry) => entry.orderId === order.orderId ? order : entry)); });
    socket.on('new_event_booking', (booking) => { if (active) setPendingEventIds((current) => new Set(current).add(booking._id)); });
    socket.on('event_status_updated', (booking) => { if (active) setPendingEventIds((current) => { const next = new Set(current); if (booking.status === 'Pending') next.add(booking._id); else next.delete(booking._id); return next; }); });
    return () => { active = false; socketRef.current = null; socket.removeAllListeners(); socket.disconnect(); };
  }, [token]);

  async function login(event) {
    event.preventDefault(); setError('');
    try { const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); sessionStorage.setItem('cafeAdminToken', data.token); setToken(data.token); }
    catch (err) { setError(err.message); }
  }

  function updateStatus(order, nextStatus) {
    const socket = socketRef.current;
    if (!socket?.connected) { setError('The kitchen is reconnecting. Try again when the live indicator returns.'); return; }
    setBusy(order.orderId); setError('');
    socket.timeout(10000).emit('updateOrderStatus', { orderId: order.orderId, status: nextStatus }, (timeoutError, result) => {
      setBusy('');
      if (timeoutError) { setError('The kitchen did not confirm the status change. Please retry.'); return; }
      if (!result?.ok) { setError(result?.error || 'Order status could not be updated.'); return; }
      setOrders((current) => current.map((entry) => entry.orderId === order.orderId ? result.order : entry));
    });
  }

  if (!token) return <main className="admin-login-page"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /></Link><LanguageSwitcher /><form className="login-card" onSubmit={login}><p className="eyebrow">{t('KITCHEN DISPLAY')}</p><h1>{t('Order board')}</h1><p>{t('Admin sign in is required to view live tickets.')}</p>{error && <p className="form-error" role="alert">{t(error)}</p>}<label>{t('Username')}<input autoComplete="username" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} required /></label><label>{t('Password')}<input type="password" autoComplete="current-password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required /></label><button className="primary-button">{t('Sign in to kitchen')}</button><Link className="back-link" to="/">{t('Back to customer menu')}</Link></form></main>;

  return <div className="kitchen-shell"><header className="admin-topbar"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /><small>{t(' / Kitchen')}</small></Link><div className="kitchen-header-actions"><LanguageSwitcher /><span className={`live-indicator ${connected ? 'online' : ''}`}><i />{connected ? t('Live') : t('Connecting')}</span><Link className="event-nav-link" to="/admin/events">{t('Event Bookings')}{pendingEventIds.size > 0 && <span className="pending-count-badge">{pendingEventIds.size}</span>}</Link><Link to="/admin/billing">{t('Billing')}</Link><Link to="/admin/moderation">{t('Confessions')}</Link><Link to="/admin/menu">{t('Menu switchboard')}</Link><button className="text-button" onClick={() => { sessionStorage.removeItem('cafeAdminToken'); setToken(''); setOrders([]); }}>{t('Sign out')}</button></div></header><main className="kitchen-page"><div className="kitchen-heading"><div><p className="eyebrow">{t('LIVE ORDER FLOW')}</p><h1>{t('Kitchen board')}</h1><p>{t('Tickets arrive here as soon as guests order.')}</p></div><span className="ticket-count">{orders.filter((order) => order.orderStatus !== 'Completed' && order.orderStatus !== 'Cancelled').length} {t('active tickets')}</span></div>{error && <p className="notice error-notice" role="alert">{t(error)}</p>}
    <div className="kanban-board">{columns.map((column) => { const laneOrders = orders.filter((order) => order.orderStatus === column.status); return <section className={`kanban-column lane-${column.status.toLowerCase()}`} key={column.status}><div className="lane-heading"><h2>{t(column.status)}</h2><span>{laneOrders.length}</span></div><div className="ticket-stack">{laneOrders.map((order) => <article className="order-ticket" key={order.orderId}><div className="ticket-top"><span>#{order.orderId}</span><time>{new Date(order.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div><h3>{t('Table')} {order.tableNumber}</h3><p className="ticket-customer">{order.customerName}</p><div className="ticket-items">{order.items.map((item) => <div key={`${order.orderId}-${item.menuItemId}`}><strong>{item.quantity}×</strong><span>{getLocalizedMenuField(item, 'name', language)}</span>{item.customNotes && <small>{item.customNotes}</small>}</div>)}</div><div className="ticket-total"><span>{t(order.paymentStatus)}</span><strong>{'₹' + Number(order.totalAmount).toFixed(2)}</strong></div>{column.next && <button className={`advance-button advance-${column.next.toLowerCase()}`} disabled={busy === order.orderId || !connected} onClick={() => updateStatus(order, column.next)}>{busy === order.orderId ? t('Updating…') : t(column.action)} <span>→</span></button>}</article>)}</div>{laneOrders.length === 0 && <p className="lane-empty">{t(`No ${column.status.toLowerCase()} orders`)}</p>}</section>; })}</div>
  </main></div>;
}
