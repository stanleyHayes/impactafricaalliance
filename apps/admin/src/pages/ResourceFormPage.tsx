import { type AdminResource } from '@iaa/shared';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import type { Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { SystemStyleObject } from '@mui/system';
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { useCan } from '../auth/useCan';
import { FieldRenderer } from '../components/crud/FieldRenderer';
import { FormStepNavigation } from '../components/forms/FormStepNavigation';
import { ResourceReview } from '../components/forms/ResourceReview';
import { PageHeader } from '../components/PageHeader';
import { FormPageSkeleton } from '../components/PageSkeleton';
import { ApiError } from '../lib/api-client';
import { slugify } from '../lib/slug';
import { VISUALLY_HIDDEN } from '../lib/visually-hidden';
import { fieldCell, fieldCellProps, fieldControl, firstNamedField } from '../resources/field-focus';
import { useFieldProblems } from '../resources/field-problems';
import {
  resourceErrorStep,
  resourceFormSteps,
  usesResourceFormPage,
} from '../resources/form-steps';
import { useResourceDetail, useSaveResource } from '../resources/hooks';
import { findResource } from '../resources/registry';
import { withRemovals } from '../resources/removals';
import { resourceResolver } from '../resources/resolver';
import type { ResourceConfig, ResourceRow } from '../resources/types';
import { backLinkSx, skinned, surfaceSx, tokenVar } from '../theme/surfaces';

/** The step card's padding; a skin's action bar shares it, so its buttons line up with the fields. */
const CARD_PADDING = { xs: 2.5, md: 4 };
/** The Review summary's section padding (ReviewSummary), for the bar on that step. */
const REVIEW_PADDING = { xs: 2, sm: 2.5 };

/** The top bar's material, as a layer that can sit over the canvas. */
const MATERIAL = `linear-gradient(${tokenVar('appbarBg')}, ${tokenVar('appbarBg')})`;

/**
 * The bar stays over the form as it scrolls, like the top bar does: the page
 * colour in Classic, the top bar's material in a skin.
 */
const BAR_SURFACE_SX = skinned(
  { bgcolor: 'background.default' },
  {
    // The top bar's material laid over the bare canvas (its wash fixed to
    // the window, as on the page), so it looks as it does with nothing
    // behind it but is opaque: a control scrolled beneath must not show
    // through, or a click aimed at it lands on the bar.
    bgcolor: tokenVar('canvasBg'),
    backgroundImage: `${MATERIAL}, ${tokenVar('canvasImage')}`,
    backgroundAttachment: tokenVar('canvasAttachment'),
    // iOS Safari cannot pin a background to the window, so the wash would
    // be squeezed into the bar and tint it unlike the page: the material
    // over the plain canvas colour there.
    '@supports (-webkit-touch-callout: none)': { backgroundImage: MATERIAL },
  },
);

/**
 * The material has edges, so a skin insets the bar's contents to the
 * content's edges; Classic's bar is the page, lined up with the cards' edges.
 */
const barInsetSx = (review: boolean) => skinned({}, { px: review ? REVIEW_PADDING : CARD_PADDING });

/** The row of buttons. */
const barRowSx = (review: boolean) =>
  skinned(
    {},
    {
      px: review ? REVIEW_PADDING : CARD_PADDING,
      // Whatever still does not fit wraps below, kept to the right, rather
      // than running off the screen (the auto margin replaces the spacing).
      flexWrap: 'wrap',
      rowGap: 1,
      '& > :not(style) ~ :not(style)': { ml: 'auto' },
    },
  );

/**
 * A skin's bar on the narrowest phones, where its inset leaves too little
 * room for three labelled buttons (they need about 300px, which a 380px
 * screen still has). Classic's bar has no inset and keeps its labels.
 */
const skinPhoneSx = (styles: SystemStyleObject<Theme>) =>
  skinned({}, { '@media (max-width: 379.95px)': styles });

/** Back as its arrow alone, the word kept for screen readers. */
const BACK_ARROW_SX = skinPhoneSx({
  minWidth: 40,
  paddingInline: 0,
  '& .MuiButton-startIcon': { mx: 0 },
});
const BACK_LABEL_SX = skinPhoneSx(VISUALLY_HIDDEN);
const BUTTON_GROUP_SX = skinPhoneSx({ '& > :not(style) ~ :not(style)': { ml: 1 } });
/** Cancel a little narrower, so a real gap stays between it and Back at 320px. */
const CANCEL_SX = skinPhoneSx({ px: 1.5 });

/** The room the page keeps clear above its bottom edge: the bar's height and a gap. */
const BAR_CLEARANCE_VAR = '--action-bar-clearance';
/** The gap, so a focus ring shows in full above the bar. */
const BAR_GAP = 8;

/**
 * Keeps whatever is focused, scrolled to or typed in clear of the sticky
 * bar, where it would be hidden and a click meant for it would land on the
 * bar. The page's scroll padding is what the browser leaves free when it
 * brings something into view, and unlike a control's own scroll margin it
 * also holds for the line being typed at the foot of a growing text box. It
 * is set on the page only while the editor is open; the bar's own buttons
 * cancel it (see ActionBar), or focusing them would scroll the page.
 *
 * Kept up to date as the bar's height changes (a wrapped row, another skin,
 * a message above the buttons). Returns the measurement, for a caller that
 * needs it right away, before the browser reports the change.
 */
const useBarClearance = (bar: RefObject<HTMLElement | null>): (() => void) => {
  const measure = useCallback(() => {
    const height = bar.current?.offsetHeight;
    if (!height) return;
    const root = document.documentElement.style;
    root.setProperty(BAR_CLEARANCE_VAR, `${height + BAR_GAP}px`);
    root.setProperty('scroll-padding-bottom', `var(${BAR_CLEARANCE_VAR})`);
  }, [bar]);
  useEffect(() => {
    const element = bar.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      const root = document.documentElement.style;
      root.removeProperty(BAR_CLEARANCE_VAR);
      root.removeProperty('scroll-padding-bottom');
    };
  }, [bar, measure]);
  return measure;
};

