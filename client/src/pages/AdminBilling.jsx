import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { apiRequest } from '../api';
import { getLocalizedMenuField } from '../menuLocalization';

const paymentModes = ['Cash', 'UPI', 'Card'];
const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

export default function AdminBilling() {
  const { language, t } = useLanguage();
  const [token, setToken] = useState(() => sessionStorage.getItem('cafeAdminToken') || '');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [paymentMode, setPaymentMode] = useState({});
  const [discount, setDiscount] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [error, setError] = useState('');

  async function loadBilling(activeToken = token) {
    const [financials, orderData] = await Promise.all([
      apiRequest('/api/billing/summary', { token: activeToken }),
      apiRequest('/api/orders', { token: activeToken })
    ]);
    setSummary(financials);
    setOrders(orderData.orders || []);
  }

  useEffect(() => {
    if (!token) return;
    apiRequest('/api/auth/me', { token }).then(() => loadBilling(token)).catch(() => {
      sessionStorage.removeItem('cafeAdminToken'); setToken(''); setError('Your admin session expired. Sign in again.');
    });
  }, [token]);

  async function login(event) {
    event.preventDefault(); setError('');
    try {
      const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      sessionStorage.setItem('cafeAdminToken', data.token); setToken(data.token);
    } catch (err) { setError(err.message); }
  }

  const completedOrders = useMemo(() => orders.filter((order) => order.orderStatus === 'Completed'), [orders]);
  const paymentTotals = Object.fromEntries((summary?.paymentModeBreakdown || []).map((row) => [row.paymentMode, row]));

  async function generateReceipt(order) {
    setBusyOrderId(order.orderId); setError('');
    try {
      const generated = await apiRequest('/api/billing/generate', {
        token,
        method: 'POST',
        body: JSON.stringify({ orderId: order.orderId, paymentMode: paymentMode[order.orderId] || 'Cash', discount: Number(discount[order.orderId] || 0) })
      });
      const data = await apiRequest(`/api/billing/receipt/${encodeURIComponent(generated.bill.billId)}`, { token });
      setReceipt(data.receipt);
      setOrders((current) => current.map((entry) => entry.orderId === order.orderId ? { ...entry, paymentStatus: 'Paid' } : entry));
      await loadBilling(token);
    } catch (err) { setError(err.message); }
    finally { setBusyOrderId(''); }
  }

  if (!token) return <main className="admin-login-page"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /></Link><LanguageSwitcher /><form className="login-card" onSubmit={login}><p className="eyebrow">{t('FINANCIAL REPORTS')}</p><h1>{t('Billing desk')}</h1><p>{t('Admin sign in is required to access café revenue and receipts.')}</p>{error && <p className="form-error" role="alert">{error}</p>}<label>{t('Username')}<input autoComplete="username" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} required /></label><label>{t('Password')}<input type="password" autoComplete="current-password" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required /></label><button className="primary-button">{t('Sign in to billing')}</button><Link className="back-link" to="/admin/kitchen">{t('Back to kitchen')}</Link></form></main>;

  return <div className="admin-shell billing-shell"><header className="admin-topbar"><Link className="brand" to="/" aria-label={t('Friendship Café home')}><img className="brand-logo" src="/images/entrance_logo.png" alt={t('Friendship Café badge with shake cup and Enjoy With the Friends tagline')} /><small>{t(' / Billing')}</small></Link><div className="admin-user"><LanguageSwitcher /><Link to="/admin/kitchen">{t('Kitchen')}</Link><Link to="/admin/menu">{t('Menu')}</Link><Link to="/admin/moderation">{t('Confessions')}</Link><button className="text-button" onClick={() => { sessionStorage.removeItem('cafeAdminToken'); setToken(''); }}>{t('Sign out')}</button></div></header><main className="admin-page billing-page">
    <nav className="admin-tabs" aria-label={t('Admin sections')}><Link to="/admin/kitchen">{t('Kitchen')}</Link><Link to="/admin/menu">{t('Menu')}</Link><span aria-current="page">{t('Billing & analytics')}</span><Link to="/admin/moderation">{t('Confessions')}</Link></nav>
    <div className="admin-heading"><div><p className="eyebrow">{t('FINANCIAL OVERVIEW')}</p><h1>{t('Billing & analytics')}</h1><p>{t('Revenue and receipts from completed café orders.')}</p></div><span className="billing-timezone">{t('All report dates use UTC')}</span></div>
    {error && <p className="notice error-notice" role="alert">{error}</p>}
    <section className="billing-metrics" aria-label={t('Financial summary')}>
      <article className="metric-card metric-primary"><span>{t('Total revenue')}</span><strong>{formatCurrency(summary?.totalRevenue)}</strong><small>{summary?.totalOrdersProcessed || 0} {t('billed orders')}</small></article>
      <article className="metric-card"><span>{t('Daily order count')}</span><strong>{summary?.daily?.orderCount || 0}</strong><small>{formatCurrency(summary?.daily?.revenue)} {t('revenue today')}</small></article>
      <article className="metric-card"><span>{t('Cash payments')}</span><strong>{formatCurrency(paymentTotals.Cash?.revenue)}</strong><small>{paymentTotals.Cash?.orderCount || 0} {t('transactions')}</small></article>
      <article className="metric-card"><span>{t('UPI payments')}</span><strong>{formatCurrency(paymentTotals.UPI?.revenue)}</strong><small>{paymentTotals.UPI?.orderCount || 0} {t('transactions')}</small></article>
      <article className="metric-card"><span>{t('Card payments')}</span><strong>{formatCurrency(paymentTotals.Card?.revenue)}</strong><small>{paymentTotals.Card?.orderCount || 0} {t('transactions')}</small></article><article className="metric-card"><span>{t('Last 7 days')}</span><strong>{formatCurrency(summary?.weekly?.revenue)}</strong><small>{summary?.weekly?.orderCount || 0} {t('orders')}</small></article>
    </section>
    <div className="billing-detail-grid"><section className="billing-panel"><div className="billing-panel-heading"><div><p className="eyebrow">{t('READY TO SETTLE')}</p><h2>{t('Completed orders')}</h2></div><span>{completedOrders.length}</span></div>{completedOrders.length === 0 ? <p className="billing-empty">{t('Completed orders will appear here for billing.')}</p> : <div className="completed-order-list">{completedOrders.map((order) => <article className="completed-order" key={order.orderId}><div className="completed-order-main"><div><span className="order-reference">#{order.orderId} · {t('Table')} {order.tableNumber}</span><h3>{order.customerName}</h3><p>{order.items.map((item) => `${item.quantity} × ${getLocalizedMenuField(item, 'name', language)}`).join(' · ')}</p></div><div className="completed-order-total"><strong>{formatCurrency(order.totalAmount)}</strong><span className={order.paymentStatus === 'Paid' ? 'paid-badge' : 'pending-badge'}>{t(order.paymentStatus)}</span></div></div><div className="billing-actions"><label>{t('Payment')}<select value={paymentMode[order.orderId] || 'Cash'} onChange={(e) => setPaymentMode((current) => ({ ...current, [order.orderId]: e.target.value }))}>{paymentModes.map((mode) => <option key={mode} value={mode}>{t(mode)}</option>)}</select></label><label>{t('Discount (₹)')}<input aria-label={`${t('Discount for order')} ${order.orderId}`} type="number" min="0" max={order.totalAmount} step="0.01" value={discount[order.orderId] ?? ''} placeholder="0.00" onChange={(e) => setDiscount((current) => ({ ...current, [order.orderId]: e.target.value }))} /></label><button className="primary-button" disabled={busyOrderId === order.orderId} onClick={() => generateReceipt(order)}>{busyOrderId === order.orderId ? t('Generating…') : order.paymentStatus === 'Paid' ? t('View / Print Receipt') : t('Generate & Print Receipt')}</button></div></article>)}</div>}</section>
      <section className="billing-panel top-sellers-panel"><div className="billing-panel-heading"><div><p className="eyebrow">{t('WHAT GUESTS LOVE')}</p><h2>{t('Top-selling items')}</h2></div></div>{summary?.topSellingItems?.length ? <div className="top-sellers-list">{summary.topSellingItems.map((item, index) => <div className="top-seller" key={item.menuItemId || item.name}><span className="seller-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{getLocalizedMenuField(item, 'name', language)}</strong><small>{item.quantity} {t('sold')}</small></div><b>{formatCurrency(item.revenue)}</b></div>)}</div> : <p className="billing-empty">{t('Sales details will appear after the first receipt.')}</p>}</section></div>
  </main>
  {receipt && <div className="modal-backdrop receipt-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setReceipt(null); }}><section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title"><div className="receipt-actions no-print"><button className="close-button" onClick={() => setReceipt(null)} aria-label={t('Close receipt')}>×</button></div><div className="receipt-paper"><header className="receipt-brand"><p className="eyebrow">{t('FRIENDSHIP CAFÉ')}</p><h2 id="receipt-title">{t('Payment receipt')}</h2><p>{t('Thank you for stopping by.')}</p></header><div className="receipt-meta"><div><span>{t('Receipt')}</span><strong>{receipt.billId}</strong></div><div><span>{t('Order')}</span><strong>#{receipt.orderId}</strong></div><div><span>{t('Date')}</span><strong>{new Date(receipt.timestamp).toLocaleString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN')}</strong></div><div><span>{t('Guest / Table')}</span><strong>{receipt.customerName} · {receipt.tableNumber}</strong></div></div><table className="receipt-items"><thead><tr><th>{t('Item')}</th><th>{t('Qty')}</th><th>{t('Price')}</th><th>{t('Total')}</th></tr></thead><tbody>{receipt.items.map((item, index) => <tr key={`${item.name}-${index}`}><td>{getLocalizedMenuField(item, 'name', language)}{item.customNotes && <small>{item.customNotes}</small>}</td><td>{item.quantity}</td><td>{formatCurrency(item.unitPrice)}</td><td>{formatCurrency(item.lineTotal)}</td></tr>)}</tbody></table><div className="receipt-totals"><div><span>{t('Subtotal')}</span><b>{formatCurrency(receipt.subtotal)}</b></div><div><span>{t('Tax')} ({(receipt.taxRate * 100).toFixed(0)}%)</span><b>{formatCurrency(receipt.tax)}</b></div>{receipt.discount > 0 && <div><span>{t('Discount')}</span><b>−{formatCurrency(receipt.discount)}</b></div>}<div className="receipt-grand-total"><span>{t('Total paid')}</span><strong>{formatCurrency(receipt.finalTotal)}</strong></div><div><span>{t('Payment type')}</span><b>{receipt.paymentMode}</b></div></div><p className="receipt-thanks">{t('We hope to see you again soon.')}</p></div><footer className="receipt-actions no-print"><button className="secondary-button" onClick={() => setReceipt(null)}>{t('Close')}</button><button className="primary-button" onClick={() => window.print()}>{t('Print receipt')}</button></footer></section></div>}
  </div>;
}
