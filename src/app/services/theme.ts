import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(false);

  constructor() {
    this.dark.set(localStorage.getItem('dark') === 'true');
    this.apply();
  }

  toggle() {
    this.dark.set(!this.dark());
    this.apply();
    localStorage.setItem('dark', String(this.dark()));
  }

  private apply() {
    document.body.classList.toggle('dark', this.dark());
    document.documentElement.classList.toggle('dark', this.dark());
  }
}
