import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import {
  Public,
  RequirePermission,
} from '../../iam/decorators/require-permission.decorator';
import {
  CreateBancaMembroDto,
  CreateSignedDocumentDto,
  SignDocumentDto,
} from './banca.dto';
import { BancaService } from './banca.service';
import { DocumentSigningService } from './document-signing.service';

@ApiTags('recrutamento-banca')
@ApiBearerAuth()
@Controller('v1/recrutamento/banca')
export class BancaController {
  constructor(
    private readonly bancaService: BancaService,
    private readonly documentSigningService: DocumentSigningService,
  ) {}

  @Get('concursos/:concursoId/membros')
  @RequirePermission('recrutamento.banca.read')
  @ApiOkResponse({ description: 'List examination board members.' })
  listMembers(@Param('concursoId') concursoId: string) {
    return this.bancaService.listMembers(concursoId);
  }

  @Post('membros')
  @RequirePermission('recrutamento.banca.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.banca_membro',
    tableName: 'recrutamento.banca_membro',
  })
  @ApiCreatedResponse({ description: 'Create an examination board member.' })
  createMember(@Body() body: CreateBancaMembroDto) {
    return this.bancaService.createMember(body);
  }

  @Post('documentos')
  @RequirePermission('recrutamento.banca.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'recrutamento.signed_document',
    tableName: 'recrutamento.signed_document',
  })
  @ApiCreatedResponse({
    description: 'Create an official board document for signing.',
  })
  createDocument(@Body() body: CreateSignedDocumentDto) {
    return this.documentSigningService.create(body);
  }

  @Post('documentos/:id/signatures')
  @RequirePermission('recrutamento.banca.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.document_signature',
    tableName: 'recrutamento.document_signature',
  })
  @ApiCreatedResponse({ description: 'Append the next sequential signature.' })
  sign(@Param('id') id: string, @Body() body: SignDocumentDto) {
    return this.documentSigningService.sign(id, body);
  }

  @Post('documentos/:id/publicacao')
  @RequirePermission('recrutamento.banca.write')
  @AuditMutation({
    action: 'PROCESS',
    resourceType: 'recrutamento.signed_document',
    tableName: 'recrutamento.signed_document',
  })
  @ApiOkResponse({
    description: 'Publish a fully signed official board document.',
  })
  publish(@Param('id') id: string) {
    return this.documentSigningService.publish(id);
  }
}

@ApiTags('public-banca')
@Controller('v1/publico/banca')
export class PublicBancaVerifyController {
  constructor(
    private readonly documentSigningService: DocumentSigningService,
  ) {}

  @Get('verify/:token')
  @Public()
  @ApiOkResponse({
    description: 'Public verification metadata for a signed board document.',
  })
  verify(@Param('token') token: string) {
    return this.documentSigningService.publicVerify(token);
  }
}
