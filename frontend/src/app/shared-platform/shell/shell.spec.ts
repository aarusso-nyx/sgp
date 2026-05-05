import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StynxSessionService } from '@stynx-web/angular-auth';
import { vi } from 'vitest';

import { NavigationFilter } from '../../core/navigation/navigation-filter';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(async () => {
    const session = {
      snapshot: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
    };
    session.snapshot.mockReturnValue({
      active: true,
      claims: {
        sub: '1',
        username: 'admin',
        name: 'Administrador',
        groups: [],
      },
      permissions: [],
    });

    const filter = {
      visibleSections: vi.fn(),
    };
    filter.visibleSections.mockReturnValue([
      {
        moduleLabel: 'Gestão',
        moduleKey: 'gestao',
        routePath: '/gestao',
        status: 'observed',
        items: [
          {
            id: 'menu-014',
            label: 'Bancos',
            menuPath: ['Gestão', 'Bancos'],
            moduleLabel: 'Gestão',
            moduleKey: 'gestao',
            legacyRoute: '#!/banco/gestao',
            routePath: '/gestao/banco',
            status: 'observed',
            evidence: [],
          },
        ],
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        { provide: StynxSessionService, useValue: session },
        { provide: NavigationFilter, useValue: filter },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Shell);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders menu entries from filtered manifest sections', () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Sistema de Gestão de Pessoas');
    expect(compiled.textContent).toContain('Bancos');
  });
});
