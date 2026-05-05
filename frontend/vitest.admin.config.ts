import { defineConfig } from 'vitest/config';

const featureThreshold = {
  statements: 60,
  branches: 60,
  functions: 60,
  lines: 60,
};

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        'src/app/features/folha-pagamento/**/*.ts': featureThreshold,
        'src/app/features/recrutamento/**/*.ts': featureThreshold,
        'src/app/features/fiscal/**/*.ts': featureThreshold,
        'src/app/features/{portal/lgpd-encarregado,portal-publico/concursos/inscricao}/**/*.ts':
          featureThreshold,
        'src/app/{features/auditoria,core/audit}/**/*.ts': featureThreshold,
      },
    },
  },
});
