import { Component } from '@angular/core';
import { TaskService } from '../../services/task';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  constructor(public taskSvc: TaskService) {}
}
