import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const API = 'https://tasks-api-z2qk.onrender.com';//'http://localhost:3000';

export interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn  = signal(false);

  constructor() {
    // Restore session from a previously stored JWT + user.
    const token = localStorage.getItem('token');
    const user  = localStorage.getItem('user');
    if (token && user) {
      this.currentUser.set(JSON.parse(user));
      this.isLoggedIn.set(true);
    }
  }

  /** Returns an error string, or '' on success. */
  async signup(name: string, email: string, password: string, confirm: string): Promise<string> {
    if (!name.trim())          return 'Name is required.';
    if (!email.trim())         return 'Email is required.';
    if (password.length < 6)   return 'Password must be at least 6 characters.';
    if (password !== confirm)  return 'Passwords do not match.';
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${API}/auth/signup`, { name, email, password })
      );
      this.startSession(res.token, res.user);
      return '';
    } catch (e) {
      return this.errorMsg(e, 'Sign up failed. Is the server running?');
    }
  }

  /** Returns an error string, or '' on success. */
  async signin(email: string, password: string): Promise<string> {
    if (!email.trim() || !password) return 'Email and password are required.';
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${API}/auth/login`, { email, password })
      );
      this.startSession(res.token, res.user);
      return '';
    } catch (e) {
      return this.errorMsg(e, 'Sign in failed. Is the server running?');
    }
  }

  logout() {
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async deleteAccount(): Promise<void> {
    try { await firstValueFrom(this.http.delete(`${API}/auth/account`)); } catch { /* ignore */ }
    this.logout();
  }

  private startSession(token: string, user: User) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
  }

  private errorMsg(e: any, fallback: string): string {
    const m = e?.error?.message;
    if (Array.isArray(m)) return m[0];
    return m || fallback;
  }
}