/** How far down the window the console's top bar reaches: it is fixed over the page. */
const topBarBottom = (): number => {
  const header = document.querySelector('header');
  return header && getComputedStyle(header).position === 'fixed'
    ? header.getBoundingClientRect().bottom
    : 0;
};

/**
 * Scrolls a field that needs attention into the room between the top bar
 * and the action bar, its message included, unless it is there already, and
 * puts the cursor in it. The browser's own scrolling on focus knows nothing
 * of the top bar.
 */
const revealField = (cell: HTMLElement, bar: HTMLElement | null): void => {
  const box = cell.getBoundingClientRect();
  // Only once laid out (a test's page has no layout).
  if (box.height > 0) {
    const top = topBarBottom() + BAR_GAP;
    const bottom = (bar?.getBoundingClientRect().top ?? window.innerHeight) - BAR_GAP;
    // Too tall to show whole: from its top, where its label and first line are.
    const shift =
      box.top < top || box.height > bottom - top ? box.top - top : Math.max(0, box.bottom - bottom);
    if (shift !== 0) window.scrollBy({ top: shift, behavior: 'instant' });
  }
  fieldControl(cell)?.focus({ preventScroll: true });
};

/** The bar is always in view, so bringing its buttons into view must not move the page. */
const OWN_CLEARANCE = `calc(-1 * var(${BAR_CLEARANCE_VAR}, 0px))`;

/**
 * The sticky Cancel / Back / Continue bar, with whatever explains a refused
 * Continue or Save, or a failed save, above its buttons. Anywhere else the
 * bar would cover it: between the form and the bar, the words came out cut
 * in half or hidden, so a refusal looked like a button that did nothing.
 */
const ActionBar = ({
  barRef,
  review,
  messages,
  children,
}: {
  barRef: RefObject<HTMLDivElement | null>;
  review: boolean;
  messages: ReactNode[];
  children: ReactNode;
}): JSX.Element => (
  <Box
    ref={barRef}
    sx={[
      {
        position: 'sticky',
        bottom: 0,
        mt: 3,
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 2,
        scrollMarginBottom: OWN_CLEARANCE,
        '& *': { scrollMarginBottom: OWN_CLEARANCE },
      },
      BAR_SURFACE_SX,
    ]}
  >
    {messages.length > 0 && (
      <Stack spacing={1} sx={[{ pt: 2 }, barInsetSx(review)]}>
        {messages}
      </Stack>
    )}
    <Stack
      direction="row"
      spacing={1.5}
      justifyContent="space-between"
      sx={[{ py: 2 }, barRowSx(review)]}
    >
      {children}
    </Stack>
  </Box>
);

const saveButtonLabel = (saving: boolean, activeStep: number, count: number): string => {
  if (saving) return 'Saving…';
  if (activeStep === count - 1) return 'Save';
  if (activeStep === count - 2) return 'Review';
  return 'Continue';
};

interface ResourceEditorProps {
  resource: ResourceConfig;
  initial?: ResourceRow;
}

