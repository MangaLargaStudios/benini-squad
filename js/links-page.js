(function initLinksPage() {
  const phone = String(window.BENINI_WHATSAPP_PHONE || '').replace(/\D/g, '');
  const whatsappLink = document.getElementById('links-whatsapp');
  if (whatsappLink && phone) {
    const message = encodeURIComponent('Oi, vim pelo link da Benini Squad.');
    whatsappLink.href = `https://wa.me/${phone}?text=${message}`;
  }

  const section = document.body;
  const container = document.getElementById('links-color-bends');
  if (section && container && typeof window.initBeniniColorBends === 'function') {
    window.initBeniniColorBends(section, container);
  }
})();
