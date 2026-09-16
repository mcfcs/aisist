# Interface design

The course tools follow AISIS's existing table styles. Cells inherit their adjacent cell's font, background, and alignment. Links use navy; dialogs use a periwinkle header, white reading surface, and compact Arial typography.

Each eligible course row adds one Links column containing the enabled tools: Syllabus, Prof reviews, and Add to plan. Confirmed missing syllabus links show an unavailable state with recheck and correction controls. A course still listed as not yet taken carries a small periwinkle badge naming its year and semester in the program of study. Tables with native syllabus controls are left intact, and a table receives no column at all when every tool is off.

Reviews open in a single-column dialog with a persistent close control. Each instructor has separate ratings and reviews, with current-course matches first. Long reviews expand on request. Escape closes the dialog and restores focus.

The schedule planner adds a bar above each enhanced table carrying the term being planned, the draft name, its course and unit counts, conflicts, the courses due this term, and the progress of the section search, with controls for the draft dialog and the planner tab. The bar sticks to the top of the viewport, so on a schedule hundreds of rows long a course added far down the page still reports back.

The draft dialog is the wide form of the same dialog. It leads with the courses the program still needs for the chosen term, because that is what a draft is built from: each course carries its units, category, and program year, then its sections with meeting time, room, instructor, and free slots, each addable in place. Courses whose sections are all by arrangement sort after ones that can be timetabled, a course with many sections keeps four open behind a count, and courses filed under another semester sit in a closed group rather than being hidden. The weekly grid, the sections in the draft, and export follow. Plan course is the same list for one course, opened from its row.

The weekly grid runs Monday to Friday, adding Saturday and Sunday only when a picked section uses them, and spans only the hours the draft actually uses: a fixed seven-to-seven window turned a five-hour schedule into mostly empty ruling. Row height is set from that span so a long day stays on one screen instead of scrolling. Each block names its course, its title, its time and its room, in that order, dropping the later lines when the block is too short to hold them. Each course keeps one muted fill chosen from its code so the same course reads the same way in the grid, the export and the section table. Sections that overlap on a day sit side by side within that day rather than hiding one another, and conflicting blocks take the error border. Sections without a usable meeting time stay in the section table as arranged rather than disappearing from the draft.

A planned time block is drawn with a dashed border and labelled as planned in the grid, the section table and the exported image, because a block the student invented must never read as a section AISIS is offering.

Save as image redraws the same grid on a canvas rather than rasterising the page, so the export carries the drawing and none of the surrounding interface.

The planner tab repeats the header, dialog controls, and grid at full width, with the draft on the left and the section search on the right; the two columns stack below 900 pixels. Warnings are advisory text, never disabled controls: a full section can still be drafted.

The tab reads AISIS itself rather than waiting on a class schedule page, so it opens to a load control and a progress line rather than an empty state. When a department cannot be read, the courses it owns say so by name and reason: a student cannot otherwise tell a failed request from a course that is simply not offered.

The toolbar popup lists the three tools as checkboxes with a one-line description each, states which are off, and says whether the tools are running in the current tab and at what version, so a page left open across an update can be told apart from a page the tools do not cover.

On the AISIS home page the planner adds a single site map row, MY DRAFT SCHEDULES, below Class Schedule. It copies the alignment and classes of the row above it so it reads as part of the list AISIS already prints.

The planner tab is a page in its own right rather than a view onto whatever a class schedule tab happened to collect. It reads the term list, the program of study, and the department listings itself, reports what it is reading while it works, and can be stopped. A course with no sections says which of the two things happened: AISIS offers none this term, or the department could not be read and why. Nothing about the planner depends on a class schedule page being open.

The eagle image identifies the extension in the browser toolbar, extensions page, popup, and planner tab. It does not add decoration to AISIS course rows.
