import type { INestApplication } from '@nestjs/common';
import {
  OpenAPIObject,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

type OpenApi31Document = OpenAPIObject & {
  jsonSchemaDialect: string;
};

export function createOpenApi31Document(
  app: INestApplication,
  config: Omit<OpenAPIObject, 'paths'>,
  options?: SwaggerDocumentOptions,
): OpenApi31Document {
  const document = SwaggerModule.createDocument(app, config, options);
  return {
    ...document,
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  };
}
