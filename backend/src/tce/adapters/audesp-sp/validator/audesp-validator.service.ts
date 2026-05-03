import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import {
  AudespLayoutField,
  AudespPayrollEnvelope,
  AudespValidationError,
} from '../audesp-sp.types';

@Injectable()
export class AudespValidatorService {
  validate(
    payload: AudespPayrollEnvelope,
    layoutVersion: string,
    fields: AudespLayoutField[],
  ): AudespValidationError[] {
    if (layoutVersion !== payload.layoutVersion) {
      return [
        {
          fieldPath: 'layoutVersion',
          code: 'UNSUPPORTED_LAYOUT',
          message: `Unsupported AUDESP/SP layout version: ${layoutVersion}`,
        },
      ];
    }

    const errors: AudespValidationError[] = [];
    for (const field of fields) {
      if (!field.required) continue;
      const values = valuesForField(payload, field.fieldPath);
      if (
        !values.length ||
        values.some((value) => value === null || value === '')
      ) {
        errors.push({
          fieldPath: field.fieldPath,
          code: 'REQUIRED',
          message: `${field.fieldPath} is required`,
        });
        continue;
      }
      for (const value of values) {
        this.validateValue(field, value, errors);
      }
    }
    return errors;
  }

  private validateValue(
    field: AudespLayoutField,
    value: unknown,
    errors: AudespValidationError[],
  ): void {
    if (field.dataType === 'XML_NODE') return;
    if (field.dataType === 'STRING') {
      const text = String(value);
      if (field.maxLength !== null && text.length > field.maxLength) {
        errors.push({
          fieldPath: field.fieldPath,
          code: 'MAX_LENGTH',
          message: `${field.fieldPath} exceeds ${field.maxLength} characters`,
        });
      }
      return;
    }
    if (field.dataType === 'INT' && !Number.isInteger(Number(value))) {
      errors.push({
        fieldPath: field.fieldPath,
        code: 'TYPE',
        message: `${field.fieldPath} must be an integer`,
      });
      return;
    }
    if (field.dataType === 'DECIMAL') {
      this.validateDecimal(field, value, errors);
    }
  }

  private validateDecimal(
    field: AudespLayoutField,
    value: unknown,
    errors: AudespValidationError[],
  ): void {
    const text = String(value);
    if (!/^-?\d+(\.\d+)?$/.test(text)) {
      errors.push({
        fieldPath: field.fieldPath,
        code: 'TYPE',
        message: `${field.fieldPath} must be decimal text`,
      });
      return;
    }
    const decimal = new Decimal(text);
    const [integerPart = '0', fractionalPart = ''] = decimal
      .toFixed()
      .split('.');
    const integerDigits = integerPart.replace('-', '').length;
    const precision = field.decimalPrecision ?? 14;
    const scale = field.decimalScale ?? 2;
    if (
      integerDigits + fractionalPart.length > precision ||
      fractionalPart.length > scale
    ) {
      errors.push({
        fieldPath: field.fieldPath,
        code: 'DECIMAL',
        message: `${field.fieldPath} exceeds decimal(${precision},${scale})`,
      });
    }
  }
}

function valuesForField(
  payload: AudespPayrollEnvelope,
  path: string,
): unknown[] {
  switch (path) {
    case 'AudespFolha':
    case 'AudespFolha.Cabecalho':
      return [payload];
    case 'AudespFolha.Cabecalho.OrgaoCodigo':
      return [payload.organizationCode];
    case 'AudespFolha.Cabecalho.CompetenciaAno':
      return [payload.competenceYear];
    case 'AudespFolha.Cabecalho.CompetenciaMes':
      return [payload.competenceMonth];
    case 'AudespFolha.Cabecalho.TipoRemessa':
      return [payload.shipmentKind];
    case 'AudespFolha.Servidores.Servidor':
      return payload.servers;
    case 'AudespFolha.Servidores.Servidor.Matricula':
      return payload.servers.map((server) => server.registration);
    case 'AudespFolha.Servidores.Servidor.Cpf':
      return payload.servers.map((server) => server.cpf);
    case 'AudespFolha.Servidores.Servidor.Cargo':
      return payload.servers.map((server) => server.position);
    case 'AudespFolha.Servidores.Servidor.Proventos':
      return payload.servers.map((server) => server.earnings);
    case 'AudespFolha.Servidores.Servidor.Descontos':
      return payload.servers.map((server) => server.deductions);
    case 'AudespFolha.Servidores.Servidor.Liquido':
      return payload.servers.map((server) => server.net);
    default:
      return [];
  }
}
