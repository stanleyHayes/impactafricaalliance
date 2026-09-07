import {
  DESTINATION_CAPABILITIES,
  destinationRejection,
  type SocialDestination,
  type SocialPublicationInput,
  type DestinationCapabilities,
} from '@iaa/shared';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { useSocialAccounts, type SocialAccount } from '../../lib/admin-hooks';
import {
  usePreviewSocialPost,
  usePublishSocial,
  type DestinationPreview,
} from '../../lib/social-publishing';
import { DialogFooter, DialogHeader, dialogPaperSx } from '../dialogs/DialogShell';

export interface SocialPublishSource {
  title: string;
  excerpt?: string;
  url?: string;
  tags?: string[];
  imageUrl?: string;
}

interface SocialPublishDialogProps {
  open: boolean;
  source: SocialPublishSource;
  articleId?: string;
  onClose: () => void;
}

/** Which connection carries a destination, so the checkbox knows if it can be offered. */
const connectionFor = (
  accounts: SocialAccount[],
  destination: SocialDestination,
): SocialAccount | undefined =>
  accounts.find((account) =>
    account.destinations.some((capability) => capability.destination === destination),
  );

const localToIso = (value: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

type Captions = Partial<Record<SocialDestination, string>>;

/** Why the chosen destinations cannot accept what is drafted, if anything. */
const blockersFor = (
  selected: SocialDestination[],
  captions: Captions,
  imageUrl?: string,
): Array<{ destination: SocialDestination; reason: string }> =>
  selected
    .map((destination) => ({
      destination,
      // Before the preview runs there is no caption to judge, and an empty one
      // would report a problem the editor has not had a chance to cause.
      reason: destinationRejection(destination, {
        caption: captions[destination] ?? 'placeholder',
        ...(imageUrl ? { imageUrl } : {}),
      }),
    }))
    .filter((entry): entry is { destination: SocialDestination; reason: string } =>
      Boolean(entry.reason),
    );

/** Pair each chosen destination with the connection that will carry it. */
const buildDestinations = ({
  selected,
  accounts,
  captions,
  source,
  previews,
}: {
  selected: SocialDestination[];
  accounts: SocialAccount[];
  captions: Captions;
  source: SocialPublishSource;
  previews: DestinationPreview[];
}): SocialPublicationInput[] =>
  selected.flatMap((destination) => {
    const account = connectionFor(accounts, destination);
    const caption = captions[destination];
    if (!account || !caption) {
      return [];
    }
    // The preview already worked out this destination's tagged link and its
    // own crop; publishing with the untagged original would throw both away.
    const drafted = previews.find((item) => item.destination === destination);
    const imageUrl = drafted?.imageUrl ?? source.imageUrl;
    const canonicalUrl = drafted?.linkUrl ?? source.url;
    return [
      {
        destination,
        connectionId: account.id,
        caption,
        ...(imageUrl ? { imageUrl } : {}),
        ...(canonicalUrl ? { canonicalUrl } : {}),
      },
    ];
  });

/** One destination and the connection behind it, or an invitation to connect one. */
const DestinationRow = ({
  capability,
  account,
  checked,
  locked,
  onToggle,
}: {
  capability: DestinationCapabilities;
  account: SocialAccount | undefined;
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}): JSX.Element => {
  const reconnect = account?.needsReconnect ?? false;
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 2 }}
    >
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            // A destination with no working connection is not a choice to
            // offer — it is an account to connect first.
            disabled={!account || reconnect || locked}
            onChange={onToggle}
          />
        }
        label={
          <Stack>
            <Typography sx={{ fontWeight: 650 }}>{capability.label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {account?.accountName ?? account?.accountHandle ?? 'Not connected'}
            </Typography>
          </Stack>
        }
      />
      {!account && <Chip size="small" label="Connect" color="default" />}
      {reconnect && <Chip size="small" color="warning" label="Reconnect" />}
    </Stack>
  );
};

/** Where this is going, and whether the assistant should draft it. */
const ChooseStep = ({
  accounts,
  selected,
  locked,
  onToggle,
  useAi,
  onUseAi,
}: {
  accounts: SocialAccount[];
  selected: SocialDestination[];
  locked: boolean;
  onToggle: (destination: SocialDestination) => void;
  useAi: boolean;
  onUseAi: (value: boolean) => void;
}): JSX.Element => (
  <>
    <Typography variant="overline" color="text.secondary">
      Distribute to
    </Typography>

    <Stack spacing={1}>
      {Object.values(DESTINATION_CAPABILITIES).map((capability) => (
        <DestinationRow
          key={capability.destination}
          capability={capability}
          account={connectionFor(accounts, capability.destination)}
          checked={selected.includes(capability.destination)}
          locked={locked}
          onToggle={() => onToggle(capability.destination)}
        />
      ))}
    </Stack>

    {!locked && (
      <FormControlLabel
        control={<Checkbox checked={useAi} onChange={(_event, value) => onUseAi(value)} />}
        label={
          <Stack>
            <Typography variant="body2">Let the writing assistant draft these</Typography>
            <Typography variant="caption" color="text.secondary">
              You can edit whatever it produces. If the assistant is unavailable the standard
              templates are used instead.
            </Typography>
          </Stack>
        }
      />
    )}
  </>
);

/**
 * The editable copy for each chosen destination, and when it should go.
 *
 * Each field carries its own network's limit, because 280 characters and 3,000
 * are not the same writing job and an editor should see which one they are in.
 */
