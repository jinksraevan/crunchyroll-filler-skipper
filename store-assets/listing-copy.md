# Chrome Web Store Listing Copy

## Basic Details

Name:
Crunchyroll Filler Skipper

Category:
Entertainment

Language:
English

Short description:
Automatically skip Crunchyroll filler episodes using AnimeFillerList and your selected watch mode.

Detailed description:
Crunchyroll Filler Skipper helps you watch anime on Crunchyroll without manually checking filler guides.

When you open a Crunchyroll series or episode page, the extension detects the current show, matches it to AnimeFillerList, loads the episode classifications, and applies your selected watch mode.

Features:

- Automatically detects the current Crunchyroll show
- Uses AnimeFillerList episode classifications
- Supports Canon Only, Canon + Mixed, and Filler Only watch modes
- Automatically advances past episodes that do not match your selected mode
- Shows a simple in-page banner while skipping episodes
- Includes a popup with show status, episode breakdown, source link, and advanced controls
- Caches show data locally to reduce repeated requests

Watch modes:

Canon Only skips filler and mixed canon/filler episodes.

Canon + Mixed skips filler episodes only.

Filler Only skips canon and mixed canon/filler episodes.

This extension does not require an account, does not use a backend server, and stores settings locally in Chrome.

AnimeFillerList is used as the source for episode classifications. Crunchyroll Filler Skipper is an independent browser extension and is not affiliated with Crunchyroll or AnimeFillerList.

## Graphic Assets

Extension package:
`C:\Projects\crunchyroll-filler-skipper\dist\crunchyroll-filler-skipper-0.1.0.zip`

Extension icon:
`C:\Projects\crunchyroll-filler-skipper\icons\icon-128.png`

Screenshots:

- `C:\Projects\crunchyroll-filler-skipper\store-assets\screenshot-01-overview-1280x800.png`
- `C:\Projects\crunchyroll-filler-skipper\store-assets\screenshot-02-watch-modes-1280x800.png`
- `C:\Projects\crunchyroll-filler-skipper\store-assets\screenshot-03-skip-banner-1280x800.png`
- `C:\Projects\crunchyroll-filler-skipper\store-assets\screenshot-04-source-status-1280x800.png`

Promotional images:

- Small promo tile: `C:\Projects\crunchyroll-filler-skipper\store-assets\small-promo-tile-440x280.png`
- Marquee promo tile: `C:\Projects\crunchyroll-filler-skipper\store-assets\marquee-promo-tile-1400x560.png`
- Large promo tile: `C:\Projects\crunchyroll-filler-skipper\store-assets\large-promo-tile-920x680.png`

## Privacy Fields

Single purpose:
Automatically detect the current Crunchyroll anime episode and skip episodes that do not match the user's selected AnimeFillerList-based watch mode.

Permission justification - storage:
Stores the user's enable setting, selected watch mode, manual AnimeFillerList slug overrides, cached show mappings, cached episode classifications, and local status information in Chrome storage. This keeps the extension working across Crunchyroll pages without a backend service.

Permission justification - https://www.crunchyroll.com/*:
Required to run the content script on Crunchyroll pages, detect the current show and episode, show the skip banner, and advance to the next episode when the selected watch mode says the current episode should be skipped.

Permission justification - https://www.animefillerlist.com/*:
Required for the background service worker to fetch AnimeFillerList show pages and parse episode classifications used for skip decisions.

Remote code:
No. The extension does not load or execute remotely hosted code.

Recommended data disclosure:

- Website content: The extension reads Crunchyroll page content such as show title, episode number, and next-episode controls so it can make skip decisions.
- Web browsing activity: The extension reads the current Crunchyroll URL/route locally so it can react to Crunchyroll single-page navigation and keep status current.

Data use notes:

- Data is used only to provide the filler-skipping feature.
- Data is stored locally in Chrome storage.
- Data is not sold.
- Data is not used for advertising.
- Data is not used to determine creditworthiness.
- Data is not transferred to the developer's server because the extension has no backend service.
- AnimeFillerList pages are fetched over HTTPS to retrieve public episode classification data.

Suggested privacy policy summary:
Crunchyroll Filler Skipper reads the current Crunchyroll page URL, show title, episode number, and page controls only to detect the current episode and decide whether to skip it based on the user's selected watch mode. The extension stores settings, manual overrides, cached AnimeFillerList mappings, cached episode classifications, and local status data in Chrome storage. The extension does not require an account, does not operate a backend service, does not sell data, does not use data for advertising, and does not transfer user data to the developer. AnimeFillerList is contacted over HTTPS only to retrieve public episode classification pages.

## Distribution

Visibility:
Public, unless you want to test with a limited group first.

Regions:
All regions where the extension is allowed, unless you have a reason to restrict distribution.

Pricing:
Free.

In-app purchases:
No.

Test instructions:
Install the extension, open a Crunchyroll anime series or watch page, open the extension popup, and confirm that the current show is detected. Select Canon Only, Canon + Mixed, or Filler Only. On a skipped episode, the extension should advance to the next episode and show a short in-page skip banner.
