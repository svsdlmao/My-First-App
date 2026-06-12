import { Component, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TaskService } from '../../services/task';
import { TaskTypeService } from '../../services/task-type';
import { ThemeService } from '../../services/theme';
import type { Task } from '../../services/task';

@Component({
  selector: 'app-task-list',
  imports: [FormsModule],
  templateUrl: './task-list.html',
  styleUrl: './task-list.css'
})
export class TaskListComponent {
  filter: 'All' | Task['status'] = 'All';
  sortDir: 'asc' | 'desc' | null = null;
  searchQuery = '';
  view: 'list' | 'grid' = (localStorage.getItem('taskView') as 'list' | 'grid') || 'list';
  archiveOpen = true;
  formOpen = false;
  editingId: number | null = null;
  titleInput = '';
  descInput = '';
  statusInput: Task['status'] = 'Todo';
  dueDateInput = '';
  typeInput: number | null = null;

  private readonly API_URL = 'https://assistai-ezsf.onrender.com/api/ai/help';
  /** Cache: task.id → raw HTML string (from API's `html` field) */
  private helpCache = new Map<number, string>();
  /** Cache: task.id → which (title,desc) was used so cache invalidates on edit */
  private helpCacheKey = new Map<number, string>();

  constructor(public taskSvc: TaskService, public typeSvc: TaskTypeService, private theme: ThemeService, private sanitizer: DomSanitizer) {
    // Pre-warm the API on app boot. Render free-tier servers sleep when idle,
    // so the 30-second cold start happens in the background instead of when
    // the user actually clicks Help.
    fetch(this.API_URL, { method: 'OPTIONS' }).catch(() => {});

    // Whenever the raw help HTML OR the theme changes, rebuild a themed document
    // and expose it as a Blob URL. We load the iframe from this URL instead of
    // srcdoc because Angular's sanitizer strips <style>/<head> out of srcdoc,
    // which was wiping our theme. A Blob URL loads as a real, isolated document.
    effect(() => {
      const raw = this.helpRawResponse();
      if (this.currentBlobUrl) { URL.revokeObjectURL(this.currentBlobUrl); this.currentBlobUrl = null; }
      if (!raw) { this.helpUrl.set(null); return; }
      const html = this.themeWrap(raw);            // reads theme.dark() → tracked
      const blob = new Blob([html], { type: 'text/html' });
      this.currentBlobUrl = URL.createObjectURL(blob);
      this.helpUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.currentBlobUrl));
    });
  }

  // ── Task form ──
  openAdd() {
    this.editingId = null;
    this.titleInput = ''; this.descInput = ''; this.statusInput = 'Todo'; this.dueDateInput = ''; this.typeInput = null;
    this.formOpen = true;
  }

  openEdit(id: number) {
    const task = this.taskSvc.tasks().find(t => t.id === id);
    if (!task) return;
    this.editingId = id;
    this.titleInput = task.title; this.descInput = task.description;
    this.statusInput = task.status; this.dueDateInput = task.dueDate ?? ''; this.typeInput = task.typeId ?? null;
    this.formOpen = true;
  }

  saveTask() {
    const title = this.titleInput.trim();
    if (!title) { alert('Title is required.'); return; }
    if (this.editingId === null) {
      this.taskSvc.add(title, this.descInput.trim(), this.statusInput, this.dueDateInput, this.typeInput);
    } else {
      this.taskSvc.update(this.editingId, title, this.descInput.trim(), this.statusInput, this.dueDateInput, this.typeInput);
    }
    this.formOpen = false;
  }

  // ── Due date helpers ──
  /** Format YYYY-MM-DD as e.g. "Jun 15" (adds year only if not the current year) */
  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric',
      year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
    });
  }

  /** True if dueDate is before today AND the task isn't Done */
  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'Done') return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate + 'T00:00:00');
    return due < today;
  }

  // ── Sort / filter ──
  toggleSort() {
    if (this.sortDir === null)       this.sortDir = 'asc';
    else if (this.sortDir === 'asc') this.sortDir = 'desc';
    else                             this.sortDir = null;
    this.resetPage();
  }

  filtered() { return this.taskSvc.filtered(this.filter, this.sortDir, this.searchQuery); }

  setView(v: 'list' | 'grid') {
    this.view = v;
    localStorage.setItem('taskView', v);
  }

  // ── Pagination ──
  pageSize = 10;            // 0 = "All"
  currentPage = 1;

  /** Reset to the first page (call when filter/search/sort/page-size changes). */
  resetPage() { this.currentPage = 1; }

  private effectiveSize(): number {
    return this.pageSize === 0 ? Math.max(1, this.filtered().length) : this.pageSize;
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered().length / this.effectiveSize()));
  }

  /** currentPage clamped into the valid [1, totalPages] range. */
  clampedPage(): number {
    return Math.min(Math.max(1, this.currentPage), this.totalPages());
  }

  /** Just the tasks for the current page. */
  paged(): Task[] {
    const all = this.filtered();
    if (this.pageSize === 0) return all;
    const start = (this.clampedPage() - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  /** A small window of page numbers to render as buttons. */
  pageNumbers(): number[] {
    const total = this.totalPages();
    const cur = this.clampedPage();
    const max = 5;
    let start = Math.max(1, cur - Math.floor(max / 2));
    const end = Math.min(total, start + max - 1);
    start = Math.max(1, end - max + 1);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }

  rangeStart(): number {
    return this.filtered().length === 0 ? 0 : (this.clampedPage() - 1) * this.effectiveSize() + 1;
  }
  rangeEnd(): number {
    return Math.min(this.filtered().length, this.clampedPage() * this.effectiveSize());
  }
  prevPage() { if (this.clampedPage() > 1) this.currentPage = this.clampedPage() - 1; }
  nextPage() { if (this.clampedPage() < this.totalPages()) this.currentPage = this.clampedPage() + 1; }

  /** The exact color of a task's assigned type, or null if it has none. */
  typeColor(task: Task): string | null {
    return this.typeSvc.byId(task.typeId)?.color ?? null;
  }

  /** Black or white text, whichever is readable on the type color. */
  textColor(task: Task): string | null {
    const c = this.typeColor(task);
    if (!c) return null;
    return this.isLight(c) ? '#111111' : '#ffffff';
  }

  /** Name of a task's assigned type (for the row tooltip). */
  typeName(task: Task): string {
    return this.typeSvc.byId(task.typeId)?.name ?? '';
  }

  /** Perceived-brightness check so we pick a contrasting text color. */
  private isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
    const r = parseInt(full.substring(0, 2), 16) || 0;
    const g = parseInt(full.substring(2, 4), 16) || 0;
    const b = parseInt(full.substring(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  }

  // ── Help (signals so async updates trigger re-render in zoneless mode) ──
  helpOpen        = signal(false);
  helpLoading     = signal(false);
  helpRawResponse = signal('');                       // raw HTML from API
  helpTaskTitle   = signal('');
  helpUrl         = signal<SafeResourceUrl | null>(null); // Blob URL for the iframe
  private currentBlobUrl: string | null = null;
  private helpTaskId = 0;
  private helpTaskDesc = '';
  private fetching = false;

  openHelp(task: Task) {
    this.helpTaskId = task.id;
    this.helpTaskTitle.set(task.title);
    this.helpTaskDesc = task.description;
    this.helpOpen.set(true);

    // Cache hit → show instantly, no API call
    const key = `${task.title}|${task.description}`;
    if (this.helpCache.has(task.id) && this.helpCacheKey.get(task.id) === key) {
      this.helpRawResponse.set(this.helpCache.get(task.id)!);
      this.helpLoading.set(false);
      return;
    }
    this.helpRawResponse.set('');
    this.fetchHelp();
  }

  closeHelp() { this.helpOpen.set(false); }

  async fetchHelp() {
    if (this.fetching) return;          // ignore double-clicks
    this.fetching = true;
    this.helpLoading.set(true);
    this.helpRawResponse.set('');
    try {
      const res = await fetch(this.API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: this.helpTaskTitle(), description: this.helpTaskDesc })
      });
      const data = await res.json();
      // API returns a pre-rendered HTML document in `data.html`. Append a unique
      // marker so the iframe's srcdoc is always a different string on Retry,
      // forcing a reload even when the API returns identical HTML.
      const baseHtml = data?.html ?? '<p>No response received.</p>';
      const html = baseHtml + `<!-- fetched:${Date.now()} -->`;
      this.helpRawResponse.set(html);
      this.helpCache.set(this.helpTaskId, html);
      this.helpCacheKey.set(this.helpTaskId, `${this.helpTaskTitle()}|${this.helpTaskDesc}`);
    } catch {
      this.helpRawResponse.set('<p style="font-family:sans-serif;padding:20px;color:#dc2626">Failed to get help. Please check your connection and try again.</p>');
    } finally {
      this.helpLoading.set(false);
      this.fetching = false;
    }
  }

  /** Rebuild the API HTML as a clean, theme-matched document for the iframe. */
  private themeWrap(apiHtml: string): string {
    const d = this.theme.dark();
    const c = {
      bg:        d ? '#0f172a' : '#ffffff',
      text:      d ? '#cbd5e1' : '#1e293b',
      heading:   d ? '#f1f5f9' : '#0f172a',
      thBg:      d ? '#4f46e5' : '#6366f1',
      thText:    '#ffffff',
      codeBg:    d ? '#1e1b4b' : '#eef2ff',
      codeText:  d ? '#818cf8' : '#4f46e5',
      border:    d ? '#334155' : '#e2e8f0',
      altRow:    d ? '#1e293b' : '#fafbff',
      scrollbar: d ? '#334155' : '#cbd5e1',
      link:      '#6366f1'
    };

    // Take ONLY the body's inner content (ignore the API's <head>/<style> entirely),
    // then strip every styling hook so nothing can fight our theme:
    //  - <style>/<script>/<link> blocks
    //  - inline style="..." attributes  ← the real culprit (beat stylesheet rules)
    //  - class="..." and legacy color/size attributes
    const bodyMatch = apiHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let inner = bodyMatch ? bodyMatch[1] : apiHtml;
    inner = inner
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<link[^>]*?>/gi, '')
      .replace(/\sstyle="[^"]*"/gi, '')
      .replace(/\sstyle='[^']*'/gi, '')
      .replace(/\sclass="[^"]*"/gi, '')
      .replace(/\sclass='[^']*'/gi, '')
      .replace(/\s(?:bgcolor|color|text|alink|vlink|link|width|height|align|valign)="[^"]*"/gi, '');

    const styles = `<style>
      html, html body { background:${c.bg}!important; color:${c.text}!important;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important;
        margin:0!important; padding:0!important; }
      html body { padding:28px 36px!important; line-height:1.7!important; font-size:0.95rem!important; }
      html body * { color:${c.text}!important; background-color:transparent!important; border-color:${c.border}!important; }
      html body h1, html body h2, html body h3, html body h4, html body h5, html body h6 {
        color:${c.heading}!important; margin:18px 0 10px!important; line-height:1.3!important; font-weight:700!important; }
      html body h1 { font-size:1.4rem!important; }
      html body h2 { font-size:1.2rem!important; }
      html body h3 { font-size:1.05rem!important; }
      html body strong, html body b { color:${c.heading}!important; font-weight:700!important; }
      html body em, html body i { color:${c.text}!important; font-style:italic!important; }
      html body p { margin:8px 0!important; }
      html body a { color:${c.link}!important; text-decoration:none!important; border-bottom:1px solid transparent!important; }
      html body a:hover { border-bottom-color:${c.link}!important; }
      html body code, html body kbd, html body samp {
        background:${c.codeBg}!important; color:${c.codeText}!important; padding:2px 7px!important;
        border-radius:5px!important; font-size:0.88em!important;
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important; }
      html body pre { background:${c.codeBg}!important; padding:14px 16px!important; border-radius:8px!important;
        overflow-x:auto!important; font-size:0.88rem!important; margin:12px 0!important; }
      html body pre, html body pre * { color:${c.codeText}!important; background:transparent!important; }
      html body pre { background:${c.codeBg}!important; }
      html body hr { border:none!important; border-top:1px solid ${c.border}!important; margin:20px 0!important; }
      html body ul, html body ol { padding-left:24px!important; margin:10px 0!important; }
      html body li { margin-bottom:6px!important; }
      html body table { border-collapse:collapse!important; width:100%!important; margin:14px 0!important; }
      html body th { background:${c.thBg}!important; color:${c.thText}!important; padding:10px 14px!important;
        text-align:left!important; font-size:0.85rem!important; border:none!important; }
      html body th, html body th * { color:${c.thText}!important; }
      html body td { padding:10px 14px!important; border:none!important; border-bottom:1px solid ${c.border}!important;
        vertical-align:top!important; background:transparent!important; color:${c.text}!important; }
      html body tr:last-child td { border-bottom:none!important; }
      html body tbody tr:nth-child(even) td { background:${c.altRow}!important; }
      html body blockquote { border-left:3px solid ${c.link}!important; padding:6px 14px!important;
        margin:12px 0!important; background:${c.codeBg}!important; border-radius:0 8px 8px 0!important; }
      html ::-webkit-scrollbar { width:10px; height:10px; }
      html ::-webkit-scrollbar-thumb { background:${c.scrollbar}; border-radius:5px; }
      html ::-webkit-scrollbar-thumb:hover { background:${c.link}; }
      html ::-webkit-scrollbar-track { background:transparent; }
    </style>`;

    // Preserve the cache-buster marker so the iframe's srcdoc stays unique per fetch.
    const marker = apiHtml.match(/<!-- fetched:\d+ -->/)?.[0] ?? '';

    // Build a brand-new document we fully control — no API CSS can interfere.
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body>${inner}${marker}</body></html>`;
  }
}
