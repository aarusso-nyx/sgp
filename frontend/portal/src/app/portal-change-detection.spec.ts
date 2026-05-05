import { Contracheque } from './pages/contracheque/contracheque';
import { Ferias } from './pages/ferias/ferias';
import { GovBrSignCallback } from './pages/govbr-sign-callback/govbr-sign-callback';
import { Licencas } from './pages/licencas/licencas';
import { LicencasSaude } from './pages/licencas/saude/saude';
import { MeusDadosBancarios } from './pages/meus-dados/bancarios/bancarios';
import { MeusDados } from './pages/meus-dados/meus-dados';
import { PortalAuthCallback } from './pages/auth-callback/auth-callback';
import { PortalFeaturePage } from './pages/portal-feature-page/portal-feature-page';
import { PortalHome } from './pages/portal-home/portal-home';
import { PortalShell } from './pages/portal-shell/portal-shell';
import { ProximasEscalas } from './pages/ponto/proximas-escalas/proximas-escalas';

interface AngularComponentDeclaration {
  onPush?: boolean;
}

const declarationKey = `${String.fromCharCode(0x0275)}cmp`;

const portalComponents = [
  { label: 'PortalAuthCallback', component: PortalAuthCallback },
  { label: 'Contracheque', component: Contracheque },
  { label: 'Ferias', component: Ferias },
  { label: 'GovBrSignCallback', component: GovBrSignCallback },
  { label: 'Licencas', component: Licencas },
  { label: 'LicencasSaude', component: LicencasSaude },
  { label: 'MeusDados', component: MeusDados },
  { label: 'MeusDadosBancarios', component: MeusDadosBancarios },
  { label: 'PortalFeaturePage', component: PortalFeaturePage },
  { label: 'PortalHome', component: PortalHome },
  { label: 'PortalShell', component: PortalShell },
  { label: 'ProximasEscalas', component: ProximasEscalas },
];

describe('portal change detection policy', () => {
  it.each(portalComponents)('keeps $label on OnPush', ({ component }) => {
    const declaration = (component as unknown as Record<string, unknown>)[declarationKey] as
      | AngularComponentDeclaration
      | undefined;

    expect(declaration?.onPush).toBe(true);
  });
});
