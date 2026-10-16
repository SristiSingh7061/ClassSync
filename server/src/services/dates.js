// Date helpers (all dates are plain 'YYYY-MM-DD' strings in the server's local time)
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (s) => new Date(`${s}T12:00:00`);
const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(at(s).getTime()) && ymd(at(s)) === s;
const dow = (s) => at(s).getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
const today = () => ymd(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
module.exports = { DAY_NAMES, ymd, isYmd, dow, today, daysAgo };
