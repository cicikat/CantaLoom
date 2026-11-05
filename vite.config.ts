import { defineConfig,loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,process.cwd(),''),...process.env};
 const target=env.VITE_API_PROXY_TARGET||'http://127.0.0.1:3001';
 return {plugins:[react(),{name:'keep-admin-local',configureServer(server){
  // Access administration directly on the loopback backend, never through Vite.
  server.middlewares.use((req,res,next)=>{const path=new URL(req.url||'/','http://local').pathname;if(/^\/(api\/admin|admin|admin-assets)(\/|$)/.test(path)){res.statusCode=403;res.end('Use the local backend administration URL');return}next()});
 }}],server:{host:'127.0.0.1',port:5173,proxy:mode==='mock'?undefined:{'/api':target}}};
});
