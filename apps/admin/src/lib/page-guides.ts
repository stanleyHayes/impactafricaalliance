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
};

export const resourceGuide = (label: string, singular: string): PageGuide => ({
  title: `Managing ${label.toLowerCase()}`,
  steps: [
    `Create, edit, and delete ${label.toLowerCase()} from this page.`,
    `Click a row to view the full ${singular.toLowerCase()} details.`,
    `Changes are saved immediately and reflected on the public website.`,
  ],
});
