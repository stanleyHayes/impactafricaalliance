import type { ProjectMetric, ProjectRisk, ProjectUpdate } from '@iaa/shared';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip, { type ChipProps } from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { DetailSection } from '../../components/detail/DetailSection';
import { ConfirmDialog } from '../../components/dialogs/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ProjectStoriesPanel } from '../../components/impact-stories/ProjectStoriesPanel';
import {
  draftFromMetric,
  draftFromRisk,
  emptyMetricDraft,
  emptyRiskDraft,
  removeMetric,
  removeRisk,
  saveMetric,
  saveRisk,
  towardsTarget,
  type MetricDraft,
  type RiskDraft,
} from '../../components/projects/impact-items';
import { MetricDialog, RiskDialog } from '../../components/projects/ProjectDialogs';
import { READ_ONLY_NOTE, useProjectPlanEditing } from '../../components/projects/useProjectOutlet';
import { RISK_LEVEL_OPTIONS, RISK_STATUS_OPTIONS } from '../../lib/select-options';
import { skinned, surfaceSx } from '../../theme/surfaces';

type Editing<T> = { id: string | null; draft: T } | null;
type Removing =
  { kind: 'metric'; item: ProjectMetric } | { kind: 'risk'; item: ProjectRisk } | null;

const NUMBER = new Intl.NumberFormat('en-GB');

const LEVEL_TONE: Record<ProjectRisk['level'], NonNullable<ChipProps['color']>> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
};

const labelOf = (options: typeof RISK_LEVEL_OPTIONS, value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

const RowActions = ({
  name,
  busy,
  onEdit,
  onRemove,
}: {
  name: string;
  busy: boolean;
  onEdit: () => void;
  onRemove: () => void;
}): JSX.Element => (
  <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
    <Tooltip title="Edit">
      <IconButton size="small" aria-label={`Edit ${name}`} onClick={onEdit} disabled={busy}>
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Remove">
      <IconButton size="small" aria-label={`Remove ${name}`} onClick={onRemove} disabled={busy}>
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Stack>
);

/**
 * A number or a risk. Classic outlines it on the section's paper; the other
 * skins give it their card, so each entry stands on its own there too.
 */
const rowSx = skinned({ border: 1, borderColor: 'divider' }, surfaceSx.card);

const Row = ({ children, actions }: { children: ReactNode; actions?: ReactNode }): JSX.Element => (
  <Stack
    component="li"
    direction="row"
    spacing={1.5}
    alignItems="flex-start"
    sx={[{ p: 1.5, borderRadius: 2.5, minWidth: 0 }, rowSx]}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    {actions}
  </Stack>
);

/** One impact number, with a bar towards its target when it has one. */
const MetricLine = ({ metric }: { metric: ProjectMetric }): JSX.Element => {
  const share = towardsTarget(metric);
  const suffix = metric.suffix ?? '';
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
        {metric.label}
      </Typography>
      <Typography sx={{ fontSize: '1.35rem', fontWeight: 750 }}>
        {NUMBER.format(metric.value)}
        {suffix}
        {typeof metric.target === 'number' && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            of {NUMBER.format(metric.target)}
            {suffix} target
          </Typography>
        )}
      </Typography>
      {share !== null && (
        <Box sx={{ mt: 1, maxWidth: 420 }}>
          <LinearProgress
            variant="determinate"
            value={share}
            aria-label={`${metric.label}: ${share}% of target`}
            sx={{ height: 6, borderRadius: 99 }}
          />
          <Typography variant="caption" color="text.secondary">
            {share}% of target
          </Typography>
        </Box>
      )}
    </>
  );
};

/**
 * The project's Impact tab: the numbers it is moving and how close they are
 * to target, the risks to it, and the impact stories written from it.
 */
