import { Component } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { TaskListComponent } from '../../components/task-list/task-list';

@Component({
  selector: 'app-tasks-page',
  imports: [SidebarComponent, TaskListComponent],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.css'
})
export class TasksPageComponent {}
