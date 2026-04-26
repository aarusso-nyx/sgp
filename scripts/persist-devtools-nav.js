const fs = require('node:fs');
const path = require('node:path');

const navData = {
  navFound: true,
  currentUrl: 'https://sgp.detran.am.gov.br/detran-am/#!/page/home',
  menus: [
    {
      topLabel: 'Gestão',
      submenus: [
        { label: 'Bancos', href: '#!/banco/gestao' },
        { label: 'Cargos', href: '#!/cargo/gestao' },
        { label: 'Causas de Afastamento', href: '#!/causaAfastamento/gestao' },
        { label: 'Centro de Custo', href: '#!/centroCusto/gestao' },
        { label: 'Classificacoes dos Atos', href: '#!/classificacaoAto/gestao' },
        { label: 'Convenios', href: '#!/convenio/gestao' },
        { label: 'Dias Uteis', href: '#!/diaUtil/gestao' },
        { label: 'Exportacao de Arquivo', href: '#!/exportacaoArquivo/gestao' },
        { label: 'Faixas Salariais', href: '#!/faixaSalarial/gestao' },
        { label: 'Funcao', href: '#!/funcao/gestao' },
        { label: 'Importação Consignado', href: '#!/importacaoConsignado' },
        { label: 'Legislacao', href: '#!/legislacao/gestao' },
        { label: 'Lotacao', href: '#!/lotacao/gestao' },
        { label: 'Motivo Afastamento', href: '#!/motivoAfastamento/gestao' },
        { label: 'Motivos', href: '#!/motivo/gestao' },
        { label: 'Motivos do Desligamento', href: '#!/motivoDesligamento/gestao' },
        { label: 'Natureza da Funcao', href: '#!/naturezaFuncao/gestao' },
        { label: 'Naturezas Juridicas', href: '#!/naturezaJuridica/gestao' },
        { label: 'Orgaos Publicos', href: '#!/empresaFilial/gestao' },
        { label: 'Parametro do Sistema', href: '#!/parametroSistema/gestao' },
        { label: 'Perfis de Acesso', href: '#!/perfilAcesso/gestao' },
        { label: 'Referencia Salarial', href: '#!/referenciaSalarial/gestao' },
        { label: 'Responsavel Legal', href: '#!/responsavelLegal/gestao' },
        { label: 'Sindicatos', href: '#!/sindicato/gestao' },
        { label: 'Situacao Funcional', href: '#!/situacaoFuncional/gestao' },
        { label: 'Tipo de Processamento', href: '#!/tipoProcessamento/gestao' },
        { label: 'Tipos de Contrato', href: '#!/tipoContrato/gestao' },
        { label: 'Tipos de Documento', href: '#!/tipoDocumento/gestao' },
        { label: 'Tipos de Ferias', href: '#!/tipoFerias/gestao' },
        { label: 'Tipos de Folhas', href: '#!/tipoFolha/gestao' },
        { label: 'Turno', href: '#!/turno/gestao' },
        { label: 'Usuarios', href: '#!/usuario/gestao' },
        { label: 'Vales Transporte', href: '#!/valeTransporte/gestao' },
        { label: 'Verbas', href: '#!/verba/gestao' },
        { label: 'Vinculos', href: '#!/vinculo/gestao' }
      ]
    },
    {
      topLabel: 'Módulo RH',
      submenus: [
        { label: 'Afastamentos dos Funcionários', href: '#!/historicoSituacaoFuncional/gestao' },
        { label: 'Dados Cadastrais', href: '#!/dadoCadastralComplementar/gestao' },
        { label: 'Definicao de Organico', href: '#!/definicaoOrganico/gestao' },
        { label: 'Dependentes', href: '#!/dependente/gestao' },
        { label: 'Experiencia Profissional', href: '#!/experienciaProfissional/gestao' },
        { label: 'Funcionario', href: '#!/funcionario/gestao' },
        { label: 'Historico Nível Salarial', href: '#!/nivelSalarialHistorico/gestao' },
        { label: 'Licenca Premio', href: '#!/licencaPremio/gestao' },
        { label: 'Programacao de Ferias', href: '#!/feriasProgramacao/gestao' },
        { label: 'Registo de Frequêcia', href: '#!/frequencia/gestao' },
        { label: 'Tempo de Servico', href: '#!/tempoServico/gestao' },
        { label: 'Transferencia Funcionário', href: '#!/transferenciaFuncionario/gestao' }
      ]
    },
    {
      topLabel: 'Folha de Pgt',
      submenus: [
        { label: 'Arquivo remessa pagamento', href: '#!/arquivoRemessaPagamento/gestao' },
        { label: 'Ficha Financeira', href: '#!/fichaFinanceira/gestao' },
        { label: 'Folha de Pagamento', href: '#!/folhaPagamento/gestao' },
        { label: 'Rel. Batimento da Folha', href: '#!/batimentoFolhaPagamento/relatorio' },
        { label: 'Rel. Financeiro', href: '#!/relatorio/financeiro/gestao' },
        { label: 'Rel. Folha de Pagamento', href: '#!/relatorioFolhaPagamento/gestao' },
        { label: 'Rel. Gerencial', href: '#!/relatorioGerencial/gestao' },
        { label: 'Rel. Pagamento Bloqueados', href: '#!/relatorioServidorPagBloqueado/gestao' },
        { label: 'Verbas do Funcionario', href: '#!/verbasFuncionario/gestao' }
      ]
    },
    {
      topLabel: 'Relatório',
      submenus: [
        { label: 'Relatório Repasse Fundo RH', href: '#!/relatorios/relatorioRepasseFundoRh' },
        { label: 'Relatórios de Estágio', href: '#!/relatorios/estagio' }
      ]
    },
    {
      topLabel: 'Auditoria',
      submenus: [
        { label: 'Auditoria', href: '#!/auditoria/gestao' }
      ]
    },
    {
      topLabel: 'Convênio',
      submenus: [
        { label: 'Estagiario', href: '#!/convenios/estagiario' },
        { label: 'Instituicao de Ensino', href: '#!/convenios/instituicaoEnsino' },
        { label: 'Programas de Estagios', href: '#!/convenios/programa' }
      ]
    }
  ]
};

