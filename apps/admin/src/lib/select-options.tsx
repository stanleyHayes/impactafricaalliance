import {
  AFRICAN_COUNTRY_CODES,
  countryName,
  DIASPORA_COUNTRY_CODES,
  FILE_KIND_FORMATS,
  PILLARS,
  STORY_BLOCK_LABELS,
  STORY_BLOCK_TYPES,
  type FileKind,
  type StoryBlockType,
} from '@iaa/shared';
import AdsClickOutlinedIcon from '@mui/icons-material/AdsClickOutlined';
import AlternateEmailRoundedIcon from '@mui/icons-material/AlternateEmailRounded';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import ArrowDropDownCircleOutlinedIcon from '@mui/icons-material/ArrowDropDownCircleOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import Diversity3OutlinedIcon from '@mui/icons-material/Diversity3Outlined';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import DragHandleRoundedIcon from '@mui/icons-material/DragHandleRounded';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import GppGoodOutlinedIcon from '@mui/icons-material/GppGoodOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import LaptopMacRoundedIcon from '@mui/icons-material/LaptopMacRounded';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import LibraryAddCheckOutlinedIcon from '@mui/icons-material/LibraryAddCheckOutlined';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import NewspaperOutlinedIcon from '@mui/icons-material/NewspaperOutlined';
import NotesRoundedIcon from '@mui/icons-material/NotesRounded';
import NumbersRoundedIcon from '@mui/icons-material/NumbersRounded';
import PanoramaOutlinedIcon from '@mui/icons-material/PanoramaOutlined';
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded';
import PlaylistRemoveRoundedIcon from '@mui/icons-material/PlaylistRemoveRounded';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ShortTextRoundedIcon from '@mui/icons-material/ShortTextRounded';
import SignalCellularAlt1BarRoundedIcon from '@mui/icons-material/SignalCellularAlt1BarRounded';
import SignalCellularAlt2BarRoundedIcon from '@mui/icons-material/SignalCellularAlt2BarRounded';
import SignalCellularAltRoundedIcon from '@mui/icons-material/SignalCellularAltRounded';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import SmartDisplayOutlinedIcon from '@mui/icons-material/SmartDisplayOutlined';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import SubjectRoundedIcon from '@mui/icons-material/SubjectRounded';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import TimelapseRoundedIcon from '@mui/icons-material/TimelapseRounded';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import UpcomingOutlinedIcon from '@mui/icons-material/UpcomingOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import VolunteerActivismOutlinedIcon from '@mui/icons-material/VolunteerActivismOutlined';
import WebAssetRoundedIcon from '@mui/icons-material/WebAssetRounded';
import Woman2OutlinedIcon from '@mui/icons-material/Woman2Outlined';
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
  {
    value: 'ambassador',
    label: 'Ambassadors',
    description:
      'People who represent the alliance in their own country. Listed after the regional teams, with their country under their name.',
    icon: <CampaignOutlinedIcon />,
  },
];

/**
 * A member's country, by name. Every African country first, then the diaspora
 * countries members are based in; the value stored is the ISO code.
 */
export const TEAM_COUNTRY_OPTIONS: SelectChoice[] = [
  {
    value: '',
    label: 'No country',
    description: 'Nothing is shown under the name. Not allowed for ambassadors.',
  },
  ...AFRICAN_COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code) })),
  ...DIASPORA_COUNTRY_CODES.map((code) => ({
    value: code,
    label: countryName(code),
    description: 'Outside Africa',
  })),
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

// ---------------------------------------------------------------------------
// Work modules: projects, tasks, forms, applications and impact stories.
// ---------------------------------------------------------------------------

export const PROJECT_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Still being written up. Nobody is committed to it yet.',
    icon: <DraftsOutlinedIcon />,
  },
  {
    value: 'planned',
    label: 'Planned',
    description: 'Agreed and scheduled, but the work has not started.',
    icon: <EventNoteOutlinedIcon />,
  },
  {
    value: 'active',
    label: 'Active',
    description: 'Work is under way.',
    icon: <PlayCircleOutlineRoundedIcon />,
  },
  {
    value: 'on-hold',
    label: 'On hold',
    description: 'Paused. Its plans and tasks stay as they are until it restarts.',
    icon: <PauseCircleOutlineRoundedIcon />,
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'Delivered. Stays in the lists as a record of the work.',
    icon: <TaskAltRoundedIcon />,
  },
  {
    value: 'archived',
    label: 'Archived',
    description:
      'Hidden from every list. Its tasks and stories keep their link, and it can be restored.',
    icon: <ArchiveOutlinedIcon />,
  },
];

