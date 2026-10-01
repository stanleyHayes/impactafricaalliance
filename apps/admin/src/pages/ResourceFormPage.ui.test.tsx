import { ThemeProvider } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  configure,
  fireEvent,
  getConfig,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../lib/api-client';
import { theme } from '../theme/theme';

import ResourceFormPage from './ResourceFormPage';

// The real resources and the real fields: what an editor sees and clicks.
vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      role: 'admin',
      permissions: [
        'team:read',
        'team:update',
        'jobs:read',
        'jobs:update',
        'gallery:read',
        'gallery:update',
        'media:create',
      ],
    },
  }),
}));
vi.mock('../lib/api-client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  ApiError: class extends Error {},
}));

const member = {
  id: 'ama',
  name: 'Ama Mensah',
  role: 'Programme Lead',
  tier: 'executive',
  country: 'GH',
  bio: 'Leads the digital skills programme.',
  photo: { url: 'https://res.cloudinary.com/demo/image/upload/ama.jpg', publicId: 'ama' },
  order: 2,
  isActive: true,
};

const openEditPage = async (
  resource = 'team',
  record: Record<string, unknown> & { id: string } = member,
): Promise<QueryClient> => {
  vi.mocked(api.get).mockResolvedValue(record);
  vi.mocked(api.patch).mockResolvedValue(record);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[`/content/${resource}/${record.id}/edit`]}>
            <Routes>
              <Route path="/content/:resource/:id/edit" element={<ResourceFormPage />} />
              <Route path="/content/:resource" element={<p>List of {resource}</p>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </LocalizationProvider>
    </ThemeProvider>,
  );
  // Loaded: the first step's Continue shows once the record is in the form.
  expect(await screen.findByRole('button', { name: 'Continue' })).toBeInTheDocument();
  return client;
};

/** The heading of the step on show. */
const shownStep = (): string | null | undefined =>
  screen.getAllByRole('heading', { level: 5 })[0]?.textContent;

/** Continue (then Review) until the Save button shows. */
const continueToReview = async (): Promise<void> => {
  while (!screen.queryByRole('button', { name: 'Save' })) {
    const heading = shownStep();
    fireEvent.click(screen.getByRole('button', { name: /^(Continue|Review)$/ }));
    await waitFor(() => expect(shownStep()).not.toBe(heading));
  }
};

/** Continue (then Review) until the Save button shows, and press it. */
const saveFromHere = async (): Promise<void> => {
  await continueToReview();
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
};

const sentBody = async (path = '/admin/team/ama'): Promise<Record<string, unknown>> => {
  await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
  const [sentTo, body] = vi.mocked(api.patch).mock.calls[0] as [string, unknown];
  expect(sentTo).toBe(path);
  // What goes over the wire.
  return JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
};

// Each step waits on the form's validation, and Save on the request and a
// refetch: on a machine running the whole suite, often longer than the
// default second.
const { asyncUtilTimeout } = getConfig();
beforeAll(() => configure({ asyncUtilTimeout: 10_000 }));
afterAll(() => configure({ asyncUtilTimeout }));

