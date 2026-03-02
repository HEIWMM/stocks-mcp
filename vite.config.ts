import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TushareMCP',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        '@modelcontextprotocol/sdk',
        'koa',
        'koa-router',
        'koa-bodyparser',
        '@koa/cors',
        'axios'
      ],
      output: {
        globals: {
          '@modelcontextprotocol/sdk': 'MCP',
          'koa': 'Koa',
          'koa-router': 'KoaRouter',
          'koa-bodyparser': 'bodyParser',
          '@koa/cors': 'cors',
          'axios': 'axios'
        }
      }
    },
    target: 'node18',
    outDir: 'dist'
  }
});
