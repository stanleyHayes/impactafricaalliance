import type { AdminResource, PermissionAction } from '@iaa/shared';
import Alert from '@mui/material/Alert';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '../auth/RequireAuth';
import { RequirePermission } from '../auth/RequirePermission';
import { RequireRole } from '../auth/RequireRole';
import { AppShell } from '../components/layout/AppShell';
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
import ApplicationDetailPage from '../pages/applications/ApplicationDetailPage';
import ApplicationsPage from '../pages/applications/ApplicationsPage';
import ReviewQueuePage from '../pages/applications/ReviewQueuePage';
import Dashboard from '../pages/Dashboard';
import Donations from '../pages/Donations';
import EventDetail from '../pages/EventDetail';
import EventEditor from '../pages/EventEditor';
import Events from '../pages/Events';
import FormDetailPage from '../pages/forms/FormDetailPage';
import FormEditorPage from '../pages/forms/FormEditorPage';
import FormsPage from '../pages/forms/FormsPage';
import ImpactStoriesPage from '../pages/impact-stories/ImpactStoriesPage';
import ImpactStoryEditorPage from '../pages/impact-stories/ImpactStoryEditorPage';
import StoryFromProjectPage from '../pages/impact-stories/StoryFromProjectPage';
import Login from '../pages/Login';
import MediaLibrary from '../pages/MediaLibrary';
import PrivacyRequests from '../pages/PrivacyRequests';
import ProjectActivityTab from '../pages/projects/ProjectActivityTab';
import ProjectDetailLayout from '../pages/projects/ProjectDetailLayout';
import ProjectDocumentsTab from '../pages/projects/ProjectDocumentsTab';
import ProjectEditorPage from '../pages/projects/ProjectEditorPage';
import ProjectImpactTab from '../pages/projects/ProjectImpactTab';
import ProjectMediaTab from '../pages/projects/ProjectMediaTab';
import ProjectMilestonesTab from '../pages/projects/ProjectMilestonesTab';
import ProjectOverviewTab from '../pages/projects/ProjectOverviewTab';
import ProjectsPage from '../pages/projects/ProjectsPage';
import ProjectTasksTab from '../pages/projects/ProjectTasksTab';
import ResetPassword from '../pages/ResetPassword';
import ResourceFormPage from '../pages/ResourceFormPage';
import ResourcePage from '../pages/ResourcePage';
import Reviews from '../pages/Reviews';
import SiteSettings from '../pages/SiteSettings';
import SocialConnections from '../pages/SocialConnections';
import SubmissionDetail from '../pages/SubmissionDetail';
import Submissions from '../pages/Submissions';
import Subscribers from '../pages/Subscribers';
import AllTasksPage from '../pages/tasks/AllTasksPage';
import MyTasksPage from '../pages/tasks/MyTasksPage';
import TaskBoardPage from '../pages/tasks/TaskBoardPage';
import TaskDetailPage from '../pages/tasks/TaskDetailPage';
import TaskEditorPage from '../pages/tasks/TaskEditorPage';
import UserAccessEditor from '../pages/UserAccessEditor';
import Users from '../pages/Users';

const NO_PERMISSION = (
  <Alert severity="warning">You do not have permission to view this page.</Alert>
);

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
  <RequireRole roles={['admin', 'editor']}>{guarded(resource, action, page)}</RequireRole>
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
      <Route path="projects" element={guarded('projects', 'read', <ProjectsPage />)} />
      <Route path="projects/new" element={editPage('projects', 'create', <ProjectEditorPage />)} />
      <Route
        path="projects/:projectId/edit"
        element={editPage('projects', 'update', <ProjectEditorPage />)}
      />
      <Route
        path="projects/:projectId"
        element={guarded('projects', 'read', <ProjectDetailLayout />)}
      >
        <Route index element={<ProjectOverviewTab />} />
        <Route path="tasks" element={<ProjectTasksTab />} />
        <Route path="milestones" element={<ProjectMilestonesTab />} />
        <Route path="media" element={<ProjectMediaTab />} />
        <Route path="impact" element={<ProjectImpactTab />} />
        <Route path="documents" element={<ProjectDocumentsTab />} />
        <Route path="activity" element={<ProjectActivityTab />} />
      </Route>
      {/* The fixed task paths come before :taskKey. The router ranks a fixed
          segment above a parameter anyway; the order is for the reader. */}
      <Route path="tasks" element={guarded('tasks', 'read', <MyTasksPage />)} />
      <Route path="tasks/all" element={guarded('tasks', 'read', <AllTasksPage />)} />
      <Route path="tasks/board" element={guarded('tasks', 'read', <TaskBoardPage />)} />
      <Route path="tasks/new" element={editPage('tasks', 'create', <TaskEditorPage />)} />
      <Route path="tasks/:taskKey" element={guarded('tasks', 'read', <TaskDetailPage />)} />
      <Route path="tasks/:taskKey/edit" element={editPage('tasks', 'update', <TaskEditorPage />)} />
      {/* Applications: the form builder and what people send through it. */}
      <Route path="forms" element={guarded('forms', 'read', <FormsPage />)} />
      <Route path="forms/new" element={editPage('forms', 'create', <FormEditorPage />)} />
      <Route path="forms/:formId" element={guarded('forms', 'read', <FormDetailPage />)} />
      <Route path="forms/:formId/edit" element={editPage('forms', 'update', <FormEditorPage />)} />
      <Route path="applications" element={guarded('applications', 'read', <ApplicationsPage />)} />
      <Route
        path="applications/review"
        element={guarded('applications', 'read', <ReviewQueuePage />)}
      />
      <Route
        path="applications/:applicationId"
        element={guarded('applications', 'read', <ApplicationDetailPage />)}
      />
      {/* Impact stories. Drafts and Published are separate addresses so the
          tab survives a reload and can be linked to. */}
      <Route
        path="impact-stories"
        element={guarded('impact-stories', 'read', <ImpactStoriesPage view="drafts" />)}
      />
      <Route
        path="impact-stories/published"
        element={guarded('impact-stories', 'read', <ImpactStoriesPage view="published" />)}
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
