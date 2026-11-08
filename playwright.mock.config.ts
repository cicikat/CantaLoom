import {defineConfig} from '@playwright/test';
import {browserUse,watcherEnv} from './tests/browser/config';
const port=Number(process.env.E2E_MOCK_PORT||5184);
export default defineConfig({
 testDir:'./tests/browser',testMatch:['**/mock.spec.ts','**/interface-sync.spec.js'],outputDir:'temp/test-results/mock',timeout:60000,workers:1,
 use:{...browserUse,baseURL:`http://127.0.0.1:${port}`},
 webServer:{command:`npm run dev:mock -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,env:{...watcherEnv,VITE_API_MODE:'mock',VITE_API_BASE_URL:''},reuseExistingServer:false,timeout:30000},
});