export const WORK_PRIORITY_OPTIONS: SelectChoice[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'Can wait until the more pressing work is done.',
    icon: <KeyboardArrowDownRoundedIcon />,
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'The normal level. Most work sits here.',
    icon: <DragHandleRoundedIcon />,
  },
  {
    value: 'high',
    label: 'High',
    description: 'Comes before the normal run of work.',
    icon: <KeyboardArrowUpRoundedIcon />,
  },
  {
    value: 'urgent',
    label: 'Urgent',
    description: 'Put other work aside for this. Sorted to the top of every list.',
    icon: <PriorityHighRoundedIcon />,
  },
];

export const MILESTONE_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'planned',
    label: 'Planned',
    description: 'Not started yet.',
    icon: <ScheduleRoundedIcon />,
  },
  {
    value: 'in-progress',
    label: 'In progress',
    description: 'Work towards it has started.',
    icon: <TimelapseRoundedIcon />,
  },
  {
    value: 'done',
    label: 'Done',
    description: "Reached. Counts towards the project's progress.",
    icon: <CheckCircleOutlineRoundedIcon />,
  },
];

export const MILESTONE_KIND_OPTIONS: SelectChoice[] = [
  {
    value: 'milestone',
    label: 'Milestone',
    description: 'A checkpoint with a date: a launch, a cohort starting, a report due.',
    icon: <FlagOutlinedIcon />,
  },
  {
    value: 'activity',
    label: 'Activity',
    description: 'A piece of delivery work: a training week, a site visit, a workshop.',
    icon: <HandymanOutlinedIcon />,
  },
];

export const RISK_LEVEL_OPTIONS: SelectChoice[] = [
  {
    value: 'low',
    label: 'Low',
    description: 'Unlikely to happen, or small if it does.',
    icon: <SignalCellularAlt1BarRoundedIcon />,
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Worth watching and planning around.',
    icon: <SignalCellularAlt2BarRoundedIcon />,
  },
  {
    value: 'high',
    label: 'High',
    description: 'Could stop the project. Needs a plan and someone watching it.',
    icon: <SignalCellularAltRoundedIcon />,
  },
];

export const RISK_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'open',
    label: 'Open',
    description: 'Still a live threat to the project.',
    icon: <ReportProblemOutlinedIcon />,
  },
  {
    value: 'mitigated',
    label: 'Mitigated',
    description: 'Steps are in place that make it less likely or less harmful.',
    icon: <ShieldOutlinedIcon />,
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'No longer a threat. Kept on the record.',
    icon: <DoneAllRoundedIcon />,
  },
];

/**
 * Menu wording for each programme. The pillars' own descriptions are written
 * for the website and run to three lines, which is too long for a menu.
 */
const PROGRAMME_DETAILS: Record<string, { description: string; icon: JSX.Element }> = {
  'digital-skills': {
    description: 'Coding, social media, e-commerce and enterprise training for young people.',
    icon: <DevicesOutlinedIcon />,
  },
  'stem-learning': {
    description: 'Online STEM and vocational courses, certified and tied to careers.',
    icon: <ScienceOutlinedIcon />,
  },
  'youth-inclusion': {
    description:
      'Skills, mentoring and placements that take young people from learning to earning.',
    icon: <RocketLaunchOutlinedIcon />,
  },
  'women-empowerment': {
    description: 'Digital skills, enterprise training and mentoring for women.',
    icon: <Woman2OutlinedIcon />,
  },
};

const firstSentence = (text: string): string => text.split(/(?<=\.)\s/)[0] ?? text;

/**
 * The programme areas, built from the website's pillars so the two always
 * agree. A pillar added to the site before this file catches up still appears,
 * described by the first sentence of its own copy.
 */
export const PROGRAMME_OPTIONS: SelectChoice[] = PILLARS.map((pillar) => ({
  value: pillar.key,
  label: pillar.title,
  description: PROGRAMME_DETAILS[pillar.key]?.description ?? firstSentence(pillar.description),
  icon: PROGRAMME_DETAILS[pillar.key]?.icon ?? <CategoryOutlinedIcon />,
}));

