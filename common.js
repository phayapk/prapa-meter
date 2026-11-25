// ===== ตั้งค่า: ใช้ค่าเดียวกับใน index.html =====
const SB_URL = 'https://pfxygeegbxcdrgtaafyc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmeHlnZWVnYnhjZHJndGFhZnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMjQ5NDcsImV4cCI6MjEwODkwMDk0N30.kK-sZw_MB8DnH4YQUCUcmmLBL0fEGg2F0o9ke2tzkV0';
const sb = supabase.createClient(SB_URL, SB_KEY);

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => { const v = Number(n || 0); return v.toLocaleString('th-TH', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }); };
const TH_M = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const thMonth = d => { const [y, m] = String(d).split('-').map(Number); return TH_M[m - 1] + ' ' + (y + 543); };
const thDateTime = t => new Date(t).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' });
const todayTH = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });

function toast(msg, ok = true) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div'); t.id = 'toast'; t.className = 'no-print';
    t.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);padding:12px 18px;border-radius:10px;color:#fff;z-index:99999;max-width:90%;font-size:15px';
    document.body.appendChild(t);
  }
  t.style.background = ok ? '#16a34a' : '#dc2626';
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = 'none'), 4500);
}

async function requireLogin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    document.body.innerHTML = '<p style="padding:20px;font-size:18px">กรุณาเข้าสู่ระบบที่ <a href="index.html">หน้าจดมิเตอร์</a> ก่อน</p>';
    throw new Error('no session');
  }
  const { data: role } = await sb.rpc('my_role');
  return { session, role };
}

// ===== พร้อมเพย์ (มาตรฐาน EMVCo / Thai QR) =====
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
const digitsOnly = s => String(s || '').replace(/\D/g, '');
const validPhone = s => /^0\d{9}$/.test(digitsOnly(s));
function validTaxId(s) {
  const t = digitsOnly(s); if (!/^\d{13}$/.test(t)) return false;
  let sum = 0; for (let i = 0; i < 12; i++) sum += +t[i] * (13 - i);
  return (11 - (sum % 11)) % 10 === +t[12];
}
function promptpayPayload(id, amount) {
  const t = digitsOnly(id);
  let acc = null;
  if (t.length === 13) acc = tlv('02', t);                       // เลขบัตรประชาชน / ผู้เสียภาษี
  else if (t.length === 10) acc = tlv('01', '0066' + t.slice(1)); // เบอร์มือถือ
  if (!acc) return null;
  const amt = Number(amount) > 0;
  const p = tlv('00', '01') + tlv('01', amt ? '12' : '11')
    + tlv('29', tlv('00', 'A000000677010111') + acc)
    + tlv('53', '764') + (amt ? tlv('54', Number(amount).toFixed(2)) : '')
    + tlv('58', 'TH') + '6304';
  return p + crc16(p);
}
function qrImg(text, cls = 'qr') {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return `<img class="${cls}" src="${q.createDataURL(6, 0)}" alt="QR">`;
}
const fmtPhone = s => digitsOnly(s).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
const maskTax = s => { const t = digitsOnly(s); return t.length === 13 ? t[0] + '-xxxx-xxxxx-' + t.slice(10, 12) + '-' + t[12] : t; };

// ===== จำนวนเงินเป็นตัวอักษร =====
function bahtText(n) {
  const D = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const P = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  const say = s => {
    s = String(s).replace(/^0+/, ''); if (!s) return '';
    let out = '';
    if (s.length > 6) { out = say(s.slice(0, -6)) + 'ล้าน'; s = s.slice(-6); }
    const L = s.length;
    for (let i = 0; i < L; i++) {
      const k = +s[i], pos = L - i - 1; if (!k) continue;
      if (pos === 0 && k === 1 && L > 1) out += 'เอ็ด';
      else if (pos === 1 && k === 2) out += 'ยี่';
      else if (!(pos === 1 && k === 1)) out += D[k];
      out += P[pos];
    }
    return out;
  };
  const [b, s] = Number(n || 0).toFixed(2).split('.');
  return (say(b) || 'ศูนย์') + 'บาท' + (+s ? say(s) + 'สตางค์' : 'ถ้วน');
}
// ===== ตัวเลือกเดือน/ปี พ.ศ. =====
function fillMonthPicker(mSel, ySel, ym) {
  const [y, m] = (ym || todayTH().slice(0, 7)).split('-').map(Number);
  mSel.innerHTML = TH_M.map((t, i) => `<option value="${String(i + 1).padStart(2, '0')}">${t}</option>`).join('');
  const be = y + 543, now = Number(todayTH().slice(0, 4)) + 543, ys = [];
  for (let k = Math.min(be, now) - 2; k <= Math.max(be, now) + 1; k++) ys.push(k);
  ySel.innerHTML = ys.map(k => `<option value="${k}">พ.ศ. ${k}</option>`).join('');
  mSel.value = String(m).padStart(2, '0'); ySel.value = String(be);
}
const pickerValue = (mSel, ySel) => (Number(ySel.value) - 543) + '-' + mSel.value;
const homeHref = role => role === 'admin' ? 'admin.html' : 'index.html';