const sharedEnv = {
  NODE_ENV: 'production',
  APP_ENV_FILE: '/opt/sgp/shared/runtime.env',
};

module.exports = {
  apps: [
    {
      name: 'sgp-core-api',
      script: 'backend/dist/main.js',
      cwd: '/opt/sgp/current',
      exec_mode: 'cluster',
      instances: 'max',
      env: { ...sharedEnv, PORT: '3000' },
    },
    {
      name: 'sgp-portal-api',
      script: 'backend/dist/main-portal.js',
      cwd: '/opt/sgp/current',
      exec_mode: 'cluster',
      instances: 'max',
      env: { ...sharedEnv, PORTAL_API_PORT: '3001' },
    },
    {
      name: 'sgp-payroll-engine',
      script: 'backend/dist/main-payroll-engine.js',
      cwd: '/opt/sgp/current',
      exec_mode: 'cluster',
      instances: 'max',
      env: { ...sharedEnv, PAYROLL_ENGINE_PORT: '3302' },
    },
    {
      name: 'sgp-integrations-worker',
      script: 'backend/dist/main-integrations-worker.js',
      cwd: '/opt/sgp/current',
      exec_mode: 'fork',
      instances: 1,
      env: { ...sharedEnv, INTEGRATIONS_WORKER_READY_PORT: '3304' },
    },
    {
      name: 'sgp-report-service',
      script: 'backend/dist/main-report-service.js',
      cwd: '/opt/sgp/current',
      exec_mode: 'cluster',
      instances: 'max',
      env: { ...sharedEnv, REPORT_SERVICE_PORT: '3305' },
    },
    {
      name: 'sgp-report-worker',
      script: 'backend/dist/main-report-worker.js',
      cwd: '/opt/sgp/current',
      exec_mode: 'fork',
      instances: 1,
      env: { ...sharedEnv, REPORT_WORKER_READY_PORT: '3306' },
    },
  ],
};
