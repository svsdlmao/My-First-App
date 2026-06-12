import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task';
import { TaskTypeService } from '../../services/task-type';

@Component({
  selector: 'app-sidebar',
  imports: [FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  newTypeName = '';
  newTypeColor = '#6366f1';
  adding = false;

  constructor(public taskSvc: TaskService, public typeSvc: TaskTypeService) {}

  async addType() {
    const name = this.newTypeName.trim();
    if (!name) return;
    this.adding = true;
    try {
      await this.typeSvc.add(name, this.newTypeColor);
      this.newTypeName = '';
      this.newTypeColor = '#6366f1';
    } finally {
      this.adding = false;
    }
  }

  removeType(id: number) {
    this.typeSvc.remove(id);
  }
}