/** In board order, left to right, so the menu matches the columns people see. */
export const TASK_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'backlog',
    label: 'Backlog',
    description: 'Written down so it is not forgotten. Not planned yet.',
    icon: <MoveToInboxOutlinedIcon />,
  },
  {
    value: 'todo',
    label: 'To do',
    description: 'Planned and ready for someone to start.',
    icon: <RadioButtonUncheckedRoundedIcon />,
  },
  {
    value: 'in-progress',
    label: 'In progress',
    description: 'Someone is working on it now.',
    icon: <TimelapseRoundedIcon />,
  },
  {
    value: 'blocked',
    label: 'Blocked',
    description: 'Stuck on something outside the task. Say what in a comment.',
    icon: <BlockRoundedIcon />,
  },
  {
    value: 'review',
    label: 'In review',
    description: 'Finished by the assignee and waiting for someone to check it.',
    icon: <RateReviewOutlinedIcon />,
  },
  {
    value: 'done',
    label: 'Done',
    description: 'Finished. Leaves My tasks and stops counting as due.',
    icon: <CheckCircleOutlineRoundedIcon />,
  },
];

export const DUE_BUCKET_OPTIONS: SelectChoice[] = [
  {
    value: 'overdue',
    label: 'Overdue',
    description: 'The due date has passed and the work is still open.',
    icon: <EventBusyOutlinedIcon />,
  },
  {
    value: 'today',
    label: 'Due today',
    description: 'Due today, going by the calendar on this device.',
    icon: <TodayOutlinedIcon />,
  },
  {
    value: 'upcoming',
    label: 'Upcoming',
    description: 'Due on a later day.',
    icon: <UpcomingOutlinedIcon />,
  },
  {
    value: 'none',
    label: 'No due date',
    description: 'Nobody has set a date for it.',
    icon: <RemoveCircleOutlineRoundedIcon />,
  },
];

export const FORM_TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'speaker-application',
    label: 'Speaker application',
    description: 'People applying to speak at one of our events.',
    icon: <RecordVoiceOverOutlinedIcon />,
  },
  {
    value: 'volunteer',
    label: 'Volunteer',
    description: 'People offering their time.',
    icon: <VolunteerActivismOutlinedIcon />,
  },
  {
    value: 'mentor',
    label: 'Mentor',
    description: 'People offering to mentor on a programme.',
    icon: <SchoolOutlinedIcon />,
  },
  {
    value: 'partnership',
    label: 'Partnership',
    description: 'Organisations proposing to work with us.',
    icon: <HandshakeOutlinedIcon />,
  },
  {
    value: 'event',
    label: 'Event',
    description: 'Sign-ups or questions for one event.',
    icon: <CalendarMonthOutlinedIcon />,
  },
  {
    value: 'survey',
    label: 'Survey',
    description: 'Questions to learn from, such as feedback after a programme.',
    icon: <PollOutlinedIcon />,
  },
  {
    value: 'general',
    label: 'General',
    description: 'Anything the types above do not cover.',
    icon: <DescriptionOutlinedIcon />,
  },
];

export const FORM_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Being built. It has no public page yet.',
    icon: <DraftsOutlinedIcon />,
  },
  {
    value: 'published',
    label: 'Published',
    description: 'Live. Anyone with the link can apply while its dates allow.',
    icon: <PublicOutlinedIcon />,
  },
  {
    value: 'closed',
    label: 'Closed',
    description: 'The page stays up and says applications have closed. Nothing new can be sent.',
    icon: <LockOutlinedIcon />,
  },
];

export const FORM_FIELD_TYPE_OPTIONS: SelectChoice[] = [
  {
    value: 'short-text',
    label: 'Short text',
    description: 'One line. A name, an organisation, a job title.',
    icon: <ShortTextRoundedIcon />,
  },
  {
    value: 'long-text',
    label: 'Long text',
    description: 'A paragraph or more. A biography, a proposal.',
    icon: <NotesRoundedIcon />,
  },
  {
    value: 'email',
    label: 'Email',
    description: 'An email address, checked for the right shape.',
    icon: <AlternateEmailRoundedIcon />,
  },
  {
    value: 'phone',
    label: 'Phone',
    description: 'A phone number with its country code.',
    icon: <PhoneOutlinedIcon />,
  },
  {
    value: 'number',
    label: 'Number',
    description: 'A number, with an optional lowest and highest.',
    icon: <NumbersRoundedIcon />,
  },
  {
    value: 'date',
    label: 'Date',
    description: 'A day picked from a calendar.',
    icon: <CalendarMonthOutlinedIcon />,
  },
  {
    value: 'select',
    label: 'Dropdown',
    description: 'Pick one from a list you set, shown as a menu. Suits long lists.',
    icon: <ArrowDropDownCircleOutlinedIcon />,
  },
  {
    value: 'multi-select',
    label: 'Multiple choice',
    description: 'Pick any number from a list you set.',
    icon: <ChecklistRoundedIcon />,
  },
  {
    value: 'radio',
    label: 'Single choice',
    description: 'Pick one from a list you set, with every choice on show. Suits short lists.',
    icon: <RadioButtonCheckedRoundedIcon />,
  },
  {
    value: 'checkbox',
    label: 'Tick box',
    description: 'One box to tick, such as "I can attend in person".',
    icon: <CheckBoxOutlinedIcon />,
  },
  {
    value: 'url',
    label: 'Link',
    description: 'A web address starting with https://.',
    icon: <LinkRoundedIcon />,
  },
  {
    value: 'file',
    label: 'File upload',
    description: 'One or more files. You choose the kinds and the size limit.',
    icon: <AttachFileRoundedIcon />,
  },
  {
    value: 'consent',
    label: 'Consent',
    description: 'A statement the applicant must agree to before they can submit.',
    icon: <GppGoodOutlinedIcon />,
  },
];

