'use strict';

/** Janela antes do fim do video / inicio do hold (personas, blur, texto). */
const GRID_SCAN_VIDEO_LEAD_SEC = 0.48;
const GRID_SCAN_SCROLL_LEAD_PX = 80;

function disposeHeroGridScan() {
  if (typeof window.__heroGridScanDispose === 'function') {
    window.__heroGridScanDispose();
    window.__heroGridScanDispose = null;
  }
}

function initHeroGridScan() {
  const section = document.getElementById('hero-visual');
  const container = document.getElementById('hero-visual-grid-scan');
  if (!section || !container || typeof window.initBeniniGridScan !== 'function') {
    return;
  }

  disposeHeroGridScan();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    container.style.opacity = '0';
    return;
  }

  window.__heroGridScanDispose = window.initBeniniGridScan(section, container, {
    hoverIntensity: 0.1,
    // 15% mais lento (duracao maior = varredura mais lenta)
    scanDuration: 2.35,
  });
}

function updateHeroGridScanVisibility(scrollProgress, videoTime, duration) {
  const el = document.getElementById('hero-visual-grid-scan');
  const metrics = window.__heroVideoScrollMetrics;
  if (!el || !metrics || !duration) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.style.opacity = '0';
    el.classList.remove('is-active');
    return;
  }

  const mainRatio = metrics.mainRatio;
  const scrollDistance = metrics.scrollDistance || 1;
  const leadRatio = GRID_SCAN_SCROLL_LEAD_PX / scrollDistance;
  const holdEdge = mainRatio;
  const videoLead = Math.max(0, duration - GRID_SCAN_VIDEO_LEAD_SEC);

  let opacity = 0;

  if (videoTime >= videoLead && scrollProgress >= holdEdge - leadRatio) {
    const scrollRamp = Math.min(
      1,
      Math.max(0, (scrollProgress - (holdEdge - leadRatio)) / Math.max(leadRatio, 0.0001))
    );
    const videoRamp = Math.min(1, Math.max(0, (videoTime - videoLead) / GRID_SCAN_VIDEO_LEAD_SEC));
    opacity = scrollProgress >= holdEdge ? 1 : Math.min(scrollRamp, videoRamp);
  }

  el.style.opacity = String(opacity);
  el.classList.toggle('is-active', opacity > 0.04);
}

window.initHeroGridScan = initHeroGridScan;
window.updateHeroGridScanVisibility = updateHeroGridScanVisibility;
window.disposeHeroGridScan = disposeHeroGridScan;
