(function attachBanner(globalScope) {
  "use strict";

  const CFS = globalScope.CFS || {};
  const BANNER_ID = "cfs-skip-banner";

  /**
   * @param {string} text
   * @returns {void}
   */
  const showBanner = (text) => {
    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = document.createElement("div");
      banner.id = BANNER_ID;
      banner.setAttribute("role", "status");
      banner.style.position = "fixed";
      banner.style.top = "16px";
      banner.style.left = "50%";
      banner.style.transform = "translateX(-50%)";
      banner.style.zIndex = "2147483647";
      banner.style.padding = "12px 16px";
      banner.style.borderRadius = "8px";
      banner.style.background = "#111827";
      banner.style.color = "#ffffff";
      banner.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.35)";
      banner.style.font = "600 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      banner.style.maxWidth = "calc(100vw - 32px)";
      banner.style.pointerEvents = "none";
      document.documentElement.appendChild(banner);
    }
    banner.textContent = text;
  };

  /**
   * @returns {void}
   */
  const hideBanner = () => {
    document.getElementById(BANNER_ID)?.remove();
  };

  CFS.banner = {
    showBanner,
    hideBanner
  };

  globalScope.CFS = CFS;
})(globalThis);
