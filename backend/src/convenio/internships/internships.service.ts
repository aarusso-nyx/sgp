import { Injectable } from '@nestjs/common';

import { DomainListQueryDto } from '../../common/pagination/domain-list-query.dto';
import { PagedResponse } from '../../common/pagination/paged-response';
import {
  CreateInternshipDto,
  CreateInternshipProgramDto,
  ExtendInternshipDto,
  TerminateInternshipDto,
} from './internships.dto';
import { InternshipEsocialService } from './internship-esocial.service';
import { InternshipLifecycleService } from './internship-lifecycle.service';
import { InternshipProgramsService } from './internship-programs.service';
import type {
  InternshipProgramSummary,
  InternshipSummary,
  S2300BuildResult,
} from './internships.types';

export type {
  InternshipProgramSummary,
  InternshipSummary,
  S2300BuildResult,
} from './internships.types';

@Injectable()
export class InternshipsService {
  constructor(
    private readonly programsService: InternshipProgramsService,
    private readonly lifecycleService: InternshipLifecycleService,
    private readonly esocialService: InternshipEsocialService,
  ) {}

  async listPrograms(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<InternshipProgramSummary>> {
    return this.programsService.listPrograms(query);
  }

  async createProgram(
    input: CreateInternshipProgramDto,
  ): Promise<InternshipProgramSummary> {
    return this.programsService.createProgram(input);
  }

  async listInternships(
    query: DomainListQueryDto,
  ): Promise<PagedResponse<InternshipSummary>> {
    return this.lifecycleService.listInternships(query);
  }

  async createInternship(
    input: CreateInternshipDto,
  ): Promise<InternshipSummary> {
    return this.lifecycleService.createInternship(input);
  }

  async extendInternship(
    id: string,
    input: ExtendInternshipDto,
  ): Promise<InternshipSummary> {
    return this.lifecycleService.extendInternship(id, input);
  }

  async terminateInternship(
    id: string,
    input: TerminateInternshipDto,
  ): Promise<InternshipSummary> {
    return this.lifecycleService.terminateInternship(id, input);
  }

  async buildS2300(id: string): Promise<S2300BuildResult> {
    return this.esocialService.buildS2300(id);
  }
}
