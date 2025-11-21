// Simple layout helper that scales the main content card so it always fits inside
// the current viewport, removing the need for scrolling while keeping the UI centered.
(function () {
  function fitAppToViewport() {
    var app = document.querySelector('.app');
    if (!app) return;

    // Reset any previous inline transform so measurements are correct.
    app.style.transformOrigin = 'top center';
    app.style.transform = 'none';

    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!viewportWidth || !viewportHeight) return;

    var rect = app.getBoundingClientRect();
    var appWidth = rect.width;
    var appHeight = rect.height;
    if (!appWidth || !appHeight) return;

    // Leave a small visual margin around the UI so it does not touch the edges.
    var margin = 16;
    var maxWidth = Math.max(viewportWidth - margin * 2, 1);
    var maxHeight = Math.max(viewportHeight - margin * 2, 1);

    var scaleX = maxWidth / appWidth;
    var scaleY = maxHeight / appHeight;
    var scale = Math.min(scaleX, scaleY, 1);

    if (!isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    app.style.transform = 'scale(' + scale + ')';
  }

  function scheduleFit() {
    if (scheduleFit._rafId) {
      cancelAnimationFrame(scheduleFit._rafId);
    }
    scheduleFit._rafId = window.requestAnimationFrame(fitAppToViewport);
  }

  window.addEventListener('resize', scheduleFit);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleFit);
  } else {
    scheduleFit();
  }
})();
