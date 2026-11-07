import type {Page} from '@playwright/test';
export async function creationSettings(page:Page){
 if(!await page.locator('.creation-options').evaluate((el:HTMLDetailsElement)=>el.open))await page.getByLabel('创作设置',{exact:true}).click();
}
export async function projectSettings(page:Page){
 if(!await page.locator('.project-controls').evaluate((el:HTMLDetailsElement)=>el.open))await page.getByLabel('作品设置',{exact:true}).click();
}
