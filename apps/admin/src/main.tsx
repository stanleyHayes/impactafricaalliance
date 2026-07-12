import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './app/App';
import { AuthProvider } from './auth/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TourProvider } from './components/tour';
import { PreferencesProvider } from './lib/preferences';
import { queryClient } from './lib/query-client';
import { createAppTheme } from './theme/theme';
import { ThemeProvider, useThemeSettings } from './theme/ThemeContext';

const ThemedApp = (): JSX.Element => {
  const { preset, mode } = useThemeSettings();
  const theme = createAppTheme(preset, mode);
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <PreferencesProvider>
              <App />
            </PreferencesProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MuiThemeProvider>
  );
};

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <TourProvider>
          <ThemedApp />
        </TourProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
