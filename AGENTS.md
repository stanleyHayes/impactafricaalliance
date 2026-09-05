# Interface rules

## Admin forms

- A form with more than five logical input fields must use a dedicated, routable create/edit
  page with named steps. Do not put a long form in a dialog or expand a small dialog past this limit.
- Count text inputs, selectors, dates, switches, uploads, and compound question builders as fields.
  Complex permission matrices also require a dedicated stepwise page. Search/filter toolbars and
  individual preferences that save immediately are not multi-field submission forms.
- Group related fields into focused steps, normally no more than five fields per step. Show progress,
  Back and Continue controls, and a clear final Save/Create/Update action. Keep values when navigating
  between steps. Enter on an intermediate step must advance with validation, never submit early.
- Validate the current step before continuing and the whole form before final submission. Return to
  the relevant step for errors. Prevent advancing or saving while an upload or save is in progress.
- Preserve direct edit links, existing values, permissions, image handling, previews, and API contracts.
  Load existing records with skeletons and actionable errors. Creation and editing use the same flow.
- Use themed MUI X date/time pickers for event schedules, including registration deadlines. Preserve
  local display/UTC storage and explicit clearing of optional values; never treat an invalid date as
  an intentional removal.
- Use `apps/admin/src/components/forms/FormStepNavigation.tsx` for progress navigation. Generic CMS
  resources select dedicated pages automatically through `apps/admin/src/resources/form-steps.ts`.

See [form design guidance](docs/design/forms.md) for the routes and verification checklist.
