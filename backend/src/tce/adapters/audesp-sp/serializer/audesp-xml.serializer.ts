import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';

import { AudespPayrollEnvelope } from '../audesp-sp.types';

@Injectable()
export class AudespXmlSerializer {
  serialize(payload: AudespPayrollEnvelope): string {
    return create(
      { version: '1.0', encoding: 'UTF-8' },
      {
        AudespFolha: {
          '@adapter': payload.adapterId,
          '@layout': payload.layoutCode,
          '@versao': payload.layoutVersion,
          Cabecalho: {
            OrgaoCodigo: payload.organizationCode,
            CompetenciaAno: String(payload.competenceYear),
            CompetenciaMes: String(payload.competenceMonth).padStart(2, '0'),
            TipoRemessa: payload.shipmentKind,
            GeradoEm: payload.generatedAt,
          },
          Servidores: {
            Servidor: payload.servers.map((server) => ({
              Matricula: server.registration,
              Cpf: server.cpf,
              Cargo: server.position,
              Proventos: server.earnings,
              Descontos: server.deductions,
              Liquido: server.net,
            })),
          },
        },
      },
    ).end({ prettyPrint: true, headless: false });
  }
}
