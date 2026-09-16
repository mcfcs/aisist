# Interface design

The course tools follow AISIS's existing table styles. Cells inherit their adjacent cell's font, background, and alignment. Links use navy; dialogs use a periwinkle header, white reading surface, and compact Arial typography.

Each eligible course row adds one Links column containing the enabled tools: Syllabus, Prof reviews, and Add to plan. Confirmed missing syllabus links show an unavailable state with recheck and correction controls. A course still listed as not yet taken carries a small periwinkle badge naming its year and semester in the program of study. Tables with native syllabus controls are left intact, and a table receives no column at all when every tool is off.

Reviews open in a single-column dialog with a persistent close control. Each instructor has separate ratings and reviews, with current-course matches first. Long reviews expand on request. Escape closes the dialog and restores focus.

The schedule planner adds a bar above each enhanced table carrying the draft name, its course and unit counts, conflicts, and the courses left in the program, with controls for the draft dialog and the planner tab. The draft dialog is the wide form of the same dialog: draft controls, a summary, the weekly grid, the sections in the draft, the remaining program courses, and export.

The weekly grid runs Monday to Friday, adding Saturday and Sunday only when a picked section uses them. Rows are fifteen minutes, hours are ruled, and each course keeps one muted fill chosen from its code so the same course reads the same way in the grid and the section table. Sections that overlap on a day sit side by side within that day rather than hiding one another, and conflicting blocks take the error border. Sections without a usable meeting time stay in the section table as arranged rather than disappearing from the draft.

The planner tab repeats the header, dialog controls, and grid at full width, with the draft on the left and the program checklist and section search on the right; the two columns stack below 900 pixels. Warnings are advisory text, never disabled controls: a full section can still be drafted.

The toolbar popup lists the three tools as checkboxes with a one-line description each, and states which are off.

The eagle image identifies the extension in the browser toolbar, extensions page, popup, and planner tab. It does not add decoration to AISIS course rows.
