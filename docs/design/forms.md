# Admin form design

Forms with more than five logical inputs belong on a dedicated page with named steps. This is a
standing interface rule, requested on 5 September 2026. Short forms can remain compact dialogs.

## Current flows

| Form | Routes | Steps |
| --- | --- | --- |
| Events | `/events/new`, `/events/:eventId/edit` | Details, Schedule, Registration, Questions & follow-up, Review |
| CMS resources with more than five fields | `/content/:resource/new`, `/content/:resource/:id/edit` | Resource-specific groups followed by Review |
| Site settings | `/site-settings` | Organisation, contact, location, visibility and communication groups |
| Invitations and permissions | `/users/invite`, `/users/:userId/permissions` | Identity, Permissions, Review |
| Projects | `/projects/new`, `/projects/:projectId/edit` | Basics, People, Schedule & place, Scope, Story & cover, Review |
| Tasks | `/tasks/new`, `/tasks/:taskKey/edit` | Basics, Assignment, Schedule, Details, Review |
| Application forms (builder) | `/forms/new`, `/forms/:formId/edit` | Basics, Introduction, Questions, Schedule & limits, Confirmation, Review |
| Impact stories | `/impact-stories/new`, `/impact-stories/:storyId/edit` | Basics, Classification, Blocks, Search & sharing, Review |

The CMS threshold is calculated from field definitions, so adding a sixth field automatically moves
that resource into the dedicated editor. Give every field a named step group in
`resources/form-steps.ts`: a field without one falls into an auto-named "More details" step, which
`form-steps.test.ts` refuses. Partners, pillar images and direct user creation remain short dialogs.

Emptying an optional field on a CMS edit (page or dialog) sends it as null if it had a value;
untouched blanks are not sent. Emptying a number that has a default (an order, a priority, a popup's
delay) saves that default, and Review shows it as such, for example "0 (default)". The content API
removes a null field that the create schema marks optional with no default, and still refuses null
for a required field or one with a default. A control that empties (a removed picture or file, a
cleared number) holds null, never undefined: react-hook-form shows a field's default in place of
undefined, which on an edit page is the stored value. `resources/resolver.ts` reads those nulls as
"no value" before the create schema validates. A required picture or file left empty, on create or
after Remove, asks for one in plain words ("Choose a picture.", "Choose a PDF.") rather than the
schema's own message.

The sticky Cancel / Back / Continue bar is opaque in every skin. While the editor is open the page
keeps the bar's height (and a small gap) as scroll padding, so whatever is focused, scrolled to or
typed in stops above the bar, including the line being typed at the foot of a growing text box; the
bar's own buttons cancel the padding, so focusing them never scrolls the page.

The work modules keep a few short forms as dialogs, each at five fields or fewer: quick task
creation (top bar and a project's Tasks tab), a project milestone, metric, risk, progress figure or
photo's details, and an application review. An application's status change (status and note) sits
inline on its page. The task drawer saves each field as it changes; it is a set of single-value
preferences, not a multi-field submission form.
Starting an impact story from a project (`/impact-stories/from-project/:projectId`) creates a draft
and opens it in the story editor, so it has no form of its own.

Use the shared `FormStepNavigation` component. Let the form own validation and submission. Keep field
state across steps; preserve image uploads, AI assistance, Markdown editors, previews and permission
rules. Review/save errors must keep the user's work. Show skeletons when loading an existing record.

Every Review step draws its summary with `ReviewSummary` (`components/forms/ReviewSummary.tsx`): one
connected summary with an `Edit <section>` control per step (held while saving or uploading) and a
responsive grid of labelled values, with "Not set" for anything left empty (a CMS field with a
default shows the default it will be saved as). CMS resources reach it through `ResourceReview`; the
project, task, form and story editors use it directly and put their own panels (readiness checks,
status cards) below it. Keep short values together; reserve full rows for
descriptions, rich text, and long content. Summary widths follow the content rather than the input's
editor width. Images, uploaded file links, custom previews, and all configured fields remain
available for review.

Event scheduling uses [MUI X DateTimePicker](https://mui.com/x/react-date-pickers/date-time-picker/)
with the Day.js adapter, British date formatting and 12-hour time (`DD MMM YYYY, hh:mm A`). Mouse
devices get a calendar/time popover and touch devices get a MUI dialog. Dates display in the browser
timezone and serialize to UTC. Form opening and closing times use the same 12-hour picker.
Calendar dates without a time (project and task dates, milestones) use `DateField` and are stored at
12:00 UTC of the chosen day, so every staff time zone reads the same day.
End times must follow the start; registration can close at or before the start. Empty optional dates
are distinct from invalid dates, and clearing existing values sends the API's explicit null update.
`DateField`, `InstantField` and the CMS forms' `IsoDateTimeField` never pass a half-typed or
impossible date on (deleting only the year keeps the saved date); they report it through
`onProblemChange`, and the step or dialog holding them refuses Continue, Enter and Save while it is set.

## Verification

- New and deep-linked existing forms load with the correct defaults and permissions.
- Back/Continue and permitted step navigation retain values; no intermediate step submits a save.
- Current-step errors and hidden-field final errors take the user to an actionable field.
- Pending uploads block step changes/save; failed saves preserve the full form for retry.
- Optional removal and unchanged timestamp round trips preserve the API contract.
- Keyboard controls and narrow layouts remain usable; check the desktop and touch date pickers.
- Tabbing to a control near the bottom of a step, or typing at the end of a long text box, keeps it
  above the sticky action bar.

Submission edits use `/submissions/records/:id/edit`: type-specific Contact, Partnership,
Volunteering or Application steps followed by Status & review. The read route is
`/submissions/records/:id`. Consent evidence stays read-only. Optional monthly hours can be cleared;
Back retains answers, intermediate Enter validates/advances, and only the final review saves.
