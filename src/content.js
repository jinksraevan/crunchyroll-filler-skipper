(function attachContent(globalScope) {
  "use strict";

  const CFS = globalScope.CFS || {};
  const {
    ROUTE_DEBOUNCE_MS,
    SKIP_NAVIGATION_COOLDOWN_MS,
    normalizeTitle,
    shouldSkipEpisode,
    debugLog
  } = CFS.shared;
  const { getSettings, setStatus } = CFS.storage;
  const { resolveShow } = CFS.afl;
  const { detectTitle, detectEpisode, navigateToNextEpisode } = CFS.crunchyroll;
  const { showBanner, hideBanner } = CFS.banner;

  /** @type {number | null} */
  let debounceTimer = null;
  /** @type {string} */
  let lastEvaluatedKey = "";
  /** @type {number} */
  let lastNavigationAt = 0;
  /** @type {{ start: number, end: number } | null} */
  let activeSkipChain = null;

  /**
   * @param {Record<string, import("./afl.js").AflEpisode>} episodes
   * @param {number} episodeNumber
   * @param {string} watchMode
   * @returns {{ start: number, end: number }}
   */
  const getSkipRange = (episodes, episodeNumber, watchMode) => {
    let start = episodeNumber;
    let end = episodeNumber;

    while (start > 1) {
      const previous = episodes[String(start - 1)];
      if (!previous || !shouldSkipEpisode(watchMode, previous.classification)) {
        break;
      }
      start -= 1;
    }

    while (true) {
      const next = episodes[String(end + 1)];
      if (!next || !shouldSkipEpisode(watchMode, next.classification)) {
        break;
      }
      end += 1;
    }

    return { start, end };
  };

  /**
   * @param {{ start: number, end: number }} range
   * @returns {string}
   */
  const formatSkipBannerText = (range) => {
    if (range.start === range.end) {
      return `Skipping episode ${range.start}`;
    }
    return `Skipping episodes ${range.start}-${range.end}`;
  };

  /**
   * @param {string} debugStatus
   * @param {Record<string, unknown>} fields
   * @returns {Promise<void>}
   */
  const writeStatus = async (debugStatus, fields) => {
    await setStatus({
      url: location.href,
      debugStatus,
      ...fields
    });
  };

  /**
   * @returns {Promise<void>}
   */
  const evaluateCurrentPage = async () => {
    const settings = await getSettings();
    const detectedTitle = detectTitle();
    const detectedEpisode = detectEpisode();
    const title = detectedTitle ? detectedTitle.title : "";
    const normalizedTitle = title ? normalizeTitle(title) : "";

    if (!settings.enabled) {
      hideBanner();
      await writeStatus("disabled", {
        enabled: false,
        watchMode: settings.watchMode,
        detectedShowTitle: title,
        normalizedTitle,
        titleSource: detectedTitle ? detectedTitle.source : "not-found",
        episodeNumber: detectedEpisode.episodeNumber,
        episodeSource: detectedEpisode.source,
        shouldSkip: false
      });
      return;
    }

    if (!title) {
      hideBanner();
      await writeStatus("show-not-detected", {
        enabled: true,
        watchMode: settings.watchMode,
        detectedShowTitle: "",
        normalizedTitle: "",
        titleSource: "not-found",
        episodeNumber: detectedEpisode.episodeNumber,
        episodeSource: detectedEpisode.source,
        shouldSkip: false
      });
      return;
    }

    try {
      const showData = await resolveShow(title, settings.manualOverrides);
      const episode = detectedEpisode.episodeNumber
        ? showData.episodes[String(detectedEpisode.episodeNumber)]
        : null;
      const classification = episode ? episode.classification : "UNKNOWN";
      const shouldSkip = detectedEpisode.episodeNumber
        ? shouldSkipEpisode(settings.watchMode, classification)
        : false;
      const evaluationKey = [
        location.href,
        showData.slug,
        detectedEpisode.episodeNumber || "series",
        classification,
        settings.watchMode,
        shouldSkip ? "skip" : "watch"
      ].join("|");

      debugLog(settings.debug, {
        title,
        normalizedTitle,
        aflSlug: showData.slug,
        episodeNumber: detectedEpisode.episodeNumber,
        classification,
        sourceLabel: episode ? episode.sourceLabel : "",
        watchMode: settings.watchMode,
        shouldSkip
      });

      await writeStatus("ok", {
        enabled: true,
        watchMode: settings.watchMode,
        detectedShowTitle: title,
        normalizedTitle,
        titleSource: detectedTitle.source,
        resolvedAflSlug: showData.slug,
        resolvedAflTitle: showData.title,
        resolvedAflUrl: showData.sourceUrl,
        episodeNumber: detectedEpisode.episodeNumber,
        episodeSource: detectedEpisode.source,
        classification,
        sourceLabel: episode ? episode.sourceLabel : "",
        shouldSkip
      });

      if (!shouldSkip || !detectedEpisode.episodeNumber) {
        activeSkipChain = null;
        hideBanner();
        lastEvaluatedKey = evaluationKey;
        return;
      }

      const skipRange = getSkipRange(showData.episodes, detectedEpisode.episodeNumber, settings.watchMode);
      activeSkipChain = skipRange;
      showBanner(formatSkipBannerText(skipRange));

      if (evaluationKey === lastEvaluatedKey && Date.now() - lastNavigationAt < SKIP_NAVIGATION_COOLDOWN_MS) {
        debugLog(settings.debug, "skip suppressed by cooldown", { evaluationKey });
        return;
      }

      lastEvaluatedKey = evaluationKey;
      lastNavigationAt = Date.now();
      const navigated = navigateToNextEpisode();
      debugLog(settings.debug, navigated ? "next episode navigation attempted" : "next episode control not found", {
        activeSkipChain
      });

      if (!navigated) {
        await writeStatus("next-control-not-found", {
          enabled: true,
          watchMode: settings.watchMode,
          detectedShowTitle: title,
          normalizedTitle,
          resolvedAflSlug: showData.slug,
          episodeNumber: detectedEpisode.episodeNumber,
          classification,
          sourceLabel: episode ? episode.sourceLabel : "",
          shouldSkip: true
        });
      }
    } catch (error) {
      hideBanner();
      const message = error instanceof Error ? error.message : String(error);
      debugLog(settings.debug, "evaluation failed", { message });
      await writeStatus("error", {
        enabled: true,
        watchMode: settings.watchMode,
        detectedShowTitle: title,
        normalizedTitle,
        titleSource: detectedTitle.source,
        episodeNumber: detectedEpisode.episodeNumber,
        episodeSource: detectedEpisode.source,
        shouldSkip: false,
        error: message
      });
    }
  };

  /**
   * @returns {void}
   */
  const scheduleEvaluation = () => {
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(() => {
      evaluateCurrentPage().catch((error) => {
        console.error("[Crunchyroll Filler Skipper] Unhandled evaluation error", error);
      });
    }, ROUTE_DEBOUNCE_MS);
  };

  /**
   * @returns {void}
   */
  const startRouteWatcher = () => {
    let previousUrl = location.href;
    window.setInterval(() => {
      if (previousUrl !== location.href) {
        previousUrl = location.href;
        scheduleEvaluation();
      }
    }, 500);

    const observer = new MutationObserver(() => {
      scheduleEvaluation();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && (changes.settings || changes.cache)) {
        scheduleEvaluation();
      }
    });
  };

  startRouteWatcher();
  scheduleEvaluation();
})(globalThis);
