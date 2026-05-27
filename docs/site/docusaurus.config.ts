import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SGP',
  tagline: 'Municipal people, payroll, governance, and regulatory operations platform.',

  future: {
    v4: false,
  },

  url: 'https://aarusso-nyx.github.io',
  baseUrl: '/sgp/',

  organizationName: 'aarusso-nyx',
  projectName: 'sgp',

  onBrokenLinks: 'warn',
  markdown: {
    format: 'md',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
      onBrokenMarkdownImages: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'SGP',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/eng',
          label: 'Engineering',
          position: 'left',
        },
        {
          to: '/docs/gov',
          label: 'Governance',
          position: 'left',
        },
        {
          to: '/docs/user',
          label: 'Operators',
          position: 'left',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Authority',
          items: [
            { label: 'Engineering', to: '/docs/eng' },
            { label: 'ADRs', to: '/docs/eng/decisions' },
            { label: 'Governance', to: '/docs/gov' },
          ],
        },
        {
          title: 'Operations',
          items: [
            { label: 'User docs', to: '/docs/user' },
            { label: 'Runbooks', to: '/docs/eng/runbooks/deploy-rollback' },
            { label: 'Legacy archive', to: '/docs/leg' },
          ],
        },
      ],
      copyright: 'Built with Docusaurus. SGP documentation follows DEVAI docs-governance.',
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
