import type { AdminResource, PermissionAction } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { RequireRole } from '../auth/RequireRole';
import { AppShell } from '../components/layout/AppShell';
import { RouteSkeleton } from '../components/PageSkeleton';
import AcceptInvitation from '../pages/AcceptInvitation';
import AccountLayout from '../pages/account/AccountLayout';
import EditProfile from '../pages/account/EditProfile';
import MfaSetup from '../pages/account/MfaSetup';
import Notifications from '../pages/account/Notifications';
import Profile from '../pages/account/Profile';
import Settings from '../pages/account/Settings';
import UpdatePassword from '../pages/account/UpdatePassword';
import UserGuide from '../pages/account/UserGuide';
import Analytics from '../pages/Analytics';
import Dashboard from '../pages/Dashboard';
import Donations from '../pages/Donations';
import EventDetail from '../pages/EventDetail';
import EventEditor from '../pages/EventEditor';
import Events from '../pages/Events';
import Login from '../pages/Login';
import MediaLibrary from '../pages/MediaLibrary';
import PrivacyRequests from '../pages/PrivacyRequests';
import ResetPassword from '../pages/ResetPassword';
import ResourceFormPage from '../pages/ResourceFormPage';
import ResourcePage from '../pages/ResourcePage';
import Reviews from '../pages/Reviews';
import SiteImages from '../pages/SiteImages';
import SiteSettings from '../pages/SiteSettings';
import SocialConnections from '../pages/SocialConnections';
import SubmissionDetail from '../pages/SubmissionDetail';
import Submissions from '../pages/Submissions';
import Subscribers from '../pages/Subscribers';
import UserAccessEditor from '../pages/UserAccessEditor';
import Users from '../pages/Users';

/*
 * The work modules load on first visit rather than in the console's first
 * download: together they made the one bundle nearly a quarter larger, and
 * most sessions open only one of them, if any. Each page is its own chunk.
 * Keep these imports dynamic; a static import from one of these folders here
 * pulls it, and the drag and drop library the board uses, back into the
 * entry chunk (app/lazy-routes.test.ts checks).
 */

// Projects
const ProjectsPage = lazy(() => import('../pages/projects/ProjectsPage'));
const ProjectEditorPage = lazy(() => import('../pages/projects/ProjectEditorPage'));
const ProjectDetailLayout = lazy(() => import('../pages/projects/ProjectDetailLayout'));
const ProjectOverviewTab = lazy(() => import('../pages/projects/ProjectOverviewTab'));
const ProjectTasksTab = lazy(() => import('../pages/projects/ProjectTasksTab'));
const ProjectMilestonesTab = lazy(() => import('../pages/projects/ProjectMilestonesTab'));
const ProjectMediaTab = lazy(() => import('../pages/projects/ProjectMediaTab'));
const ProjectImpactTab = lazy(() => import('../pages/projects/ProjectImpactTab'));
const ProjectDocumentsTab = lazy(() => import('../pages/projects/ProjectDocumentsTab'));
const ProjectActivityTab = lazy(() => import('../pages/projects/ProjectActivityTab'));

// Tasks
const MyTasksPage = lazy(() => import('../pages/tasks/MyTasksPage'));
const AllTasksPage = lazy(() => import('../pages/tasks/AllTasksPage'));
const TaskBoardPage = lazy(() => import('../pages/tasks/TaskBoardPage'));
const TaskEditorPage = lazy(() => import('../pages/tasks/TaskEditorPage'));
const TaskDetailPage = lazy(() => import('../pages/tasks/TaskDetailPage'));

// Forms and applications
const FormsPage = lazy(() => import('../pages/forms/FormsPage'));
const FormEditorPage = lazy(() => import('../pages/forms/FormEditorPage'));
const FormDetailPage = lazy(() => import('../pages/forms/FormDetailPage'));
const ApplicationsPage = lazy(() => import('../pages/applications/ApplicationsPage'));
const ReviewQueuePage = lazy(() => import('../pages/applications/ReviewQueuePage'));
const ApplicationDetailPage = lazy(() => import('../pages/applications/ApplicationDetailPage'));

// Impact stories
const ImpactStoriesPage = lazy(() => import('../pages/impact-stories/ImpactStoriesPage'));
const ImpactStoryEditorPage = lazy(() => import('../pages/impact-stories/ImpactStoryEditorPage'));
const StoryFromProjectPage = lazy(() => import('../pages/impact-stories/StoryFromProjectPage'));

// Says who can fix it, so a missing permission reads as a next step rather
// than a dead end.
const NO_PERMISSION = (
  <Alert severity="warning">
    You do not have permission to view this page. An administrator can grant access under Users.
  </Alert>
);

/**
 * A page whose code loads on first visit, with its shape on screen meanwhile.
 * Navigation runs in a transition, so moving from one loaded page to another
 * keeps the old page up until the new one is ready; the skeleton shows on a
 * first visit or a reload.
 */
