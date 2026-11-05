import {defineConfig} from '@playwright/test';
const port=Number(process.env.E2E_MOCK_PORT||5184);
export default defineConfig({
 testDir:'./tests/browser',testMatch:'**/mock.spec.ts',outputDir:'mock-test-results',timeout:60000,workers:1,
 use:{baseURL:`http://127.0.0.1:${port}`,headless:true,viewport:{width:1440,height:1000},launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}},
 webServer:{command:`npm run dev:mock -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,env:{VITE_API_MODE:'mock',VITE_API_BASE_URL:''},reuseExistingServer:false,timeout:30000},
});