const ProjectImpactTab = (): JSX.Element => {
  const { project, canUpdate, save, saving } = useProjectPlanEditing();
  const [metricEditing, setMetricEditing] = useState<Editing<MetricDraft>>(null);
  const [riskEditing, setRiskEditing] = useState<Editing<RiskDraft>>(null);
  const [removing, setRemoving] = useState<Removing>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const confirmRemove = (): void => {
    if (!removing) return;
    const body: ProjectUpdate =
      removing.kind === 'metric'
        ? { metrics: removeMetric(project.metrics, removing.item.id) }
        : { risks: removeRisk(project.risks, removing.item.id) };
    setRemoveError(null);
    save(body)
      .then(() => setRemoving(null))
      .catch((cause: unknown) =>
        setRemoveError(cause instanceof Error ? cause.message : 'It could not be removed.'),
      );
  };

  const addButton = (label: string, onClick: () => void): JSX.Element | undefined =>
    canUpdate ? (
      <Button startIcon={<AddRoundedIcon />} onClick={onClick} disabled={saving}>
        {label}
      </Button>
    ) : undefined;

  return (
    <Stack spacing={3}>
      {!canUpdate && <Alert severity="info">{READ_ONLY_NOTE}</Alert>}
      <DetailSection
        title="Impact numbers"
        icon={<InsightsOutlinedIcon />}
        description="What the project is moving, and how close it is to each target."
        // Named for what it adds: two buttons both called "Add" read the same to a screen reader.
        action={addButton('Add a number', () =>
          setMetricEditing({ id: null, draft: emptyMetricDraft() }),
        )}
      >
        {project.metrics.length === 0 ? (
          <EmptyState
            compact
            icon={<InsightsOutlinedIcon />}
            title="No impact numbers yet"
            description="Add the numbers this project moves, such as people trained or hubs opened, with a target if there is one."
          />
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
            {project.metrics.map((metric) => (
              <Row
                key={metric.id}
                actions={
                  canUpdate ? (
                    <RowActions
                      name={metric.label}
                      busy={saving}
                      onEdit={() =>
                        setMetricEditing({ id: metric.id, draft: draftFromMetric(metric) })
                      }
                      onRemove={() => setRemoving({ kind: 'metric', item: metric })}
                    />
                  ) : undefined
                }
              >
                <MetricLine metric={metric} />
              </Row>
            ))}
          </Box>
        )}
      </DetailSection>

      <DetailSection
        title="Risks"
        icon={<ReportProblemOutlinedIcon />}
        description="What could stop the project, and what is being done about it."
        action={addButton('Add a risk', () =>
          setRiskEditing({ id: null, draft: emptyRiskDraft() }),
        )}
      >
        {project.risks.length === 0 ? (
          <EmptyState
            compact
            icon={<ReportProblemOutlinedIcon />}
            title="No risks recorded"
            description="Note anything that could stop the project, how serious it is and the plan for it."
          />
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
            {project.risks.map((risk) => (
              <Row
                key={risk.id}
                actions={
                  canUpdate ? (
                    <RowActions
                      name={risk.title}
                      busy={saving}
                      onEdit={() => setRiskEditing({ id: risk.id, draft: draftFromRisk(risk) })}
                      onRemove={() => setRemoving({ kind: 'risk', item: risk })}
                    />
                  ) : undefined
                }
              >
                <Typography sx={{ fontWeight: 700 }}>{risk.title}</Typography>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ my: 0.75 }}>
                  <Chip
                    size="small"
                    color={LEVEL_TONE[risk.level]}
                    label={`${labelOf(RISK_LEVEL_OPTIONS, risk.level)} risk`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={labelOf(RISK_STATUS_OPTIONS, risk.status)}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {risk.mitigation ?? 'No plan recorded yet.'}
                </Typography>
              </Row>
            ))}
          </Box>
        )}
      </DetailSection>

      <ProjectStoriesPanel projectId={project.id} />

      {metricEditing && (
        <MetricDialog
          open
          initial={metricEditing.draft}
          editing={metricEditing.id !== null}
          onSave={(metric) =>
            save({ metrics: saveMetric(project.metrics, metric, metricEditing.id) })
          }
          onClose={() => setMetricEditing(null)}
        />
      )}
      {riskEditing && (
        <RiskDialog
          open
          initial={riskEditing.draft}
          editing={riskEditing.id !== null}
          onSave={(risk) => save({ risks: saveRisk(project.risks, risk, riskEditing.id) })}
          onClose={() => setRiskEditing(null)}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        tone="error"
        eyebrow="Projects"
        title={removing?.kind === 'risk' ? 'Remove this risk?' : 'Remove this number?'}
        description={
          <>
            <strong>
              {removing?.kind === 'risk' ? removing.item.title : removing?.item.label}
            </strong>{' '}
            will be removed from the project. Impact stories that already quote it keep their copy.
          </>
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={saving}
        error={removeError}
        onConfirm={confirmRemove}
        onClose={() => {
          setRemoving(null);
          setRemoveError(null);
        }}
      />
    </Stack>
  );
};

export default ProjectImpactTab;
