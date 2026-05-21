(function attachStorage(globalScope) {
  "use strict";

  const CFS = globalScope.CFS || {};
  const { DEFAULT_SETTINGS } = CFS.shared;

  /**
   * @template T
   * @param {string | string[] | Record<string, unknown>} keys
   * @returns {Promise<T>}
   */
  const storageGet = (keys) => new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(/** @type {T} */ (items));
    });
  });

  /**
   * @param {Record<string, unknown>} items
   * @returns {Promise<void>}
   */
  const storageSet = (items) => new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });

  /**
   * @returns {Promise<{
   *   enabled: boolean,
   *   watchMode: string,
   *   debug: boolean,
   *   manualOverrides: Record<string, string>
   * }>}
   */
  const getSettings = async () => {
    const result = await storageGet({ settings: DEFAULT_SETTINGS });
    const settings = /** @type {{ settings: typeof DEFAULT_SETTINGS }} */ (result).settings;
    return {
      enabled: Boolean(settings.enabled),
      watchMode: String(settings.watchMode || DEFAULT_SETTINGS.watchMode),
      debug: Boolean(settings.debug),
      manualOverrides: settings.manualOverrides && typeof settings.manualOverrides === "object"
        ? /** @type {Record<string, string>} */ (settings.manualOverrides)
        : {}
    };
  };

  /**
   * @param {Partial<typeof DEFAULT_SETTINGS>} patch
   * @returns {Promise<void>}
   */
  const updateSettings = async (patch) => {
    const current = await getSettings();
    await storageSet({ settings: { ...current, ...patch } });
  };

  /**
   * @param {string} key
   * @returns {Promise<unknown | null>}
   */
  const getCacheEntry = async (key) => {
    const result = await storageGet({ cache: {} });
    const cache = /** @type {{ cache: Record<string, { savedAt: number, value: unknown }> }} */ (result).cache;
    const entry = cache[key];
    return entry ? entry.value : null;
  };

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   */
  const setCacheEntry = async (key, value) => {
    const result = await storageGet({ cache: {} });
    const cache = /** @type {{ cache: Record<string, { savedAt: number, value: unknown }> }} */ (result).cache;
    await storageSet({ cache: { ...cache, [key]: { savedAt: Date.now(), value } } });
  };

  /**
   * @param {string} key
   * @param {number} ttlMs
   * @returns {Promise<unknown | null>}
   */
  const getFreshCacheEntry = async (key, ttlMs) => {
    const result = await storageGet({ cache: {} });
    const cache = /** @type {{ cache: Record<string, { savedAt: number, value: unknown }> }} */ (result).cache;
    const entry = cache[key];
    if (!entry) {
      return null;
    }
    return Date.now() - entry.savedAt <= ttlMs ? entry.value : null;
  };

  /**
   * @param {Record<string, unknown>} status
   * @returns {Promise<void>}
   */
  const setStatus = async (status) => {
    await storageSet({ latestStatus: { ...status, updatedAt: new Date().toISOString() } });
  };

  CFS.storage = {
    storageGet,
    storageSet,
    getSettings,
    updateSettings,
    getCacheEntry,
    setCacheEntry,
    getFreshCacheEntry,
    setStatus
  };

  globalScope.CFS = CFS;
})(globalThis);
