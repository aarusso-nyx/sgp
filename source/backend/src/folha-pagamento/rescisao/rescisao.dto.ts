import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RunRescisaoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  employmentLinkId!: string;

  @ApiProperty()
  @IsDateString()
  terminationDate!: string;

  @ApiProperty({
    enum: ['SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'APOSENTADORIA', 'OUTRA'],
  })
  @IsString()
  @IsIn(['SEM_JUSTA_CAUSA', 'PEDIDO_DEMISSAO', 'APOSENTADORIA', 'OUTRA'])
  cause!: 'SEM_JUSTA_CAUSA' | 'PEDIDO_DEMISSAO' | 'APOSENTADORIA' | 'OUTRA';
}
