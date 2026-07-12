import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** Catches render errors and prevents the entire admin shell from crashing. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
     
    console.error('Admin ErrorBoundary caught an error:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The admin console encountered an unexpected error. Try reloading the page.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Button variant="outlined" onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
          </Box>
          {import.meta.env.DEV && this.state.error && (
            <Box
              component="pre"
              sx={{
                mt: 4,
                p: 2,
                textAlign: 'left',
                bgcolor: 'background.paper',
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.75rem',
              }}
            >
              {this.state.error.stack}
            </Box>
          )}
        </Container>
      );
    }

    return this.props.children;
  }
}
