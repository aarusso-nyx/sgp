import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-geofence-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './geofence-admin.html',
  styleUrl: './geofence-admin.scss',
})
export class GeofenceAdmin {
  private readonly formBuilder = inject(UntypedFormBuilder);
  readonly form = this.formBuilder.group({
    workLocationId: ['', [Validators.required]],
    polygonText: [
      '-23.550700,-46.633600\n-23.550700,-46.632900\n-23.550200,-46.632900\n-23.550200,-46.633600',
      [Validators.required],
    ],
  });

  readonly points = signal<Array<{ lat: number; lon: number }>>([]);
  readonly valid = computed(
    () => this.points().length >= 3 && !this.hasSelfIntersection(this.points()),
  );
  message = '';

  preview(): void {
    const points = String(this.form.value.polygonText ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [lat, lon] = line.split(',').map((value) => Number(value.trim()));
        return { lat, lon };
      })
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    this.points.set(points);
    this.message = this.valid() ? 'Poligono valido para salvar.' : 'Poligono invalido.';
  }

  private hasSelfIntersection(points: Array<{ lat: number; lon: number }>): boolean {
    for (let i = 0; i < points.length; i += 1) {
      const a1 = points[i];
      const a2 = points[(i + 1) % points.length];
      for (let j = i + 1; j < points.length; j += 1) {
        if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
        const b1 = points[j];
        const b2 = points[(j + 1) % points.length];
        if (this.segmentsIntersect(a1, a2, b1, b2)) return true;
      }
    }
    return false;
  }

  private segmentsIntersect(
    a1: { lat: number; lon: number },
    a2: { lat: number; lon: number },
    b1: { lat: number; lon: number },
    b2: { lat: number; lon: number },
  ): boolean {
    const direction = (
      p: { lat: number; lon: number },
      q: { lat: number; lon: number },
      r: { lat: number; lon: number },
    ) => (q.lon - p.lon) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lon - p.lon);
    const d1 = direction(a1, a2, b1);
    const d2 = direction(a1, a2, b2);
    const d3 = direction(b1, b2, a1);
    const d4 = direction(b1, b2, a2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
}
