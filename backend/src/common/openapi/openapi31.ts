import type { INestApplication } from '@nestjs/common';
import {
  OpenAPIObject,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

type OpenApi31Document = OpenAPIObject & {
  jsonSchemaDialect: string;
};

type OpenApiResponse = {
  description?: string | undefined;
  content?: Record<string, { schema?: unknown }> | undefined;
};

type OpenApiOperation = {
  responses?: Record<string, OpenApiResponse> | undefined;
};

const methods = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
]);

const problemDetailsSchema = {
  type: 'object',
  required: ['type', 'title', 'status', 'detail', 'instance'],
  properties: {
    type: {
      type: 'string',
      format: 'uri',
    },
    title: {
      type: 'string',
    },
    status: {
      type: 'integer',
      minimum: 400,
      maximum: 599,
    },
    detail: {
      type: 'string',
    },
    instance: {
      type: 'string',
    },
    traceId: {
      type: 'string',
    },
    correlationId: {
      type: 'string',
    },
    errors: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  additionalProperties: false,
};

const fallbackSuccessSchema = {
  description:
    'Fallback success response for operations that return plain objects or arrays without a dedicated DTO class yet.',
  oneOf: [
    { type: 'object', additionalProperties: true },
    { type: 'array', items: { type: 'object', additionalProperties: true } },
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'null' },
  ],
};

const standardClientResponses: Record<string, string> = {
  '400': 'Bad request.',
  '401': 'Authentication required.',
  '403': 'Permission, tenant, or policy denial.',
  '404': 'Resource not found.',
  '409': 'Conflict with current resource state.',
  '422': 'Semantically invalid request.',
  '429': 'Rate limit exceeded.',
};

function problemResponse(description: string): OpenApiResponse {
  return {
    description,
    content: {
      'application/problem+json': {
        schema: { $ref: '#/components/schemas/SgpProblemDetails' },
      },
    },
  };
}

function hasSchema(response: OpenApiResponse | undefined): boolean {
  return Boolean(response?.content?.['application/json']?.schema);
}

function isOpenApiOperation(value: unknown): value is OpenApiOperation {
  return Boolean(value && typeof value === 'object');
}

function enrichOperationContracts(operation: OpenApiOperation): void {
  operation.responses ??= {};

  for (const [status, description] of Object.entries(standardClientResponses)) {
    operation.responses[status] ??= problemResponse(description);
  }

  for (const [status, response] of Object.entries(operation.responses)) {
    if (!/^2\d\d$/.test(status) || status === '204') {
      continue;
    }
    if (!hasSchema(response)) {
      response.content = {
        ...(response.content ?? {}),
        'application/json': {
          schema: { $ref: '#/components/schemas/SgpOperationResult' },
        },
      };
    }
  }
}

export function createOpenApi31Document(
  app: INestApplication,
  config: Omit<OpenAPIObject, 'paths'>,
  options?: SwaggerDocumentOptions,
): OpenApi31Document {
  const document = SwaggerModule.createDocument(app, config, options);
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.SgpProblemDetails = problemDetailsSchema;
  document.components.schemas.SgpOperationResult = fallbackSuccessSchema;

  for (const pathItem of Object.values(document.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      const candidate = operation as unknown;
      if (!methods.has(method) || !isOpenApiOperation(candidate)) {
        continue;
      }
      enrichOperationContracts(candidate);
    }
  }

  return {
    ...document,
    openapi: '3.1.0',
    jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  };
}
