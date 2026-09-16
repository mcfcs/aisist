# AISIS Course Companion

A Chrome / Edge extension that adds direct syllabus links, course-prioritized professor reviews, and a draft schedule planner to AISIS Class Schedule tables.

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
- **Schedule planner:** **Add to plan** puts a section into a draft for the term selected on the page. A bar above the table shows the current draft, its units, and any time conflicts. **Open draft schedule** shows a weekly grid, the sections in the draft, warnings, and the courses still left in your program. **Full planner** opens a separate tab with the same draft plus a searchable list of every section you have opened in AISIS.
- **Drafts:** several named drafts per term, with duplicate, delete, and **Copy as text** for enlistment day. A draft is a personal plan; it does not reserve a slot or change your enlistment.
- **Program matching:** your Individual Program of Study is read to mark rows whose subject is still not yet taken, including placeholders such as `ISCS 30.XX`, which match any course under that prefix.
- **Conflicts and warnings:** overlapping meetings are named by day and time. Repeated courses, full or over-capacity sections, restricted remarks, and TBA meeting times are flagged but never block a pick.
- **Feature toggles:** the toolbar popup turns Syllabus links, Prof reviews, and the Schedule planner on or off. Changes apply to open AISIS tabs without a reload. All three start on.

Tools appear only on signed-in and public Class Schedule pages. Tables with native syllabus controls are skipped. Other AISIS pages receive no extra columns or course dialogs.

Meeting times are read as AISIS writes them: day codes joined by hyphens are separate days, so `M-TH 1530-1700` is Monday and Thursday, and `S` means Saturday. `TBA` and `TUTORIAL` sections stay in the draft as arranged meetings instead of being dropped.

Syllabus filenames follow FACILE Syllabus Viewer conventions. Filename exceptions or missing uploads can still prevent a PDF from opening. Professor reviews are read from public Profs to Pick pages; changes to that site's page format may require an extension update.

## Privacy

No analytics, remote scripts, API keys, or additional accounts are required.

Syllabus checks and department lookups stay on AISIS and use the current AISIS session. Department lookups request display-only class schedules; they do not change registration. Professor-profile requests go to Profs to Pick without cookies and include only the derived professor slug. AISIS credentials and schedules are not sent to that service.

With the planner on, the extension reads your Individual Program of Study from AISIS with the current AISIS session. That page is display-only; the request does not change your program, registration, or enlistment. A signed-out response leaves planning unchanged. Sections from the class schedules you open are saved so the planner tab can search them. Your program of study, saved sections, and drafts stay in this browser's extension storage, are never sent anywhere, and are bounded to the three most recent terms. Feature toggles are stored in synced extension storage so they follow your browser profile.

Availability statuses are cached locally for 10 minutes when available, 5 minutes when missing, and 30 seconds when uncertain. Professor profiles are cached in extension session storage for 15 minutes. Refresh controls bypass the corresponding cache.

The `storage` permission supports these caches, your drafts, and the feature toggles. Cross-origin host permission is limited to `https://profstopick.com/*`.

## Development

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run package
```

Tests use synthetic schedules, programs of study, profiles, and controlled server responses. They do not need an AISIS account, saved browsing captures, or live professor data. Browser tests load the extension in Chromium and cover syllabus navigation, reviews, program matching, the draft schedule and planner tab, the feature toggles, page restrictions, the extension image, and availability checks.

Packaging copies an explicit list of runtime files and documentation to `dist/aisis-course-companion`. On Windows it also creates `dist/aisis-course-companion.zip`. Private captures, credentials, dependencies, and generated test artifacts are excluded. Never include authenticated page captures or HAR files in issues or pull requests.