beforeEach(() => {
  // Desktop mode, where the parts of a date are typed in the field.
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('editing a team member', () => {
  // Removing used to set the field to undefined, which react-hook-form reads
  // as "show the default": on an edit page, the stored photo.
  it('removes the photo from the page and sends it as null', async () => {
    const client = await openEditPage();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ama Mensah');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'About' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Photo' })).toHaveAttribute('src', member.photo.url);

    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    expect(screen.queryByRole('img', { name: 'Photo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove file' })).not.toBeInTheDocument();
    expect(screen.getByText('Click to upload or drag & drop')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About' })).toBeVisible();

    await saveFromHere();
    expect(await screen.findByText('List of team')).toBeInTheDocument();
    expect(await sentBody()).toEqual({
      name: member.name,
      role: member.role,
      tier: member.tier,
      country: member.country,
      bio: member.bio,
      photo: null,
      order: member.order,
      isActive: member.isActive,
    });
    client.clear();
  });

  it('keeps an emptied number empty instead of bringing the stored one back', async () => {
    const client = await openEditPage();
    for (const step of ['About', 'Profile links', 'Social media', 'Visibility']) {
      fireEvent.click(screen.getByRole('button', { name: /^(Continue|Review)$/ }));
      expect(await screen.findByRole('heading', { name: step })).toBeVisible();
    }
    const order = screen.getByRole('spinbutton', { name: 'Order' });
    expect(order).toHaveValue(2);
    fireEvent.change(order, { target: { value: '' } });
    expect(order).toHaveValue(null);

    // An emptied order falls back to the schema's default, like a new
    // member's, and Review says so rather than "Not set".
    await continueToReview();
    expect(screen.getByText('0 (default)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('List of team')).toBeInTheDocument();
    expect(await sentBody()).toMatchObject({ order: 0, photo: member.photo });
    client.clear();
  });
});

describe('the sticky action bar', () => {
  // The browser keeps the page's scroll padding clear when it brings a
  // control, or the line being typed, into view; a control's own scroll
  // margin is ignored for the typed line.
  it('keeps its height clear at the foot of the page while the editor is open', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly report: () => void) {}
        observe(): void {
          this.report();
        }
        disconnect(): void {}
      },
    );
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(73);
    const client = await openEditPage();
    const root = document.documentElement.style;
    await waitFor(() => expect(root.getPropertyValue('--action-bar-clearance')).toBe('81px'));
    expect(root.getPropertyValue('scroll-padding-bottom')).toBe('var(--action-bar-clearance)');

    cleanup();
    expect(root.getPropertyValue('--action-bar-clearance')).toBe('');
    expect(root.getPropertyValue('scroll-padding-bottom')).toBe('');
    height.mockRestore();
    client.clear();
  });
});

describe('editing a job’s deadline', () => {
  const INCOMPLETE = 'Finish typing the date and time, or clear the field.';
  const job = {
    id: 'manager',
    title: 'Programme Manager',
    slug: 'programme-manager',
    location: 'Accra, Ghana',
    type: 'full-time',
    description: 'Lead the delivery of our flagship programme.',
    deadline: dayjs('2026-12-01T10:00:00').toISOString(),
    status: 'published',
  };

  const openApplicationStep = async (): Promise<QueryClient> => {
    const client = await openEditPage('jobs', job);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Application' })).toBeVisible();
    return client;
  };

  // Deleting only the year used to reach the form as a removal: Continue
  // went on, Review said "Not set" and Save sent deadline: null.
  it('holds a half-typed deadline back instead of removing it', async () => {
    const client = await openApplicationStep();
    const year = screen.getByRole('spinbutton', { name: 'Year' });
    fireEvent.mouseDown(year);
    fireEvent.keyDown(year, { key: 'Delete' });
    expect(await screen.findByText(INCOMPLETE)).toBeInTheDocument();

    // Neither the button nor Enter moves on, so Review and Save stay out of reach.
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('Please complete the highlighted fields before continuing.'),
    ).toBeInTheDocument();
    expect(shownStep()).toBe('Application');
    fireEvent.submit(year.closest('form') as HTMLFormElement);
    await waitFor(() => expect(shownStep()).toBe('Application'));
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();

    // Finishing the year lets it go on, with the deadline kept.
    for (const digit of ['2', '0', '2', '7']) {
      year.textContent = digit;
      fireEvent.input(year);
    }
    await waitFor(() => expect(screen.queryByText(INCOMPLETE)).not.toBeInTheDocument());
    await saveFromHere();
    expect(await sentBody('/admin/jobs/manager')).toMatchObject({
      deadline: dayjs('2027-12-01T10:00:00').toISOString(),
    });
    client.clear();
  });

  it('still removes the deadline when it is cleared', async () => {
    const client = await openApplicationStep();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await continueToReview();
    const reviewed = screen.getAllByText('Deadline').find((label) => label.tagName === 'DT');
    expect(reviewed?.parentElement).toHaveTextContent('Not set');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await sentBody('/admin/jobs/manager')).toMatchObject({ deadline: null });
    client.clear();
  });
});

describe('removing a required picture', () => {
  it('asks for another in plain words, and does not save', async () => {
    const client = await openEditPage('gallery', {
      id: 'festival',
      title: 'Opening night',
      programme: 'Accra Impact Festival',
      image: { url: 'https://res.cloudinary.com/demo/image/upload/festival.jpg', publicId: 'f' },
      status: 'published',
      featured: false,
      order: 1,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Choose a picture.')).toBeInTheDocument();
    expect(screen.queryByText(/expected object/)).not.toBeInTheDocument();
    expect(shownStep()).toBe('Photo');
    expect(api.patch).not.toHaveBeenCalled();
    client.clear();
  });
});
