import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigHealthService {
  constructor(private readonly configService: ConfigService) {}

  summary() {
    return {
      ok: true,
      nodeEnv: this.configService.get<string>('NODE_ENV'),
      auth: {
        jwksConfigured: Boolean(
          this.configService.get<string>('COGNITO_JWKS_URI'),
        ),
        issuerConfigured: Boolean(
          this.configService.get<string>('COGNITO_ISSUER'),
        ),
        audienceConfigured: Boolean(
          this.configService.get<string>('COGNITO_CLIENT_ID'),
        ),
        unsignedTestTokensEnabled:
          this.configService.get<boolean>('AUTH_ALLOW_UNSIGNED_TEST_TOKENS') ===
          true,
      },
    };
  }
}
