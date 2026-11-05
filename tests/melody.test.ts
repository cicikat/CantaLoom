import {test} from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Express backend is exercised at runtime; repository has no @types/express.
import express from 'express';
import {createProject,regenerate} from '../src/composer';
import {createFreeProject,melodyRequest,applyMelodyDraft,setPhrasePerformance} from '../src/melody';
import {localMelody,validateMelody} from '../shared/melody.mjs';
import {singingDependency} from '../src/singing';
import {validateProject} from '../src/model';
// @ts-expect-error backend module
import {qixuanProject} from '../server/services/qixuan.mjs';
// @ts-expect-error backend module
import {createMelodyComposer} from '../server/services/melody.mjs';
// @ts-expect-error backend route
import {mountMelody} from '../server/routes/melody.mjs';
import {createApiClient} from '../src/api/client';

test('phrase grammar has repeated pitches, varied duration and rests; preserves manual lyrics and unrelated tracks',()=>{
 const p=createProject();p.lyrics.forEach(l=>l.source='manual');const r=melodyRequest(p,'轻柔而有停顿'),draft=localMelody(r),next=applyMelodyDraft(p,r,draft);
 assert.deepEqual(next.lyrics.map(l=>l.text),p.lyrics.map(l=>l.text));assert.deepEqual(next.tracks.filter(t=>t.kind!=='vocal'),p.tracks.filter(t=>t.kind!=='vocal'));
 const n=draft.phrases[0].notes;assert.ok(new Set(n.map(n=>n.duration.toFixed(5))).size>1);assert.ok(n.some((v,i)=>i&&v.midi===n[i-1].midi));assert.ok(n.some((v,i)=>i&&v.beat>n[i-1].beat+n[i-1].duration+.001));validateProject(JSON.parse(JSON.stringify(next)));
});
test('targeted phrase transaction keeps siblings and rejects stale response, overlaps, lyrics edits and off-key notes',()=>{
 const p=createProject(),id=p.lyrics[0].id,r=melodyRequest(p,'只改第一句',[id]),draft=localMelody(r),next=applyMelodyDraft(p,r,draft);
 assert.deepEqual(next.lyrics.slice(1),p.lyrics.slice(1));const before=JSON.stringify(p);
 for(const edit of [(d:typeof draft)=>{d.phrases[0].text+='字'},(d:typeof draft)=>{d.phrases[0].notes[1].beat=d.phrases[0].notes[0].beat},(d:typeof draft)=>{d.phrases[0].notes[0].midi=61}]){const bad=structuredClone(draft);edit(bad);assert.throws(()=>applyMelodyDraft(p,r,bad));assert.equal(JSON.stringify(p),before)}
 const stale=structuredClone(p);stale.lyrics[0].text+='变';assert.throws(()=>applyMelodyDraft(stale,r,draft));
});
test('locked notes survive legacy regeneration and structured continuation validation',()=>{
 const initial=createProject(),initialRequest=melodyRequest(initial,'先构建有节奏的乐句');const p=applyMelodyDraft(initial,initialRequest,localMelody(initialRequest));p.lyrics[0].notes[0].locked=true;const t=p.tracks.find(t=>t.kind==='vocal'&&t.sectionId===p.lyrics[0].sectionId)!;const regenerated=regenerate(p,t.id);assert.deepEqual(regenerated.lyrics[0].notes,p.lyrics[0].notes);
 const r=melodyRequest(p,'保留第一音，继续旋律',[p.lyrics[0].id]),draft={version:1 as const,source:'llm' as const,phrases:structuredClone(r.phrases).map(p=>({...p,motif:'test'}))};
 validateMelody(r,draft);draft.phrases[0].notes[0].midi++;assert.throws(()=>validateMelody(r,draft));
});
test('performance presets change actual USTX and only invalidate the affected sentence cache',()=>{
 const p=createProject(),l=p.lyrics[0],v={id:'qixuan',version:'2.7',label:'test',providerId:'openutau-diffsinger' as const};const first=singingDependency(p,l,v),sibling=singingDependency(p,p.lyrics[1],v);
 const next=setPhrasePerformance(p,l.id,{preset:'soft'});assert.notEqual(singingDependency(next,next.lyrics[0],v),first);assert.equal(singingDependency(next,next.lyrics[1],v),sibling);assert.deepEqual(next.lyrics[0].notes,l.notes);
 const input={lyricId:l.id,lyrics:l.text,start:l.start,end:l.end,bpm:p.bpm,notes:l.notes,engineVersion:'test'};
 const soft=qixuanProject({...input,performance:{preset:'soft'}}),strong=qixuanProject({...input,performance:{preset:'strong'}});assert.notDeepEqual(soft.voice_parts[0].curves,strong.voice_parts[0].curves);assert.notDeepEqual(soft.voice_parts[0].notes[0].pitch,strong.voice_parts[0].notes[0].pitch);
});
test('LLM provider validates structured output, fails atomically and reports honest provenance (fixture)',async()=>{
 const p=createProject(),r=melodyRequest(p,'夹具'),draft=localMelody(r);draft.source='llm';let calls=0;
 const composer=createMelodyComposer({env:{LLM_API_KEY:'fixture',LLM_MODEL:'fixture'},request:async()=>{calls++;return Response.json({choices:[{message:{content:JSON.stringify(draft)}}],usage:{prompt_tokens:10,completion_tokens:20}})}});
 const result=await composer.compose(r);assert.equal(result.draft.source,'llm');assert.equal(result.metrics.completionTokens,20);assert.equal(calls,1);
 const bad=createMelodyComposer({env:{LLM_API_KEY:'fixture'},request:async()=>Response.json({choices:[{message:{content:'{}'}}]})});const before=JSON.stringify(p);await assert.rejects(()=>bad.compose(r));assert.equal(JSON.stringify(p),before);
});

test('free short-song accepts variable count and original multiline lyrics without templates',()=>{const p=createFreeProject({intent:'自由输入',lyrics:'第一句自己的词\n第二句自己的词\n第三句自己的词'});assert.equal(p.lyrics.length,3);assert.deepEqual(p.lyrics.map(l=>l.text),['第一句自己的词','第二句自己的词','第三句自己的词']);assert.ok(p.lyrics.every(l=>l.source==='manual'));const theme=createFreeProject({intent:'热烈的夏天',phraseCount:5});assert.equal(theme.lyrics.length,5);assert.ok(theme.lyrics.every(l=>l.text===''));validateProject(theme)});

test('public melody HTTP route and shared client validate real transport without keys (explicit local rules)',async()=>{
 const app=express();app.use(express.json());mountMelody(app);const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
 const baseUrl=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
 try{const request=melodyRequest(createProject(),'本地规则');request.source='local-rules';const result=await createApiClient({baseUrl}).melody(request);assert.equal(result.draft.source,'local-rules');assert.equal((await fetch(baseUrl+'/api/melody',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400)}finally{await new Promise<void>(resolve=>server.close(()=>resolve()))}
});

test('new local vocal phrases use rhythm grammar while old saved notes are never rewritten on validation',()=>{const p=createProject(),before=JSON.stringify(p);validateProject(p);assert.equal(JSON.stringify(p),before);for(const l of p.lyrics){assert.ok(new Set(l.notes.map(n=>n.duration.toFixed(4))).size>1);assert.ok(l.notes.some((n,i)=>i&&n.beat>l.notes[i-1].beat+l.notes[i-1].duration+.001))}});
