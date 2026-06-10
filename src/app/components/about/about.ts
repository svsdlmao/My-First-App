import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class AboutComponent {
  readonly open  = input<boolean>(false);
  readonly close = output<void>();
}
