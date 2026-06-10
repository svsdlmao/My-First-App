import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';
import { TaskService } from '../../services/task';
import { ThemeService } from '../../services/theme';
import { AboutComponent } from '../about/about';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, RouterLinkActive, AboutComponent],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class TopbarComponent {
  userMenuOpen = false;
  confirmDelete = false;
  aboutOpen = false;

  constructor(public auth: AuthService, public theme: ThemeService, private taskSvc: TaskService) {}

  logout() {
    this.auth.logout();
    this.taskSvc.clear();
  }

  deleteAccount() {
    this.auth.deleteAccount();
    this.taskSvc.clear();
    this.confirmDelete = false;
  }
}
