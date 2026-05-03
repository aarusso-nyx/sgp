import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CognitoAuth {
  private readonly storageKey = 'sgp.session';

  currentSession(): unknown | null {
    const raw = sessionStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  accessToken(): string | null {
    return sessionStorage.getItem('sgp.access_token');
  }

  startLogin(): void {
    const domain = this.requiredConfig('COGNITO_DOMAIN');
    const clientId = this.requiredConfig('COGNITO_CLIENT_ID');
    const redirectUri = encodeURIComponent(this.requiredConfig('COGNITO_REDIRECT_URI'));
    const url = `${domain}/oauth2/authorize?client_id=${clientId}&response_type=code&scope=openid+email+profile&redirect_uri=${redirectUri}`;
    window.location.assign(url);
  }

  clearSession(): void {
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem('sgp.access_token');
  }

  private requiredConfig(key: string): string {
    const value = (window as unknown as { SGP_CONFIG?: Record<string, string> }).SGP_CONFIG?.[key];
    if (!value) {
      throw new Error(`Missing portal runtime config: ${key}`);
    }
    return value;
  }
}
