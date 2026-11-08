// Inspect only known provenance locations, never arbitrary user text or IDs.
export function hasMockData(value:unknown):boolean {
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 if(v.mock===true)return true;
 if(v.pvVisual&&hasMockData((v.pvVisual as Record<string,unknown>).result))return true;
 for(const key of ['project','composition','draft','melodyDraft','planning'])if(hasMockData(v[key]))return true;
 for(const key of ['vocalAssets','vocalHistory']){
  const assets=v[key];
  if(assets&&typeof assets==='object'&&Object.values(assets).some(a=>Array.isArray(a)?a.some(hasMockData):hasMockData(a)))return true;
 }
 return false;
}
