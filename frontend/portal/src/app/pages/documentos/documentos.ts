import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

type DocumentosSection = 'solicitar' | 'ficha-funcional' | 'declaracoes' | 'certidoes';

interface DocumentRequest {
  id: string;
  documentKind: string;
  purpose: string;
  status: string;
  dueAt: string | null;
  createdAt: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './documentos.html',
  styleUrl: './documentos.scss',
})
export class Documentos implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.nonNullable.group({
    documentKind: ['ficha-funcional', [Validators.required, Validators.maxLength(120)]],
    purpose: ['', [Validators.maxLength(1000)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  readonly documentKinds = [
    { value: 'ficha-funcional', label: 'Ficha funcional' },
    { value: 'declaracao-vinculo', label: 'Declaracao de vinculo' },
    { value: 'certidao-tempo', label: 'Certidao de tempo' },
    { value: 'comprovante-cadastral', label: 'Comprovante cadastral' },
  ];

  section: DocumentosSection = 'solicitar';
  requests: DocumentRequest[] = [];
  saving = false;
  loading = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((segments) => {
      this.section = (segments.at(-1)?.path ?? 'solicitar') as DocumentosSection;
      this.message = '';
      this.error = '';
      this.loadRequests();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRequests(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .get<DocumentRequest[]>('v1/portal/documentos/solicitacoes')
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (requests) => {
          this.requests = requests;
        },
        error: () => {
          this.error = 'Nao foi possivel carregar solicitacoes de documentos.';
        },
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api
      .post<DocumentRequest, Record<string, unknown>>(
        'v1/portal/documentos/solicitacoes',
        this.form.getRawValue(),
      )
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (request) => {
          this.requests = [request, ...this.requests.filter((item) => item.id !== request.id)];
          this.message = 'Solicitacao de documento registrada.';
          this.form.patchValue({ purpose: '', notes: '' });
        },
        error: () => {
          this.error = 'Nao foi possivel registrar a solicitacao.';
        },
      });
  }
}
