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
import SiteSettings from '../pages/SiteSettings';
import SocialConnections from '../pages/SocialConnections';
import SubmissionDetail from '../pages/SubmissionDetail';
import Submissions from '../pages/Submissions';
import Subscribers from '../pages/Subscribers';
import UserAccessEditor from '../pages/UserAccessEditor';
import Users from '../pages/Users';

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
