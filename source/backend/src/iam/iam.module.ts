import { Module } from '@nestjs/common';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { CognitoJwtService } from '../auth/cognito-jwt.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PermissionsController } from './permissions/permissions.controller';
import { PermissionsService } from './permissions/permissions.service';

@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    CognitoJwtService,
    CognitoJwtGuard,
    PermissionsGuard,
  ],
  exports: [PermissionsService],
})
export class IamModule {}