const formatList = (kind: FileKind): string =>
  FILE_KIND_FORMATS[kind].map((format) => format.toUpperCase()).join(', ');

/** Built from the shared format lists, so the menu names exactly what is accepted. */
export const FILE_KIND_OPTIONS: SelectChoice[] = [
  {
    value: 'image',
    label: 'Images',
    description: `Photos and graphics: ${formatList('image')}.`,
    icon: <ImageOutlinedIcon />,
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: `Documents that look the same everywhere: ${formatList('pdf')}.`,
    icon: <PictureAsPdfOutlinedIcon />,
  },
  {
    value: 'document',
    label: 'Documents',
    description: `Word-processor and text files: ${formatList('document')}.`,
    icon: <ArticleOutlinedIcon />,
  },
  {
    value: 'spreadsheet',
    label: 'Spreadsheets',
    description: `Tables and budgets: ${formatList('spreadsheet')}.`,
    icon: <TableChartOutlinedIcon />,
  },
  {
    value: 'presentation',
    label: 'Presentations',
    description: `Slide decks: ${formatList('presentation')}.`,
    icon: <SlideshowOutlinedIcon />,
  },
];

/** How a condition compares an earlier answer. Text is compared ignoring case. */
export const VISIBILITY_OPERATOR_OPTIONS: SelectChoice[] = [
  {
    value: 'equals',
    label: 'Is',
    description: 'The answer is exactly this. On multiple choice, it is the only one picked.',
    icon: <CheckRoundedIcon />,
  },
  {
    value: 'not-equals',
    label: 'Is not',
    description: 'The answer is anything else, including no answer at all.',
    icon: <CloseRoundedIcon />,
  },
  {
    value: 'includes',
    label: 'Includes',
    description: 'On multiple choice, this is among those picked. On text, the answer contains it.',
    icon: <PlaylistAddCheckRoundedIcon />,
  },
  {
    value: 'not-includes',
    label: 'Does not include',
    description: 'This is not among those picked, or the text does not contain it.',
    icon: <PlaylistRemoveRoundedIcon />,
  },
  {
    value: 'is-empty',
    label: 'Is not answered',
    description: 'The question was left blank, or its box was not ticked.',
    icon: <CheckBoxOutlineBlankRoundedIcon />,
  },
  {
    value: 'is-not-empty',
    label: 'Is answered',
    description: 'The question has any answer at all.',
    icon: <LibraryAddCheckOutlinedIcon />,
  },
];

/** Which question feeds the applicant's details on the application list. */
export const APPLICANT_MAPPING_OPTIONS: SelectChoice[] = [
  {
    value: 'applicant-name',
    label: "Applicant's name",
    description: 'Shown as their name in the applications list and on emails.',
    icon: <BadgeOutlinedIcon />,
  },
  {
    value: 'applicant-email',
    label: "Applicant's email",
    description: 'Where the acknowledgement goes, if the form sends one.',
    icon: <MailOutlineRoundedIcon />,
  },
  {
    value: 'applicant-phone',
    label: "Applicant's phone",
    description: 'Shown as their phone number on the application.',
    icon: <PhoneOutlinedIcon />,
  },
];

/**
 * The statuses a reviewer can set. Drafts are left out: they belong to the
 * applicant until they press Submit. None of these emails the applicant.
 */
export const APPLICATION_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'submitted',
    label: 'Submitted',
    description: 'Sent in and waiting for a first look.',
    icon: <FiberNewOutlinedIcon />,
  },
  {
    value: 'under-review',
    label: 'Under review',
    description: 'Someone is reading it and gathering views.',
    icon: <ManageSearchOutlinedIcon />,
  },
  {
    value: 'shortlisted',
    label: 'Shortlisted',
    description: 'Through to the final round of decisions.',
    icon: <StarBorderRoundedIcon />,
  },
  {
    value: 'accepted',
    label: 'Accepted',
    description: 'Offered a place. The applicant is not told automatically.',
    icon: <CheckCircleOutlineRoundedIcon />,
  },
  {
    value: 'rejected',
    label: 'Not taken forward',
    description: 'Declined. The applicant is not told automatically.',
    icon: <CancelOutlinedIcon />,
  },
];