const deferred = (
  page: JSX.Element,
  variant: 'list' | 'form' | 'section' = 'list',
): JSX.Element => <Suspense fallback={<RouteSkeleton variant={variant} />}>{page}</Suspense>;

/** A project tab: loads inside the project's page, under its header and tabs. */
const tab = (page: JSX.Element): JSX.Element => deferred(page, 'section');

/**
 * A page behind one permission. Says so when the permission is missing
 * rather than rendering nothing, which reads as a broken page.
 */
const guarded = (
  resource: AdminResource,
  action: PermissionAction,
  page: JSX.Element,
): JSX.Element => (
  <RequirePermission resource={resource} action={action} fallback={NO_PERMISSION}>
    {page}
  </RequirePermission>
);

/** A create or edit page: staff roles only, plus the permission for the change it makes. */
const editPage = (
  resource: AdminResource,
  action: PermissionAction,
  page: JSX.Element,
): JSX.Element => (
  <RequireRole roles={['admin', 'editor']}>
    {guarded(resource, action, deferred(page, 'form'))}
  </RequireRole>
);

/** Admin route table: a public login and an authenticated console shell. */
export const App = (): JSX.Element => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/accept-invitation" element={<AcceptInvitation />} />
    <Route
      element={
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="analytics" element={<Analytics />} />
      {/* A board of every slot rather than a list of uploads. A fixed segment
          outranks :resource, so the sidebar link and old bookmarks land here. */}
      <Route path="content/site-images" element={guarded('site-images', 'read', <SiteImages />)} />
      <Route path="content/:resource" element={<ResourcePage />} />
      <Route
        path="content/:resource/new"
        element={
          <RequireRole roles={['admin', 'editor']}>
            <ResourceFormPage />
          </RequireRole>
        }
      />
      <Route
        path="content/:resource/:id/edit"
        element={
          <RequireRole roles={['admin', 'editor']}>
            <ResourceFormPage />
          </RequireRole>
        }
      />
      <Route
        path="media"
        element={
          <RequirePermission
            resource="media-library"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <MediaLibrary />
          </RequirePermission>
        }
      />
      <Route
        path="reviews"
        element={
          <RequirePermission resource="reviews" action="read">
            <Reviews />
          </RequirePermission>
        }
      />
      <Route
        path="submissions"
        element={
          <RequirePermission
            resource="submissions"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <Submissions />
          </RequirePermission>
        }
      />
      <Route path="submissions/records/:id" element={<SubmissionDetail />} />
      <Route path="submissions/records/:id/edit" element={<SubmissionDetail edit />} />
      <Route
        path="submissions/:inbox"
        element={
          <RequirePermission
            resource="submissions"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <Submissions />
          </RequirePermission>
        }
      />
      <Route
        path="subscribers"
        element={
          <RequirePermission
            resource="subscribers"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <Subscribers />
          </RequirePermission>
        }
      />
      <Route
        path="donations"
        element={
          <RequireRole roles={['admin']}>
            <RequirePermission
              resource="donations"
              action="read"
              fallback={
                <Alert severity="warning">You do not have permission to view this page.</Alert>
              }
            >
              <Donations />
            </RequirePermission>
          </RequireRole>
        }
      />
      <Route
        path="privacy-requests"
        element={
          <RequirePermission
            resource="privacy-requests"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <PrivacyRequests />
          </RequirePermission>
        }
      />
      <Route
        path="site-settings"
        element={
          <RequirePermission
            resource="site-settings"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <SiteSettings />
          </RequirePermission>
        }
      />
      <Route
        path="social-connections"
        element={
          <RequireRole roles={['admin']}>
            <SocialConnections />
          </RequireRole>
        }
      />
      <Route
        path="events"
        element={
          <RequirePermission
            resource="events"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <Events />
          </RequirePermission>
        }
      />
      <Route
        path="events/:eventId"
        element={
          <RequirePermission
            resource="events"
            action="read"
            fallback={
              <Alert severity="warning">You do not have permission to view this page.</Alert>
            }
          >
            <EventDetail />
          </RequirePermission>
        }
      />
      <Route
        path="events/new"
        element={
          <RequireRole roles={['admin', 'editor']}>
            <RequirePermission resource="events" action="create">
              <EventEditor />
            </RequirePermission>
          </RequireRole>
        }
      />
      <Route
        path="events/:eventId/edit"
        element={
          <RequireRole roles={['admin', 'editor']}>
            <RequirePermission resource="events" action="update">
              <EventEditor />
            </RequirePermission>
          </RequireRole>
        }
      />
      <Route
        path="users/invite"
        element={
          <RequireRole roles={['admin']}>
            <RequirePermission resource="users" action="create">
              <UserAccessEditor />
            </RequirePermission>
          </RequireRole>
        }
      />
      <Route
        path="users/:userId/permissions"
        element={
          <RequireRole roles={['admin']}>
            <RequirePermission resource="users" action="update">
              <UserAccessEditor />
            </RequirePermission>
          </RequireRole>
        }
      />
      <Route
        path="users"
        element={
          <RequireRole roles={['admin']}>
            <RequirePermission resource="users" action="read">
              <Users />
            </RequirePermission>
          </RequireRole>
        }
      />
      {/* Work: projects and tasks. The first path segment is the permission
          key, which is how the sidebar decides what to show (nav-config). */}
      <Route path="projects" element={guarded('projects', 'read', deferred(<ProjectsPage />))} />
      <Route path="projects/new" element={editPage('projects', 'create', <ProjectEditorPage />)} />
      <Route
        path="projects/:projectId/edit"
        element={editPage('projects', 'update', <ProjectEditorPage />)}
      />
      <Route
        path="projects/:projectId"
        element={guarded('projects', 'read', deferred(<ProjectDetailLayout />))}
      >
        <Route index element={tab(<ProjectOverviewTab />)} />
        <Route path="tasks" element={tab(<ProjectTasksTab />)} />
        <Route path="milestones" element={tab(<ProjectMilestonesTab />)} />
        <Route path="media" element={tab(<ProjectMediaTab />)} />
        <Route path="impact" element={tab(<ProjectImpactTab />)} />
        <Route path="documents" element={tab(<ProjectDocumentsTab />)} />
        <Route path="activity" element={tab(<ProjectActivityTab />)} />
      </Route>
      {/* The fixed task paths come before :taskKey. The router ranks a fixed
          segment above a parameter anyway; the order is for the reader. */}
      <Route path="tasks" element={guarded('tasks', 'read', deferred(<MyTasksPage />))} />
      <Route path="tasks/all" element={guarded('tasks', 'read', deferred(<AllTasksPage />))} />
      <Route path="tasks/board" element={guarded('tasks', 'read', deferred(<TaskBoardPage />))} />
      <Route path="tasks/new" element={editPage('tasks', 'create', <TaskEditorPage />)} />
      <Route
        path="tasks/:taskKey"
        element={guarded('tasks', 'read', deferred(<TaskDetailPage />))}
      />
      <Route path="tasks/:taskKey/edit" element={editPage('tasks', 'update', <TaskEditorPage />)} />
      {/* Applications: the form builder and what people send through it. */}
      <Route path="forms" element={guarded('forms', 'read', deferred(<FormsPage />))} />
      <Route path="forms/new" element={editPage('forms', 'create', <FormEditorPage />)} />
      <Route
        path="forms/:formId"
        element={guarded('forms', 'read', deferred(<FormDetailPage />))}
      />
      <Route path="forms/:formId/edit" element={editPage('forms', 'update', <FormEditorPage />)} />
      <Route
        path="applications"
        element={guarded('applications', 'read', deferred(<ApplicationsPage />))}
      />
      <Route
        path="applications/review"
        element={guarded('applications', 'read', deferred(<ReviewQueuePage />))}
      />
      <Route
        path="applications/:applicationId"
        element={guarded('applications', 'read', deferred(<ApplicationDetailPage />))}
      />
      {/* Impact stories. Drafts and Published are separate addresses so the
          tab survives a reload and can be linked to. */}
      <Route
        path="impact-stories"
        element={guarded('impact-stories', 'read', deferred(<ImpactStoriesPage view="drafts" />))}
      />
      <Route
        path="impact-stories/published"
        element={guarded(
          'impact-stories',
          'read',
          deferred(<ImpactStoriesPage view="published" />),
        )}
      />
      <Route
        path="impact-stories/new"
        element={editPage('impact-stories', 'create', <ImpactStoryEditorPage />)}
      />
      <Route
        path="impact-stories/from-project/:projectId"
        // Copying a project into a story reads the project as well.
        element={editPage(
          'impact-stories',
          'create',
          guarded('projects', 'read', <StoryFromProjectPage />),
        )}
      />
      <Route
        path="impact-stories/:storyId/edit"
        element={editPage('impact-stories', 'update', <ImpactStoryEditorPage />)}
      />
      <Route path="account" element={<AccountLayout />}>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="edit" element={<EditProfile />} />
        <Route path="password" element={<UpdatePassword />} />
        <Route path="mfa" element={<MfaSetup />} />
        <Route
          path="notifications"
          element={
            <RequirePermission
              resource="submissions"
              action="read"
              fallback={
                <Alert severity="info">
                  You do not have permission to view submission notifications.
                </Alert>
              }
            >
              <Notifications />
            </RequirePermission>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route path="user-guide" element={<UserGuide />} />
      </Route>
    </Route>
  </Routes>
);
