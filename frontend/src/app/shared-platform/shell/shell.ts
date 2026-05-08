import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { StynxSessionService } from '@stynx-web/angular-auth';
import { filter, map, startWith } from 'rxjs';

import { UserSession } from '../../core/models/user-session';
import { NavigationFilter } from '../../core/navigation/navigation-filter';
import {
  LegacyNavigationItem,
  LegacyNavigationSection,
} from '../../core/navigation/legacy-navigation.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-shell',
  imports: [
    CommonModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    MatTooltipModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly session = inject(StynxSessionService);
  private readonly navigationFilter = inject(NavigationFilter);
  private readonly router = inject(Router);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 1024px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly menuSections = computed(() =>
    this.navigationFilter.visibleSections(this.currentSession()),
  );

  readonly userDisplayName = computed(() => {
    const session = this.currentSession();
    return session?.displayName || session?.login || 'Sessão autenticada';
  });

  readonly currentNavigationItem = computed(() => {
    const url = this.normalizedUrl();

    for (const section of this.menuSections()) {
      const item = section.items.find((candidate) =>
        this.matchesRouteTemplate(url, candidate.routePath),
      );
      if (item) {
        return item;
      }
    }

    return null;
  });

  readonly currentSection = computed(() => {
    const url = this.normalizedUrl();
    const exactItem = this.currentNavigationItem();

    if (exactItem) {
      return (
        this.menuSections().find((section) => section.moduleKey === exactItem.moduleKey) ?? null
      );
    }

    return (
      this.menuSections().find((section) => {
        return url === section.routePath || url.startsWith(`${section.routePath}/`);
      }) ?? null
    );
  });

  readonly pageTitle = computed(() => this.currentNavigationItem()?.label ?? 'Visão geral');

  readonly pageModule = computed(() => this.currentSection()?.moduleLabel ?? 'SGP');

  closeSidenavAfterNavigation(drawer: MatSidenav): void {
    if (this.isMobile()) {
      void drawer.close();
    }
  }

  isSectionActive(section: LegacyNavigationSection): boolean {
    const url = this.normalizedUrl();
    if (url === '/') {
      return section.moduleKey === 'gestao';
    }

    return url === section.routePath || url.startsWith(`${section.routePath}/`);
  }

  menuItemAriaLabel(item: LegacyNavigationItem): string {
    return `${item.label}, módulo ${item.moduleLabel}, status ${this.statusLabel(item.status)}`;
  }

  statusLabel(status: string): string {
    if (status === 'observed') {
      return 'observado';
    }

    if (status === 'inferred') {
      return 'inferido';
    }

    return 'não verificado';
  }

  logout(): void {
    void this.session.logout().finally(() => this.router.navigateByUrl('/'));
  }

  private currentSession(): UserSession | null {
    const snapshot = this.session.snapshot();
    if (!snapshot.active) return null;
    const claims = snapshot.claims ?? {};
    const login =
      this.stringClaim(claims, 'username') ?? this.stringClaim(claims, 'email') ?? 'stynx-session';
    return {
      subject: this.stringClaim(claims, 'sub') ?? login,
      login,
      displayName: this.stringClaim(claims, 'name') ?? login,
      groups: this.arrayClaim(claims, 'groups') ?? this.arrayClaim(claims, 'cognito:groups') ?? [],
      permissions: snapshot.permissions,
    };
  }

  private stringClaim(claims: Record<string, unknown>, key: string): string | null {
    const value = claims[key];
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private arrayClaim(claims: Record<string, unknown>, key: string): string[] | null {
    const value = claims[key];
    if (!Array.isArray(value)) return null;
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private normalizedUrl(): string {
    const normalized = (this.currentUrl().split('?')[0] ?? '').split('#')[0] || '/';
    return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized;
  }

  private matchesRouteTemplate(url: string, routePath: string): boolean {
    const urlParts = url.split('/').filter(Boolean);
    const routeParts = routePath.split('/').filter(Boolean);

    if (urlParts.length !== routeParts.length) {
      return false;
    }

    return routeParts.every((part, index) => part.startsWith(':') || part === urlParts[index]);
  }
}
