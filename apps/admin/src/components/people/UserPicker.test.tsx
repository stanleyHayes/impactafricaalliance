import type { Paginated, PersonSummary } from '@iaa/shared';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../lib/api-client';
import { theme } from '../../theme/theme';

import { UserPicker } from './UserPicker';

vi.mock('../../lib/api-client', () => ({ api: { get: vi.fn() } }));

const ama: PersonSummary = {
  id: 'a'.repeat(24),
  name: 'Ama Mensah',
  email: 'ama@example.org',
  role: 'editor',
};
const kofi: PersonSummary = {
  id: 'b'.repeat(24),
  name: 'Kofi Boateng',
  email: 'kofi@example.org',
  role: 'admin',
};
const esi: PersonSummary = {
  id: 'c'.repeat(24),
  name: 'Esi Owusu',
  email: 'esi@example.org',
  role: 'editor',
};
const directory = [ama, kofi, esi];

const page = (items: PersonSummary[]): Paginated<PersonSummary> => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: 1,
});

// Answers like the directory: `ids` looks people up, `q` searches names and emails.
const answerLikeTheDirectory = (path: string): Promise<Paginated<PersonSummary>> => {
  const params = new URL(path, 'http://localhost').searchParams;
  const ids = params.get('ids');
  if (ids) {
    const wanted = ids.split(',');
    return Promise.resolve(page(directory.filter((person) => wanted.includes(person.id))));
  }
  const q = (params.get('q') ?? '').toLowerCase();
  return Promise.resolve(
    page(directory.filter((person) => `${person.name} ${person.email}`.toLowerCase().includes(q))),
  );
};

const onChange = vi.fn();
const clients: QueryClient[] = [];

beforeEach(() => {
  vi.mocked(api.get).mockImplementation((path: string) => answerLikeTheDirectory(path) as never);
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.clearAllMocks();
});

const withProviders = (ui: JSX.Element): JSX.Element => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

const Assignees = ({ initial, max }: { initial: string[]; max?: number }): JSX.Element => {
  const [value, setValue] = useState(initial);
  return (
    <UserPicker
      multiple
      label="Assignees"
      value={value}
      max={max}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
};

const openAndSearch = (text: string): HTMLElement => {
  const input = screen.getByRole('combobox', { name: 'Assignees' });
  // A real click focuses the field as well as opening it; jsdom needs telling.
  fireEvent.focus(input);
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: text } });
  return input;
};

describe('UserPicker', () => {
  it('shows the names of people already chosen, not their ids', async () => {
    render(withProviders(<Assignees initial={[ama.id, kofi.id]} />));
    expect(await screen.findByText('Ama Mensah')).toBeInTheDocument();
    expect(screen.getByText('Kofi Boateng')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/people?ids='));
  });

  it('searches the directory as you type and adds the person you pick', async () => {
    render(withProviders(<Assignees initial={[ama.id]} />));
    await screen.findByText('Ama Mensah');

    openAndSearch('esi');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringContaining('q=esi')));
    await waitFor(() =>
      expect(screen.queryByRole('option', { name: /Kofi Boateng/ })).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('option', { name: /Esi Owusu/ }));

    expect(onChange).toHaveBeenLastCalledWith([ama.id, esi.id]);
    expect(await screen.findByText('Esi Owusu')).toBeInTheDocument();
  });

  it('removes a person when their chip is deleted', async () => {
    render(withProviders(<Assignees initial={[ama.id, kofi.id]} />));
    const chip = (await screen.findByText('Kofi Boateng')).closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(chip).getByTestId('CancelIcon'));
    expect(onChange).toHaveBeenLastCalledWith([ama.id]);
  });

  it('stops offering people once the limit is reached', async () => {
    render(withProviders(<Assignees initial={[ama.id]} max={1} />));
    await screen.findByText('Ama Mensah');
    expect(screen.getByText('That is the most people this can hold (1).')).toBeInTheDocument();

    openAndSearch('');
    const option = await screen.findByRole('option', { name: /Kofi Boateng/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps someone who has left, marked as a former colleague', async () => {
    const gone = 'd'.repeat(24);
    render(withProviders(<Assignees initial={[gone]} />));
    expect(await screen.findByText('Former colleague')).toBeInTheDocument();
  });

  it('picks and clears a single person', async () => {
    const Lead = (): JSX.Element => {
      const [value, setValue] = useState<string | null>(null);
      return (
        <UserPicker
          label="Lead"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    };
    render(withProviders(<Lead />));
    const input = screen.getByRole('combobox', { name: 'Lead' });
    fireEvent.mouseDown(input);
    fireEvent.click(await screen.findByRole('option', { name: /Kofi Boateng/ }));
    expect(onChange).toHaveBeenLastCalledWith(kofi.id);

    const chip = (await screen.findByText('Kofi Boateng')).closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(chip).getByTestId('CancelIcon'));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null));
  });
});
