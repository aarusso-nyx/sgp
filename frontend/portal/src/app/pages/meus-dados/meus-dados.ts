import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';

import { ApiClient } from '../../core/api/api-client';

type Section = 'cadastro' | 'endereco' | 'contato' | 'dependentes' | 'documentos';

interface GovBrSignInitiation {
  redirectUrl: string;
  request: {
    id: string;
    status: string;
  };
}

@Component({
  selector: 'app-meus-dados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './meus-dados.html',
  styleUrl: './meus-dados.scss',
})
export class MeusDados implements OnInit, OnDestroy {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly form = this.formBuilder.nonNullable.group({
    fieldA: [''],
    fieldB: [''],
    fieldC: [''],
    fieldD: [''],
  });

  section: Section = 'cadastro';
  current: Record<string, unknown> = {};
  rows: Record<string, unknown>[] = [];
  loading = false;
  saving = false;
  signing = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe((segments) => {
      this.section = (segments.at(-1)?.path ?? 'cadastro') as Section;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get diff(): Array<{ field: string; before: unknown; after: unknown }> {
    const payload = this.payload();
    return Object.keys(payload)
      .filter((key) => payload[key] !== this.current[key])
      .map((key) => ({ field: key, before: this.current[key] ?? '', after: payload[key] }));
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api
      .get<unknown>(`v1/portal/meus-dados/${this.section}`)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (value) => {
          if (Array.isArray(value)) {
            this.rows = value as Record<string, unknown>[];
            this.current = {};
          } else {
            this.rows = [];
            this.current = (value ?? {}) as Record<string, unknown>;
          }
          this.patchForm();
        },
        error: () => {
          this.error = 'Nao foi possivel carregar os dados cadastrais.';
        },
      });
  }

  submit(): void {
    const payload = this.payload();
    this.saving = true;
    this.error = '';
    this.api
      .put<Record<string, unknown>, Record<string, unknown>>(
        `v1/portal/meus-dados/${this.section}`,
        {
          section: this.section,
          payload,
          previousPayload: this.current,
        },
      )
      .pipe(
        finalize(() => {
          this.saving = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.message = 'Solicitacao enviada para aprovacao.';
          this.load();
        },
        error: () => {
          this.error = 'Nao foi possivel enviar a solicitacao.';
        },
      });
  }

  startGovBrSignature(): void {
    const payload = this.payload();
    if (!this.diff.length) return;

    this.signing = true;
    this.error = '';
    this.api
      .post<
        GovBrSignInitiation,
        {
          resourceType: string;
          resourceId: string;
          payload: Record<string, unknown>;
          returnUrl: string;
        }
      >('portal/v1/auth/govbr/sign', {
        resourceType: 'hr.cadastral_change_request',
        resourceId: `draft-${this.section}`,
        payload: {
          section: this.section,
          payload,
          previousPayload: this.current,
        },
        returnUrl: `${window.location.origin}/govbr-sign/callback`,
      })
      .pipe(
        finalize(() => {
          this.signing = false;
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          window.location.assign(this.redirectUrl(result.redirectUrl));
        },
        error: () => {
          this.error = 'Nao foi possivel iniciar a assinatura Gov.br.';
        },
      });
  }

  private patchForm(): void {
    this.form.reset({
      fieldA: String(this.current[this.keys()[0]] ?? ''),
      fieldB: String(this.current[this.keys()[1]] ?? ''),
      fieldC: String(this.current[this.keys()[2]] ?? ''),
      fieldD: String(this.current[this.keys()[3]] ?? ''),
    });
  }

  private payload(): Record<string, unknown> {
    const value = this.form.getRawValue();
    const keys = this.keys();
    return {
      [keys[0]]: value.fieldA,
      [keys[1]]: value.fieldB,
      [keys[2]]: value.fieldC,
      [keys[3]]: value.fieldD,
    };
  }

  private keys(): string[] {
    if (this.section === 'endereco') return ['street', 'number', 'city', 'zipCode'];
    if (this.section === 'contato') return ['email', 'phone', 'alternatePhone', 'preferredChannel'];
    if (this.section === 'cadastro') return ['socialName', 'rg', 'pisPasep', 'motherName'];
    return ['name', 'cpf', 'relationship', 'notes'];
  }

  private redirectUrl(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    const config = (window as unknown as { SGP_CONFIG?: Record<string, string> }).SGP_CONFIG;
    const baseUrl = config?.['API_BASE_URL'] ?? '';
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