export const APPLICATION_RECOMMENDATION_OPTIONS: SelectChoice[] = [
  {
    value: 'strong-yes',
    label: 'Strong yes',
    description: 'Take them. You would argue for this one.',
    icon: <StarRoundedIcon />,
  },
  {
    value: 'yes',
    label: 'Yes',
    description: 'Take them if there is room.',
    icon: <ThumbUpOutlinedIcon />,
  },
  {
    value: 'maybe',
    label: 'Maybe',
    description: 'Could go either way. Say in your notes what would decide it.',
    icon: <HelpOutlineRoundedIcon />,
  },
  {
    value: 'no',
    label: 'No',
    description: 'Do not take this forward.',
    icon: <ThumbDownOutlinedIcon />,
  },
];

export const IMPACT_STORY_STATUS_OPTIONS: SelectChoice[] = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Being written. Only the team can see it.',
    icon: <DraftsOutlinedIcon />,
  },
  {
    value: 'in-review',
    label: 'In review',
    description: 'Written and waiting for an administrator to check and publish it.',
    icon: <RateReviewOutlinedIcon />,
  },
  {
    value: 'published',
    label: 'Published',
    description: 'On the public website under Impact stories.',
    icon: <PublicOutlinedIcon />,
  },
  {
    value: 'archived',
    label: 'Archived',
    description: 'Off the website and out of the working lists. Can come back as a draft.',
    icon: <ArchiveOutlinedIcon />,
  },
];

const STORY_BLOCK_DETAILS: Record<StoryBlockType, { description: string; icon: JSX.Element }> = {
  hero: {
    description: 'The opening: a large heading over a picture.',
    icon: <PanoramaOutlinedIcon />,
  },
  'rich-text': {
    description: 'Paragraphs of writing, with headings, lists and links.',
    icon: <SubjectRoundedIcon />,
  },
  image: {
    description: 'One photo with a caption.',
    icon: <ImageOutlinedIcon />,
  },
  gallery: {
    description: 'Several photos laid out together.',
    icon: <CollectionsOutlinedIcon />,
  },
  video: {
    description: 'A YouTube or Vimeo video that plays on the page.',
    icon: <SmartDisplayOutlinedIcon />,
  },
  quote: {
    description: "Someone's own words, with who said them.",
    icon: <FormatQuoteRoundedIcon />,
  },
  metrics: {
    description: 'A row of headline numbers, such as people trained.',
    icon: <LeaderboardOutlinedIcon />,
  },
  timeline: {
    description: 'Steps in order, each with a when and a what.',
    icon: <TimelineOutlinedIcon />,
  },
  partners: {
    description: 'The organisations the work was done with.',
    icon: <HandshakeOutlinedIcon />,
  },
  cta: {
    description: 'A closing button asking the reader to act: donate, volunteer, read more.',
    icon: <AdsClickOutlinedIcon />,
  },
};

/** Named as the story editor names them elsewhere, from the shared labels. */
export const STORY_BLOCK_TYPE_OPTIONS: SelectChoice[] = STORY_BLOCK_TYPES.map((type) => ({
  value: type,
  label: STORY_BLOCK_LABELS[type],
  ...STORY_BLOCK_DETAILS[type],
}));

/** Prepends an "everything" row to a filter dropdown. */
export const withAnyOption = (
  options: SelectChoice[],
  label: string,
  description: string,
): SelectChoice[] => [{ value: '', label, description }, ...options];

/**
 * Reads a stored value as the menus name it, field by field: `in-progress`
 * under `status` reads "In progress". Anything it has no options for is
 * returned as stored. For activity logs, which keep the stored values.
 */
const labelsByField =
  (options: Record<string, readonly SelectChoice[]>) =>
  (field: string, value: string): string =>
    options[field]?.find((option) => option.value === value)?.label ?? value;

/** A project's logged status and priority changes, in the words its screens use. */
export const projectChangeLabel = labelsByField({
  status: PROJECT_STATUS_OPTIONS,
  priority: WORK_PRIORITY_OPTIONS,
});

/** A task's logged status and priority changes, in the words its screens use. */
export const taskChangeLabel = labelsByField({
  status: TASK_STATUS_OPTIONS,
  priority: WORK_PRIORITY_OPTIONS,
});
