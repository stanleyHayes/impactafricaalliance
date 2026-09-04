import { Navigate, Route, Routes } from 'react-router-dom';


import { RequireAuth } from '../auth/RequireAuth';
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
import Dashboard from '../pages/Dashboard';
import Donations from '../pages/Donations';
import Events from '../pages/Events';
import Login from '../pages/Login';
import PrivacyRequests from '../pages/PrivacyRequests';
import ResetPassword from '../pages/ResetPassword';
import ResourcePage from '../pages/ResourcePage';
import SiteSettings from '../pages/SiteSettings';
import SocialConnections from '../pages/SocialConnections';
import Submissions from '../pages/Submissions';
import Subscribers from '../pages/Subscribers';
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
      <Route path="content/:resource" element={<ResourcePage />} />
      <Route path="submissions" element={<Submissions />} />
      <Route path="submissions/:inbox" element={<Submissions />} />
      <Route path="subscribers" element={<Subscribers />} />
      <Route path="donations" element={<Donations />} />
      <Route path="privacy-requests" element={<PrivacyRequests />} />
      <Route path="site-settings" element={<SiteSettings />} />
      <Route
        path="social-connections"
        element={
          <RequireRole roles={['admin']}>
            <SocialConnections />
          </RequireRole>
        }
      />
      <Route path="events" element={<Events />} />
      <Route
        path="users"
        element={
          <RequireRole roles={['admin']}>
            <Users />
          </RequireRole>
        }
      />
      <Route path="account" element={<AccountLayout />}>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<Profile />} />
        <Route path="edit" element={<EditProfile />} />
        <Route path="password" element={<UpdatePassword />} />
        <Route path="mfa" element={<MfaSetup />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="user-guide" element={<UserGuide />} />
      </Route>
    </Route>
  </Routes>
);
