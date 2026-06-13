import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, domAnimation } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './app/App';
import { queryClient } from './lib/query-client';
import { theme } from './theme/theme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domAnimation} strict>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LazyMotion>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
