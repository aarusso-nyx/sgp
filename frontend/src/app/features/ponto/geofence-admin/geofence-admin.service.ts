import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';

@Injectable({ providedIn: 'root' })
export class GeofenceAdminService {
  private readonly api = inject(ApiClient);

  savePolygon(payload: {
    workLocationId: string;
    polygon: Array<{ lat: number; lon: number }>;
  }): Observable<unknown> {
    return this.api.post('v1/ponto/mobile/geofences', payload);
  }
}
