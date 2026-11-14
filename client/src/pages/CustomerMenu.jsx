import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { io } from 'socket.io-client';
import CafeDirectionsModal from '../components/CafeDirectionsModal';
import { apiRequest } from '../api';
import { canAddItemToCart, isItemUnavailable } from '../menuPresentation';
import { getOrderingContextFromSearch } from '../tableNumber';

const SOCKET_URL = import.meta.env.VITE_API_URL || undefined;
function playReadyChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = frequency; oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + index * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.16 + 0.22);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(context.currentTime + index * 0.16); oscillator.stop(context.currentTime + index * 0.16 + 0.24);
    });
    window.setTimeout(() => context.close(), 600);
  } catch { /* Audio is optional; the visual update remains available. */ }
}

export default function CustomerMenu() {
  const { t } = useLanguage();
  const orderingContext = getOrderingContextFromSearch(window.location.search);
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState({});
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState(() => orderingContext.tableNumber);
  const [placing, setPlacing] = useState(false);
  const [tracker, setTracker] = useState(() => { try { return JSON.parse(sessionStorage.getItem('cafeOrderTrack') || 'null'); } catch { return null; } });
  const trackerRef = useRef(tracker);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [readyNotice, setReadyNotice] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const refreshMenu = () => apiRequest('/api/menu').then((data) => { if (active) { setItems(data.items || []); setError(''); } }).catch((err) => { if (active) setError(err.message); });
    const refreshOnAdminChange = (event) => { if (event.key === 'cafeMenuUpdatedAt') refreshMenu(); };
    refreshMenu();
    window.addEventListener('storage', refreshOnAdminChange);
    window.addEventListener('focus', refreshMenu);
    return () => { active = false; window.removeEventListener('storage', refreshOnAdminChange); window.removeEventListener('focus', refreshMenu); };
  }, []);
  useEffect(() => {
    const client = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(client);
    client.on('connect', () => {
      setSocketConnected(true);
      const saved = trackerRef.current || (() => { try { return JSON.parse(sessionStorage.getItem('cafeOrderTrack') || 'null'); } catch { return null; } })();
      if (saved?.trackingToken && saved?.order?.orderId) {
        client.emit('trackOrder', { orderId: saved.order.orderId, trackingToken: saved.trackingToken }, (result) => {
          if (result?.ok) { const next = { ...saved, order: result.order }; trackerRef.current = next; setTracker(next); sessionStorage.setItem('cafeOrderTrack', JSON.stringify(next)); }
        });
      }
    });
    client.on('disconnect', () => setSocketConnected(false));
    client.on('orderStatusChanged', (updatedOrder) => {
      const previous = trackerRef.current;
      if (!previous || previous.order?.orderId !== updatedOrder.orderId) return;
      const next = { ...previous, order: updatedOrder };
      trackerRef.current = next; setTracker(next); sessionStorage.setItem('cafeOrderTrack', JSON.stringify(next));
      if (updatedOrder.orderStatus === 'Ready' && previous.order.orderStatus !== 'Ready') { setReadyNotice(true); playReadyChime(); notifyOrderReady(updatedOrder); }
    });
    return () => { client.removeAllListeners(); client.disconnect(); };
  }, []);
  const categories = useMemo(() => ['All', ...new Set(items.map((item) => item.category))], [items]);
  const visibleItems = useMemo(() => items.filter((item) => `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (category === 'All' || item.category === category) && (!availableOnly || item.isAvailable)), [items, query, category, availableOnly]);
  const totalItems = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const cartLines = items.filter((item) => cart[item._id]).map((item) => ({ ...item, quantity: cart[item._id] }));
  const cartTotal = cartLines.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  function addToCart(item) { if (canAddItemToCart(item)) setCart((old) => ({ ...old, [item._id]: (old[item._id] || 0) + 1 })); }
  function changeQuantity(item, delta) { setCart((old) => { const quantity = (old[item._id] || 0) + delta; const next = { ...old }; if (quantity < 1) delete next[item._id]; else next[item._id] = quantity; return next; }); }
  function orderAck(payload) { return new Promise((resolve, reject) => { if (!socket?.connected) return reject(new Error('Reconnecting to the café. Please try again in a moment.')); socket.timeout(10000).emit('placeOrder', payload, (timeoutError, response) => { if (timeoutError) return reject(new Error('The café did not respond. Please try again.')); if (!response?.ok) return reject(new Error(response?.error || 'Order could not be placed')); resolve(response); }); }); }
  function requestReadyNotificationPermission() {
    if (!('Notification' in window) || window.Notification.permission !== 'default') return;
    try { const permissionRequest = window.Notification.requestPermission(); permissionRequest?.catch?.(() => {}); } catch { /* Permission prompts are optional in unsupported browsers. */ }
  }
  function notifyOrderReady(order) {
    if (!('Notification' in window) || window.Notification.permission !== 'granted') return;
    try { new window.Notification(t('Your order is ready!'), { body: `${t('Order')} #${order.orderId} · ${t('Your order is ready for pickup at the counter.')}`, tag: `cafe-order-${order.orderId}` }); } catch { /* Browser notifications are optional; the in-app alert remains available. */ }
  }
  async function placeOrder(event) {
    event.preventDefault(); requestReadyNotificationPermission(); setError(''); setPlacing(true);
    try {
      const result = await orderAck({ customerName, tableNumber, orderingMode: orderingContext.mode, total: Number(cartTotal.toFixed(2)), items: cartLines.map((item) => ({ menuItemId: item._id, quantity: item.quantity })) });
      const next = { order: result.order, trackingToken: result.trackingToken };
      trackerRef.current = next; setTracker(next); sessionStorage.setItem('cafeOrderTrack', JSON.stringify(next)); setCart({}); setCartOpen(false); setTrackerOpen(true); setReadyNotice(false);
    } catch (err) { setError(err.message); }
    finally { setPlacing(false); }
  }
  const groups = visibleItems.reduce((acc, item) => { (acc[item.category] ||= []).push(item); return acc; }, {});

  return <div className="customer-shell">
    <header className="topbar"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /></Link><LanguageSwitcher /><nav><button className="directions-link" onClick={() => setDirectionsOpen(true)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 10c0 5.2-8 12-8 12S4 15.2 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg><span>{t('Get Directions')}</span></button><Link to="/confessions">{t('Confession wall')}</Link>{tracker && <button className="track-link" onClick={() => setTrackerOpen(true)}>{t('Track')} #{tracker.order.orderId}</button>}<button className="cart-pill cart-trigger" onClick={() => setCartOpen(true)} aria-label={`${t('Open cart')}, ${totalItems} ${t('items')}`}>{t('Bag')} · {totalItems}</button><Link to="/admin/kitchen">{t('Kitchen')}</Link></nav></header>
    {orderingContext.notice && <div className="ordering-context-banner" role="status">{orderingContext.mode === 'remote' ? t('Welcome remote customer') : `${t('Ordering for table')} ${orderingContext.tableNumber}`}</div>}
    {!socketConnected && <div className="socket-banner" role="status">{t('Connecting to live café service…')}</div>}
    <main className="menu-page"><section className="menu-hero"><div className="menu-hero-content"><p className="eyebrow">{t('FRIENDSHIP CAFÉ · TASTY, FAST FOOD')}</p><h1>{t('Something lovely')}<br />{t('for your table.')}</h1><p className="hero-copy">{t('Good things have a way of coming together.')}</p><p className="hero-subcopy">{t('Freshly made favorites, ready when you are.')}</p><span className="hero-welcome">{t('Enjoy with the friends')}</span></div></section>
      <section className="menu-controls" aria-label={t('Menu filters')}><label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Search the menu')} aria-label={t('Search menu')} /></label><label className="select-box"><span className="sr-only">{t('Category')}</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((name) => <option key={name}>{t(name)}</option>)}</select></label><label className="available-filter"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} /> {t('Available now')}</label></section>
      {error && <p className="notice error-notice" role="alert">{t(error)}. {t('Check that the café server is running.')}</p>}
      {Object.entries(groups).map(([name, categoryItems]) => <section className="category-section" key={name}><div className="section-heading"><div><p className="eyebrow">{t('MADE FOR YOUR MOMENT')}</p><h2>{t(name)}</h2></div><span>{categoryItems.length} {t('items')}</span></div><div className="menu-grid">{categoryItems.map((item) => { const unavailable = isItemUnavailable(item); return <article className={`menu-card ${unavailable ? 'is-unavailable' : ''}`} key={item._id}><div className="menu-image">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span aria-hidden="true">{item.category.toLowerCase().includes('beverage') || item.category.toLowerCase().includes('drink') ? '☕' : '✿'}</span>}{unavailable && <b className="sold-out">{t('Currently unavailable')}</b>}</div><div className="menu-card-content"><div className="item-title"><h3>{item.name}</h3><strong>{'₹' + Number(item.price).toFixed(2)}</strong></div><p>{item.description || t('A café favorite, prepared fresh.')}</p><div className="item-meta"><span>{item.prepTimeMinutes || 0} {t('min')}</span><button className="add-button" disabled={!canAddItemToCart(item)} onClick={() => addToCart(item)}>{unavailable ? t('Sold out') : cart[item._id] ? `${t('Added')} · ${cart[item._id]}` : t('Add') + ' +'}</button></div></div></article>; })}</div></section>)}
      {!error && visibleItems.length === 0 && <div className="empty-state"><span>☕</span><h2>{t('No menu matches')}</h2><p>{t('Try another search or category.')}</p></div>}
      <section className="cafe-experience" aria-labelledby="experience-title"><div className="experience-heading"><p className="eyebrow">{t('A PLACE TO PAUSE')}</p><h2 id="experience-title">{t('The Café Experience')}</h2><p>{t('Come for a bite, stay for the company. Here’s a little look around Friendship Café.')}</p></div><div className="experience-grid"><figure className="experience-card"><img src="/images/outer_view.png" alt={t('The welcoming outside view of Friendship Café')} loading="lazy" /><figcaption><span>{t('01 · THE WELCOME')}</span><strong>{t('A friendly place to gather')}</strong></figcaption></figure><figure className="experience-card"><img src="/images/innerViewAndKitchen.png" alt={t('Friendship Café interior and open kitchen')} loading="lazy" /><figcaption><span>{t('02 · MADE WITH CARE')}</span><strong>{t('Good things come together')}</strong></figcaption></figure><figure className="experience-card"><img src="/images/table_view.png" alt={t('Café seating with signature purple-topped tables')} loading="lazy" /><figcaption><span>{t('03 · YOUR TABLE')}</span><strong>{t('Enjoy with the friends')}</strong></figcaption></figure></div></section>
      <footer className="customer-footer"><span>{t('Good food, good company.')}</span><button className="footer-directions" onClick={() => setDirectionsOpen(true)}>{t('Find Friendship Café · Get directions')}</button><Link to="/confessions">{t('Leave a note on the café wall ↗')}</Link></footer>
    </main>{readyNotice && tracker && <button className="ready-toast" type="button" aria-live="polite" aria-label={`${t('Your order is ready for pickup at the counter.')} ${t('Order')} ${tracker.order.orderId}`} onClick={() => { setTrackerOpen(true); setReadyNotice(false); }}><span aria-hidden="true">🎉</span><span>{t('Your order is ready for pickup at the counter.')} · #{tracker.order.orderId}</span><span aria-hidden="true">×</span></button>}{totalItems > 0 && <button className="cart-toast" onClick={() => setCartOpen(true)}>{totalItems} {t(totalItems === 1 ? 'item' : 'items')} · {t('View bag')}</button>}
    {cartOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}><section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="cart-title"><div className="modal-heading"><div><p className="eyebrow">{t('YOUR ORDER')}</p><h2 id="cart-title">{t('A little something')}</h2></div><button className="close-button" onClick={() => setCartOpen(false)} aria-label={t('Close cart')}>×</button></div>{cartLines.length === 0 ? <div className="empty-cart"><p>{t('Your bag is waiting for a café favorite.')}</p><button className="primary-button" onClick={() => setCartOpen(false)}>{t('Explore menu')}</button></div> : <form onSubmit={placeOrder}><div className="cart-lines">{cartLines.map((item) => <div className="cart-line" key={item._id}><div><strong>{item.name}</strong><small>{'₹' + Number(item.price).toFixed(2)} {t('each')}</small></div><div className="qty-control"><button type="button" onClick={() => changeQuantity(item, -1)} aria-label={`${t('Remove one')} ${item.name}`}>−</button><span>{item.quantity}</span><button type="button" disabled={!item.isAvailable} onClick={() => addToCart(item)} aria-label={`${t('Add one')} ${item.name}`}>＋</button></div><strong>{'₹' + (Number(item.price) * item.quantity).toFixed(2)}</strong></div>)}</div><div className="cart-total"><span>{t('Total')}</span><strong>{'₹' + cartTotal.toFixed(2)}</strong></div><label>{t('Your name (optional)')}<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength="120" placeholder={t('Guest')} /></label><label>{t('Table number')}<input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required maxLength="30" placeholder={t('e.g. 4')} /></label>{error && <p className="form-error" role="alert">{t(error)}</p>}<button className="primary-button place-order-button" disabled={placing || !socketConnected}>{placing ? t('Sending to kitchen…') : t('Place order') + ' · ₹' + cartTotal.toFixed(2)}</button><p className="price-note">{t('Final total is confirmed by the café menu.')}</p></form>}</section></div>}
    {trackerOpen && tracker && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setTrackerOpen(false); }}><section className="order-modal tracker-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-title"><div className="modal-heading"><div><p className="eyebrow">{t('LIVE ORDER TRACKER')} · #{tracker.order.orderId}</p><h2 id="tracker-title">{tracker.order.orderStatus === 'Ready' ? t('Your order is ready!') : t('Your order is on its way')}</h2></div><button className="close-button" onClick={() => setTrackerOpen(false)} aria-label={t('Close')}>×</button></div>{readyNotice && <div className="ready-alert" role="alert"><span>✦</span> {t('Your order is ready for pickup at the counter.')}</div>}<div className="tracker-summary"><span>{t('Table')} {tracker.order.tableNumber}</span><strong>{'₹' + Number(tracker.order.totalAmount).toFixed(2)}</strong></div><div className="status-steps">{['Received', 'Preparing', 'Ready', 'Completed'].map((status, index) => { const activeIndex = ['Received', 'Preparing', 'Ready', 'Completed'].indexOf(tracker.order.orderStatus); return <div className={`status-step ${index <= activeIndex ? 'step-done' : ''} ${tracker.order.orderStatus === status ? 'step-current' : ''}`} key={status}><span>{index <= activeIndex ? '✓' : index + 1}</span><strong>{t(status)}</strong></div>; })}</div><div className="tracker-lines">{tracker.order.items.map((line) => <div key={line.menuItemId}><span>{line.quantity} × {line.name}</span><span>{'₹' + (Number(line.unitPrice) * line.quantity).toFixed(2)}</span></div>)}</div><p className="tracker-footnote">{t('This tracker stays available on this device while your order is active.')}</p></section></div>}
    {directionsOpen && <CafeDirectionsModal onClose={() => setDirectionsOpen(false)} />}
  </div>;
}
