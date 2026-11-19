// Runs in <head> before first paint: apply the saved theme so there is no flash.
try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}

// 404 page: echo the requested path.
document.addEventListener('DOMContentLoaded', function () {
  var el = document.getElementById('path');
  if (el) el.textContent = location.pathname;
});
