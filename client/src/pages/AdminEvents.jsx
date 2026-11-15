import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { API_ROOT, apiRequest } from '../api';

const statusFilters = ['All', 'Pending', 'Approved', 'Completed', 'Rejected'];
const statusActions = {
  Pending: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Completed', 'Cancelled'],
  Rejected: [], Completed: [], Cancelled: []
};

export default function AdminEvents() {
  const { language, t } = useLanguage();
  const [token, setToken] = useState(() => sessionStorage.getItem('cafeAdminToken') || '');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [eventTypeFilter, setEventTypeFilter] = useState('All');
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';

  async function loadBookings(activeToken = token) {
    setLoading(true); setError('');
    try { const data = await apiRequest('/api/events?upcoming=true', { token: activeToken }); setBookings(data.bookings || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    apiRequest('/api/auth/me', { token }).then(() => { if (active) return loadBookings(token); }).catch(() => { if (active) { sessionStorage.removeItem('cafeAdminToken'); setToken(''); setError('Your admin session expired. Sign in again.'); } });
    const socket = io(API_ROOT || undefined, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => active && setLive(true));
    socket.on('disconnect', () => active && setLive(false));
    socket.on('new_event_booking', (booking) => { if (active) setBookings((current) => [booking, ...current.filter((entry) => entry._id !== booking._id)]); });
    socket.on('event_status_updated', (booking) => {
      if (!active) return;
      setBookings((current) => booking.status === 'Deleted' ? current.filter((entry) => entry._id !== booking._id) : current.map((entry) => entry._id === booking._id ? booking : entry));
    });
    return () => { active = false; socket.removeAllListeners(); socket.disconnect(); };
  }, [token]);

  async function login(event) {
    event.preventDefault(); setError('');
    try { const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); sessionStorage.setItem('cafeAdminToken', data.token); setToken(data.token); }
    catch (err) { setError(err.message); }
  }

  async function updateStatus(booking, status) {
    setBusyId(booking._id); setError('');
    try {
      const data = await apiRequest(`/api/events/${booking._id}/status`, { token, method: 'PATCH', body: JSON.stringify({ status, adminNotes: notes[booking._id] ?? booking.adminNotes ?? '' }) });
      setBookings((current) => current.map((entry) => entry._id === booking._id ? data.booking : entry));
    } catch (err) { setError(err.message); }
    finally { setBusyId(''); }
  }

  async function deleteBooking(booking) {
    if (!window.confirm(t('Delete this event booking?'))) return;
    setBusyId(booking._id); setError('');
    try { await apiRequest(`/api/events/${booking._id}`, { token, method: 'DELETE' }); setBookings((current) => current.filter((entry) => entry._id !== booking._id)); }
    catch (err) { setError(err.message); }
    finally { setBusyId(''); }
  }

  const filteredBookings = useMemo(() => bookings.filter((booking) => (statusFilter === 'All' || booking.status === statusFilter) && (eventTypeFilter === 'All' || booking.eventType === eventTypeFilter)), [bookings, statusFilter, eventTypeFilter]);
  const pendingCount = bookings.filter((booking) => booking.status === 'Pending').length;

  if (!token) return <main className="admin-login-page"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /></Link><LanguageSwitcher /><form className="login-card" onSubmit={login}><p className="eyebrow">{t('EVENT BOOKINGS')}</p><h1>{t('Event management')}</h1><p>{t('Admin sign in is required to manage event requests.')}</p>{error && <p className="form-error" role="alert">{t(error)}</p>}<label>{t('Username')}<input autoComplete="username" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} required /></label><label>{t('Password')}<input type="password" autoComplete="current-password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required /></label><button className="primary-button">{t('Sign in')}</button><Link className="back-link" to="/admin/kitchen">{t('Back to kitchen')}</Link></form></main>;

  return <div className="admin-shell"><header className="admin-topbar"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /><small>{t(' / Event bookings')}</small></Link><div className="admin-user"><LanguageSwitcher /><Link to="/admin/kitchen">{t('Kitchen')}</Link><Link to="/admin/menu">{t('Menu')}</Link><Link to="/admin/billing">{t('Billing')}</Link><Link to="/admin/moderation">{t('Confessions')}</Link><button className="text-button" onClick={() => { sessionStorage.removeItem('cafeAdminToken'); setToken(''); }}>{t('Sign out')}</button></div></header>
    <main className="admin-page event-admin-page"><div className="admin-heading"><div><p className="eyebrow">{t('CELEBRATIONS AT FRIENDSHIP CAFÉ')}</p><h1>{t('Event bookings')}</h1><p>{t('Review upcoming celebrations and keep the café team in sync.')}</p></div><div className="event-admin-summary"><span className={`live-indicator ${live ? 'online' : ''}`}><i />{live ? t('Live updates') : t('Connecting')}</span><strong>{pendingCount} {t('pending requests')}</strong></div></div>
      {error && <p className="notice error-notice" role="alert">{t(error)}</p>}
      <section className="event-admin-toolbar"><div className="event-status-filters" role="group" aria-label={t('Filter bookings by status')}>{statusFilters.map((status) => <button type="button" key={status} className={statusFilter === status ? 'filter-active' : ''} onClick={() => setStatusFilter(status)}>{t(status)}{status === 'Pending' && pendingCount > 0 && <span className="pending-count-badge">{pendingCount}</span>}</button>)}</div><div className="event-admin-controls"><label>{t('Event type')}<select value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}><option value="All">{t('All event types')}</option>{Array.from(new Set(bookings.map((booking) => booking.eventType))).sort().map((type) => <option key={type}>{t(type)}</option>)}</select></label><button type="button" className="secondary-button" onClick={() => loadBookings()} disabled={loading}>{loading ? t('Loading…') : t('Refresh')}</button></div></section>
      <div className="event-admin-list">{filteredBookings.map((booking) => {
        const actions = statusActions[booking.status] || [];
        return <article className="event-admin-card" key={booking._id}>
          {booking.bookingSpace === 'Full Cafe' && <div className="full-cafe-alert"><strong>{t('FULL CAFÉ BOOKING')}</strong><span>{t(booking.status === 'Approved' ? 'Block regular table walk-ins during this approved booking.' : 'Full Cafe request: confirm availability before approval.')}</span></div>}
          <div className="event-admin-card-heading"><div><p className="eyebrow">{booking.bookingId} · {t(booking.status)}</p><h2>{t(booking.eventType)}</h2></div><span className={`event-status-badge status-${booking.status.toLowerCase()}`}>{t(booking.status)}</span></div>
          <div className="event-admin-details"><div><span>{t('Guest')}</span><strong>{booking.customerName}</strong></div><div><span>{t('Contact')}</span><strong>{booking.phone}</strong>{booking.email && <small>{booking.email}</small>}</div><div><span>{t('Date and time')}</span><strong>{new Date(booking.eventDate).toLocaleDateString(locale, { dateStyle: 'long', timeZone: 'Asia/Kolkata' })}</strong><small>{booking.startTime}–{booking.endTime}</small></div><div><span>{t('Guests')}</span><strong>{booking.guestCount}</strong></div><div><span>{t('Space')}</span><strong>{t(booking.bookingSpace)}</strong></div><div><span>{t('Catering')}</span><strong>{t(booking.cateringPreference)}</strong></div>{booking.estimatedBudget != null && <div><span>{t('Estimated budget')}</span><strong>{new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(booking.estimatedBudget)}</strong></div>}</div>
          {booking.specialRequests && <div className="event-request-notes"><strong>{t('Special requests')}</strong><p>{booking.specialRequests}</p></div>}
          <label className="event-admin-notes">{t('Internal café notes')}<textarea rows="2" maxLength="2000" value={notes[booking._id] ?? booking.adminNotes ?? ''} onChange={(e) => setNotes((current) => ({ ...current, [booking._id]: e.target.value }))} placeholder={t('Add manager notes…')} /></label>
          <div className="event-admin-actions">{actions.map((status) => <button type="button" className={status === 'Rejected' || status === 'Cancelled' ? 'secondary-button danger-button' : 'primary-button'} key={status} disabled={busyId === booking._id} onClick={() => updateStatus(booking, status)}>{busyId === booking._id ? t('Saving…') : t(status === 'Approved' ? 'Approve booking' : status === 'Rejected' ? 'Reject request' : status === 'Completed' ? 'Mark completed' : 'Cancel booking')}</button>)}<button type="button" className="secondary-button" disabled={busyId === booking._id} onClick={() => updateStatus(booking, booking.status)}>{busyId === booking._id ? t('Saving…') : t('Save notes')}</button><button type="button" className="text-button delete-event-button" disabled={busyId === booking._id} onClick={() => deleteBooking(booking)}>{t('Delete')}</button></div>
        </article>;
      })}{filteredBookings.length === 0 && <div className="empty-state"><span>☕</span><h2>{loading ? t('Loading event bookings…') : t('No event bookings found.')}</h2><p>{t('New customer requests will appear here.')}</p></div>}</div>
    </main></div>;
}