const ResourceEditor = ({ resource, initial }: ResourceEditorProps): JSX.Element => {
  const navigate = useNavigate();
  const save = useSaveResource(resource.key);
  const steps = resourceFormSteps(resource);
  const [activeStep, setActiveStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState(false);
  const [notice, setNotice] = useState('');
  const validationLock = useRef(false);
  // Date fields holding a half-typed date: each keeps its old value, which
  // passes the schema, so they are checked here as well.
  const dateProblems = useFieldProblems();
  const bar = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const measureBar = useBarClearance(bar);
  // The field that held the form back, to bring into view once its step shows.
  const [reveal, setReveal] = useState<{ name: string } | null>(null);
  useEffect(() => {
    if (!reveal) return;
    // The message saying why may have just made the bar taller.
    measureBar();
    const cell = fieldCell(form.current, reveal.name);
    if (cell) revealField(cell, bar.current);
  }, [reveal, measureBar]);
  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    getFieldState,
    watch,
    formState: { errors },
  } = useForm<Record<string, unknown>>({
    resolver: resourceResolver(resource.createSchema),
    defaultValues: { ...resource.defaultValues, ...initial },
    shouldUnregister: false,
  });
  const values = watch();

  // Derive the slug from the title while creating, so a new article gets a
  // sensible URL without anyone hand-typing one. It stops the moment the field
  // is edited directly, and never touches an existing record, whose slug is
  // already published and must not move.
  const slugSource = (values.title ?? values.name) as string | undefined;
  const slugTouched = getFieldState('slug').isDirty;
  useEffect(() => {
    if (initial || slugTouched || !slugSource) {
      return;
    }
    const derived = slugify(slugSource);
    if (derived && derived !== values.slug) {
      setValue('slug', derived, { shouldValidate: false, shouldDirty: false });
    }
  }, [initial, slugSource, slugTouched, values.slug, setValue]);
  const isReview = activeStep === steps.length - 1;
  const busy = save.isPending || validating || Object.values(uploading).some(Boolean);
  const goBack = (): void => {
    if (!busy) void navigate(`/content/${resource.key}`);
  };
  /**
   * Goes back to the first step with a problem, says why above the buttons
   * and puts the cursor in its first field that needs attention. A date's
   * problem is not the form's own error, so the form cannot focus it.
   */
  const holdBack = (names: readonly string[], message: string): void => {
    const index = resourceErrorStep(steps, names);
    setActiveStep(index);
    setNotice(message);
    const field = firstNamedField(steps[index]?.fields ?? [], names);
    if (field) setReveal({ name: field.name });
  };
  const moveToStep = async (next: number): Promise<void> => {
    if (busy || validationLock.current || next < 0 || next >= steps.length) return;
    if (next <= activeStep) {
      setActiveStep(next);
      setNotice('');
      return;
    }
    validationLock.current = true;
    setValidating(true);
    try {
      const names = steps.slice(0, next).flatMap((step) => step.fields.map((field) => field.name));
      const valid = await trigger(names);
      const problems = dateProblems.current();
      const held = names.filter((name) => problems[name] || getFieldState(name).invalid);
      if (!valid || held.length) {
        holdBack(held, 'Please complete the highlighted fields before continuing.');
        return;
      }
      setNotice('');
      setActiveStep(next);
      setMaxStep((previous) => Math.max(previous, next));
    } finally {
      validationLock.current = false;
      setValidating(false);
    }
  };
  const refuseSave = (names: string[]): void =>
    holdBack(names, 'Please complete the highlighted fields before saving.');
  const submit = handleSubmit(
    (body) => {
      if (busy) return;
      const problems = Object.keys(dateProblems.current());
      if (problems.length) {
        refuseSave(problems);
        return;
      }
      save.mutate(
        { id: initial?.id, body: initial ? withRemovals(resource.fields, initial, body) : body },
        { onSuccess: () => void navigate(`/content/${resource.key}`) },
      );
    },
    (invalid) => refuseSave([...Object.keys(dateProblems.current()), ...Object.keys(invalid)]),
  );
  const messages = [
    notice && (
      <Alert key="notice" severity="error">
        {notice}
        {Object.keys(errors).length > 0 && ' Your other entries have been kept.'}
      </Alert>
    ),
    save.isError && (
      <Alert key="save" severity="error">
        {save.error.message || 'Could not save. Please try again.'}
      </Alert>
    ),
  ].filter(Boolean);

  return (
    <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
      <Button
        onClick={goBack}
        disabled={busy}
        startIcon={<ArrowBackRoundedIcon />}
        sx={[{ mb: 2 }, backLinkSx]}
      >
        Back to {resource.label.toLowerCase()}
      </Button>
      <PageHeader
        icon={resource.icon}
        title={`${initial ? 'Edit' : 'Create'} ${resource.singular.toLowerCase()}`}
        description="Work through each section, then review everything before saving."
      />
      <FormStepNavigation
        steps={steps.map((step) => step.label)}
        activeStep={activeStep}
        maxStep={maxStep}
        disabled={busy}
        onStepChange={(next) => void moveToStep(next)}
      />
      <Box
        ref={form}
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          if (isReview) void submit(event);
          else void moveToStep(activeStep + 1);
        }}
        sx={{ mt: 3 }}
      >
        <Box
          component="fieldset"
          disabled={save.isPending || validating}
          sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}
        >
          {steps.slice(0, -1).map((step, index) => (
            <Box
              key={step.label}
              hidden={index !== activeStep}
              sx={{ p: CARD_PADDING, borderRadius: 3, ...surfaceSx.card }}
            >
              <Typography variant="overline" color="text.secondary">
                Step {index + 1} of {steps.length}
              </Typography>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                {step.label}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2.5,
                }}
              >
                {step.fields.map((field) => (
                  <Box
                    key={field.name}
                    {...fieldCellProps(field.name)}
                    sx={{ minWidth: 0, gridColumn: field.wide ? '1 / -1' : 'auto' }}
                  >
                    <FieldRenderer
                      field={field}
                      control={control}
                      onUploadingChange={(fieldName, pending) =>
                        setUploading((previous) => ({ ...previous, [fieldName]: pending }))
                      }
                      onProblemChange={dateProblems.report}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
        {isReview && (
          <ResourceReview
            resource={resource}
            steps={steps.slice(0, -1)}
            values={values}
            busy={busy}
            onEdit={(index) => void moveToStep(index)}
          />
        )}
        <ActionBar barRef={bar} review={isReview} messages={messages}>
          <Button onClick={goBack} disabled={busy} sx={CANCEL_SX}>
            Cancel
          </Button>
          <Stack direction="row" spacing={1.5} sx={BUTTON_GROUP_SX}>
            {activeStep > 0 && (
              <Button
                disabled={busy}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => void moveToStep(activeStep - 1)}
                sx={BACK_ARROW_SX}
              >
                <Box component="span" sx={BACK_LABEL_SX}>
                  Back
                </Box>
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={busy}
              startIcon={isReview ? <SaveRoundedIcon /> : undefined}
              endIcon={!isReview ? <ArrowForwardRoundedIcon /> : undefined}
            >
              {saveButtonLabel(save.isPending, activeStep, steps.length)}
            </Button>
          </Stack>
        </ActionBar>
      </Box>
    </Box>
  );
};

const ResourceFormLoader = ({
  resource,
  id,
}: {
  resource: ResourceConfig;
  id?: string;
}): JSX.Element => {
  const record = useResourceDetail(resource.key, id);
  const navigate = useNavigate();
  // An id in the route means this is an edit; the record itself is not needed
  // to say so, so the heading does not wait for it.
  if (id && record.isLoading)
    return (
      <>
        <PageHeader
          icon={resource.icon}
          title={`Edit ${resource.singular.toLowerCase()}`}
          description="Work through each section, then review everything before saving."
        />
        <FormPageSkeleton backLink steps fields={5} />
      </>
    );
  if (id && (record.isError || !record.data)) {
    const notFound = record.error instanceof ApiError && record.error.status === 404;
    return (
      <Stack spacing={2}>
        <Alert
          severity={notFound ? 'info' : 'error'}
          action={!notFound && <Button onClick={() => void record.refetch()}>Retry</Button>}
        >
          {notFound
            ? `This ${resource.singular.toLowerCase()} could not be found.`
            : 'Could not load this record. Please try again.'}
        </Alert>
        <Button
          sx={[{ alignSelf: 'flex-start' }, backLinkSx]}
          onClick={() => void navigate(`/content/${resource.key}`)}
          startIcon={<ArrowBackRoundedIcon />}
        >
          Back to {resource.label.toLowerCase()}
        </Button>
      </Stack>
    );
  }
  return (
    <ResourceEditor
      key={`${resource.key}:${id ?? 'new'}`}
      resource={resource}
      initial={id ? record.data : undefined}
    />
  );
};

const ResourceFormPage = (): JSX.Element => {
  const { resource: key = '', id } = useParams();
  const can = useCan();
  const resource = findResource(key);
  if (
    !resource ||
    !can(id ? 'update' : 'create', key as AdminResource) ||
    !can('read', key as AdminResource)
  )
    return <Navigate to="/" replace />;
  if (!usesResourceFormPage(resource)) return <Navigate to={`/content/${resource.key}`} replace />;
  return <ResourceFormLoader key={`${key}:${id ?? 'new'}`} resource={resource} id={id} />;
};

export default ResourceFormPage;
