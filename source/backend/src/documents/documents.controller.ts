import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { CognitoJwtGuard } from '../auth/cognito-jwt.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { DomainListQueryDto } from '../common/pagination/domain-list-query.dto';
import type { RequestWithContext } from '../common/request-id/request-with-context';
import { PresignUploadRequestDto } from './documents.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(CognitoJwtGuard, PermissionsGuard)
@Controller('v1/arquivos')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions('documents:download')
  @ApiOkResponse({ description: 'Paged document attachment metadata.' })
  list(@Query() query: DomainListQueryDto) {
    return this.documentsService.list(query);
  }

  @Post('presigned-upload')
  @RequirePermissions('documents:upload')
  @ApiCreatedResponse({ description: 'Create a presigned upload URL for S3.' })
  async presignUpload(
    @Req() request: RequestWithContext,
    @Body() body: PresignUploadRequestDto,
  ) {
    const created = await this.documentsService.presignUpload(request, body);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'document_upload_session',
      {
        resourceId: created.uploadSessionId,
        tableName: 'document_upload_session',
      },
    );
    return created;
  }

  @Patch(':anexo_id/confirmar')
  @Patch(':id/confirmar')
  @RequirePermissions('documents:register')
  @ApiCreatedResponse({
    description: 'Register a completed upload as attachment metadata.',
  })
  async registerByPath(
    @Req() request: RequestWithContext,
    @Param() params: { anexo_id?: string; id?: string },
  ) {
    const uploadSessionId = params.anexo_id ?? params.id ?? '';
    const registered =
      await this.documentsService.registerUpload(uploadSessionId);
    await this.auditService.appendMutation(
      request,
      'CREATE',
      'document_attachment',
      {
        resourceId: registered.id,
        tableName: 'document_attachment',
        metadata: { uploadSessionId },
      },
    );
    return registered;
  }

  @Delete(':id')
  @RequirePermissions('documents:register')
  @ApiOkResponse({
    description: 'Delete a document attachment metadata record.',
  })
  async deleteAttachment(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const deleted = await this.documentsService.deleteAttachment(id);
    await this.auditService.appendMutation(
      request,
      'DELETE',
      'document_attachment',
      {
        resourceId: deleted.id,
        tableName: 'document_attachment',
      },
    );
    return deleted;
  }

  @Get(':id/download')
  @RequirePermissions('documents:download')
  @ApiOkResponse({
    description: 'Create a short-lived presigned download URL.',
  })
  async presignDownload(
    @Req() request: RequestWithContext,
    @Param('id') id: string,
  ) {
    const download = await this.documentsService.presignDownload(request, id);
    await this.auditService.appendMutation(
      request,
      'PROCESS',
      'document_download_audit',
      {
        resourceId: id,
        tableName: 'document_download_audit',
      },
    );
    return download;
  }
}
