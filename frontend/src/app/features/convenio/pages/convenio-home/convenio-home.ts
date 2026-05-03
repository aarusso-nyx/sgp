import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-convenio-home',
  standalone: false,
  templateUrl: './convenio-home.html',
  styleUrl: './convenio-home.scss',
})
export class ConvenioHome {}