const ReviewStep = ({
  selected,
  captions,
  onCaption,
  when,
  onWhen,
  scheduledFor,
  onScheduledFor,
  timezone,
}: {
  selected: SocialDestination[];
  captions: Captions;
  onCaption: (destination: SocialDestination, caption: string) => void;
  when: 'now' | 'schedule';
  onWhen: (value: 'now' | 'schedule') => void;
  scheduledFor: string;
  onScheduledFor: (value: string) => void;
  timezone: string;
}): JSX.Element => (
  <Stack spacing={2}>
    <Typography variant="overline" color="text.secondary">
      Review each post
    </Typography>
    {selected.map((destination) => {
      const capability = DESTINATION_CAPABILITIES[destination];
      const caption = captions[destination] ?? '';
      const note = capability.clickableLink ? '' : ' · links are not clickable here';
      return (
        <TextField
          key={destination}
          label={capability.label}
          value={caption}
          multiline
          minRows={3}
          onChange={(event) => onCaption(destination, event.target.value)}
          helperText={`${caption.length} / ${capability.maxLength}${note}`}
          error={caption.length > capability.maxLength}
        />
      );
    })}

    <RadioGroup value={when} onChange={(event) => onWhen(event.target.value as 'now')}>
      <FormControlLabel value="now" control={<Radio />} label="Publish now" />
      <FormControlLabel value="schedule" control={<Radio />} label="Schedule" />
    </RadioGroup>
    {when === 'schedule' && (
      <TextField
        type="datetime-local"
        label="When"
        value={scheduledFor}
        onChange={(event) => onScheduledFor(event.target.value)}
        // Stored in UTC; shown in the timezone the administrator is working in.
        helperText={`Times are in ${timezone}.`}
        slotProps={{ inputLabel: { shrink: true } }}
      />
    )}
  </Stack>
);

/**
 * Choose destinations, review the copy each one will get, then publish or
 * schedule.
 *
 * The preview step is the point of the whole dialog: posting identical text to
 * five networks is what makes an organisation's feed look automated, and the
 * only way to avoid it is to show an editor what each one will actually say
 * while they can still change it.
 */
export const SocialPublishDialog = ({
  open,
  source,
  articleId,
  onClose,
}: SocialPublishDialogProps): JSX.Element | null => {
  const { data: accounts } = useSocialAccounts();
  const preview = usePreviewSocialPost();
  const publish = usePublishSocial();

  const [selected, setSelected] = useState<SocialDestination[]>([]);
  const [captions, setCaptions] = useState<Captions>({});
  const [previews, setPreviews] = useState<DestinationPreview[]>([]);
  const [useAi, setUseAi] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [when, setWhen] = useState<'now' | 'schedule'>('now');
  const [scheduledFor, setScheduledFor] = useState('');

  const connected = accounts ?? [];
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const busy = preview.isPending || publish.isPending;

  const toggle = (destination: SocialDestination): void =>
    setSelected((current) =>
      current.includes(destination)
        ? current.filter((item) => item !== destination)
        : [...current, destination],
    );

  const startReview = async (): Promise<void> => {
    const result = await preview.mutateAsync({
      destinations: selected,
      useAi,
      source: {
        title: source.title,
        ...(source.excerpt ? { excerpt: source.excerpt } : {}),
        ...(source.url ? { url: source.url } : {}),
        ...(source.tags ? { tags: source.tags } : {}),
      },
      ...(source.imageUrl ? { imageUrl: source.imageUrl } : {}),
    });
    setPreviews(result.previews);
    setCaptions(
      Object.fromEntries(result.previews.map((item) => [item.destination, item.caption])),
    );
    setReviewing(true);
  };

  const send = async (): Promise<void> => {
    const destinations = buildDestinations({
      selected,
      accounts: connected,
      captions,
      source,
      previews,
    });
    await publish.mutateAsync({
      destinations,
      ...(when === 'schedule' && scheduledFor
        ? { scheduledFor: localToIso(scheduledFor) as string, timezone }
        : {}),
      ...(articleId ? { articleId } : {}),
    });
    onClose();
  };

  if (!open) {
    return null;
  }

  const blockers = blockersFor(selected, captions, source.imageUrl);

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <DialogHeader
        title="Publish to social media"
        description="Choose where this goes, then review what each network will say."
        onClose={onClose}
      />
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <ChooseStep
            accounts={connected}
            selected={selected}
            locked={reviewing}
            onToggle={toggle}
            useAi={useAi}
            onUseAi={setUseAi}
          />

          {blockers.length > 0 && (
            <Alert severity="warning">
              {blockers.map((entry) => (
                <div key={entry.destination}>{entry.reason}</div>
              ))}
            </Alert>
          )}

          {reviewing && (
            <ReviewStep
              selected={selected}
              captions={captions}
              onCaption={(destination, caption) =>
                setCaptions((current) => ({ ...current, [destination]: caption }))
              }
              when={when}
              onWhen={setWhen}
              scheduledFor={scheduledFor}
              onScheduledFor={setScheduledFor}
              timezone={timezone}
            />
          )}

          {publish.isError && <Alert severity="error">{publish.error.message}</Alert>}
          {preview.isError && <Alert severity="error">{preview.error.message}</Alert>}
        </Stack>
      </DialogContent>
      <DialogFooter>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        {reviewing ? (
          <Button
            variant="contained"
            startIcon={<SendRoundedIcon />}
            disabled={busy || blockers.length > 0 || (when === 'schedule' && !scheduledFor)}
            onClick={() => void send()}
          >
            {when === 'schedule' ? 'Schedule' : 'Publish everywhere'}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={busy || selected.length === 0}
            onClick={() => void startReview()}
          >
            Preview social posts
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
};

export default SocialPublishDialog;
