import { bootstrapApplication } from '@angular/platform-browser';

async function loadDevJitCompiler(): Promise<void> {
  if (shouldLoadDevJitCompiler()) {
    await import('@angular/compiler');
  }
}

function shouldLoadDevJitCompiler(): boolean {
  const runtimeConfig = (
    globalThis as typeof globalThis & {
      SGP_CONFIG?: Record<string, string | undefined>;
    }
  ).SGP_CONFIG;
  const hostname = globalThis.location?.hostname;
  return (
    runtimeConfig?.['STYNX_E2E'] === 'true' || hostname === '127.0.0.1' || hostname === 'localhost'
  );
}

async function bootstrapPortal(): Promise<void> {
  await loadDevJitCompiler();
  const [{ App }, { appConfig }] = await Promise.all([
    import('./app/app'),
    import('./app/app.config'),
  ]);
  await bootstrapApplication(App, appConfig);
}

bootstrapPortal().catch((error) => console.error(error));
