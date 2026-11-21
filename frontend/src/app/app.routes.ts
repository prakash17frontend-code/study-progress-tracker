
import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { MentorDashboard } from './pages/mentor-dashboard/mentor-dashboard';
import { AiPlanner } from './pages/ai-planner/ai-planner';
import { MentorSettings } from './pages/mentor-settings/mentor-settings';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'mentor-dashboard', component: MentorDashboard },
  { path: 'mentor-settings', component: MentorSettings },
  { path: 'ai-planner', component: AiPlanner },
  { path: '**', redirectTo: 'login' }
];
