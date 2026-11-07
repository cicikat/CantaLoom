import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actProgress,cascade,easeBack,span,stepSwap,swapTarget} from '../src/components/chapter-motion';

// Ticket 29: the scroll acts are pure functions of scroll position, so these pin the timing contract.
const V=800,REVEAL=760,INTRO=V*1.8,TRACK=V+INTRO+REVEAL;

test('original opener holds a full screen before the curtain reveals the pinned page',()=>{
 assert.deepEqual(actProgress(V,TRACK,V,V+INTRO,REVEAL),{intro:0,story:0,reveal:0});
 const half=actProgress(-INTRO*.5,TRACK,V,INTRO*.5,REVEAL);assert.equal(half.intro,.5);assert.equal(half.story,0);assert.equal(half.reveal,0);
 assert.ok(INTRO*(1-.42)>V,'title threshold leaves at least a screen of scroll');
 const open=actProgress(-INTRO-380,TRACK,V,-380,REVEAL);assert.equal(open.intro,1);assert.equal(open.reveal,.5);
 assert.equal(actProgress(-4000,TRACK,V,-3080,REVEAL).reveal,1);
 const mvTrack=V+INTRO+V*2.2+REVEAL;
 assert.equal(actProgress(-INTRO,mvTrack,V,V*2.2,REVEAL).story,0,'phrase swap waits until the original hold finishes');
 assert.equal(actProgress(-INTRO-V*1.1,mvTrack,V,V*1.1,REVEAL).story,.5);
 // Reduced motion removes the spacer: the page counts as uncovered once it reaches the top.
 assert.equal(actProgress(0,V,V,0,0).reveal,1);assert.equal(actProgress(0,V,V,10,0).reveal,0);
});

test('phrase target holds between the two thresholds so it cannot flicker',()=>{
 assert.equal(swapTarget(.25,0,.3,.22),0);assert.equal(swapTarget(.3,0,.3,.22),1);
 assert.equal(swapTarget(.25,1,.3,.22),1);assert.equal(swapTarget(.22,1,.3,.22),0);
});

test('swap clock moves both ways and scroll forces it at the ends',()=>{
 const ready:[number,number]=[.1,.16],done:[number,number]=[.5,.58];
 assert.equal(stepSwap(0,1,400,1600,.35,ready,done),.25);
 assert.equal(stepSwap(.5,0,400,1600,.2,ready,done),.25);
 assert.equal(stepSwap(0,1,16,1600,.6,ready,done),1,'a fast fling past the act still finishes the swap');
 assert.equal(stepSwap(1,0,16,1600,.05,ready,done),0,'scrolling far back resets it');
});

test('letters cascade in order and finish together with the swap',()=>{
 const total=.12+14*.04+.44;
 assert.equal(cascade(0,0,.12,.04,.44,total),0);assert.equal(cascade(1,14,.12,.04,.44,total),1);
 assert.ok(cascade(.4,0,.12,.04,.44,total)>cascade(.4,5,.12,.04,.44,total));
 assert.equal(span(.5,0,1),.5);assert.equal(easeBack(0),0);assert.equal(easeBack(1),1);assert.ok(easeBack(.7)>1,'lands with an overshoot');
});
