import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-relatorio-home',
  standalone: false,
  templateUrl: './relatorio-home.html',
  styleUrl: './relatorio-home.scss',
})
export class RelatorioHome {}
