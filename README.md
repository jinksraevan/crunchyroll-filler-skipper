# Crunchyroll Filler Skipper

A Chrome Manifest V3 extension that automatically detects the anime you are viewing on Crunchyroll, resolves it to AnimeFillerList, and skips episodes based on your selected watch mode.

The normal flow is automatic: open a Crunchyroll series or watch page, and the extension detects the show, loads filler data, and applies your watch mode.

## Features

- Auto-detects the current Crunchyroll show from page metadata, visible headings, series links, and series URLs.
- Resolves the detected show to AnimeFillerList without requiring manual setup.
- Fetches and caches AnimeFillerList episode classifications.
- Supports Crunchyroll series pages and watch pages.
- Handles Crunchyroll SPA route changes without requiring a full reload.
- Skips disallowed episodes automatically.
- Shows one persistent in-page banner during consecutive skipped episodes.
- Includes a popup with show status, watch mode controls, episode breakdown, source link, and advanced controls.

## Watch Modes

### Canon Only

Watches full canon episodes only.

Skips:

- `FILLER`
- `MIXED CANON/FILLER`

### Canon + Mixed

Watches canon and mixed episodes.

Skips:

- `FILLER`

### Filler Only

Watches filler episodes only.

Skips:

- `MANGA CANON`
- `ANIME CANON`
- `MIXED CANON/FILLER`

## Data Source

AnimeFillerList is the source of truth for episode classifications.

The extension parses AnimeFillerList show pages and normalizes labels internally:

- `MANGA CANON` -> `CANON`
- `ANIME CANON` -> `CANON`
- `MIXED CANON/FILLER` -> `MIXED`
- `FILLER` -> `FILLER`

The popup includes a single source link for the resolved show so you can inspect the AnimeFillerList page directly.

## Install Locally

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this folder:

   ```text
   C:\Projects\crunchyroll-filler-skipper
   ```

6. Open a Crunchyroll series page or watch page.
7. Pin the extension if you want quick access to the popup.

After code changes, return to `chrome://extensions` and click the reload button for this extension.

## How To Use

1. Open a Crunchyroll anime series page.
2. Open the extension popup.
3. Confirm the show was auto-detected.
4. Review the episode breakdown.
5. Select a watch mode.
6. Open an episode and watch normally.

If the current episode should be skipped, the extension attempts to advance to the next episode immediately. If several episodes are skipped in a row, a banner stays visible until the extension lands on an allowed episode.

## Popup Guide

- `Show`: the Crunchyroll show detected by the extension.
- `Source: AnimeFillerList`: opens the resolved source page in a new tab.
- `Watch Mode`: controls which classifications should be watched or skipped.
- `Episode Breakdown`: total, canon, mixed, and filler counts for the resolved show.
- `Advanced`: debug and recovery controls.

Advanced controls:

- `Status`: latest internal status or error.
- `Episode`: current detected episode number, when available.
- `Classification`: current episode classification, when available.
- `Decision`: whether the current episode will be watched or skipped.
- `Manual AFL slug override`: fallback mapping override for shows that do not auto-resolve cleanly.
- `Refresh data`: clears cached mapping and episode data for the detected show.
- `Debug logging`: enables console logs for development.

## Caching

Resolved show mappings and AnimeFillerList episode data are stored in `chrome.storage.local`.

The cache TTL is 7 days. Use `Advanced -> Refresh data` when:

- AnimeFillerList has changed.
- A show mapped incorrectly.
- The episode breakdown looks stale or empty.
- You changed a manual override.

## Debugging

Enable `Advanced -> Debug logging`, then open Chrome DevTools on the Crunchyroll page.

Console logs are prefixed with:

```text
[Crunchyroll Filler Skipper]
```

Useful fields include:

- detected Crunchyroll title
- normalized title
- resolved AnimeFillerList slug
- detected episode number
- episode classification
- selected watch mode
- skip decision
- skip-chain range
- next episode navigation attempts

## Manual Override

Manual override is a fallback only. The extension should not require it for normal use.

Use it when:

- Crunchyroll and AnimeFillerList use meaningfully different show names.
- Auto-resolution picks the wrong show.
- A show page cannot be found through the direct or fuzzy mapping flow.

Enter only the AnimeFillerList slug, not the full URL.

Example:

```text
naruto
```

For this page:

```text
https://www.animefillerlist.com/shows/naruto
```

## Naruto Test Case

Known-good baseline:

- Crunchyroll series: `https://www.crunchyroll.com/series/GY9PJ5KWR/naruto`
- Crunchyroll episode: `https://www.crunchyroll.com/watch/G64907Q8Y/the-assassin-of-the-mist`
- AnimeFillerList source: `https://www.animefillerlist.com/shows/naruto`

Expected:

- detected show: `Naruto`
- resolved AFL slug: `naruto`
- episode count: `220`
- canon count: `74`
- mixed count: `56`
- filler count: `90`
- episode 7 classification: `MIXED CANON/FILLER`
- `Canon Only`: skips episode 7
- `Canon + Mixed`: watches episode 7

## Project Structure

```text
manifest.json
icons/
  icon-16.png
  icon-32.png
  icon-48.png
  icon-128.png
popup/
  popup.html
  popup.css
  popup.js
src/
  afl.js
  background.js
  banner.js
  content.js
  crunchyroll.js
  shared.js
  storage.js
```

## Architecture

- `manifest.json`: Chrome MV3 configuration, permissions, content scripts, popup, and icons.
- `src/background.js`: background service worker that fetches AnimeFillerList HTML.
- `src/content.js`: main Crunchyroll page controller for detection, status, skip decisions, and route changes.
- `src/crunchyroll.js`: Crunchyroll title, episode, and next-episode DOM detection.
- `src/afl.js`: AnimeFillerList mapping, fetching, parsing, and classification normalization.
- `src/banner.js`: in-page skip banner.
- `src/storage.js`: promise-based `chrome.storage.local` helpers.
- `src/shared.js`: shared constants, enums, normalization helpers, and skip rules.
- `popup/*`: popup UI and settings.

## Validation

There is no build step. Basic syntax validation can be run with:

```powershell
node --check src\shared.js
node --check src\storage.js
node --check src\background.js
node --check src\afl.js
node --check src\crunchyroll.js
node --check src\banner.js
node --check src\content.js
node --check popup\popup.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('manifest ok')"
```

## Known Limitations

- Crunchyroll can change its DOM or player controls, which may require selector updates.
- AnimeFillerList can change its HTML structure, which may require parser updates.
- If Crunchyroll does not expose a usable next-episode control, the popup status will show that navigation could not be completed.
- The extension intentionally avoids a backend service, database, or dashboard.
