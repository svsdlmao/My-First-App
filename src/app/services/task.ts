import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth';

const API = 'http://localhost:3000';

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'Todo' | 'In Progress' | 'Done';
  dueDate?: string | null; // "YYYY-MM-DD" — optional
  archived?: boolean;
}

interface TasksResponse {
  active: Task[];
  archived: Task[];
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);

  readonly tasks    = signal<Task[]>([]);
  readonly archived = signal<Task[]>([]);

  readonly totalCount      = computed(() => this.tasks().length);
  readonly archivedCount   = computed(() => this.archived().length);
  readonly todoCount       = computed(() => this.tasks().filter(t => t.status === 'Todo').length);
  readonly inProgressCount = computed(() => this.tasks().filter(t => t.status === 'In Progress').length);
  readonly doneCount       = computed(() => this.tasks().filter(t => t.status === 'Done').length);

  constructor(private auth: AuthService) {
    // If a session was restored on boot, fetch that user's tasks from the API.
    if (this.auth.isLoggedIn()) this.load();
  }

  async load() {
    try {
      const res = await firstValueFrom(this.http.get<TasksResponse>(`${API}/tasks`));
      this.tasks.set(res.active);
      this.archived.set(res.archived);
    } catch {
      this.tasks.set([]);
      this.archived.set([]);
    }
  }

  clear() {
    this.tasks.set([]);
    this.archived.set([]);
  }

  async add(title: string, description: string, status: Task['status'], dueDate = '') {
    const created = await firstValueFrom(
      this.http.post<Task>(`${API}/tasks`, { title, description, status, dueDate: dueDate || null })
    );
    this.tasks.update(list => [...list, created]);
  }

  async update(id: number, title: string, description: string, status: Task['status'], dueDate = '') {
    const updated = await firstValueFrom(
      this.http.patch<Task>(`${API}/tasks/${id}`, { title, description, status, dueDate: dueDate || null })
    );
    this.tasks.update(list => list.map(t => (t.id === id ? updated : t)));
  }

  async delete(id: number) {
    const archivedTask = await firstValueFrom(this.http.delete<Task>(`${API}/tasks/${id}`));
    this.tasks.update(list => list.filter(t => t.id !== id));
    this.archived.update(a => [...a, archivedTask]);
  }

  async restore(id: number) {
    const restored = await firstValueFrom(this.http.post<Task>(`${API}/tasks/${id}/restore`, {}));
    this.archived.update(a => a.filter(t => t.id !== id));
    this.tasks.update(list => [...list, restored]);
  }

  filtered(filter: 'All' | Task['status'], sortDir: 'asc' | 'desc' | null, search = ''): Task[] {
    let result = filter === 'All' ? this.tasks() : this.tasks().filter(t => t.status === filter);
    const q = search.trim().toLowerCase();
    if (q) result = result.filter(t =>
      t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
    if (sortDir === 'asc')  return [...result].sort((a, b) => a.title.localeCompare(b.title));
    if (sortDir === 'desc') return [...result].sort((a, b) => b.title.localeCompare(a.title));
    return result;
  }
}
