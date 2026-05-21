(function attachPopup(globalScope) {
  "use strict";

  const CFS = globalScope.CFS;
  const { getSettings, updateSettings, storageGet, storageSet } = CFS.storage;
  const { normalizeTitle } = CFS.shared;

  /**
   * @param {string} id
   * @returns {HTMLElement}
   */
  const getElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing popup element: ${id}`);
    }
    return element;
  };

  /**
   * @param {string} value
   * @returns {string}
   */
  const displayValue = (value) => value || "-";

  /**
   * @returns {Promise<void>}
   */
  const render = async () => {
    const settings = await getSettings();
    const result = await storageGet({ latestStatus: {} });
    const status = /** @type {{ latestStatus: Record<string, unknown> }} */ (result).latestStatus;

    /** @type {HTMLInputElement} */ (getElement("enabled")).checked = settings.enabled;
    /** @type {HTMLSelectElement} */ (getElement("watchMode")).value = settings.watchMode;
    /** @type {HTMLInputElement} */ (getElement("debug")).checked = settings.debug;

    getElement("showTitle").textContent = displayValue(String(status.detectedShowTitle || ""));
    getElement("aflTarget").textContent = displayValue(String(status.resolvedAflSlug || ""));
    getElement("episodeNumber").textContent = displayValue(status.episodeNumber ? String(status.episodeNumber) : "");
    getElement("classification").textContent = displayValue(String(status.sourceLabel || status.classification || ""));
    getElement("decision").textContent = status.shouldSkip === true ? "Skip" : status.shouldSkip === false ? "Watch" : "-";
    getElement("debugStatus").textContent = displayValue(String(status.error || status.debugStatus || ""));

    const detectedTitle = String(status.detectedShowTitle || "");
    const overrideSlug = settings.manualOverrides[normalizeTitle(detectedTitle)] || "";
    /** @type {HTMLInputElement} */ (getElement("manualSlug")).value = overrideSlug;
  };

  /**
   * @returns {Promise<void>}
   */
  const saveManualOverride = async () => {
    const settings = await getSettings();
    const result = await storageGet({ latestStatus: {} });
    const status = /** @type {{ latestStatus: Record<string, unknown> }} */ (result).latestStatus;
    const detectedTitle = String(status.detectedShowTitle || "");
    if (!detectedTitle) {
      throw new Error("Cannot save manual override before a show is detected.");
    }

    const key = normalizeTitle(detectedTitle);
    const slug = /** @type {HTMLInputElement} */ (getElement("manualSlug")).value.trim();
    const manualOverrides = { ...settings.manualOverrides };
    if (slug) {
      manualOverrides[key] = slug;
    } else {
      delete manualOverrides[key];
    }
    await updateSettings({ manualOverrides });
    await render();
  };

  /**
   * @returns {Promise<void>}
   */
  const clearMappingForDetectedShow = async () => {
    const result = await storageGet({ latestStatus: {}, cache: {} });
    const status = /** @type {{ latestStatus: Record<string, unknown>, cache: Record<string, unknown> }} */ (result).latestStatus;
    const cache = /** @type {{ latestStatus: Record<string, unknown>, cache: Record<string, unknown> }} */ (result).cache;
    const detectedTitle = String(status.detectedShowTitle || "");
    if (!detectedTitle) {
      return;
    }
    const key = `afl-mapping:${normalizeTitle(detectedTitle)}`;
    const nextCache = { ...cache };
    delete nextCache[key];
    await storageSet({ cache: nextCache });
    await render();
  };

  getElement("enabled").addEventListener("change", async (event) => {
    await updateSettings({ enabled: /** @type {HTMLInputElement} */ (event.currentTarget).checked });
    await render();
  });

  getElement("watchMode").addEventListener("change", async (event) => {
    await updateSettings({ watchMode: /** @type {HTMLSelectElement} */ (event.currentTarget).value });
    await render();
  });

  getElement("debug").addEventListener("change", async (event) => {
    await updateSettings({ debug: /** @type {HTMLInputElement} */ (event.currentTarget).checked });
    await render();
  });

  getElement("saveOverride").addEventListener("click", () => {
    saveManualOverride().catch((error) => {
      getElement("debugStatus").textContent = error instanceof Error ? error.message : String(error);
    });
  });

  getElement("recheck").addEventListener("click", () => {
    clearMappingForDetectedShow().catch((error) => {
      getElement("debugStatus").textContent = error instanceof Error ? error.message : String(error);
    });
  });

  render().catch((error) => {
    getElement("debugStatus").textContent = error instanceof Error ? error.message : String(error);
  });
})(globalThis);
