import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { TaskService } from './services/task';
import { TaskTypeService } from './services/task-type';
import { ThemeService } from './services/theme';
import { AuthComponent } from './components/auth/auth';
import { TopbarComponent } from './components/topbar/topbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthComponent, TopbarComponent],
  templateUrl: './taskmanager.html',
  styleUrl: './taskmanager.css'
})
export class App {
  @HostBinding('class.dark') get isDark() { return this.theme.dark(); }

  // TaskService injected so it's instantiated on boot — its constructor
  // restores the logged-in user's tasks from localStorage.
  constructor(public auth: AuthService, public theme: ThemeService, _taskSvc: TaskService, _typeSvc: TaskTypeService) {}
}
