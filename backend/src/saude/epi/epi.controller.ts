import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuditMutation } from '../../common/audit/audit-mutation.decorator';
import { RequirePermission } from '../../iam/decorators/require-permission.decorator';
import { CreateEpiInventoryDto, RegisterEpiDeliveryDto } from './epi.dto';
import { EpiDeliveryService } from './epi-delivery.service';
import { EpiInventoryService } from './epi-inventory.service';

@ApiTags('saude-epi')
@ApiBearerAuth()
@Controller('v1/saude/epi')
export class EpiController {
  constructor(
    private readonly inventoryService: EpiInventoryService,
    private readonly deliveryService: EpiDeliveryService,
  ) {}

  @ApiOperation({ summary: 'GET inventario' })
  @Get('inventario')
  @RequirePermission('saude.epi.read')
  @ApiOkResponse({ description: 'EPI inventory records.' })
  listInventory() {
    return this.inventoryService.list();
  }

  @ApiOperation({ summary: 'POST inventario' })
  @Post('inventario')
  @RequirePermission('saude.epi.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.epi_inventory',
    tableName: 'saude.epi_inventory',
  })
  @ApiCreatedResponse({
    description: 'Create or update an EPI inventory item.',
  })
  createInventory(@Body() body: CreateEpiInventoryDto) {
    return this.inventoryService.create(body);
  }

  @ApiOperation({ summary: 'GET entregas' })
  @Get('entregas')
  @RequirePermission('saude.epi.read')
  @ApiOkResponse({ description: 'Signed EPI deliveries.' })
  listDeliveries() {
    return this.deliveryService.list();
  }

  @ApiOperation({ summary: 'POST entregas' })
  @Post('entregas')
  @RequirePermission('saude.epi.write')
  @AuditMutation({
    action: 'CREATE',
    resourceType: 'saude.epi_delivery',
    tableName: 'saude.epi_delivery',
  })
  @ApiCreatedResponse({ description: 'Register a signed EPI delivery.' })
  registerDelivery(@Body() body: RegisterEpiDeliveryDto) {
    return this.deliveryService.register(body);
  }
}
