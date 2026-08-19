import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import XIcon from '@mui/icons-material/X';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader';
import {
  useDisconnectSocial,
  usePublishSocialPost,
  useSocialAccounts,
  type SocialAccount,
  type SocialPostResult,
} from '../lib/admin-hooks';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

type Platform = 'linkedin' | 'meta' | 'x';

interface PlatformConfig {
  platform: Platform;
  label: string;
  description: string;
  icon: JSX.Element;
}

const PLATFORMS: PlatformConfig[] = [
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    description: 'Publish articles to your LinkedIn profile.',
    icon: <LinkedInIcon />,
  },
  {
    platform: 'meta',
    label: 'Facebook & Instagram',
    description: 'Publish articles to your Facebook Page and linked Instagram account.',
    icon: <FacebookIcon />,
  },
  {
    platform: 'x',
    label: 'X',
    description: 'Publish articles as posts on X (formerly Twitter).',
    icon: <XIcon />,
  },
];

const formatDate = (value?: string): string => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type PostPlatform = 'linkedin' | 'facebook' | 'instagram' | 'x';

interface PostPlatformConfig {
  platform: PostPlatform;
  label: string;
  /** Connected account that enables this post target. */
  account: Platform;
}

const POST_PLATFORMS: PostPlatformConfig[] = [
  { platform: 'linkedin', label: 'LinkedIn', account: 'linkedin' },
  { platform: 'facebook', label: 'Facebook', account: 'meta' },
  { platform: 'instagram', label: 'Instagram', account: 'meta' },
  { platform: 'x', label: 'X', account: 'x' },
];

const POST_PLATFORM_LABELS: Record<PostPlatform, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
};

interface PlatformCardProps {
  config: PlatformConfig;
  account?: SocialAccount;
  isLoading: boolean;
  isDisconnecting: boolean;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
}

