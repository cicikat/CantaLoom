import {defineConfig} from '@playwright/test';
const port=Number(process.env.E2E_FRONTEND_PORT||5183),apiPort=Number(process.env.E2E_API_PORT||3101);
export default defineConfig({
 testDir:'./tests/browser',testIgnore:'**/mock.spec.ts',timeout:120000,
 use:{baseURL:`http://127.0.0.1:${port}`,headless:true,viewport:{width:1440,height:1000},launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}},workers:1,
 webServer:[
  {command:'npm run dev:backend',url:`http://127.0.0.1:${apiPort}/api/health`,env:{PORT:String(apiPort)},reuseExistingServer:false,timeout:30000},
  {command:`npm run dev:frontend -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,env:{VITE_API_MODE:'real',VITE_API_PROXY_TARGET:`http://127.0.0.1:${apiPort}`,VITE_API_BASE_URL:''},reuseExistingServer:false,timeout:30000},
 ],
});
