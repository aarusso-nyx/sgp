export interface PortalFeatureItem {
  label: string;
  path: string;
  capability: string;
  module: string;
  description: string;
}

export interface PortalFeatureSection {
  label: string;
  summary: string;
  items: PortalFeatureItem[];
}

export const PORTAL_FEATURE_CATALOG: PortalFeatureSection[] = [
  {
    label: 'Meus Dados',
    summary: 'Self-service access to identity, contact, and dependent records.',
    items: [
      {
        label: 'Cadastro Pessoal',
        path: '/meus-dados/cadastro',
        capability: 'authenticated',
        module: 'rh',
        description: 'Personal profile view with HR-owned update flow.',
      },
      {
        label: 'Endereco',
        path: '/meus-dados/endereco',
        capability: 'authenticated',
        module: 'pessoa',
        description: 'Address and domicile maintenance used by recadastramento.',
      },
      {
        label: 'Contato',
        path: '/meus-dados/contato',
        capability: 'authenticated',
        module: 'pessoa',
        description: 'Email and phone data used by notifications and proof-of-life reminders.',
      },
      {
        label: 'Documentos',
        path: '/meus-dados/documentos',
        capability: 'authenticated',
        module: 'pessoa',
        description: 'Read-only view of official documents stored in the canonical person record.',
      },
      {
        label: 'Dependentes',
        path: '/meus-dados/dependentes',
        capability: 'authenticated',
        module: 'rh',
        description: 'Dependent roster visible to the authenticated actor.',
      },
    ],
  },
  {
    label: 'Contracheques',
    summary: 'Portal payroll outputs and annual financial history.',
    items: [
      {
        label: 'Mes Atual',
        path: '/contracheques/atual',
        capability: 'authenticated',
        module: 'folha',
        description: 'Current competence payslip summary.',
      },
      {
        label: 'Historico',
        path: '/contracheques/historico',
        capability: 'authenticated',
        module: 'folha',
        description: 'Historical competence list by year and month.',
      },
      {
        label: 'Download PDF',
        path: '/contracheques/download/competencia-atual',
        capability: 'authenticated',
        module: 'folha',
        description: 'PDF delivery path for the actor own payslip.',
      },
      {
        label: 'Financeiro Anual',
        path: '/contracheques/financeiro-anual',
        capability: 'authenticated',
        module: 'folha',
        description: 'Annual totals for earnings and deductions.',
      },
    ],
  },
  {
    label: 'Licencas e Afastamentos',
    summary: 'Request intake and visibility for leave-related flows.',
    items: [
      {
        label: 'Solicitacoes',
        path: '/licencas/solicitacoes',
        capability: 'authenticated',
        module: 'rh',
        description: 'Leave request entry point for the authenticated actor.',
      },
      {
        label: 'Historico',
        path: '/licencas/historico',
        capability: 'authenticated',
        module: 'rh',
        description: 'Historical leave and absence statuses.',
      },
      {
        label: 'Documentos',
        path: '/licencas/documentos',
        capability: 'authenticated',
        module: 'rh',
        description: 'Medical or documentary attachments linked to leave requests.',
      },
    ],
  },
  {
    label: 'Pericias',
    summary: 'Occupational health scheduling and approved reports.',
    items: [
      {
        label: 'Agendadas',
        path: '/pericias/agendadas',
        capability: 'authenticated',
        module: 'saude',
        description: 'Upcoming scheduled medical evaluations.',
      },
      {
        label: 'Historico',
        path: '/pericias/historico',
        capability: 'authenticated',
        module: 'saude',
        description: 'Completed evaluations and disposition history.',
      },
      {
        label: 'Anexos',
        path: '/pericias/anexos',
        capability: 'authenticated',
        module: 'saude',
        description: 'Attachments and approved report downloads for the actor.',
      },
    ],
  },
  {
    label: 'Recadastramento',
    summary: 'Proof-of-life and recertification journeys.',
    items: [
      {
        label: 'Iniciar',
        path: '/recadastramento/iniciar',
        capability: 'authenticated',
        module: 'previdenciario',
        description: 'Start the portal-driven recadastramento flow.',
      },
      {
        label: 'Historico',
        path: '/recadastramento/historico',
        capability: 'authenticated',
        module: 'previdenciario',
        description: 'Prior proof-of-life submissions and statuses.',
      },
      {
        label: 'Comprovantes',
        path: '/recadastramento/comprovantes',
        capability: 'authenticated',
        module: 'previdenciario',
        description: 'Receipt archive for completed recadastramento runs.',
      },
    ],
  },
  {
    label: 'Ferias',
    summary: 'Vacation requests, planning, and historical visibility.',
    items: [
      {
        label: 'Solicitar',
        path: '/ferias/solicitar',
        capability: 'authenticated',
        module: 'rh',
        description: 'Vacation request intake linked to HR approval workflows.',
      },
      {
        label: 'Historico',
        path: '/ferias/historico',
        capability: 'authenticated',
        module: 'rh',
        description: 'Past and approved vacation periods.',
      },
      {
        label: 'Programacao',
        path: '/ferias/programacao',
        capability: 'authenticated',
        module: 'rh',
        description: 'Scheduled vacation plan and remaining balances.',
      },
    ],
  },
  {
    label: 'Curriculo',
    summary: 'Talent bank profile and application tracking.',
    items: [
      {
        label: 'Meu Curriculo',
        path: '/curriculo/meu-curriculo',
        capability: 'authenticated',
        module: 'recrutamento',
        description: 'Editable candidate or employee curriculum profile.',
      },
      {
        label: 'Candidaturas',
        path: '/curriculo/candidaturas',
        capability: 'authenticated',
        module: 'recrutamento',
        description: 'Application status tracking across personnel requests.',
      },
    ],
  },
  {
    label: 'Requisicoes',
    summary: 'Manager-initiated personnel request workflows.',
    items: [
      {
        label: 'Nova Requisicao',
        path: '/requisicoes/nova',
        capability: 'REQUISICAO_DE_PESSOAL.CADASTRAR',
        module: 'recrutamento',
        description: 'Manager-only entry point for a new staffing request.',
      },
      {
        label: 'Acompanhamento',
        path: '/requisicoes/acompanhamento',
        capability: 'REQUISICAO_DE_PESSOAL.VISUALIZAR',
        module: 'recrutamento',
        description: 'Track requests opened by the authenticated manager.',
      },
    ],
  },
  {
    label: 'Documentos Pessoais',
    summary: 'Document download center for the authenticated actor.',
    items: [
      {
        label: 'Ficha Funcional',
        path: '/documentos/ficha-funcional',
        capability: 'authenticated',
        module: 'rh',
        description: 'Download the personal functional file projection.',
      },
      {
        label: 'Declaracoes',
        path: '/documentos/declaracoes',
        capability: 'authenticated',
        module: 'previdenciario',
        description: 'Declaration catalog for retirees and former employees.',
      },
      {
        label: 'Certidoes',
        path: '/documentos/certidoes',
        capability: 'authenticated',
        module: 'previdenciario',
        description: 'Contribution and compensation certificate downloads.',
      },
    ],
  },
  {
    label: 'Avaliacao',
    summary: 'Self-evaluation and performance cycle visibility.',
    items: [
      {
        label: 'Auto-Avaliacao',
        path: '/avaliacao/auto-avaliacao',
        capability: 'authenticated',
        module: 'avaliacao',
        description: 'Self-evaluation submission form for active cycles.',
      },
      {
        label: 'Resultados',
        path: '/avaliacao/resultados',
        capability: 'authenticated',
        module: 'avaliacao',
        description: 'Published performance cycle outcomes and notes.',
      },
    ],
  },
  {
    label: 'Notificacoes',
    summary: 'Portal inbox and engagement trail.',
    items: [
      {
        label: 'Inbox',
        path: '/notificacoes',
        capability: 'authenticated',
        module: 'notificacoes',
        description: 'In-app notifications with optional email correlation.',
      },
    ],
  },
  {
    label: 'Configuracoes',
    summary: 'Identity and privacy preferences managed in the portal.',
    items: [
      {
        label: 'MFA',
        path: '/configuracoes/mfa',
        capability: 'authenticated',
        module: 'auth',
        description: 'Multi-factor configuration and recovery guidance.',
      },
      {
        label: 'Alterar Senha',
        path: '/configuracoes/senha',
        capability: 'authenticated',
        module: 'auth',
        description: 'Password rotation through Cognito-native flows.',
      },
      {
        label: 'Consentimentos LGPD',
        path: '/configuracoes/lgpd',
        capability: 'authenticated',
        module: 'auth',
        description: 'Consent, revocation, and privacy acknowledgement trail.',
      },
    ],
  },
];
