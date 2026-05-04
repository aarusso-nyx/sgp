import { Injectable } from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import { DatabaseService } from '../../database/database.service';
import {
  AdmitEmployeeDto,
  ApproveCadastralChangeDto,
  ChangeContractRegimeDto,
  EmployeeMutationDto,
  RejectCadastralChangeDto,
  TerminateEmployeeDto,
  UpdateAbonoPermanenciaDto,
} from './employees.dto';
import { EmployeeAbonoPermanenciaService } from './employee-abono-permanencia.service';
import { EmployeeCadastralChangesService } from './employee-cadastral-changes.service';
import { EmployeeContractRegimeService } from './employee-contract-regime.service';
import { EmployeeLifecycleService } from './employee-lifecycle.service';
import { EmployeeReferenceDataService } from './employee-reference-data.service';
import { EmployeeRegistryService } from './employee-registry.service';
import { EmployeeVersionService } from './employee-version.service';
import {
  ContractRegimeChangeResult,
  EmployeeAdmissionResult,
  EmployeeDossier,
  EmployeeSummary,
  EmployeeTerminationResult,
} from './employees.types';

export type {
  ContractRegimeChangeResult,
  EmployeeAdmissionResult,
  EmployeeDossier,
  EmployeeSummary,
  EmployeeTerminationResult,
} from './employees.types';

@Injectable()
export class EmployeesService {
  private readonly registryService: EmployeeRegistryService;
  private readonly cadastralChangesService: EmployeeCadastralChangesService;
  private readonly lifecycleService: EmployeeLifecycleService;
  private readonly abonoPermanenciaService: EmployeeAbonoPermanenciaService;
  private readonly contractRegimeService: EmployeeContractRegimeService;

  constructor(
    databaseService: DatabaseService,
    registryService?: EmployeeRegistryService,
    cadastralChangesService?: EmployeeCadastralChangesService,
    lifecycleService?: EmployeeLifecycleService,
    abonoPermanenciaService?: EmployeeAbonoPermanenciaService,
    contractRegimeService?: EmployeeContractRegimeService,
  ) {
    const versionService = new EmployeeVersionService(databaseService);
    const referenceDataService = new EmployeeReferenceDataService();

    this.registryService =
      registryService ??
      new EmployeeRegistryService(databaseService, versionService);
    this.cadastralChangesService =
      cadastralChangesService ??
      new EmployeeCadastralChangesService(databaseService);
    this.lifecycleService =
      lifecycleService ??
      new EmployeeLifecycleService(databaseService, referenceDataService);
    this.abonoPermanenciaService =
      abonoPermanenciaService ??
      new EmployeeAbonoPermanenciaService(databaseService, versionService);
    this.contractRegimeService =
      contractRegimeService ??
      new EmployeeContractRegimeService(
        databaseService,
        referenceDataService,
        versionService,
      );
  }

  async list(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<EmployeeSummary>> {
    return this.registryService.list(query);
  }

  async listCadastralChanges(
    status = 'PENDING',
  ): Promise<Array<Record<string, unknown>>> {
    return this.cadastralChangesService.listCadastralChanges(status);
  }

  async approveCadastralChange(
    id: string,
    body: ApproveCadastralChangeDto,
  ): Promise<Record<string, unknown>> {
    return this.cadastralChangesService.approveCadastralChange(id, body);
  }

  async rejectCadastralChange(
    id: string,
    body: RejectCadastralChangeDto,
  ): Promise<Record<string, unknown>> {
    return this.cadastralChangesService.rejectCadastralChange(id, body);
  }

  async create(input: EmployeeMutationDto): Promise<EmployeeSummary> {
    return this.registryService.create(input);
  }

  async admit(input: AdmitEmployeeDto): Promise<EmployeeAdmissionResult> {
    return this.lifecycleService.admit(input);
  }

  async update(
    id: string,
    input: EmployeeMutationDto,
    expectedVersion?: number,
  ): Promise<EmployeeSummary> {
    return this.registryService.update(id, input, expectedVersion);
  }

  async getDossier(id: string): Promise<EmployeeDossier> {
    return this.registryService.getDossier(id);
  }

  async deactivate(id: string): Promise<EmployeeSummary> {
    return this.registryService.deactivate(id);
  }

  async terminate(
    id: string,
    input: TerminateEmployeeDto,
  ): Promise<EmployeeTerminationResult> {
    return this.lifecycleService.terminate(id, input);
  }

  async getAbonoPermanencia(id: string): Promise<Record<string, unknown>> {
    return this.abonoPermanenciaService.getAbonoPermanencia(id);
  }

  async updateAbonoPermanencia(
    id: string,
    input: UpdateAbonoPermanenciaDto,
    expectedVersion?: number,
  ): Promise<Record<string, unknown>> {
    return this.abonoPermanenciaService.updateAbonoPermanencia(
      id,
      input,
      expectedVersion,
    );
  }

  async changeContractRegime(
    employeeId: string,
    input: ChangeContractRegimeDto,
    expectedVersion?: number,
  ): Promise<ContractRegimeChangeResult> {
    return this.contractRegimeService.changeContractRegime(
      employeeId,
      input,
      expectedVersion,
    );
  }
}
