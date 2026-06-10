import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import * as XLSX from 'xlsx';
import { TaskService } from '../../services/task';
import type { Task } from '../../services/task';

interface ExportRow {
  id: number;
  title: string;
  description: string;
  status: string;
  dueDate: string;
  archived: 'Yes' | 'No';
}

@Component({
  selector: 'app-reports',
  imports: [RouterLink],
  templateUrl: './reports.html',
  styleUrl: './reports.css'
})
export class ReportsComponent {
  importMessage = signal('');
  importError   = signal(false);

  constructor(public taskSvc: TaskService) {}

  private buildRows(): ExportRow[] {
    const active   = this.taskSvc.tasks().map(t => this.toRow(t, 'No'));
    const archived = this.taskSvc.archived().map(t => this.toRow(t, 'Yes'));
    return [...active, ...archived];
  }

  private toRow(t: Task, archived: 'Yes' | 'No'): ExportRow {
    return { id: t.id, title: t.title, description: t.description, status: t.status, dueDate: t.dueDate ?? '', archived };
  }

  exportXlsx() {
    const rows = this.buildRows();
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Tasks');
    XLSX.writeFile(book, `tasks_${this.timestamp()}.xlsx`);
  }

  exportCsv() {
    const rows = this.buildRows();
    const sheet = XLSX.utils.json_to_sheet(rows);
    const csv   = XLSX.utils.sheet_to_csv(sheet);
    this.download(csv, `tasks_${this.timestamp()}.csv`, 'text/csv;charset=utf-8;');
  }

  async onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    try {
      const buf  = await file.arrayBuffer();
      const book = XLSX.read(buf, { type: 'array' });
      const sheet = book.Sheets[book.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json<Partial<ExportRow>>(sheet);

      let added = 0;
      for (const r of rows) {
        const title = (r.title ?? '').toString().trim();
        if (!title) continue;
        const status  = this.normaliseStatus(r.status?.toString());
        const dueDate = this.normaliseDate(r.dueDate);
        await this.taskSvc.add(title, (r.description ?? '').toString(), status, dueDate);
        added++;
      }

      this.importError.set(false);
      this.importMessage.set(`Imported ${added} task${added === 1 ? '' : 's'}.`);
    } catch (e) {
      this.importError.set(true);
      this.importMessage.set('Failed to import file. Make sure it is a valid .xlsx or .csv with columns: title, description, status.');
    } finally {
      input.value = '';
    }
  }

  /** Accept Date objects, Excel serial dates, or YYYY-MM-DD strings; return YYYY-MM-DD or '' */
  private normaliseDate(v: unknown): string {
    if (!v) return '';
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number') {
      // Excel serial date: days since 1899-12-30
      const ms = (v - 25569) * 86400 * 1000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private normaliseStatus(s?: string): Task['status'] {
    const v = (s ?? '').trim().toLowerCase();
    if (v === 'in progress' || v === 'inprogress' || v === 'in-progress') return 'In Progress';
    if (v === 'done' || v === 'complete' || v === 'completed')            return 'Done';
    return 'Todo';
  }

  private download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private timestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }
}
