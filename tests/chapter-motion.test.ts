import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actProgress,cascade,easeBack,MV_EXIT_MS,mvExitFrame,PHRASE_HOLD_MS,PHRASE_SWAP_MS,phraseFrame,span} from '../src/components/chapter-motion';

// Ticket 29: pin the scroll geometry and the entry-triggered phrase playback.
const V=800,REVEAL=760,INTRO=V*1.8,TRACK=V+INTRO+REVEAL;

test('original opener holds a full screen before the curtain reveals the pinned page',()=>{
 assert.deepEqual(actProgress(V,TRACK,V,V+INTRO,REVEAL),{intro:0,story:0,reveal:0});
 const half=actProgress(-INTRO*.5,TRACK,V,INTRO*.5,REVEAL);assert.equal(half.intro,.5);assert.equal(half.story,0);assert.equal(half.reveal,0);
 assert.ok(INTRO*(1-.42)>V,'title threshold leaves at least a screen of scroll');
 const open=actProgress(-INTRO-380,TRACK,V,-380,REVEAL);assert.equal(open.intro,1);assert.equal(open.reveal,.5);
 assert.equal(actProgress(-4000,TRACK,V,-3080,REVEAL).reveal,1);
 const mvTrack=V+INTRO+V*2.2+REVEAL;
 assert.equal(actProgress(-INTRO,mvTrack,V,V*2.2,REVEAL).story,0,'closing curtain waits until the original hold finishes');
 assert.equal(actProgress(-INTRO-V*1.1,mvTrack,V,V*1.1,REVEAL).story,.5);
 // Reduced motion removes the spacer: the page counts as uncovered once it reaches the top.
 assert.equal(actProgress(0,V,V,0,0).reveal,1);assert.equal(actProgress(0,V,V,10,0).reveal,0);
});

test('entering Lets plays the whole phrase swap while scroll stays still, then stops requesting frames',()=>{
 const start=100;
 assert.deepEqual(phraseFrame(.4,start,null),{startedAt:null,progress:0,running:false});
 assert.deepEqual(phraseFrame(.5,start,null),{startedAt:start,progress:0,running:true});
 assert.equal(phraseFrame(.5,start+PHRASE_HOLD_MS,start).progress,0,'first phrase has time to land');
 assert.equal(phraseFrame(.5,start+PHRASE_HOLD_MS+PHRASE_SWAP_MS/2,start).progress,.5);
 assert.deepEqual(phraseFrame(.5,start+PHRASE_HOLD_MS+PHRASE_SWAP_MS,start),{startedAt:start,progress:1,running:false});
});

test('small scrolls never restart playback; leaving resets it and skipping ahead settles it',()=>{
 assert.equal(phraseFrame(.7,1200,100).startedAt,100);
 assert.equal(phraseFrame(.4,1200,100).startedAt,100,'hysteresis holds near the entry threshold');
 assert.deepEqual(phraseFrame(.3,1200,100),{startedAt:null,progress:0,running:false});
 assert.equal(phraseFrame(.5,1300,null).startedAt,1300,'returning starts a fresh playback');
 const skipped=phraseFrame(1,2000,100,true);
 assert.equal(skipped.progress,1);assert.equal(skipped.running,false);
 assert.equal(phraseFrame(1,2100,skipped.startedAt).progress,1,'coming back from the closing curtain keeps the finished phrase');
});

test('letters cascade in order and finish together with the swap',()=>{
 const total=.12+14*.04+.44;
 assert.equal(cascade(0,0,.12,.04,.44,total),0);assert.equal(cascade(1,14,.12,.04,.44,total),1);
 assert.ok(cascade(.4,0,.12,.04,.44,total)>cascade(.4,5,.12,.04,.44,total));
 assert.equal(span(.5,0,1),.5);assert.equal(easeBack(0),0);assert.equal(easeBack(1),1);assert.ok(easeBack(.7)>1,'lands with an overshoot');
});

test('MV exit closes the sentence, fills the screen, then uncovers MV on its own clock',()=>{
 const joined=mvExitFrame(0,1,MV_EXIT_MS*.18);
 assert.equal(joined.join,1);assert.equal(joined.expand,0);assert.equal(joined.reveal,0);assert.equal(joined.running,true);
 const filled=mvExitFrame(0,1,MV_EXIT_MS*.56);
 assert.equal(filled.join,1);assert.equal(filled.expand,1);assert.equal(filled.reveal,0,'MV is moved underneath only after the block covers the screen');
 assert.deepEqual(mvExitFrame(0,1,MV_EXIT_MS),{progress:1,join:1,expand:1,reveal:1,running:false});
});

test('MV exit can reverse mid-flight and stops at both ends',()=>{
 const reverse=mvExitFrame(.8,0,MV_EXIT_MS*.1);
 assert.ok(Math.abs(reverse.progress-.7)<1e-10);assert.equal(reverse.join,1);assert.equal(reverse.expand,1);assert.ok(reverse.reveal>0&&reverse.reveal<1);
 assert.deepEqual(mvExitFrame(.8,0,MV_EXIT_MS),{progress:0,join:0,expand:0,reveal:0,running:false});
 assert.equal(mvExitFrame(1,1,10000).running,false);
});
