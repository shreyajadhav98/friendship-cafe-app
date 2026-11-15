import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { io } from 'socket.io-client';
import { API_ROOT, apiRequest } from '../api';

const SOCKET_URL = API_ROOT || undefined;
const MAX_LENGTH = 500;

function getLikedIds() {
  try { return new Set(JSON.parse(localStorage.getItem('cafeLikedConfessions') || '[]')); }
  catch { return new Set(); }
}

export default function ConfessionWall() {
  const { language, t } = useLanguage();
  const [confessions, setConfessions] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [likedIds, setLikedIds] = useState(getLikedIds);
  const [submitting, setSubmitting] = useState(false);
  const [likingId, setLikingId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest('/api/confessions').then((data) => { if (active) setConfessions(data.confessions || []); }).catch((err) => { if (active) setError(err.message); });
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('newApprovedConfession', (confession) => {
      if (active) setConfessions((current) => [confession, ...current.filter((entry) => entry._id !== confession._id)]);
    });
    return () => { active = false; socket.removeAllListeners(); socket.disconnect(); };
  }, []);

  const sortedConfessions = useMemo(() => [...confessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [confessions]);

  async function submitConfession(event) {
    event.preventDefault(); setError(''); setNotice(''); setSubmitting(true);
    try {
      await apiRequest('/api/confessions', { method: 'POST', body: JSON.stringify({ messageText }) });
      setMessageText(''); setNotice('Your note is in the queue. It will appear here after moderation.');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function likeConfession(confession) {
    if (likedIds.has(confession._id) || likingId) return;
    setError(''); setLikingId(confession._id);
    try {
      const data = await apiRequest(`/api/confessions/${confession._id}/like`, { method: 'PATCH' });
      setConfessions((current) => current.map((entry) => entry._id === data.confession._id ? data.confession : entry));
      setLikedIds((current) => { const next = new Set(current).add(confession._id); localStorage.setItem('cafeLikedConfessions', JSON.stringify([...next])); return next; });
    } catch (err) { setError(err.message); }
    finally { setLikingId(''); }
  }

  return <div className="confession-shell"><header className="topbar"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /></Link><LanguageSwitcher /><nav><Link to="/">{t('Menu')}</Link><span className="wall-label">{t('Community wall')}</span></nav></header><main className="confession-page"><section className="confession-hero"><p className="eyebrow">{t('LEAVE A LITTLE SOMETHING')}</p><h1>{t('Words between')}<br />{t('sips.')}</h1><p>{t('A thought, a secret, a thank-you, a tiny joy. Share it anonymously with the café.')}</p></section>
    <div className="confession-layout"><section className="confession-compose"><div className="compose-heading"><span>✎</span><div><h2>{t('Leave a note')}</h2><p>{t('Your name is never attached.')}</p></div></div><form onSubmit={submitConfession}><label htmlFor="confession-message">{t('Your anonymous message')}</label><textarea id="confession-message" value={messageText} onChange={(e) => setMessageText(e.target.value)} maxLength={MAX_LENGTH} placeholder={t('Today I remembered to slow down and enjoy my coffee…')} rows="5" required /><div className="compose-footer"><span>{messageText.length}/{MAX_LENGTH}</span><button className="primary-button" disabled={submitting || !messageText.trim()}>{submitting ? t('Sending…') : t('Send anonymously')}</button></div></form>{notice && <p className="confession-notice" role="status">{t(notice)}</p>}{error && <p className="form-error" role="alert">{t(error)}</p>}<p className="moderation-note">{t('Notes are reviewed by our team before appearing on the wall.')}</p></section>
      <section className="confession-feed"><div className="feed-heading"><div><p className="eyebrow">{t('FROM THE CAFÉ COMMUNITY')}</p><h2>{t('The wall')}</h2></div><span className="live-label"><i /> {t('Live')}</span></div>{sortedConfessions.length === 0 ? <div className="wall-empty"><span>♡</span><h3>{t('A little quiet here')}</h3><p>{t('Leave the first note for someone to find.')}</p></div> : <div className="confession-list">{sortedConfessions.map((confession) => <article className="confession-card" key={confession._id}><p className="confession-message">{confession.messageText}</p><div className="confession-card-footer"><time>{new Date(confession.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', { month: 'short', day: 'numeric' })}</time><button className={`like-button ${likedIds.has(confession._id) ? 'liked' : ''}`} disabled={likedIds.has(confession._id) || likingId === confession._id} onClick={() => likeConfession(confession)} aria-label={`${t('Like confession')}, ${confession.likesCount} ${t('likes')}`}><span>{likedIds.has(confession._id) ? '♥' : '♡'}</span> {confession.likesCount}</button></div></article>)}</div>}</section></div><Link className="wall-back-link" to="/">← {t('Back to the menu')}</Link>
  </main></div>;
}
