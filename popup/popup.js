(function attachPopup(globalScope) {
  "use strict";

  const CFS = globalScope.CFS;
  const { getSettings, updateSettings, storageGet, storageSet } = CFS.storage;
  const { EpisodeClass, WatchMode, normalizeTitle } = CFS.shared;

  const MODE_DESCRIPTIONS = Object.freeze({
    [WatchMode.CANON_ONLY]: "Skips filler and mixed for the clean canon path.",
    [WatchMode.CANON_MIXED]: "Skips pure filler and keeps mixed episodes.",
    [WatchMode.FILLER_ONLY]: "Skips canon and mixed to play only filler."
  });

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
   * @param {unknown} value
   * @returns {string}
   */
  const asText = (value) => String(value || "");

  /**
   * @param {Record<string, unknown>} cache
   * @param {string} slug
   * @returns {{ total: number, canon: number, mixed: number, filler: number }}
   */
  const readBreakdown = (cache, slug) => {
    const empty = { total: 0, canon: 0, mixed: 0, filler: 0 };
    const entry = /** @type {{ value?: { episodes?: Record<string, { classification: string }> } } | undefined} */ (cache[`afl-show:${slug}`]);
    const episodes = entry && entry.value ? entry.value.episodes || {} : {};
    return Object.values(episodes).reduce((counts, episode) => {
      const classification = episode.classification;
      return {
        total: counts.total + 1,
        canon: counts.canon + (classification === EpisodeClass.CANON ? 1 : 0),
        mixed: counts.mixed + (classification === EpisodeClass.MIXED ? 1 : 0),
        filler: counts.filler + (classification === EpisodeClass.FILLER ? 1 : 0)
      };
    }, empty);
  };

  /**
   * @param {string} watchMode
   * @returns {void}
   */
  const renderModeCards = (watchMode) => {
    Array.from(document.querySelectorAll("[data-mode]")).forEach((element) => {
      const mode = element.getAttribute("data-mode") || "";
      element.setAttribute("aria-checked", mode === watchMode ? "true" : "false");
    });
    getElement("modeDescription").textContent = MODE_DESCRIPTIONS[watchMode] || "";
  };

  /**
   * @param {Record<string, unknown>} status
   * @returns {void}
   */
  const renderSourceLink = (status) => {
    const link = /** @type {HTMLAnchorElement} */ (getElement("sourceLink"));
    const url = asText(status.resolvedAflUrl);
    if (!url) {
      link.style.display = "none";
      link.removeAttribute("href");
      return;
    }
    link.style.display = "inline-block";
    link.href = url;
  };

  /**
   * @param {{ total: number, canon: number, mixed: number, filler: number }} breakdown
   * @returns {void}
   */
  const renderBreakdown = (breakdown) => {
    getElement("totalEpisodes").textContent = breakdown.total > 0 ? String(breakdown.total) : "-";
    getElement("canonEpisodes").textContent = breakdown.total > 0 ? String(breakdown.canon) : "-";
    getElement("mixedEpisodes").textContent = breakdown.total > 0 ? String(breakdown.mixed) : "-";
    getElement("fillerEpisodes").textContent = breakdown.total > 0 ? String(breakdown.filler) : "-";
    getElement("breakdownStatus").textContent = breakdown.total > 0
      ? "Episode counts are loaded for the resolved show."
      : "Episode counts load automatically from the series page.";
  };

  /**
   * @returns {Promise<void>}
   */
  const render = async () => {
    const settings = await getSettings();
    const result = await storageGet({ latestStatus: {}, cache: {} });
    const status = /** @type {{ latestStatus: Record<string, unknown>, cache: Record<string, unknown> }} */ (result).latestStatus;
    const cache = /** @type {{ latestStatus: Record<string, unknown>, cache: Record<string, unknown> }} */ (result).cache;
    const detectedTitle = asText(status.detectedShowTitle);
    const resolvedSlug = asText(status.resolvedAflSlug);
    const hasError = asText(status.debugStatus) === "error" || Boolean(status.error);
    const showTitle = detectedTitle || "No show detected";
    const showStatus = resolvedSlug
      ? "Auto-detected from Crunchyroll."
      : detectedTitle
        ? "Auto-detected from Crunchyroll."
        : hasError
          ? "Open a Crunchyroll series or watch page."
        : "Open a Crunchyroll series or watch page.";

    /** @type {HTMLInputElement} */ (getElement("enabled")).checked = settings.enabled;
    /** @type {HTMLInputElement} */ (getElement("debug")).checked = settings.debug;
    getElement("enabledLabel").textContent = settings.enabled ? "ON" : "OFF";

    getElement("showTitle").textContent = showTitle;
    getElement("showStatus").textContent = showStatus;
    getElement("mappingStatus").textContent = resolvedSlug ? "Auto" : "Pending";
    getElement("episodeNumber").textContent = displayValue(status.episodeNumber ? String(status.episodeNumber) : "");
    getElement("classification").textContent = displayValue(asText(status.sourceLabel || status.classification));
    getElement("decision").textContent = status.shouldSkip === true ? "Skip" : status.shouldSkip === false ? "Watch" : "-";
    getElement("debugStatus").textContent = displayValue(asText(status.error || status.debugStatus));

    renderSourceLink(status);
    renderModeCards(settings.watchMode);
    renderBreakdown(resolvedSlug ? readBreakdown(cache, resolvedSlug) : { total: 0, canon: 0, mixed: 0, filler: 0 });

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
    const detectedTitle = asText(status.detectedShowTitle);
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
    await clearMappingForDetectedShow();
  };

  /**
   * @returns {Promise<void>}
   */
  const clearMappingForDetectedShow = async () => {
    const result = await storageGet({ latestStatus: {}, cache: {} });
    const status = /** @type {{ latestStatus: Record<string, unknown>, cache: Record<string, unknown> }} */ (result).latestStatus;
    const cache = /** @type {{ latestStatus: Record<string, unknown>, cache: Record<string, unknown> }} */ (result).cache;
    const detectedTitle = asText(status.detectedShowTitle);
    const resolvedSlug = asText(status.resolvedAflSlug);
    if (!detectedTitle && !resolvedSlug) {
      return;
    }

    const nextCache = { ...cache };
    if (detectedTitle) {
      delete nextCache[`afl-mapping:${normalizeTitle(detectedTitle)}`];
    }
    if (resolvedSlug) {
      delete nextCache[`afl-show:${resolvedSlug}`];
    }
    await storageSet({ cache: nextCache });
    await render();
  };

  getElement("enabled").addEventListener("change", async (event) => {
    await updateSettings({ enabled: /** @type {HTMLInputElement} */ (event.currentTarget).checked });
    await render();
  });

  Array.from(document.querySelectorAll("[data-mode]")).forEach((element) => {
    element.addEventListener("click", async () => {
      const watchMode = element.getAttribute("data-mode") || WatchMode.CANON_ONLY;
      await updateSettings({ watchMode });
      await render();
    });
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

  getElement("advancedOpen").addEventListener("click", () => {
    getElement("mainView").classList.remove("view-active");
    getElement("advancedView").classList.add("view-active");
  });

  getElement("advancedBack").addEventListener("click", () => {
    getElement("advancedView").classList.remove("view-active");
    getElement("mainView").classList.add("view-active");
  });

  render().catch((error) => {
    getElement("debugStatus").textContent = error instanceof Error ? error.message : String(error);
  });
})(globalThis);
