import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import Diversity3OutlinedIcon from '@mui/icons-material/Diversity3Outlined';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import LaptopMacRoundedIcon from '@mui/icons-material/LaptopMacRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import WebAssetRoundedIcon from '@mui/icons-material/WebAssetRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';

import type { SelectChoice } from '../components/fields/OptionSelect';

/**
 * Every option the console offers, described once.
 *
 * The dropdowns used to list bare enum values — "verified", "archived",
 * "short-text" — which say what the database calls something, not what
 * choosing it does. Keeping the wording here means a status reads the same
 * on every screen that offers it.
 */

export const ROLE_OPTIONS: SelectChoice[] = [
  {
    value: 'editor',
    label: 'Editor',
    description: 'Writes and publishes content. Cannot manage people or site settings.',
    icon: <EditNoteOutlinedIcon />,
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Everything an editor can do, plus users, permissions and settings.',
    icon: <ShieldOutlinedIcon />,
  },
];

export const CONTENT_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Saved and visible here only. Nobody outside the team can see it.',
    icon: <DraftsOutlinedIcon />,
  },
  {
    value: 'published',
    label: 'Published',
    description: 'Live on the website as soon as you save.',
    icon: <PublicOutlinedIcon />,
  },
];

export const SUBMISSION_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'new',
    label: 'New',
    description: 'Nobody has picked this up yet.',
    icon: <FiberNewOutlinedIcon />,
  },
  {
    value: 'read',
    label: 'Read',
    description: 'Someone has seen it. Still in the working list.',
    icon: <DoneAllRoundedIcon />,
  },
  {
    value: 'archived',
    label: 'Archived',
    description: 'Dealt with and filed away. Hidden from the default view.',
    icon: <ArchiveOutlinedIcon />,
  },
];

export const PRIVACY_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Received, but the requester has not confirmed their address yet.',
    icon: <HourglassEmptyRoundedIcon />,
  },
  {
    value: 'verified',
    label: 'Verified',
    description: 'Address confirmed. The clock on responding is running.',
    icon: <CheckCircleOutlineRoundedIcon />,
  },
  {
    value: 'fulfilled',
    label: 'Fulfilled',
    description: 'The data was supplied or erased as asked.',
    icon: <DoneAllRoundedIcon />,
  },
  {
    value: 'rejected',
    label: 'Rejected',
    description: 'Refused — record why, the requester is entitled to know.',
    icon: <BlockRoundedIcon />,
  },
];

export const QUESTION_TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'short-text',
    label: 'Short text',
    description: 'One line. A name, a company, a job title.',
    icon: <ShortTextRoundedIcon />,
  },
  {
    value: 'long-text',
    label: 'Long text',
    description: 'A paragraph. What they hope to get out of it.',
    icon: <NotesRoundedIcon />,
  },
  {
    value: 'single-choice',
    label: 'Single choice',
    description: 'Pick one from a list you set.',
    icon: <RadioButtonCheckedRoundedIcon />,
  },
  {
    value: 'multi-choice',
    label: 'Multiple choice',
    description: 'Pick any number from a list you set.',
    icon: <ChecklistRoundedIcon />,
  },
  {
    value: 'date',
    label: 'Date',
    description: 'A calendar picker.',
    icon: <CalendarMonthOutlinedIcon />,
  },
];

export const TEAM_TIER_OPTIONS: SelectChoice[] = [
  {
    value: 'executive',
    label: 'Functional Directors',
    description: 'The leadership team, shown first on the About page.',
    icon: <WorkspacePremiumOutlinedIcon />,
  },
  {
    value: 'board',
    label: 'Board of Directors',
    description: 'Governance and oversight. Shown in their own section.',
    icon: <GavelRoundedIcon />,
  },
  {
    value: 'non-executive',
    label: 'Country & Regional Teams',
    description: 'People leading the work in a particular country or region.',
    icon: <PublicOutlinedIcon />,
  },
];

export const JOB_TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'full-time',
    label: 'Full time',
    description: 'A permanent role at full hours.',
    icon: <WorkOutlineRoundedIcon />,
  },
  {
    value: 'part-time',
    label: 'Part time',
    description: 'A permanent role at reduced hours.',
    icon: <ScheduleRoundedIcon />,
  },
  {
    value: 'remote',
    label: 'Remote',
    description: 'Worked from anywhere, with no required office days.',
    icon: <LaptopMacRoundedIcon />,
  },
  {
    value: 'internship',
    label: 'Internship',
    description: 'A fixed term for someone early in their career.',
    icon: <SchoolOutlinedIcon />,
  },
  {
    value: 'fellowship',
    label: 'Fellowship',
    description: 'A funded placement built around a programme of work.',
    icon: <EmojiEventsOutlinedIcon />,
  },
];

export const EVENT_TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'webinar',
    label: 'Webinar',
    description: 'An online session people join from a link.',
    icon: <VideocamOutlinedIcon />,
  },
  {
    value: 'cohort-launch',
    label: 'Cohort launch',
    description: 'The opening of a programme intake.',
    icon: <RocketLaunchOutlinedIcon />,
  },
  {
    value: 'partner-forum',
    label: 'Partner forum',
    description: 'A convening for partners and funders.',
    icon: <HandshakeOutlinedIcon />,
  },
  {
    value: 'community-event',
    label: 'Community event',
    description: 'Open to the wider community, usually in person.',
    icon: <Diversity3OutlinedIcon />,
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything that does not fit the categories above.',
    icon: <MoreHorizRoundedIcon />,
  },
];

export const SUBMISSION_TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'contact',
    label: 'Contact',
    description: 'A general message through the contact form.',
    icon: <MailOutlineRoundedIcon />,
  },
  {
    value: 'partner',
    label: 'Partner',
    description: 'An organisation proposing to work with us.',
    icon: <HandshakeOutlinedIcon />,
  },
  {
    value: 'volunteer',
    label: 'Volunteer',
    description: 'Someone offering their time.',
    icon: <VolunteerActivismOutlinedIcon />,
  },
  {
    value: 'job',
    label: 'Job application',
    description: 'An application against an advertised role.',
    icon: <WorkOutlineRoundedIcon />,
  },
];

export const MEDIA_FOLDER_OPTIONS: SelectChoice[] = [
  {
    value: 'site',
    label: 'Site imagery',
    description: 'Backgrounds and panels used across the website.',
    icon: <WebAssetRoundedIcon />,
  },
  {
    value: 'team',
    label: 'Team portraits',
    description: 'Headshots for the About page.',
    icon: <PersonOutlineRoundedIcon />,
  },
  {
    value: 'events',
    label: 'Events',
    description: 'Speaker photos and event artwork.',
    icon: <CalendarMonthOutlinedIcon />,
  },
  {
    value: 'news',
    label: 'News & stories',
    description: 'Pictures that run with an article.',
    icon: <NewspaperOutlinedIcon />,
  },
  {
    value: 'gallery',
    label: 'Gallery',
    description: 'Photographs from the work itself.',
    icon: <CollectionsOutlinedIcon />,
  },
  {
    value: 'documents',
    label: 'Documents',
    description: 'Reports and PDFs offered for download.',
    icon: <DescriptionOutlinedIcon />,
  },
];

/** Prepends an "everything" row to a filter dropdown. */
export const withAnyOption = (
  options: SelectChoice[],
  label: string,
  description: string,
): SelectChoice[] => [{ value: '', label, description }, ...options];
