// esbuild ships .yaml as text via `loader: { '.yaml': 'text' }` (see
// esbuild.config.mjs). Vitest mirrors that via a small plugin in
// vitest.config.ts. This ambient declaration lets TypeScript accept the
// string import in src/services/vault-scan.ts.
declare module '*.yaml' {
  const content: string;
  export default content;
}
