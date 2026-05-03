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
import { filter, map, startWith } from 'rxjs';

import { CognitoAuth } from '../../core/auth/cognito-auth';
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
  private readonly auth = inject(CognitoAuth);
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
    this.navigationFilter.visibleSections(this.auth.currentSession()),
  );

  readonly userDisplayName = computed(() => {
    const session = this.auth.currentSession();
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
    this.auth.clearSession();
    this.router.navigateByUrl('/');
  }

  private normalizedUrl(): string {
    const normalized = this.currentUrl().split('?')[0].split('#')[0] || '/';
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
