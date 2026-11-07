import type {PlaywrightTestConfig} from '@playwright/test';
export const browserUse:PlaywrightTestConfig['use']={
 headless:true,viewport:{width:1440,height:1000},
 launchOptions:{args:['--autoplay-policy=no-user-gesture-required']},
 screenshot:'only-on-failure',
};
// Windows file watching can race with Chromium downloads under the project output tree.
export const watcherEnv:Record<string,string>=process.platform==='win32'?{CHOKIDAR_USEPOLLING:'true'}:{};
