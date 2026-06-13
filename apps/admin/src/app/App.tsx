import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from '../auth/RequireAuth';
import { AppShell } from '../components/layout/AppShell';
import Dashboard from '../pages/Dashboard';
import Donations from '../pages/Donations';
import Login from '../pages/Login';
import ResourcePage from '../pages/ResourcePage';
import Submissions from '../pages/Submissions';
import Subscribers from '../pages/Subscribers';
import Users from '../pages/Users';

/** Admin route table: a public login and an authenticated console shell. */
export const App = (): JSX.Element => (
  <Routes>
    <Route path="/login" element={<Login />} />
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
      <Route path="subscribers" element={<Subscribers />} />
      <Route path="donations" element={<Donations />} />
      <Route path="users" element={<Users />} />
    </Route>
  </Routes>
);
