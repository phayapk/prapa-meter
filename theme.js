// โหมดมืด/สว่าง ใช้ร่วมกันทุกหน้า (จำค่าไว้ในเครื่อง)
(function () {
  var K = 'adminTheme';
  function get() {
    return localStorage.getItem(K) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function apply(t) {
    document.documentElement.dataset.theme = t;
    var b = document.getElementById('themeBtn');
    if (b) b.textContent = t === 'dark' ? '☀️ สว่าง' : '🌙 มืด';
  }
  apply(get());
  window.toggleTheme = function () {
    var t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(K, t); apply(t);
  };
  document.addEventListener('DOMContentLoaded', function () { apply(get()); });
  window.addEventListener('storage', function (e) { if (e.key === K) apply(get()); });  // เปิดหลายแท็บก็เปลี่ยนตามกัน
})();