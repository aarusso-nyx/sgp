import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return {
      service: process.env.APP_SERVICE_NAME ?? 'sgp-core-api',
      status: 'ok',
    };
  }
}
