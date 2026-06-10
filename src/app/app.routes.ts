import { Routes } from '@angular/router';
import { TasksPageComponent } from './pages/tasks-page/tasks-page';
import { ReportsComponent } from './components/reports/reports';

export const routes: Routes = [
  { path: '',        pathMatch: 'full', redirectTo: 'tasks' },
  { path: 'tasks',   component: TasksPageComponent },
  { path: 'reports', component: ReportsComponent },
  { path: '**',      redirectTo: 'tasks' }
];
