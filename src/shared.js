(function attachShared(globalScope) {
  "use strict";

  const CFS = globalScope.CFS || {};

  /** @enum {string} */
  const WatchMode = {
    CANON_ONLY: "CANON_ONLY",
    CANON_MIXED: "CANON_MIXED",
    FILLER_ONLY: "FILLER_ONLY"
  };

  /** @enum {string} */
  const EpisodeClass = {
    CANON: "CANON",
    MIXED: "MIXED",
    FILLER: "FILLER",
    UNKNOWN: "UNKNOWN"
  };

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    watchMode: WatchMode.CANON_ONLY,
    debug: true,
    manualOverrides: {}
  });

  const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const ROUTE_DEBOUNCE_MS = 400;
  const SKIP_NAVIGATION_COOLDOWN_MS = 7000;

  /**
   * @param {string} value
   * @returns {string}
   */
  const normalizeTitle = (value) => value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(sub|dub|english dub|season \d+)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  /**
   * @param {string} value
   * @returns {string}
   */
  const titleToSlug = (value) => normalizeTitle(value).replace(/\s+/g, "-");

  /**
   * @param {unknown} value
   * @returns {number | null}
   */
  const parsePositiveInteger = (value) => {
    const numberValue = Number.parseInt(String(value), 10);
    return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
  };

  /**
   * @param {string} sourceLabel
   * @returns {string}
   */
  const normalizeClassification = (sourceLabel) => {
    const label = sourceLabel.toUpperCase().replace(/\s+/g, " ").trim();
    if (label.includes("MIXED CANON/FILLER")) {
      return EpisodeClass.MIXED;
    }
    if (label.includes("FILLER")) {
      return EpisodeClass.FILLER;
    }
    if (label.includes("MANGA CANON") || label.includes("ANIME CANON") || label === "CANON") {
      return EpisodeClass.CANON;
    }
    return EpisodeClass.UNKNOWN;
  };

  /**
   * @param {string} mode
   * @param {string} classification
   * @returns {boolean}
   */
  const shouldSkipEpisode = (mode, classification) => {
    if (classification === EpisodeClass.UNKNOWN) {
      return false;
    }
    if (mode === WatchMode.CANON_ONLY) {
      return classification === EpisodeClass.FILLER || classification === EpisodeClass.MIXED;
    }
    if (mode === WatchMode.CANON_MIXED) {
      return classification === EpisodeClass.FILLER;
    }
    if (mode === WatchMode.FILLER_ONLY) {
      return classification === EpisodeClass.CANON || classification === EpisodeClass.MIXED;
    }
    throw new Error(`Unsupported watch mode: ${mode}`);
  };

  /**
   * @param {boolean} enabled
   * @param {...unknown} fields
   * @returns {void}
   */
  const debugLog = (enabled, ...fields) => {
    if (enabled) {
      console.log("[Crunchyroll Filler Skipper]", ...fields);
    }
  };

  CFS.shared = {
    WatchMode,
    EpisodeClass,
    DEFAULT_SETTINGS,
    CACHE_TTL_MS,
    ROUTE_DEBOUNCE_MS,
    SKIP_NAVIGATION_COOLDOWN_MS,
    normalizeTitle,
    titleToSlug,
    parsePositiveInteger,
    normalizeClassification,
    shouldSkipEpisode,
    debugLog
  };

  globalScope.CFS = CFS;
})(globalThis);
