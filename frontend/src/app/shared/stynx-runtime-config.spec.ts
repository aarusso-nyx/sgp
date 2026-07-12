import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { STYNX_ANGULAR_OPTIONS, STYNX_AUTH_PROVIDER } from '@stynx-nyx/angular';
import { StynxSessionService } from '@stynx-nyx/angular-auth';
import { StynxI18nService } from '@stynx-nyx/angular-i18n';
import { STYNX_UPLOAD_EXECUTOR } from '@stynx-nyx/angular-storage';

import { provideSgpStynxWeb } from './stynx-runtime-config';

describe('provideSgpStynxWeb', () => {
  beforeEach(() => {
    (window as unknown as { SGP_CONFIG: Record<string, string> }).SGP_CONFIG = {
      API_BASE_URL: 'https://sgp.test/',
      API_BASE_PATH: '/api/',
      COGNITO_CLIENT_ID: 'sgp-web',
      COGNITO_DOMAIN: 'https://identity.test',
      DEFAULT_TENANT_ID: '00000000-0000-4000-8000-000000000001',
    };

    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideSgpStynxWeb()],
    });
  });

  it('composes the STYNX Angular foundation for both SGP applications', () => {
    expect(TestBed.inject(STYNX_ANGULAR_OPTIONS)).toMatchObject({
      apiBaseUrl: 'https://sgp.test/api',
      sessionMode: 'bearer',
    });
    expect(TestBed.inject(STYNX_AUTH_PROVIDER)).toBe(TestBed.inject(StynxSessionService));
    expect(TestBed.inject(STYNX_UPLOAD_EXECUTOR)).toBeTruthy();
  });

  it('loads the governed pt-BR platform catalog', async () => {
    const i18n = TestBed.inject(StynxI18nService);

    await i18n.initialize();

    expect(i18n.locale()).toBe('pt-BR');
    expect(i18n.translate('storage.upload.fileInput')).toBe('Selecione um documento');
  });
});
