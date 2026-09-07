# AISIS Course Companion

A Chrome / Edge extension that adds direct syllabus links and course-prioritized professor reviews to AISIS Class Schedule tables.

## Install

1. Download this repository or a packaged archive and extract it.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Refresh AISIS and open **Class Schedule**.

After an update, reload the extension and refresh your AISIS tabs.

## Features

- **Syllabus:** opens the PDF directly in a new tab. Links use the selected term, department, course, section, and instructor names. Interdisciplinary electives resolve their owning department from the course prefix or AISIS department listings.
- **Availability:** checks visible links with up to three concurrent checks per page. HEAD requests are preferred; a small ranged GET handles inconclusive responses. Confirmed missing PDFs are disabled. Timeouts, login redirects, and other uncertain responses leave links usable. **Recheck syllabus** retries immediately; **Edit link details** supports filename exceptions.
- **Co-taught courses:** combines instructors in one filename. If it is missing, teams of up to three are checked in alternate orders. Surname spaces, suffixes, and explicit TBA entries are supported.
- **Prof reviews:** shows each instructor separately. Exact course matches appear first, with a numeric course average when available; otherwise the overall score leads. Review filters, expansion, and source links are included.

Tools appear only on signed-in and public Class Schedule pages. Tables with native syllabus controls are skipped. Other AISIS pages receive no extra columns or course dialogs.

Syllabus filenames follow FACILE Syllabus Viewer conventions. Filename exceptions or missing uploads can still prevent a PDF from opening. Professor reviews are read from public Profs to Pick pages; changes to that site's page format may require an extension update.

## Privacy

No analytics, remote scripts, API keys, or additional accounts are required.

Syllabus checks and department lookups stay on AISIS and use the current AISIS session. Department lookups request display-only class schedules; they do not change registration. Professor-profile requests go to Profs to Pick without cookies and include only the derived professor slug. AISIS credentials and schedules are not sent to that service.

Availability statuses are cached locally for 10 minutes when available, 5 minutes when missing, and 30 seconds when uncertain. Professor profiles are cached in extension session storage for 15 minutes. Refresh controls bypass the corresponding cache.

The `storage` permission supports these caches. Cross-origin host permission is limited to `https://profstopick.com/*`.

## Development

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run package
```

Tests use synthetic schedules, profiles, and controlled server responses. They do not need an AISIS account, saved browsing captures, or live professor data. Browser tests load the extension in Chromium and cover syllabus navigation, reviews, page restrictions, the extension image, and availability checks.

Packaging copies an explicit list of runtime files and documentation to `dist/aisis-course-companion`. On Windows it also creates `dist/aisis-course-companion.zip`. Private captures, credentials, dependencies, and generated test artifacts are excluded. Never include authenticated page captures or HAR files in issues or pull requests.
