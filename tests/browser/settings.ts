import {expect,type Page} from '@playwright/test';
export async function creationSettings(page:Page){
 if(!await page.locator('.creation-options').evaluate((el:HTMLDetailsElement)=>el.open))await page.getByLabel('创作设置',{exact:true}).click();
}
export async function projectSettings(page:Page){
 // The creation drawer covers the header action; close it through its visible control first.
 if(await page.locator('.creation-options').evaluate((el:HTMLDetailsElement)=>el.open))await page.getByRole('button',{name:'完成',exact:true}).click();
 if(!await page.locator('.project-controls').evaluate((el:HTMLDetailsElement)=>el.open))await page.getByLabel('作品设置',{exact:true}).click();
}

// Browser event handlers still receive real clicks; only measured intervals are virtual.
export async function tapRhythm(page:Page){
 await page.emulateMedia({reducedMotion:'reduce'});
 const pad=page.getByRole('button',{name:'敲击节奏',exact:true});
 await pad.scrollIntoViewIfNeeded();
 await page.clock.install();await page.clock.pauseAt(Date.now()+1000);
 try{for(let i=0;i<5;i++){await pad.click();if(i<4)await page.clock.runFor(500)}}finally{await page.clock.resume()}
}
export async function startMaking(page:Page){
 const button=page.getByRole('button',{name:'制作新作品',exact:true});
 // Enabled is insufficient: clicking during capability discovery opens settings.
 await expect(button).not.toHaveAttribute('title');await button.click();
}
