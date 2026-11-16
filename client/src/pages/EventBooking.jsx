import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../api';
import { getCustomerSessionToken } from '../customerSession';

const eventTypes = [
  'Birthday Party', 'Anniversary Celebration', 'Bridal Shower', 'Baby Shower', 'Engagement Party',
  'Graduation Party', 'Farewell Party', 'Retirement Party', 'Reunion (Family or Friends)',
  'Corporate Meeting', 'Business Networking Event', 'Product Launch', 'Workshop or Masterclass',
  'Book Club Meeting', 'Open Mic Night', 'Live Music Performance', 'Stand-up Comedy Show',
  'Art Exhibition or Pop-up Shop', 'Holiday or Seasonal Party', 'Private Dinner or Brunch'
];
const spaces = ['Full Cafe', 'Private Section', 'Outdoor Patio'];
const cateringOptions = ['Standard Menu', 'Custom Buffet', 'Drinks & Snacks Only', 'No Catering'];
const timeSlots = Array.from({ length: 27 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function cafeToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function slotBlocksSpace(slot, requestedSpace) {
  return requestedSpace === 'Full Cafe' || slot.bookingSpace === 'Full Cafe' || requestedSpace === slot.bookingSpace;
}

export default function EventBooking() {
  const { language, t } = useLanguage();
  const [form, setForm] = useState({ customerName: '', phone: '', email: '', eventType: eventTypes[0], eventDate: '', startTime: '10:00', endTime: '12:00', guestCount: '20', bookingSpace: 'Private Section', cateringPreference: 'Standard Menu', specialRequests: '', estimatedBudget: '' });
  const [slots, setSlots] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [lookupValue, setLookupValue] = useState('');
  const [lookupMode, setLookupMode] = useState('bookingId');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupPerformed, setLookupPerformed] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';

  useEffect(() => {
    if (!form.eventDate) { setSlots([]); return undefined; }
    const controller = new AbortController();
    setAvailabilityLoading(true); setAvailabilityError('');
    apiRequest(`/api/events/availability?date=${encodeURIComponent(form.eventDate)}`, { signal: controller.signal })
      .then((data) => setSlots(data.slots || []))
      .catch((err) => { if (err.name !== 'AbortError') setAvailabilityError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false); });
    return () => controller.abort();
  }, [form.eventDate]);

  const overlappingSlots = useMemo(() => slots.filter((slot) => slotBlocksSpace(slot, form.bookingSpace) && overlaps(form.startTime, form.endTime, slot.startTime, slot.endTime)), [slots, form.bookingSpace, form.startTime, form.endTime]);
  const conflicts = overlappingSlots.filter((slot) => slot.status === 'Approved');
  const pendingWarnings = overlappingSlots.filter((slot) => slot.status === 'Pending');
  const endTimes = timeSlots.filter((time) => time > form.startTime);

  function change(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function submitBooking(event) {
    event.preventDefault(); setError(''); setConfirmation(null);
    if (conflicts.length) { setError('Selected time overlaps an approved booking. Choose another space or time.'); return; }
    setSubmitting(true);
    try {
      const customerSessionToken = await getCustomerSessionToken();
      const data = await apiRequest('/api/events', { customerSessionToken, method: 'POST', body: JSON.stringify({ ...form, guestCount: Number(form.guestCount), estimatedBudget: form.estimatedBudget === '' ? null : Number(form.estimatedBudget) }) });
      setConfirmation(data.booking); setLookupValue(data.booking.bookingId); setLookupMode('bookingId');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function lookupBooking(event) {
    event.preventDefault(); setLookupError(''); setLookupResults([]); setLookupPerformed(true); setLookingUp(true);
    const params = new URLSearchParams({ [lookupMode]: lookupValue.trim() });
    try { const data = await apiRequest(`/api/events/lookup?${params}`); setLookupResults(data.bookings || []); }
    catch (err) { setLookupError(err.message); }
    finally { setLookingUp(false); }
  }

  return <div className="event-page-shell">
    <header className="event-page-topbar"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /></Link><nav><Link to="/">{t('Menu')}</Link><Link to="/confessions">{t('Confession wall')}</Link></nav><LanguageSwitcher /></header>
    <main className="event-page">
      <section className="event-hero"><p className="eyebrow">{t('MAKE IT A FRIENDSHIP CAFÉ MOMENT')}</p><h1>{t('Book the café for your celebration')}</h1><p>{t('Tell us what you are planning and our team will follow up to make it special.')}</p></section>
      <div className="event-content-grid">
        <section className="event-form-panel"><div className="event-section-heading"><div><p className="eyebrow">{t('CELEBRATE TOGETHER')}</p><h2>{t('Event booking request')}</h2></div><span className="event-price-note">{t('Budget in ₹')}</span></div>
          <form className="event-booking-form" onSubmit={submitBooking}>
            <div className="event-form-row"><label>{t('Your name')}<input autoComplete="name" value={form.customerName} onChange={(e) => change('customerName', e.target.value)} maxLength="120" pattern="[^<>]*" required /></label><label>{t('Phone number')}<input type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={(e) => change('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength="10" pattern="[6-9][0-9]{9}" placeholder={t('10-digit Indian mobile number')} required /></label></div>
            <label>{t('Email (optional)')}<input type="email" autoComplete="email" value={form.email} onChange={(e) => change('email', e.target.value)} maxLength="254" /></label>
            <label>{t('Type of event')}<select value={form.eventType} onChange={(e) => change('eventType', e.target.value)}>{eventTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label>
            <div className="event-form-row event-form-row-three"><label>{t('Event date')}<input type="date" min={cafeToday()} value={form.eventDate} onChange={(e) => change('eventDate', e.target.value)} required /></label><label>{t('Start time')}<select value={form.startTime} onChange={(e) => { const startTime = e.target.value; change('startTime', startTime); if (form.endTime <= startTime) change('endTime', timeSlots.find((time) => time > startTime) || '22:00'); }}>{timeSlots.slice(0, -1).map((time) => <option key={time}>{time}</option>)}</select></label><label>{t('End time')}<select value={endTimes.includes(form.endTime) ? form.endTime : endTimes[0]} onChange={(e) => change('endTime', e.target.value)}>{endTimes.map((time) => <option key={time}>{time}</option>)}</select></label></div>
            {form.eventDate && <div className={`event-availability ${conflicts.length ? 'availability-conflict' : 'availability-open'}`} role="status"><strong>{availabilityLoading ? t('Checking availability…') : availabilityError ? t('Availability could not be checked.') : conflicts.length ? t('This time is already booked for the selected space.') : t('This time appears available.')}</strong>{availabilityError && <span>{availabilityError}</span>}{pendingWarnings.length > 0 && <span>{t('There is a pending request during this time; we will confirm after review.')}</span>}{slots.length > 0 && <div className="availability-slots">{slots.map((slot) => <span key={slot.bookingId} className={slot.status === 'Approved' ? 'slot-approved' : 'slot-pending'}>{slot.startTime}–{slot.endTime} · {t(slot.bookingSpace)} · {t(slot.status)}</span>)}</div>}</div>}
            <div className="event-form-row"><label>{t('Guest count')}<input type="number" min="1" max="500" step="1" value={form.guestCount} onChange={(e) => change('guestCount', e.target.value)} required /></label><label>{t('Space preference')}<select value={form.bookingSpace} onChange={(e) => change('bookingSpace', e.target.value)}>{spaces.map((space) => <option key={space}>{t(space)}</option>)}</select></label></div>
            <label>{t('Catering preference')}<select value={form.cateringPreference} onChange={(e) => change('cateringPreference', e.target.value)}>{cateringOptions.map((option) => <option key={option}>{t(option)}</option>)}</select></label>
            <label>{t('Special requests')}<textarea rows="4" maxLength="3000" value={form.specialRequests} onChange={(e) => change('specialRequests', e.target.value)} placeholder={t('Decorations, sound system, cake, projector, seating layout…')} /></label>
            <label>{t('Estimated budget (₹, optional)')}<input type="number" min="0" step="100" value={form.estimatedBudget} onChange={(e) => change('estimatedBudget', e.target.value)} placeholder="₹" /></label>
            {error && <p className="form-error" role="alert">{t(error)}</p>}
            <button className="primary-button event-submit" disabled={submitting || conflicts.length > 0}>{submitting ? t('Sending request…') : t('Request event booking')}</button>
            <p className="event-disclaimer">{t('Your request is pending until the café team approves it. Submitting does not charge a fee.')}</p>
          </form>
        </section>
        <aside className="event-side-column">
          {confirmation && <section className="event-confirmation" role="status"><span className="confirmation-check">✓</span><p className="eyebrow">{t('REQUEST RECEIVED')}</p><h2>{t('Thank you!')}</h2><p>{t('Your event request is in our inbox. We will contact you to confirm the details.')}</p><dl><div><dt>{t('Booking ID')}</dt><dd>{confirmation.bookingId}</dd></div><div><dt>{t('Status')}</dt><dd><span className="event-status-badge status-pending">{t(confirmation.status)}</span></dd></div><div><dt>{t('Event date')}</dt><dd>{new Date(confirmation.eventDate).toLocaleDateString(locale, { dateStyle: 'long', timeZone: 'Asia/Kolkata' })}</dd></div><div><dt>{t('Time')}</dt><dd>{confirmation.startTime}–{confirmation.endTime}</dd></div></dl></section>}
          <section className="event-lookup-panel"><p className="eyebrow">{t('YOUR EVENT')}</p><h2>{t('Check booking status')}</h2><p>{t('Look up your request using the booking ID or contact phone number.')}</p><form onSubmit={lookupBooking}><label>{t('Search by')}<select value={lookupMode} onChange={(e) => { setLookupMode(e.target.value); setLookupValue(''); setLookupResults([]); setLookupPerformed(false); }}><option value="bookingId">{t('Booking ID')}</option><option value="phone">{t('Phone number')}</option></select></label><label>{lookupMode === 'bookingId' ? t('Booking ID') : t('Phone number')}<input value={lookupValue} onChange={(e) => { setLookupValue(e.target.value); setLookupResults([]); setLookupPerformed(false); }} required /></label>{lookupError && <p className="form-error" role="alert">{t(lookupError)}</p>}<button type="submit" className="secondary-button" disabled={lookingUp}>{lookingUp ? t('Searching…') : t('Find booking')}</button></form>{lookupResults.length > 0 && <div className="event-lookup-results">{lookupResults.map((booking) => <article key={booking.bookingId}><strong>{booking.bookingId}</strong><span>{t(booking.eventType)}</span><span>{new Date(booking.eventDate).toLocaleDateString(locale, { dateStyle: 'medium', timeZone: 'Asia/Kolkata' })} · {booking.startTime}–{booking.endTime}</span><span className={`event-status-badge status-${booking.status.toLowerCase()}`}>{t(booking.status)}</span></article>)}</div>}{lookupPerformed && lookupResults.length === 0 && !lookingUp && !lookupError && <p className="lookup-empty">{t('No bookings found for that detail.')}</p>}</section>
          <div className="event-contact-note"><strong>{t('Planning something special?')}</strong><span>{t('Our café team will be happy to help shape the details.')}</span></div>
        </aside>
      </div>
    </main>
  </div>;
}
