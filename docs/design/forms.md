# Admin form design

Forms with more than five logical inputs belong on a dedicated page with named steps. This is a
standing interface rule, requested on 5 September 2026. Short forms can remain compact dialogs.

## Current flows

| Form | Routes | Steps |
| --- | --- | --- |
| Events | `/events/new`, `/events/:eventId/edit` | Details, Schedule, Registration, Review |
| CMS resources with more than five fields | `/content/:resource/new`, `/content/:resource/:id/edit` | Resource-specific groups followed by Review |
| Site settings | `/site-settings` | Organisation, contact, location, visibility and communication groups |
| Invitations and permissions | `/users/invite`, `/users/:userId/permissions` | Identity, Permissions, Review |

The CMS threshold is calculated from field definitions, so adding a sixth field automatically moves
that resource into the dedicated editor. Explicit step groups retain every field, with a five-field
fallback for future additions. Partners, pillar images and direct user creation remain short dialogs.

Use the shared `FormStepNavigation` component. Let the form own validation and submission. Keep field
state across steps; preserve image uploads, AI assistance, Markdown editors, previews and permission
rules. Review/save errors must keep the user's work. Show skeletons when loading an existing record.

Event scheduling uses [MUI X DateTimePicker](https://mui.com/x/react-date-pickers/date-time-picker/)
with the Day.js adapter, British date formatting and 24-hour time. Mouse devices get a calendar/time
popover and touch devices get a MUI dialog. Dates display in the browser timezone and serialize to UTC.
End times must follow the start; registration can close at or before the start. Empty optional dates
are distinct from invalid dates, and clearing existing values sends the API's explicit null update.

## Verification

- New and deep-linked existing forms load with the correct defaults and permissions.
- Back/Continue and permitted step navigation retain values; no intermediate step submits a save.
- Current-step errors and hidden-field final errors take the user to an actionable field.
- Pending uploads block step changes/save; failed saves preserve the full form for retry.
- Optional removal and unchanged timestamp round trips preserve the API contract.
- Keyboard controls and narrow layouts remain usable; check the desktop and touch date pickers.