const now = new Date().toISOString();
const evidencePath = 'playwright/reports/devtools-nav.png';

const menuRecords = [];
const routeSet = new Set(['#!/page/home']);

for (const top of navData.menus) {
  for (const sub of top.submenus) {
    routeSet.add(sub.href);
    menuRecords.push({
      label: sub.label,
      menuPath: [top.topLabel, sub.label],
      targetRoute: sub.href,
      module: top.topLabel,
      status: 'observed',
      evidence: [evidencePath]
    });
  }
}

const menus = menuRecords
  .sort((a, b) => a.menuPath.join('>').localeCompare(b.menuPath.join('>')))
  .map((m, idx) => ({ id: `menu-${String(idx + 1).padStart(3, '0')}`, ...m }));

const routes = Array.from(routeSet)
  .sort((a, b) => a.localeCompare(b))
  .map((route, idx) => ({
    id: `route-${String(idx + 1).padStart(3, '0')}`,
    path: route,
    name: '',
    module: '',
    access: 'unknown',
    status: 'observed',
    evidence: [evidencePath]
  }));

const menusInventory = {
  meta: {
    version: '0.1.0',
    updatedAt: now,
    source: 'chrome-devtools-ul-nav-crawl'
  },
  menus
};

const routesInventory = {
  meta: {
    version: '0.1.0',
    updatedAt: now,
    source: 'chrome-devtools-ul-nav-crawl'
  },
  routes
};

fs.writeFileSync(path.resolve(process.cwd(), 'inventories/menus.json'), JSON.stringify(menusInventory, null, 2));
fs.writeFileSync(path.resolve(process.cwd(), 'inventories/routes.json'), JSON.stringify(routesInventory, null, 2));

const topSection = navData.menus
  .map((m) => `- ${m.topLabel} (${m.submenus.length})`)
  .join('\n');

const menuPathSection = menus
  .map((m) => `- ${m.menuPath.join(' > ')} -> ${m.targetRoute}`)
  .join('\n');

const hashSection = Array.from(routeSet)
  .filter((r) => r.startsWith('#'))
  .sort((a, b) => a.localeCompare(b))
  .map((r) => `- ${r}`)
  .join('\n');

const sitemap = `# Sitemap

Generated at: ${now}

## Top-level navigation
${topSection}

## Menu paths
${menuPathSection}

## Hash routes
${hashSection}

## Path routes
- none discovered

## Notes
- Discovery source: Chrome DevTools extraction from legacy AngularJS container \`ul#nav.nav\`.
- All entries are marked \`observed\` and linked to evidence screenshot \`${evidencePath}\`.
`;

fs.writeFileSync(path.resolve(process.cwd(), 'docs/sitemap.md'), sitemap);

console.log(JSON.stringify({ totalTopMenus: navData.menus.length, totalMenuLinks: menus.length, totalRoutes: routes.length }, null, 2));
