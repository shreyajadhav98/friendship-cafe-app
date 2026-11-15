import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { io } from 'socket.io-client';
import { API_ROOT, apiRequest } from '../api';

const SOCKET_URL = API_ROOT || undefined;

export default function AdminModeration() {
  const { language, t } = useLanguage();
  const [token, setToken] = useState(() => sessionStorage.getItem('cafeAdminToken') || '');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    apiRequest('/api/auth/me', { token }).then(() => apiRequest('/api/confessions/pending', { token })).then((data) => {
      if (active) setPending((current) => { const merged = new Map((data.confessions || []).map((item) => [item._id, item])); current.forEach((item) => merged.set(item._id, item)); return [...merged.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); });
    }).catch(() => { if (active) { sessionStorage.removeItem('cafeAdminToken'); setToken(''); setError('Your admin session expired. Sign in again.'); } });
    socket.on('newPendingConfession', (confession) => { if (active) setPending((current) => current.some((item) => item._id === confession._id) ? current : [...current, confession]); });
    socket.on('connect_error', (err) => { if (active) setError(err.message || 'Could not connect to live moderation updates.'); });
    return () => { active = false; socket.removeAllListeners(); socket.disconnect(); };
  }, [token]);

  async function login(event) {
    event.preventDefault(); setError('');
    try { const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); sessionStorage.setItem('cafeAdminToken', data.token); setToken(data.token); }
    catch (err) { setError(err.message); }
  }

  async function moderate(confession, action) {
    setBusyId(confession._id); setError(''); setNotice('');
    try {
      if (action === 'approve') {
        await apiRequest(`/api/confessions/${confession._id}/approve`, { token, method: 'PATCH' });
        setNotice('Confession approved and added to the live wall.');
      } else {
        await apiRequest(`/api/confessions/${confession._id}`, { token, method: 'DELETE' });
        setNotice('Confession deleted.');
      }
      setPending((current) => current.filter((item) => item._id !== confession._id));
    } catch (err) { setError(err.message); }
    finally { setBusyId(''); }
  }

  if (!token) return <main className="admin-login-page"><Link className="brand" to="/">{t('Friendship Café home')}</Link><LanguageSwitcher /><form className="login-card" onSubmit={login}><p className="eyebrow">{t('COMMUNITY MODERATION')}</p><h1>{t('Confession wall')}</h1><p>{t('Admin sign in is required to review anonymous notes.')}</p>{error && <p className="form-error" role="alert">{t(error)}</p>}<label>{t('Username')}<input autoComplete="username" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} required /></label><label>{t('Password')}<input type="password" autoComplete="current-password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required /></label><button className="primary-button">{t('Sign in to moderate')}</button><Link className="back-link" to="/">{t('Back to customer menu')}</Link></form></main>;

  return <div className="admin-shell moderation-shell"><header className="admin-topbar"><Link className="brand" to="/">{t('Friendship Café home')}<small>{t(' / Community')}</small></Link><div className="admin-user"><LanguageSwitcher /><Link to="/admin/kitchen">{t('Kitchen')}</Link><Link to="/admin/menu">{t('Menu')}</Link><Link to="/admin/billing">{t('Billing')}</Link><button className="text-button" onClick={() => { sessionStorage.removeItem('cafeAdminToken'); setToken(''); }}>{t('Sign out')}</button></div></header><main className="admin-page moderation-page"><nav className="admin-tabs" aria-label={t('Admin sections')}><Link to="/admin/kitchen">{t('Kitchen')}</Link><Link to="/admin/menu">{t('Menu')}</Link><Link to="/admin/billing">{t('Billing')}</Link><span aria-current="page">{t('Confession moderation')}</span></nav><div className="admin-heading"><div><p className="eyebrow">{t('COMMUNITY CARE')}</p><h1>{t('Confession moderation')}</h1><p>{t('Review each note before it joins the public wall.')}</p></div><span className="ticket-count">{pending.length} {t('awaiting review')}</span></div>{notice && <p className="notice success-notice" role="status">{t(notice)}</p>}{error && <p className="notice error-notice" role="alert">{t(error)}</p>}
    {pending.length === 0 ? <div className="moderation-empty"><span>✧</span><h2>{t('All caught up')}</h2><p>{t('New anonymous notes will appear here as they arrive.')}</p></div> : <section className="moderation-list">{pending.map((confession) => <article className="pending-confession" key={confession._id}><div className="pending-note-icon">✎</div><div className="pending-note-body"><p>{confession.messageText}</p><time>{new Date(confession.createdAt).toLocaleString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN')}</time></div><div className="moderation-actions"><button className="approve-button" disabled={busyId === confession._id} onClick={() => moderate(confession, 'approve')}>{busyId === confession._id ? t('Saving…') : t('Approve')}</button><button className="delete-action" disabled={busyId === confession._id} onClick={() => moderate(confession, 'delete')}>{t('Delete')}</button></div></article>)}</section>}
  </main></div>;
}
