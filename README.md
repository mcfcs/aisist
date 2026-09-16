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
- **Schedule planner:** a bar above the class table shows the term being planned, the current draft, its units, and any time conflicts. **Plan my schedule** opens the draft, **Full planner** opens it in its own tab, and the bar stays in view while you scroll a long schedule.
- **Suggested courses:** the planner reads your Individual Program of Study, takes the courses it files under the semester selected in **School Year and Term**, and lists every section AISIS offers for them that term with its time, room, instructor, and free slots. Add or remove a section with one click; sections that clash with the draft are marked. Courses with only TBA sections sort last, and a course with many sections stays collapsed until you ask for the rest.
- **Finding those sections:** AISIS cannot search one course across departments, so on the class schedule page the planner reads department listings for the chosen term until every needed course has been seen, likeliest department first, stopping as soon as nothing is left to find. Progress shows in the bar, the result is kept per term for a day, and **Search AISIS again** repeats it.
- **Add to plan / Plan course:** every row can be added to the draft directly, and **Plan course** opens that one course with all of its sections, whether your program still needs it, and which sections clash with your draft.
- **Drafts:** several named drafts per term, with duplicate, delete, and **Copy as text** for enlistment day. A draft is a personal plan; it does not reserve a slot or change your enlistment.
- **Program matching:** rows whose subject is still not yet taken are marked with the year and semester your program files them under, including placeholders such as `ISCS 30.XX`, which match any course under that prefix.
- **On the AISIS home page:** the site map gains a **MY DRAFT SCHEDULES** row that opens the planner.
- **Conflicts and warnings:** overlapping meetings are named by day and time. Repeated courses, full or over-capacity sections, restricted remarks, and TBA meeting times are flagged but never block a pick.
- **Feature toggles:** the toolbar popup turns Syllabus links, Prof reviews, and the Schedule planner on or off. Changes apply to open AISIS tabs without a reload. All three start on.

Tools appear on signed-in and public Class Schedule pages, and the planner adds one row to the AISIS home page site map. Tables with native syllabus controls are skipped. Other AISIS pages receive no extra columns or course dialogs.

Meeting times are read as AISIS writes them: day codes joined by hyphens are separate days, so `M-TH 1530-1700` is Monday and Thursday, and `S` means Saturday. `TBA` and `TUTORIAL` sections stay in the draft as arranged meetings instead of being dropped.

Syllabus filenames follow FACILE Syllabus Viewer conventions. Filename exceptions or missing uploads can still prevent a PDF from opening. Professor reviews are read from public Profs to Pick pages; changes to that site's page format may require an extension update.

## Privacy

No analytics, remote scripts, API keys, or additional accounts are required.

Syllabus checks and department lookups stay on AISIS and use the current AISIS session. Department lookups request display-only class schedules; they do not change registration. Professor-profile requests go to Profs to Pick without cookies and include only the derived professor slug. AISIS credentials and schedules are not sent to that service.

With the planner on, the extension reads your Individual Program of Study from AISIS with the current AISIS session, and reads department class schedules for the term you are planning so it can offer sections for the courses you still need. Both are display-only pages requested the same way the browser would; they do not change your program, registration, or enlistment. Requests stop after repeated failures, and a signed-out response leaves planning unchanged. Your program of study, the sections found, and your drafts stay in this browser's extension storage, are never sent anywhere, and are bounded to the three most recent terms. Feature toggles are stored in synced extension storage so they follow your browser profile.

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

Tests use synthetic schedules, programs of study, profiles, and controlled server responses. They do not need an AISIS account, saved browsing captures, or live professor data. Browser tests load the extension in Chromium and cover syllabus navigation, reviews, program matching, the department sweep for suggested sections, the draft schedule, the per-course popup, the planner tab, the home page link, the feature toggles, page restrictions, the extension image, and availability checks.

Packaging copies an explicit list of runtime files and documentation to `dist/aisis-course-companion`. On Windows it also creates `dist/aisis-course-companion.zip`. Private captures, credentials, dependencies, and generated test artifacts are excluded. Never include authenticated page captures or HAR files in issues or pull requests.
