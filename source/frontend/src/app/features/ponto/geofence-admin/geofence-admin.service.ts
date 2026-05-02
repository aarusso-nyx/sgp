import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GeofenceAdminService {
  private readonly http = inject(HttpClient);

  savePolygon(payload: {
    workLocationId: string;
    polygon: Array<{ lat: number; lon: number }>;
  }): Observable<unknown> {
    return this.http.post('/api/v1/ponto/mobile/geofences', payload);
  }
}
