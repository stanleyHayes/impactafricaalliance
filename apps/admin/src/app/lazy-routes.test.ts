import { describe, expect, it } from 'vitest';

import appSource from './App.tsx?raw';

/*
 * The work modules load on first visit, which keeps the console's first
 * download near its size before they existed. One static import of a work
 * page in App.tsx would quietly put that page, and everything it uses (the
 * board's drag and drop library among them), back into the entry chunk.
 */
const WORK_FOLDERS = ['projects', 'tasks', 'forms', 'applications', 'impact-stories'];

describe('work module routes', () => {
  it.each(WORK_FOLDERS)('imports the %s pages lazily', (folder) => {
    const staticImport = new RegExp(`^import [^;]+ from '\\.\\./pages/${folder}/`, 'm');
    expect(appSource).not.toMatch(staticImport);
    expect(appSource).toMatch(new RegExp(`lazy\\(\\(\\) => import\\('\\.\\./pages/${folder}/`));
  });
});
