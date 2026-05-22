// Desregistra qualquer Service Worker antigo (do tempo do PWA) e limpa o cache.
// Esse arquivo é incluído no app.blade.php e roda em toda visita.
// Quando o PWA for reativado no futuro, esse script pode ser removido.
(function () {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function (regs) {
    regs.forEach(function (r) { r.unregister(); });
  });
  if (window.caches && caches.keys) {
    caches.keys().then(function (keys) {
      keys.forEach(function (k) { caches.delete(k); });
    });
  }
})();
