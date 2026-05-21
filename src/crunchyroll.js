(function attachCrunchyroll(globalScope) {
  "use strict";

  const CFS = globalScope.CFS || {};
  const { parsePositiveInteger } = CFS.shared;

  /**
   * @typedef {{
   *   title: string,
   *   source: string
   * }} DetectedTitle
   */

  /**
   * @typedef {{
   *   episodeNumber: number | null,
   *   source: string
   * }} DetectedEpisode
   */

  /**
   * @param {unknown} value
   * @returns {string | null}
   */
  const cleanTitle = (value) => {
    const title = String(value || "")
      .replace(/\s+-\s+Watch on Crunchyroll.*$/i, "")
      .replace(/\s+\|\s+Crunchyroll.*$/i, "")
      .replace(/\s*-\s*Crunchyroll.*$/i, "")
      .replace(/^Watch\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return title || null;
  };

  /**
   * @param {string} slug
   * @returns {string}
   */
  const titleFromSlug = (slug) => slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  /**
   * @returns {string | null}
   */
  const detectTitleFromSeriesUrl = () => {
    const match = location.pathname.match(/\/series\/[^/]+\/([^/?#]+)/i);
    return match ? cleanTitle(titleFromSlug(decodeURIComponent(match[1]))) : null;
  };

  /**
   * @returns {unknown[]}
   */
  const readJsonLd = () => Array.from(document.querySelectorAll("script[type='application/ld+json']"))
    .flatMap((script) => {
      try {
        const parsed = JSON.parse(script.textContent || "null");
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        return [];
      }
    })
    .filter(Boolean);

  /**
   * @param {unknown} item
   * @returns {string[]}
   */
  const collectJsonLdNames = (item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = /** @type {Record<string, unknown>} */ (item);
    const names = [];
    if (record.partOfSeries && typeof record.partOfSeries === "object") {
      const series = /** @type {Record<string, unknown>} */ (record.partOfSeries);
      if (series.name) {
        names.push(String(series.name));
      }
    }
    if (record.partOfSeason && typeof record.partOfSeason === "object") {
      const season = /** @type {Record<string, unknown>} */ (record.partOfSeason);
      if (season.name) {
        names.push(String(season.name));
      }
    }
    if (record.name) {
      names.push(String(record.name));
    }
    return names;
  };

  /**
   * @returns {DetectedTitle | null}
   */
  const detectTitle = () => {
    const jsonLdTitle = readJsonLd()
      .flatMap(collectJsonLdNames)
      .map(cleanTitle)
      .find(Boolean);
    if (jsonLdTitle) {
      return { title: jsonLdTitle, source: "json-ld" };
    }

    const ogTitle = cleanTitle(document.querySelector("meta[property='og:title']")?.getAttribute("content"));
    if (ogTitle) {
      const likelySeries = ogTitle.split(/ Episode \d+ /i)[0].trim();
      return { title: cleanTitle(likelySeries) || ogTitle, source: "open-graph" };
    }

    const heading = Array.from(document.querySelectorAll("h1, h2"))
      .map((element) => cleanTitle(element.textContent))
      .find(Boolean);
    if (heading) {
      return { title: heading, source: "heading" };
    }

    const seriesLink = Array.from(document.querySelectorAll("a[href*='/series/']"))
      .map((element) => cleanTitle(element.textContent))
      .find(Boolean);
    if (seriesLink) {
      return { title: seriesLink, source: "series-link" };
    }

    const seriesUrlTitle = detectTitleFromSeriesUrl();
    if (seriesUrlTitle) {
      return { title: seriesUrlTitle, source: "series-url" };
    }

    const documentTitle = cleanTitle(document.title);
    return documentTitle ? { title: documentTitle, source: "document-title" } : null;
  };

  /**
   * @param {string} text
   * @returns {number | null}
   */
  const parseEpisodeNumberFromText = (text) => {
    const patterns = [
      /\bE(?:pisode)?\s*(\d{1,5})\b/i,
      /\bEpisode\s+(\d{1,5})\b/i,
      /^\s*(\d{1,5})\s*[-:]/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const episodeNumber = match ? parsePositiveInteger(match[1]) : null;
      if (episodeNumber) {
        return episodeNumber;
      }
    }
    return null;
  };

  /**
   * @returns {DetectedEpisode}
   */
  const detectEpisode = () => {
    const jsonLdEpisode = readJsonLd()
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = /** @type {Record<string, unknown>} */ (item);
        return parsePositiveInteger(record.episodeNumber) || parseEpisodeNumberFromText(String(record.name || ""));
      })
      .find(Boolean);
    if (jsonLdEpisode) {
      return { episodeNumber: jsonLdEpisode, source: "json-ld" };
    }

    const ogTitle = document.querySelector("meta[property='og:title']")?.getAttribute("content") || "";
    const ogEpisode = parseEpisodeNumberFromText(ogTitle);
    if (ogEpisode) {
      return { episodeNumber: ogEpisode, source: "open-graph" };
    }

    const stableSelectors = [
      "[data-t='episode-title']",
      "[data-testid*='episode']",
      "h1",
      "h2",
      "title"
    ];
    const selectorText = stableSelectors
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
      .map((element) => element.textContent || "")
      .join(" ");
    const selectorEpisode = parseEpisodeNumberFromText(selectorText);
    if (selectorEpisode) {
      return { episodeNumber: selectorEpisode, source: "visible-metadata" };
    }

    const bodySnippet = document.body ? document.body.innerText.slice(0, 15000) : "";
    const bodyEpisode = parseEpisodeNumberFromText(bodySnippet);
    return { episodeNumber: bodyEpisode, source: bodyEpisode ? "body-text" : "not-found" };
  };

  /**
   * @returns {HTMLElement | null}
   */
  const findNextEpisodeControl = () => {
    const candidates = Array.from(document.querySelectorAll("a[href*='/watch/'], button, [role='button']"));
    const scored = candidates
      .map((element) => {
        const text = [
          element.textContent || "",
          element.getAttribute("aria-label") || "",
          element.getAttribute("title") || "",
          element.getAttribute("data-t") || ""
        ].join(" ").toLowerCase();
        const href = element instanceof HTMLAnchorElement ? element.href : "";
        const score = (text.includes("next") ? 3 : 0)
          + (text.includes("episode") ? 2 : 0)
          + (href.includes("/watch/") ? 1 : 0);
        return { element: /** @type {HTMLElement} */ (element), score };
      })
      .filter((candidate) => candidate.score >= 3)
      .sort((left, right) => right.score - left.score);

    return scored[0] ? scored[0].element : null;
  };

  /**
   * @returns {boolean}
   */
  const navigateToNextEpisode = () => {
    const control = findNextEpisodeControl();
    if (!control) {
      return false;
    }
    control.click();
    return true;
  };

  CFS.crunchyroll = {
    detectTitle,
    detectEpisode,
    navigateToNextEpisode
  };

  globalScope.CFS = CFS;
})(globalThis);
