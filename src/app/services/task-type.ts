import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';

const API = 'https://tasks-api-z2qk.onrender.com';//'http://localhost:3000';

export interface TaskType {
  id: number;
  name: string;
  color: string; // hex
}

@Injectable({ providedIn: 'root' })
export class TaskTypeService {
  private http = inject(HttpClient);

  readonly types = signal<TaskType[]>([]);

  constructor(private auth: AuthService) {
    if (this.auth.isLoggedIn()) this.load();
  }

  async load() {
    try {
      this.types.set(await firstValueFrom(this.http.get<TaskType[]>(`${API}/types`)));
    } catch {
      this.types.set([]);
    }
  }

  clear() {
    this.types.set([]);
  }

  async add(name: string, color: string) {
    const created = await firstValueFrom(
      this.http.post<TaskType>(`${API}/types`, { name, color })
    );
    this.types.update(list => [...list, created]);
  }

  async remove(id: number) {
    await firstValueFrom(this.http.delete(`${API}/types/${id}`));
    this.types.update(list => list.filter(t => t.id !== id));
  }

  /** Look up a type by id (for resolving a task's color/name). */
  byId(id: number | null | undefined): TaskType | undefined {
    if (id == null) return undefined;
    return this.types().find(t => t.id === id);
  }
}