const PlatformCard = ({
  config,
  account,
  isLoading,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: PlatformCardProps): JSX.Element => {
  const renderStatus = (): JSX.Element => {
    if (isLoading) {
      return <Skeleton variant="rectangular" height={32} />;
    }
    if (account) {
      return (
        <Stack spacing={0.75}>
          <Chip label="Connected" color="success" size="small" sx={{ alignSelf: 'flex-start' }} />
          {account.accountName && (
            <Typography variant="body2">
              <strong>Account:</strong> {account.accountName}
            </Typography>
          )}
          {account.accountHandle && (
            <Typography variant="body2" color="text.secondary">
              @{account.accountHandle}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Token expires: {formatDate(account.tokenExpiry)}
          </Typography>
        </Stack>
      );
    }
    return <Chip label="Not connected" size="small" variant="outlined" />;
  };

  return (
    <Grid size={{ xs: 12, md: 4 }}>
      <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
            <Box sx={{ color: 'primary.main', display: 'flex' }}>{config.icon}</Box>
            <Typography variant="h6">{config.label}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {config.description}
          </Typography>
          {renderStatus()}
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          {account ? (
            <Button
              size="small"
              color="error"
              onClick={() => onDisconnect(config.platform)}
              disabled={isDisconnecting}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={() => onConnect(config.platform)}
              disabled={!API_BASE}
            >
              Connect
            </Button>
          )}
        </CardActions>
      </Card>
    </Grid>
  );
};

interface ComposerCardProps {
  accountMap: Map<Platform, SocialAccount>;
  isLoading: boolean;
  onHardFailure: (message: string) => void;
}

const renderResultDetail = (result: SocialPostResult): JSX.Element | string => {
  if (result.error) return result.error;
  if (result.postUrl) {
    return (
      <Link href={result.postUrl} target="_blank" rel="noopener noreferrer">
        View post
      </Link>
    );
  }
  return 'Published';
};

const ComposerCard = ({
  accountMap,
  isLoading,
  onHardFailure,
}: ComposerCardProps): JSX.Element => {
  const publish = usePublishSocialPost();
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selected, setSelected] = useState<Set<PostPlatform>>(new Set());
  const [results, setResults] = useState<SocialPostResult[] | null>(null);

  const isTargetConnected = (target: PostPlatformConfig): boolean =>
    accountMap.has(target.account);

  // Default-check platforms whose account is connected.
  useEffect(() => {
    setSelected(
      new Set(
        POST_PLATFORMS.filter((target) => accountMap.has(target.account)).map((t) => t.platform),
      ),
    );
  }, [accountMap]);

  const togglePlatform = (platform: PostPlatform): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
  };

  const canPublish =
    !publish.isPending && !isLoading && message.trim().length > 0 && selected.size > 0;

  const handlePublish = (): void => {
    publish.mutate(
      {
        message: message.trim(),
        linkUrl: linkUrl.trim(),
        imageUrl: imageUrl.trim(),
        platforms: [...selected],
      },
      {
        onSuccess: (data) => {
          setResults(data.results);
          if (data.results.every((r) => !r.error)) {
            setMessage('');
            setLinkUrl('');
            setImageUrl('');
          }
        },
        onError: (err) => onHardFailure(err.message),
      },
    );
  };

  return (
    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          New post
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Message"
            required
            multiline
            minRows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 3000 } }}
            helperText={`${message.length}/3000 — X truncates posts at 280 characters`}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Link URL"
              fullWidth
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              helperText="Optional link to attach to the post"
            />
            <TextField
              label="Image URL"
              fullWidth
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              helperText="Required for Instagram"
            />
          </Stack>
          <FormGroup row>
            {POST_PLATFORMS.map((target) => {
              const connected = isTargetConnected(target);
              return (
                <FormControlLabel
                  key={target.platform}
                  control={
                    <Checkbox
                      checked={connected && selected.has(target.platform)}
                      onChange={() => togglePlatform(target.platform)}
                      disabled={!connected || isLoading}
                    />
                  }
                  label={connected ? target.label : `${target.label} (not connected)`}
                />
              );
            })}
          </FormGroup>
          {results && (
            <Alert severity={results.every((r) => !r.error) ? 'success' : 'warning'}>
              <Stack spacing={0.5} component="ul" sx={{ m: 0, pl: 2 }}>
                {results.map((result) => (
                  <li key={result.platform}>
                    {POST_PLATFORM_LABELS[result.platform]}: {renderResultDetail(result)}
                  </li>
                ))}
              </Stack>
            </Alert>
          )}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button variant="contained" onClick={handlePublish} disabled={!canPublish}>
          {publish.isPending ? 'Publishing…' : 'Publish'}
        </Button>
      </CardActions>
    </Card>
  );
};

const SocialConnections = (): JSX.Element => {
  const { data: accounts, isLoading } = useSocialAccounts();
  const disconnect = useDisconnectSocial();
  const [searchParams, setSearchParams] = useSearchParams();
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      setSnackbar({ message: `${connected} connected successfully`, severity: 'success' });
      setSearchParams({}, { replace: true });
    } else if (error) {
      setSnackbar({ message: decodeURIComponent(error), severity: 'error' });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const accountMap = useMemo(() => {
    const map = new Map<Platform, SocialAccount>();
    accounts?.forEach((account) => map.set(account.platform, account));
    return map;
  }, [accounts]);

  const handleConnect = (platform: Platform): void => {
    if (!API_BASE) return;
    window.location.href = `${API_BASE}/admin/social/${platform}/connect`;
  };

  const handleDisconnect = (platform: Platform): void => {
    disconnect.mutate(platform, {
      onSuccess: () => setSnackbar({ message: `${platform} disconnected`, severity: 'success' }),
      onError: (err) => setSnackbar({ message: err.message, severity: 'error' }),
    });
  };

  return (
    <Box>
      <PageHeader
        title="Social connections"
        description="Connect your social accounts so articles can be published automatically."
      />

      <ComposerCard
        accountMap={accountMap}
        isLoading={isLoading}
        onHardFailure={(errorMessage) => setSnackbar({ message: errorMessage, severity: 'error' })}
      />

      <Grid container spacing={2.5}>
        {PLATFORMS.map((config) => (
          <PlatformCard
            key={config.platform}
            config={config}
            account={accountMap.get(config.platform)}
            isLoading={isLoading}
            isDisconnecting={disconnect.isPending}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </Grid>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={6000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(null)}
          severity={snackbar?.severity ?? 'success'}
          variant="filled"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocialConnections;
