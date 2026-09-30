import type { PageGuide } from '../components/PageHelp';

export const pageGuides: Record<string, PageGuide> = {
  Dashboard: {
    title: 'Admin dashboard',
    steps: [
      'Review the summary cards for submissions, subscribers, and donations.',
      'Use the quick-action chips to jump to common tasks.',
      'Expand the sidebar groups to manage content and operations.',
    ],
  },
  Submissions: {
    title: 'Managing submissions',
    steps: [
      'New contact, partner, and volunteer submissions appear in the list.',
      'Click the status chip to mark a submission as in-progress or resolved.',
      'Use the search box to filter by sender or message content.',
    ],
  },
  Subscribers: {
    title: 'Newsletter subscribers',
    steps: [
      'View everyone who has signed up for updates.',
      'Reactivate unsubscribed users directly from this list if needed.',
      'Export the list for use in your email platform.',
    ],
  },
  Donations: {
    title: 'Donation records',
    steps: [
      'Track every initiated, succeeded, or failed donation.',
      'Check the gateway provider and donor email for reconciliation.',
      'The total raised card shows confirmed successful donations only.',
    ],
  },
  Users: {
    title: 'Managing console users',
    steps: [
      'Only administrators can invite or remove team members.',
      'Use the role column to promote or demote users.',
      'The last active administrator cannot be removed.',
    ],
  },
  PrivacyRequests: {
    title: 'Data subject requests',
    steps: [
      'Review requests from individuals exercising their Ghana DPA rights.',
      "Mark a request as Verified once you've confirmed the requester's identity.",
      'Mark Delete requests as Fulfilled to automatically erase matching personal data.',
    ],
  },

  // Work modules. Keyed in kebab case after the route rather than the
  // component, because the component files are replaced as each module lands.
  projects: {
    title: 'Projects',
    steps: [
      'All lists every project that is not archived. My projects shows the ones you lead or belong to.',
      'Search by title, or filter by status, priority or programme, to narrow the list.',
      'Archived projects move to their own tab. Their tasks and stories keep their link to them.',
      'Choose New project to set one up. You can save it as a draft and finish it later.',
    ],
  },
  'project-detail': {
    title: 'Working on a project',
    steps: [
      'Use the tabs to move between the overview, tasks, milestones, media, impact, documents and activity.',
      'Progress counts finished tasks and milestones against all of them. A figure set by hand says so, with the reason.',
      'Mark a photo Cleared for public use only when the people in it have agreed to it. Only photos cleared for public use can go into an impact story.',
      'Create impact story on the Impact tab starts a story from this project. It is a copy: later changes here do not alter it.',
      'Activity records who changed what, and when.',
    ],
  },
  'project-editor': {
    title: 'Setting up a project',
    steps: [
      'Work through the steps in order. Press Enter or Continue to check a step and move on.',
      'Choose the lead and members from the people directory. Only active colleagues are listed.',
      'Start and end dates are calendar days, so they read the same wherever a colleague is.',
      'Nothing is saved until you choose Create or Update on the Review step.',
    ],
  },
  'my-tasks': {
    title: 'My tasks',
    steps: [
      'Tasks assigned to you, grouped into Overdue, Due today, Upcoming and No due date.',
      '"Due today" follows the calendar on this device, not the server.',
      'Finished tasks leave this list unless you turn on Show completed. The Tasks badge in the sidebar counts what is overdue or due today.',
      'Open a task to comment, tick its checklist or change its status.',
    ],
  },
  'all-tasks': {
    title: 'All tasks',
    steps: [
      'Every task the team is working on. Finished and archived tasks are hidden unless you ask for them.',
      'Search by title or by key, such as IAA-42.',
      'Filter by status, priority, assignee, project or due date. Unassigned finds work nobody has picked up.',
      'Open a task to see its details without leaving the list.',
    ],
  },
  'task-board': {
    title: 'Task board',
    steps: [
      'Each column is a status. Drag a card to another column or up and down within one.',
      'On a keyboard, or where dragging is awkward, use the Move menu (…) on each card instead.',
      'A move is saved at once. If the save fails, the card goes back and the board says so.',
      'Each column shows its first 100 cards; use the filters to find the rest.',
    ],
  },
  'task-editor': {
    title: 'Creating a task',
    steps: [
      'Give the task a title that says what done looks like.',
      'Assign up to ten people, and link it to a project and one of its milestones if it belongs to one.',
      'Start and due dates are calendar days. A task without a due date appears under No due date.',
      'Nothing is saved until you choose Create or Update on the Review step.',
    ],
  },
  forms: {
    title: 'Forms',
    steps: [
      'Each form is a public page people fill in to apply. Drafts have no public page yet.',
      'Choose New form to start from a blank form or from the speaker application template.',
      'The count on each form is how many applications it has received.',
      'A form that has received applications cannot be deleted. Close or archive it instead.',
    ],
  },
  'form-editor': {
    title: 'Building a form',
    steps: [
      'Group questions into steps; the applicant sees one step at a time.',
      'A condition can show or hide a question or a step based on an earlier answer.',
      "Mark which questions hold the applicant's name, email and phone, so the application list can show them.",
      'Changes to a published form reach applicants at once. Applications already sent keep the version they answered.',
    ],
  },
  'form-detail': {
    title: 'Publishing a form',
    steps: [
      'Preview opens the real public page for two hours. Nothing entered there is saved.',
      'Publishing checks the form first and lists anything that would confuse an applicant.',
      'Only administrators can publish or close a form, because it collects personal data.',
      'Closing keeps the page up but refuses new applications. Copy the share link to send the form out.',
    ],
  },
  applications: {
    title: 'Applications',
    steps: [
      'Every submitted application, one tab per status. Unfinished drafts never appear here.',
      'Filter by form, or search by name, email or reference such as APP-4K7Q2M.',
      'Export downloads every application to one form as a spreadsheet.',
      'Applicants are not emailed when their status changes. Contact them yourself.',
    ],
  },
  'application-detail': {
    title: 'Reviewing an application',
    steps: [
      'Answers appear in the order the applicant saw them, labelled as they were asked.',
      'Uploaded files are private. Their links are made each time you open the application, and anyone with a link can open the file, so do not forward them.',
      'Add a review with a recommendation, a score and notes. Reviews are internal and never shown to the applicant.',
      'Change the status with a note explaining why. The history keeps every change and who made it.',
    ],
  },
  'review-queue': {
    title: 'Review queue',
    steps: [
      'Applications that still need a decision.',
      'Open one, read the answers, and add your review.',
      'Move it on with a status change when the decision is made.',
    ],
  },
  'site-images': {
    title: 'Site images',
    steps: [
      'Every banner and picture the site shows in a fixed place is listed here, page by page. Default means the site still shows the picture it shipped with.',
      'Replace uploads a picture or reuses one from the media library. The preview shows it in the shape the site crops it to, and the card gives the best size.',
      'Edit alt text changes what a screen reader hears. Banners behind text are decorative and need none.',
      'Reset to default brings the original back. Your upload stays in the media library.',
      'Shared upload means a banner still shows the Default page banner until it has its own. A published Page Settings hero image is shown instead of that page’s banner.',
    ],
  },
  'impact-stories': {
    title: 'Impact stories',
    steps: [
      'Drafts holds stories being written or waiting for review. Published holds what is on the website.',
      "Choose New story to write one from scratch, or start one from a project's Impact tab.",
      'Only administrators can publish, unpublish or archive a story.',
      'These are the long stories on the Impact pages. Short quotes for the home page are under Testimonials.',
    ],
  },
  'impact-story-editor': {
    title: 'Writing an impact story',
    steps: [
      'Build the story from blocks: text, photos, numbers, quotes and more. Drag them or use the move buttons to reorder.',
      'Videos must be YouTube or Vimeo links. Buttons and partner links must start with https:// or /.',
      'Preview opens the story as the public will see it, before it is published.',
      'Send it for review when it is ready. An administrator checks it and publishes it.',
    ],
  },
};

export const resourceGuide = (label: string, singular: string): PageGuide => ({
  title: `Managing ${label.toLowerCase()}`,
  steps: [
    `Create, edit, and delete ${label.toLowerCase()} from this page.`,
    `Click a row to view the full ${singular.toLowerCase()} details.`,
    `Changes are saved immediately and reflected on the public website.`,
  ],
});
