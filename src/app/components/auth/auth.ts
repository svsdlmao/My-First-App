import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { TaskService } from '../../services/task';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthComponent {
  authMode: 'signin' | 'signup' = 'signin';
  authName = '';
  authEmail = '';
  authPassword = '';
  authConfirm = '';
  authError = '';
  loading = false;

  constructor(public auth: AuthService, public theme: ThemeService, private taskSvc: TaskService) {}

  async signup() {
    this.loading = true;
    this.authError = await this.auth.signup(this.authName, this.authEmail, this.authPassword, this.authConfirm);
    this.loading = false;
    if (!this.authError) { this.taskSvc.load(); this.reset(); }
  }

  async signin() {
    this.loading = true;
    this.authError = await this.auth.signin(this.authEmail, this.authPassword);
    this.loading = false;
    if (!this.authError) { this.taskSvc.load(); this.reset(); }
  }

  private reset() {
    this.authName = ''; this.authEmail = ''; this.authPassword = ''; this.authConfirm = '';
  }
}
