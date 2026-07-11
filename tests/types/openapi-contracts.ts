import { expectTypeOf } from 'expect-type';
import type { Observable } from 'rxjs';

import type {
  ApiBody,
  ApiQuery,
  OpenApiClient,
} from '../../frontend/src/app/core/api/generated/openapi-client.js';

type MethodParams<T extends keyof OpenApiClient> = OpenApiClient[T] extends (
  ...args: infer Params
) => unknown
  ? Params
  : never;
type MethodReturn<T extends keyof OpenApiClient> = OpenApiClient[T] extends (
  ...args: never[]
) => infer Result
  ? Result
  : never;

expectTypeOf<ApiQuery>().toEqualTypeOf<Record<string, string | number | boolean | undefined>>();
expectTypeOf<ApiBody>().toEqualTypeOf<Record<string, unknown>>();

expectTypeOf<MethodParams<'getApiV1AdminFgtsAccountsByEmployeeId'>>().toEqualTypeOf<
  [{ employeeId: string }]
>();
expectTypeOf<MethodReturn<'getApiV1AdminFgtsAccountsByEmployeeId'>>().toEqualTypeOf<
  Observable<unknown>
>();

expectTypeOf<MethodParams<'getApiV1AdminFiscalDctfweb'>>().toEqualTypeOf<
  [query?: ApiQuery | undefined]
>();
expectTypeOf<MethodParams<'getApiV1AuditoriaLogsById'>>().toEqualTypeOf<[{ id: string }]>();
expectTypeOf<MethodParams<'getApiV1PublicTransparencyPayrollByTenantId'>>().toEqualTypeOf<
  [{ tenantId: string }]
>();
expectTypeOf<MethodParams<'patchApiV1FolhaRubricaById'>>().toEqualTypeOf<
  [{ id: string }, body?: ApiBody | undefined]
>();
expectTypeOf<MethodParams<'patchApiV1EmployeesAlimoniesByIdAndAlimonyId'>>().toEqualTypeOf<
  [{ id: string; alimonyId: string }, body?: ApiBody | undefined]
>();
expectTypeOf<MethodParams<'postApiV1AdminFiscalDctfwebGerar'>>().toEqualTypeOf<
  [body?: ApiBody | undefined]
>();
expectTypeOf<MethodParams<'deleteApiV1RhAfastamentosById'>>().toEqualTypeOf<[{ id: string }]>();
expectTypeOf<
  MethodParams<'deleteApiV1EmployeesRhWorkflowsExerciciosByEmployeeIdAndId'>
>().toEqualTypeOf<[{ employeeId: string; id: string }]>();
expectTypeOf<MethodReturn<'postApiV1AdminFiscalDctfwebGerar'>>().toEqualTypeOf<
  Observable<unknown>
>();

const missingTenantId: MethodParams<'getApiV1PublicTransparencyPayrollByTenantId'>[0] = {
  // @ts-expect-error generated client params require the documented tenantId key.
  id: 'tenant-1',
};

// @ts-expect-error generated delete params do not accept request bodies.
const deleteWithBody: MethodParams<'deleteApiV1RhAfastamentosById'> = [
  { id: 'afastamento-1' },
  { reason: 'not accepted' },
];

void missingTenantId;
void deleteWithBody;
