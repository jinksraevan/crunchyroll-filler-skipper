(function attachAfl(globalScope) {
  "use strict";

  const CFS = globalScope.CFS || {};
  const {
    CACHE_TTL_MS,
    normalizeClassification,
    normalizeTitle,
    titleToSlug
  } = CFS.shared;
  const { getFreshCacheEntry, setCacheEntry } = CFS.storage;

  const AFL_ORIGIN = "https://www.animefillerlist.com";

  /**
   * @typedef {{
   *   number: number,
   *   title: string,
   *   classification: string,
   *   sourceLabel: string
   * }} AflEpisode
   */

  /**
   * @typedef {{
   *   slug: string,
   *   title: string,
   *   sourceUrl: string,
   *   episodes: Record<string, AflEpisode>
   * }} AflShowData
   */

  /**
   * @param {string} url
   * @returns {Promise<string>}
   */
  const fetchTextViaBackground = async (url) => {
    const response = await chrome.runtime.sendMessage({ type: "CFS_FETCH_TEXT", url });
    if (!response || response.ok !== true) {
      throw new Error(response && response.error ? String(response.error) : `AFL fetch failed: ${url}`);
    }
    return String(response.text);
  };

  /**
   * @param {string} html
   * @returns {Document}
   */
  const parseHtml = (html) => new DOMParser().parseFromString(html, "text/html");

  /**
   * @param {Document} documentValue
   * @returns {string}
   */
  const parseShowTitle = (documentValue) => {
    const heading = documentValue.querySelector("h1");
    return heading ? heading.textContent.replace(/\s*Filler List\s*$/i, "").trim() : "";
  };

  /**
   * @param {string} text
   * @returns {{ sourceLabel: string, title: string } | null}
   */
  const parseEpisodeTail = (text) => {
    const normalized = text.replace(/\s+/g, " ").trim();
    const labels = ["Mixed Canon/Filler", "Manga Canon", "Anime Canon", "Filler"];
    const label = labels.find((candidate) => normalized.toLowerCase().includes(candidate.toLowerCase()));
    if (!label) {
      return null;
    }
    const labelIndex = normalized.toLowerCase().indexOf(label.toLowerCase());
    const title = normalized.slice(0, labelIndex).trim();
    return { sourceLabel: label, title };
  };

  /**
   * @param {Document} documentValue
   * @returns {Record<string, AflEpisode>}
   */
  const parseEpisodeTable = (documentValue) => {
    /** @type {Record<string, AflEpisode>} */
    const episodes = {};
    const rows = Array.from(documentValue.querySelectorAll("tr"));

    rows.forEach((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length < 3) {
        return;
      }
      const episodeNumber = CFS.shared.parsePositiveInteger(cells[0].textContent || "");
      if (!episodeNumber) {
        return;
      }
      const sourceLabel = (cells[2].textContent || "").replace(/\s+/g, " ").trim();
      const classification = normalizeClassification(sourceLabel);
      if (classification === CFS.shared.EpisodeClass.UNKNOWN) {
        return;
      }
      episodes[String(episodeNumber)] = {
        number: episodeNumber,
        title: (cells[1].textContent || "").replace(/\s+/g, " ").trim(),
        classification,
        sourceLabel
      };
    });

    if (Object.keys(episodes).length > 0) {
      return episodes;
    }

    const episodeLinks = Array.from(documentValue.querySelectorAll("a[href*='/shows/'][href*='episode-'], a[href*='/shows/']"));
    episodeLinks.forEach((link) => {
      const row = link.closest("tr") || link.parentElement;
      if (!row) {
        return;
      }
      const episodeNumber = CFS.shared.parsePositiveInteger(link.textContent || "");
      const tail = parseEpisodeTail(row.textContent || "");
      if (!episodeNumber || !tail) {
        return;
      }
      episodes[String(episodeNumber)] = {
        number: episodeNumber,
        title: tail.title,
        classification: normalizeClassification(tail.sourceLabel),
        sourceLabel: tail.sourceLabel
      };
    });

    return episodes;
  };

  /**
   * @param {string} slug
   * @param {string} html
   * @returns {AflShowData}
   */
  const parseShowData = (slug, html) => {
    const documentValue = parseHtml(html);
    const title = parseShowTitle(documentValue);
    const episodes = parseEpisodeTable(documentValue);
    if (!title || Object.keys(episodes).length === 0) {
      throw new Error(`Unable to parse AFL show page: slug=${slug}`);
    }
    return {
      slug,
      title,
      sourceUrl: `${AFL_ORIGIN}/shows/${slug}`,
      episodes
    };
  };

  /**
   * @param {string} slug
   * @returns {Promise<AflShowData | null>}
   */
  const tryFetchShowBySlug = async (slug) => {
    const cacheKey = `afl-show:${slug}`;
    const cached = await getFreshCacheEntry(cacheKey, CACHE_TTL_MS);
    if (cached) {
      return /** @type {AflShowData} */ (cached);
    }

    try {
      const html = await fetchTextViaBackground(`${AFL_ORIGIN}/shows/${slug}`);
      const showData = parseShowData(slug, html);
      await setCacheEntry(cacheKey, showData);
      return showData;
    } catch (error) {
      if (error instanceof Error && error.message.includes("status=404")) {
        return null;
      }
      throw error;
    }
  };

  /**
   * @param {string} a
   * @param {string} b
   * @returns {number}
   */
  const titleScore = (a, b) => {
    const aTokens = new Set(normalizeTitle(a).split(" ").filter(Boolean));
    const bTokens = new Set(normalizeTitle(b).split(" ").filter(Boolean));
    const intersection = Array.from(aTokens).filter((token) => bTokens.has(token)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    return union === 0 ? 0 : intersection / union;
  };

  /**
   * @param {string} title
   * @returns {Promise<string | null>}
   */
  const findSlugFromShowsIndex = async (title) => {
    const cacheKey = "afl-shows-index";
    const cached = await getFreshCacheEntry(cacheKey, CACHE_TTL_MS);
    const html = cached ? String(cached) : await fetchTextViaBackground(`${AFL_ORIGIN}/shows`);
    if (!cached) {
      await setCacheEntry(cacheKey, html);
    }

    const documentValue = parseHtml(html);
    const links = Array.from(documentValue.querySelectorAll("a[href^='/shows/']"));
    const candidates = links
      .map((link) => {
        const href = link.getAttribute("href") || "";
        const slug = href.replace(/^\/shows\//, "").replace(/\/$/, "");
        return {
          slug,
          title: (link.textContent || "").replace(/\s+/g, " ").trim()
        };
      })
      .filter((candidate) => candidate.slug && candidate.title);

    const best = candidates
      .map((candidate) => ({ ...candidate, score: titleScore(title, candidate.title) }))
      .sort((left, right) => right.score - left.score)[0];

    return best && best.score >= 0.75 ? best.slug : null;
  };

  /**
   * @param {string} title
   * @param {Record<string, string>} manualOverrides
   * @returns {Promise<AflShowData>}
   */
  const resolveShow = async (title, manualOverrides) => {
    const normalizedTitle = normalizeTitle(title);
    const manualSlug = manualOverrides[normalizedTitle] || manualOverrides[title];
    const directSlug = manualSlug || titleToSlug(title);
    const cachedSlug = await getFreshCacheEntry(`afl-mapping:${normalizedTitle}`, CACHE_TTL_MS);
    const slugCandidates = [cachedSlug, directSlug].filter(Boolean).map(String);

    for (const slug of slugCandidates) {
      const showData = await tryFetchShowBySlug(slug);
      if (showData) {
        await setCacheEntry(`afl-mapping:${normalizedTitle}`, slug);
        return showData;
      }
    }

    const fuzzySlug = await findSlugFromShowsIndex(title);
    if (fuzzySlug) {
      const showData = await tryFetchShowBySlug(fuzzySlug);
      if (showData) {
        await setCacheEntry(`afl-mapping:${normalizedTitle}`, fuzzySlug);
        return showData;
      }
    }

    throw new Error(`Unable to resolve AnimeFillerList show: title=${title} normalizedTitle=${normalizedTitle}`);
  };

  CFS.afl = {
    resolveShow,
    parseShowData,
    tryFetchShowBySlug
  };

  globalScope.CFS = CFS;
})(globalThis);
