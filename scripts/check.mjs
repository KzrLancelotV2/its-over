import {readFile,stat} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile('dist/index.html','utf8');
assert.match(html,/<title>Its over<\/title>/);
assert(!/<script[^>]+src=["']https?:/.test(html),'No external scripts');
assert.match(html,/src="good-or-dont-be\.m4a"/);
const audioFiles=['rooftop-hops.mp3','lush-date-adventure.mp3','good-or-dont-be.m4a','jungle-theme.mp3','jungle-intro.mp3'];
const audioPresent=await Promise.all(audioFiles.map(name=>stat('dist/'+name).then(s=>s.size>0).catch(()=>false)));
assert(audioPresent.every(Boolean)||audioPresent.every(present=>!present),'Add all five audio files, or keep the source snapshot silent');
if(!audioPresent.some(Boolean))console.log('Audio intentionally omitted from the public source snapshot. Scene mapping is checked with mock audio.');
assert((await stat('dist/pepe-run.png')).size>1000,'Replacement Pepe sprite is present');
assert((await stat('dist/pink-pepe-sheet.png')).size>1000,'Her running animation is present');
assert.match(html,/data-date="drinks"/);assert.match(html,/data-date="park"/);assert(!html.includes('data-date="tea"'),'Tea and coffee are merged');
let code=await readFile('dist/game.js','utf8');
assert(!/id=["']skip["']/.test(html),'No skip control is shipped');
assert(!/\$\('skip'\)/.test(code),'No skip handler is shipped');
assert(!code.includes('gameTest'),'No test hook is shipped');
const elements=new Map(),events=new Map(),spriteDraws=[];
const makeElement=id=>({
 id,hidden:false,textContent:'',innerHTML:'',dataset:{},attributes:{},currentTime:0,volume:.4,
 get src(){return this.attributes.src},set src(value){this.attributes.src=value},
 classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attributes[k]=v},
 getAttribute(k){return this.attributes[k]},addEventListener(k,v){events.set(id+':'+k,v)},
 focus(){},play(){this.plays=(this.plays||0)+1;this.paused=false;return Promise.resolve()},pause(){this.paused=true},load(){this.loads=(this.loads||0)+1},getBoundingClientRect(){return {width:1280,height:600}},
 getContext(){return new Proxy({},{get:(_,key)=>key==='drawImage'?(...args)=>spriteDraws.push(args):key==='createLinearGradient'||key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true})}
});
const savedScores=new Map();
const context={
 localStorage:{getItem:k=>savedScores.get(k),setItem:(k,v)=>savedScores.set(k,v)},
 document:{getElementById(id){if(!elements.has(id))elements.set(id,makeElement(id));return elements.get(id)},querySelectorAll(){return[]},addEventListener(k,v){events.set(k,v)},hidden:false},
 matchMedia:()=>({matches:false}),Path2D:class{},Image:class{complete=true;naturalWidth=2172;naturalHeight=724},ResizeObserver:class{observe(){}},
 requestAnimationFrame(){},devicePixelRatio:1,navigator:{},window:{addEventListener(){}},console,Math
};
vm.createContext(context);
code=code.replace(/\}\)\(\);\s*$/,"globalThis.gameTest={setDifficulty,maxHealth,get difficulty(){return difficulty},hurtJungle,worldWidth,cityFinishX,gardenLength,jungleLength,checkpoints,selectEndlessWorld,updateEndlessDrops,get endlessWorld(){return endlessWorld},get endlessDrops(){return endlessDrops},get endlessShots(){return endlessShots},spawnJungleDrop,jungleStorm,updateJungleStorm,resetJungleStorm,drawJungleStorm,get soundtrack(){return soundtrack},openLevelSelect,startSelectedLevel,beginWake,startJungle,resetJungle,finishJungle,drawJungle,junglePlatforms,jungleCargo,jungleThorns,jungleBats,updateJungleBats,jungleFinishX,jungleCheckpoints,get jungleFalls(){return jungleFalls},get levelTwoCleared(){return levelTwoCleared},startEndless,selectCharacter,mainMenu,openCharacters,extendEndless,drawEndless,hurtEndless,get endlessPlatforms(){return endlessPlatforms},get endlessRivals(){return endlessRivals},get endlessStars(){return endlessStars},get endlessScore(){return endlessScore},get endlessBest(){return endlessBest},storyBeats,get shownStories(){return shownStories},get activeStory(){return activeStory},get storyRemaining(){return storyRemaining},loveQuotes,get activeQuote(){return activeQuote},get quoteRemaining(){return quoteRemaining},queueQuote,updateQuotes,drawGame,get shownQuotes(){return shownQuotes},get quoteQueue(){return quoteQueue},toast,skyZones,updateSky,resetSky,drawSky,get skyDrops(){return skyDrops},gardenEnemies,updateGardenEnemies,resetGarden,resetGardenEnemies,get gardenShots(){return gardenShots},drawGardenThreats,drawPepe,start,physics,respawn,finish,hurt,togglePause,yes,startGarden,gardenPhysics,finishGarden,audioWake,player,enemies,platforms,gardenPlatforms,gardenCheckpoints,stepPlatformPlayer,drawGarden,drawPinkPepeRunning,setInput(l,r,j,d=false){left=l;right=r;jumpQueued=j;dashQueued=d},advance(dt){if(!paused&&!document.hidden)time+=dt;physics(dt);gardenPhysics(dt);endlessPhysics(dt);junglePhysics(dt);updateQuotes(dt);if(activeQuote!==null&&activeStory!==null)throw new Error('Story and quote overlap')},snapshot(){return {mode,paused,accepted,levelOneCleared,gardenCheckpoint,gardenFalls,companionX,companionY,companionPose:{...companionPose},player:{...player},found:[...found],ringFound,fallCount,camera,projectiles:projectiles.length}}};})();");
new vm.Script(code,{filename:'game.js'}).runInContext(context);
const game=context.gameTest,step=(n=1)=>{for(let i=0;i<n;i++)game.advance(1/60)};
assert.equal(game.difficulty,'easy','Default is Easy');assert.equal(game.maxHealth(),3);game.setDifficulty('hard');
// Every chapter is available immediately, independent of Story completion.
game.openLevelSelect();
assert.equal(elements.get('select-level-1').disabled,false);
assert.equal(elements.get('select-level-2').disabled,false);
assert.equal(elements.get('select-level-3').disabled,false);
game.startSelectedLevel(2);assert.equal(game.snapshot().mode,'garden');game.startSelectedLevel(3);assert.equal(game.snapshot().mode,'jungle');
events.get('select-level-1:click')();assert.equal(game.snapshot().mode,'playing');assert.equal(elements.get('level-select').hidden,true);
// The running renderer must select all four authored poses, then stop cycling in air or at rest.
const frames=[];
for(let i=0;i<4;i++){spriteDraws.length=0;game.drawPepe(0,0,1,1,(i+.1)/.52,false,false,true);const draw=spriteDraws.at(-1);assert.equal(draw[0].src,'pepe-run-cycle.png');frames.push(draw[1]);}
assert.equal(new Set(frames).size,4,'Run cycle uses four distinct poses');
spriteDraws.length=0;game.drawPepe(0,0,1,-1,9,true,false,true);assert.equal(spriteDraws.at(-1)[1],0,'Jump holds an extended pose');
spriteDraws.length=0;game.drawPepe(0,0,1,1,9,false,false,false);assert.equal(spriteDraws.at(-1)[0].src,'pepe-run.png','Idle preserves original artwork');
const pinkFrames=[];
for(let i=0;i<4;i++){
 spriteDraws.length=0;game.drawPinkPepeRunning(0,0,1,{onGround:true,vx:100,walk:(i+.1)/.52,face:1});
 const draw=spriteDraws.at(-1);assert.equal(draw[0].src,'pink-pepe-sheet.png');pinkFrames.push(draw[1]);
 assert.equal(draw[3],draw[7]/draw[8]*draw[4],'Running poses preserve their aspect ratio');
}
assert.equal(new Set(pinkFrames).size,4,'Pink Pepe uses four distinct running poses');
spriteDraws.length=0;game.drawPinkPepeRunning(0,0,1,{onGround:true,vx:0,walk:9,face:1});assert.equal(spriteDraws.at(-1)[1],60,'Pink Pepe stands still at rest');
spriteDraws.length=0;game.drawPinkPepeRunning(0,0,1,{onGround:false,vx:100,walk:9,face:-1});assert.equal(spriteDraws.at(-1)[1],902,'Pink Pepe holds a single airborne pose');
game.start();game.toast('Important instruction',4,2);game.toast('Incidental joke',3,0);
assert.equal(elements.get('toast').textContent,'Important instruction','Jokes cannot overwrite hazard instructions');
step(300);game.toast('Incidental joke',3,0);assert.equal(elements.get('toast').textContent,'Incidental joke','Normal messages resume after warning expires');
assert.equal(game.loveQuotes.length,17,'Twelve love quotes and five solitude quotes');
for(const level of ['playing','garden'])assert.equal(game.loveQuotes.filter(q=>q.level===level).length,6,'Six quotes per level');
assert(game.loveQuotes.every(q=>q.author&&q.work&&q.source.startsWith('https://')),'Every quote credits its original work');
game.start();game.queueQuote(0);game.queueQuote(0);game.queueQuote(6);
assert.equal(game.quoteQueue.length,1,'Opening quotation queues once; garden quotes stay locked');
game.togglePause(true);step(480);assert(!game.shownQuotes.has(0),'Quotes do not appear while paused');
game.togglePause(false);step(60);
assert.equal(game.activeStory,0,'Opening thought appears before poetry');
assert.equal(elements.get('quote-text').textContent,'Okay. What do I even say?','Opening establishes Pepe’s nerves');
assert.equal(elements.get('quote-credit').hidden,true,'Story does not inherit a literary attribution');
assert.equal(game.activeQuote,null,'Story and quotation do not overlap');
const storyTime=game.storyRemaining;game.togglePause(true);step(300);assert.equal(game.storyRemaining,storyTime,'Pause preserves story reading time');game.togglePause(false);
step(360);
assert.equal(elements.get('quote-text').textContent,'“The course of true love never did run smooth.”','Quotation follows the opening thought and a quiet gap');
assert.equal(elements.get('quote-author').textContent,'William Shakespeare','Author is visible');
assert.equal(elements.get('quote-work').textContent,'A Midsummer Night’s Dream','Original work is visible');
assert.equal(elements.get('quote-card').hidden,false,'Distinct quote card is visible');
game.queueQuote(0);assert.equal(game.quoteQueue.length,0,'Quote cannot repeat after a fall');
const remaining=game.quoteRemaining;
game.togglePause(true);step(480);assert.equal(game.quoteRemaining,remaining,'Pause preserves quote reading time');game.togglePause(false);
game.toast('Checkpoint saved. Hearts restored.',2.5);step(30);
assert.equal(elements.get('quote-card').hidden,false,'Progress messages cannot hide a quote');
assert.equal(game.activeQuote,0,'Progress messages cannot overwrite a quote');
game.toast('Hazard ahead',4,2);step(180);
assert.equal(elements.get('toast').textContent,'Hazard ahead','Hazard instruction retains its own display');
assert.equal(elements.get('quote-card').hidden,false,'Warning cannot hide the separate quote card');
assert.equal(game.activeQuote,0,'Warnings cannot replace the current quote');
step(660);assert.equal(elements.get('quote-card').hidden,true,'Quote exits after ten visible seconds when no new milestone is waiting');
game.start();assert.equal(game.shownQuotes.size,0,'Replay restores all quote milestones');assert.equal(game.shownStories.size,0,'Replay restores the courage story');
game.drawGame();
game.start();step(60);assert(game.player.onGround,'Safe opening spawn');
game.setInput(false,true,false);step(40);game.setInput(false,false,false);step(20);assert(game.player.x>230,'Movement works');
game.setInput(false,false,true);step();assert.equal(game.player.jumps,1);step(12);game.setInput(false,false,true);step();assert.equal(game.player.jumps,2);
game.setInput(false,false,true);step();assert.equal(game.player.jumps,2,'No third jump');step(120);assert(game.player.onGround,'Double jump lands');
function clearLevelOne(){
game.start();step(60);
// Verify roof geometry independently from the combat tests below.
game.enemies.forEach(e=>e.alive=false);game.skyZones.forEach(z=>z.cooldown=Infinity);
let visited=new Set([0]);
for(let index=1;index<game.platforms.length;index++){
 const from=game.platforms[index-1],to=game.platforms[index];let launched=false,flightFrames=0,landed=false;
 for(let frame=0;frame<600&&game.snapshot().mode==='playing';frame++){
  const p=game.player,target=to.x+to.w/2-20;let jump=false;
  if(!launched&&p.x>=from.x+from.w-65){jump=true;launched=true}
  if(launched)flightFrames++;
  if(flightFrames===22&&p.jumps===1&&!p.onGround)jump=true;
  game.setInput(false,p.x<target,jump);step();
  if(launched&&game.player.onGround&&game.player.platform===index){visited.add(index);landed=true;break}
 }
 assert(landed||game.snapshot().mode==='letter','Reach roof '+index);
}
game.setInput(false,true,false);for(let frame=0;frame<600&&game.snapshot().mode==='playing';frame++)step();
const end=game.snapshot();
assert.equal(end.mode,'letter','The route reaches Her');
assert.equal(elements.get('quote-card').hidden,true,'Quotes close before the invitation');
assert([...game.shownQuotes].filter(i=>i<6).length>=3,'Love quotes remain spaced throughout a fast city route');
assert.equal(game.shownStories.size,3,'All three courage beats play before reaching Her');
assert.equal(end.levelOneCleared,true,'Finishing the route records level-one completion');
assert.equal(end.fallCount,0,'All gaps can be cleared');
assert.equal(visited.size,game.platforms.length,'Every roof, including moving roofs, is reachable');
assert(end.found.every(Boolean),'All keepsakes are reachable');
assert.equal(end.player.checkpoint,game.checkpoints.length-1,'Checkpoints progress');
return {end,visited};
}
const {end,visited}=clearLevelOne();
// A full warning is visible before a falling object can hurt; the landing point stays locked.
game.start();game.enemies.forEach(e=>e.alive=false);game.resetSky();
Object.assign(game.player,{x:1050,y:400,vx:0,health:1,invincible:0});
game.skyZones[0].cooldown=Infinity;game.updateSky(2.01);game.skyZones[0].cooldown=0;game.updateSky(1/60);
assert.equal(game.skyDrops.length,1,'Nearby hazard zone creates one drop');
let drop=game.skyDrops[0],lockedX=drop.x;assert(drop.warning>1.15,'Drop has a full warning before falling');
game.updateSky(.6);assert.equal(game.player.health,1,'Warning cannot cause damage');game.drawSky();
game.player.x+=200;game.updateSky(.1);assert.equal(drop.x,lockedX,'Drop cannot follow the player');
for(let i=0;i<100;i++)game.updateSky(1/60);assert.equal(game.player.health,1,'Leaving the marked spot avoids damage');
game.resetSky();game.player.x=1050;game.skyZones[0].cooldown=Infinity;game.updateSky(2.01);game.skyZones[0].cooldown=0;game.updateSky(1/60);
for(let i=0;i<125;i++)game.updateSky(1/60);assert.equal(game.player.health,1,'Falling object respawn restores one heart');assert(game.snapshot().fallCount>0,'Falling object causes immediate respawn');
game.respawn();assert.equal(game.skyDrops.length,0,'Respawn clears sky hazards');
game.player.x=1050;game.skyZones[0].cooldown=0;game.updateSky(.5);assert.equal(game.skyDrops.length,0,'Respawn provides hazard grace');
game.updateSky(2);drop=game.skyDrops[0];game.togglePause(true);const warningBefore=drop.warning;step(30);assert.equal(drop.warning,warningBefore,'Pause freezes sky warnings');game.togglePause(false);


game.start();step(60);let e=game.enemies[0];Object.assign(game.player,{x:e.x+5,y:e.y+22,vy:0,health:1,invincible:0,onGround:false});step();
assert.equal(game.player.health,1,'Contact respawns with one heart');assert.equal(game.snapshot().fallCount,1,'A single hit respawns');game.hurt();assert.equal(game.player.health,1,'Invincibility prevents repeated damage');
game.start();step(60);e=game.enemies[0];Object.assign(game.player,{x:e.x+1,y:e.y-game.player.h-2,vy:150,onGround:false});step(4);
assert.equal(e.alive,false,'Stomp defeats rival');assert(game.player.vy<0,'Stomp rebounds');
game.start();step(60);e=game.enemies[0];Object.assign(game.player,{x:e.x-5,y:e.y+20,vy:0,health:1,invincible:0,onGround:false,face:1});game.setInput(false,true,false,true);step();
assert(e.stunned>0,'Dash stuns rival');assert.equal(game.player.health,1,'Dash protects from contact');assert(game.player.dashCooldown>0,'Dash has cooldown');
game.start();step(60);e=game.enemies[2];e.attackTimer=0;Object.assign(game.player,{x:e.x-260,y:e.y+50,onGround:false});step();
assert(game.snapshot().projectiles>0,'Rivals throw dumbbells');
game.start();step(60);game.player.health=1;game.player.invincible=0;game.hurt();
assert.equal(game.player.health,1,'One hit resets health at the checkpoint');assert.equal(game.player.checkpoint,0,'Respawn uses checkpoint');
game.start();step(60);game.togglePause(true);const before=game.player.x;game.setInput(false,true,false);step(30);assert.equal(game.player.x,before,'Pause freezes movement');game.togglePause(false);
game.finish();game.yes();game.startGarden();game.finishGarden();
assert.equal(game.snapshot().mode,'playing','Early finish, acceptance and garden entry are blocked');
assert.equal(game.snapshot().levelOneCleared,false,'Level-one completion cannot be skipped');
assert.equal(game.snapshot().accepted,false,'Early acceptance does not unlock the garden');
clearLevelOne();
const soundtrack=elements.get('soundtrack');
assert.equal(game.soundtrack.src,'rooftop-hops.mp3','The invitation keeps the level-one soundtrack');
game.startGarden();game.finishGarden();
assert.equal(game.snapshot().mode,'letter','Garden cannot open or finish before acceptance');
assert.equal(game.snapshot().accepted,false,'The invitation does not imply acceptance');
events.get('no:click')();game.startGarden();game.audioWake();
assert.equal(game.snapshot().accepted,false,'Declining leaves the garden locked');
assert.equal(game.snapshot().mode,'letter','Declining stays in the letter');
assert.equal(elements.get('no-view').hidden,false,'Decline response is visible');
assert.equal(game.soundtrack.src,'rooftop-hops.mp3','Declining does not start the secret soundtrack');
events.get('back-letter:click')();events.get('yes:click')();
assert.equal(game.snapshot().mode,'garden','Accepting opens level two');
assert.equal(game.snapshot().accepted,true,'Acceptance unlocks the garden');
assert.equal(game.soundtrack.src,'lush-date-adventure.mp3','Garden plays the supplied new track');
assert(!events.has('skip:click'),'No skip event exists');
assert.equal(elements.get('letter-overlay').hidden,true,'Garden is playable after acceptance');
// Garden enemies share the proven stomp / dash / damage rules.
let goose=game.gardenEnemies[0];
Object.assign(game.player,{x:goose.x+4,y:goose.y+15,health:1,invincible:0,vy:0,onGround:false});
game.updateGardenEnemies(1/60,goose.y+80);assert.equal(game.player.health,1,'Goose hit respawns');assert(game.snapshot().gardenFalls>0,'One goose hit causes a retry');
game.resetGarden();goose=game.gardenEnemies[0];
Object.assign(game.player,{x:goose.x+4,y:goose.y-game.player.h+6,vy:150,onGround:false,invincible:0});
game.updateGardenEnemies(1/60,goose.y-3);assert(!goose.alive,'Goose can be stomped');assert(game.player.vy<0,'Stomp rebounds');
game.resetGarden();goose=game.gardenEnemies[0];
Object.assign(game.player,{x:goose.x+4,y:goose.y+10,vy:0,dashTime:.15,invincible:0});
game.updateGardenEnemies(1/60,goose.y+80);assert(goose.stunned>0,'Dash stuns goose');assert.equal(game.player.health,1,'Dash protects player');
game.resetGarden();goose=game.gardenEnemies[0];goose.cooldown=0;
Object.assign(game.player,{x:goose.x-110,y:goose.y,invincible:0});
game.updateGardenEnemies(1/60,goose.y+70);assert(goose.tell>.6,'Goose warns before charging');
for(let i=0;i<44;i++)game.updateGardenEnemies(1/60,goose.y+70);
assert(goose.charge>0,'Warning turns into a charge');
game.resetGarden();let gnome=game.gardenEnemies.find(e=>e.kind==='gnome');gnome.cooldown=0;
Object.assign(game.player,{x:gnome.x-180,y:gnome.y,invincible:0});
game.updateGardenEnemies(1/60,gnome.y+70);assert(gnome.tell>.6,'Gnome warns before throwing');assert.equal(game.gardenShots.length,0,'No instant acorn');
for(let i=0;i<44;i++)game.updateGardenEnemies(1/60,gnome.y+70);
assert(game.gardenShots.length>0,'Gnome throws an acorn');
game.gardenShots.push({x:game.player.x+20,y:game.player.y+25,vx:0,vy:0,life:1});game.updateGardenEnemies(1/60,game.player.y+70);
assert.equal(game.player.health,1,'Acorn hit respawns');assert.equal(game.gardenShots.length,0,'Lethal acorn clears all old shots');assert.equal(game.player.x,100);
game.player.invincible=0;game.player.health=1;game.hurt();assert.equal(game.player.health,1,'Garden death restores health');assert.equal(game.player.x,100,'Garden death returns to its own checkpoint');assert.equal(game.gardenShots.length,0,'Respawn clears acorns');
game.drawGardenThreats();game.resetGarden();
const companionStart=game.snapshot().companionX;
game.setInput(false,true,false);step(45);
assert(game.player.x>250,'Garden movement advances at city speed');
assert(game.snapshot().companionX>companionStart+100,'Her follows the actual route');
assert(game.player.x-game.snapshot().companionX<100,'Her stays close');
assert(Math.abs(game.snapshot().companionPose.vx)>100,'Her has a running state');
game.setInput(false,false,true);step();
assert(Math.abs(game.player.vy-(-550+1450/60))<.001,'Garden has the same first jump and gravity as city');
step(12);game.setInput(false,false,true);step();
assert(Math.abs(game.player.vy-(-490+1450/60))<.001,'Garden has the same double jump as city');
game.setInput(false,false,true);step();assert.equal(game.player.jumps,2,'Garden prevents a third jump');
step(100);game.setInput(false,true,false,true);step();assert.equal(game.player.vx,650,'Garden dash matches city');
game.togglePause(true);const gardenPaused=game.snapshot();game.setInput(false,true,false);step(60);
assert.equal(game.player.x,gardenPaused.player.x,'Pause freezes garden player');
assert.equal(game.snapshot().companionX,gardenPaused.companionX,'Pause freezes Her');
game.togglePause(false);game.setInput(false,true,false);step(500);
assert.equal(game.snapshot().mode,'garden','Holding right cannot complete the garden');
assert(game.snapshot().gardenFalls>0,'Missing a gap makes the player fall and retry');
assert.equal(game.snapshot().gardenCheckpoint,0,'Early fall stays at first checkpoint');
game.finishGarden();assert.equal(game.snapshot().mode,'garden','Early garden finish is blocked');
clearLevelOne();events.get('yes:click')();game.gardenEnemies.forEach(e=>e.alive=false);
let gardenVisited=new Set([0]),checkpointRetryTested=false;
for(let index=1;index<game.gardenPlatforms.length;index++){
 const from=game.gardenPlatforms[index-1],to=game.gardenPlatforms[index];let launched=false,flightFrames=0,landed=false;
 for(let frame=0;frame<600&&game.snapshot().mode==='garden';frame++){
  const p=game.player,target=to.x+to.w/2-20;let jump=false;
  if(!launched&&p.x>=from.x+from.w-65){jump=true;launched=true}
  if(launched)flightFrames++;
  if(flightFrames===22&&p.jumps===1&&!p.onGround)jump=true;
  game.setInput(false,p.x<target,jump);step();
  if(launched&&p.onGround&&p.platform===index){gardenVisited.add(index);landed=true;break}
 }
 assert(landed,'Garden platform '+index+' is reachable');
 if(index===6){game.setInput(false,true,false);step(15);game.player.y=860;step();checkpointRetryTested=true;game.gardenEnemies.forEach(e=>e.alive=false);
  const cp=game.gardenCheckpoints[2];assert.equal(game.player.x,cp.x,'Fall returns to saved garden checkpoint');
  assert.equal(game.player.y,cp.y,'Respawn uses checkpoint height');assert.equal(game.snapshot().companionX,cp.x-80,'Her returns together');
  game.setInput(false,false,false);step(30);
 }
}
game.setInput(false,true,false);for(let frame=0;frame<600&&game.snapshot().mode==='garden';frame++)step();
assert.equal(game.snapshot().mode,'dinner','All garden platforms lead to restaurant');
assert.equal([...game.shownQuotes].filter(i=>i>=6).length,6,'All six garden quotes appear despite a checkpoint retry');
assert.equal(elements.get('quote-card').hidden,true,'Quotes close before the diner menu');
assert.equal(gardenVisited.size,game.gardenPlatforms.length,'Every garden platform is reachable');
assert.equal(game.snapshot().gardenCheckpoint,game.gardenCheckpoints.length-1,'All garden checkpoints are reached');
assert.equal(game.snapshot().gardenFalls,1,'Only the deliberate checkpoint test causes a fall');
assert(checkpointRetryTested,'Garden checkpoint retry was exercised');
assert.equal(elements.get('yes-view').hidden,false,'Restaurant shows distinct date choices');
game.drawGarden();

game.audioWake();assert.equal(game.soundtrack.src,'lush-date-adventure.mp3','Dinner keeps the garden soundtrack');
// Continue from the legitimately completed diner: the third chapter has its own gate.
game.startJungle();assert.equal(game.snapshot().mode,'dinner','Jungle cannot bypass its wake transition');
events.get('diner-next:click')();assert.equal(game.snapshot().mode,'waking');step(210);
assert.equal(game.snapshot().mode,'jungle');assert.equal(game.soundtrack.src,'jungle-theme.mp3');
game.finishJungle();assert.equal(game.snapshot().mode,'jungle','Cabin cannot finish at the spawn');
game.setInput(false,true,false);step(20);assert(game.player.x>100);
game.togglePause(true);const jx=game.player.x;step(180);assert.equal(game.player.x,jx);game.togglePause(false);
game.resetJungle(false);
// Exercise thorns and invulnerability separately from route reachability.
const jt=game.jungleThorns[0],jp=game.junglePlatforms[jt.plat];

game.resetJungle(false);const savedThorns=game.jungleThorns.splice(0),savedBats=game.jungleBats.splice(0),savedStorm=game.jungleStorm.splice(0);
for(let index=1;index<game.junglePlatforms.length;index++){
 const from=game.junglePlatforms[index-1],to=game.junglePlatforms[index];let launched=false,flightFrames=0,landed=false;
 for(let frame=0;frame<600&&game.snapshot().mode==='jungle';frame++){
  const p=game.player,target=index===game.junglePlatforms.length-1?game.jungleFinishX-40:to.x+to.w/2-20;let jump=false;
  if(!launched&&p.x>=from.x+from.w-65){jump=true;launched=true}
  if(launched)flightFrames++;
  if(flightFrames===22&&p.jumps===1&&!p.onGround)jump=true;
  game.setInput(false,p.x<target,jump);step();
  if(launched&&p.onGround&&p.platform===index){landed=true;break}
 }
 assert(landed,'Jungle platform '+index+' reachable');
 if(index===3){game.setInput(false,true,false);step(15);game.player.y=900;step();assert.equal(game.jungleFalls,1);assert(game.jungleCargo[0].got,'Chair survives fall');assert.equal(game.player.health,1);assert.equal(game.player.x,1180,'Checkpoint lantern respawn')}
}
game.jungleThorns.push(...savedThorns);game.jungleBats.push(...savedBats);game.jungleStorm.push(...savedStorm);
Object.assign(game.player,{x:jp.x+jt.offset,y:jp.y-70,onGround:true,platform:jt.plat,invincible:0});game.setInput(false,false,false);step();assert.equal(game.player.health,1,'Thorns damage');step();assert.equal(game.player.health,1,'Thorn invulnerability');
assert(game.jungleCargo.every(c=>c.got),'Both boat supplies can be collected on the route');
assert.equal(game.junglePlatforms.length,62);assert.equal(game.jungleCheckpoints.length,16);assert.equal(game.jungleBats.length,15);
assert.equal(game.junglePlatforms.filter(p=>p.moveX||p.moveY).length,14);
// Checkpoint lanterns remain safe while a player stops to read or rest.
for(const cp of game.jungleCheckpoints.slice(3)){
 const p=game.junglePlatforms[cp.platform];Object.assign(game.player,{x:cp.x,y:p.y-70,onGround:true,platform:cp.platform,health:1,invincible:0,vx:0,vy:0});game.setInput(false,false,false);step(600);assert.equal(game.player.health,1,'Safe lantern at platform '+cp.platform);
}
const bat=game.jungleBats.at(-1);game.updateJungleBats(0,-1000);
Object.assign(game.player,{x:bat.x,y:bat.y+3,health:1,invincible:0,vy:0,dashTime:0,onGround:false});
game.updateJungleBats(0,bat.y+70);assert.equal(game.player.health,1,'Bat contact hurts');game.updateJungleBats(0,bat.y+70);assert.equal(game.player.health,1,'Bat contact respects invulnerability');
Object.assign(game.player,{x:bat.x,y:bat.y+3,invincible:0,vy:0,dashTime:.1});game.updateJungleBats(0,bat.y+70);assert(bat.stunned>2,'Dash stuns a bat');assert.equal(game.player.health,1);
bat.stunned=0;Object.assign(game.player,{x:bat.x,y:bat.y-game.player.h+5,vy:150,dashTime:0});game.updateJungleBats(0,bat.y+5);assert(bat.stunned>=3,'Landing on a bat stuns it');assert(game.player.vy<0,'Stomp bounces Pepe');
const batPauseX=bat.x,batPauseTimer=bat.stunned;game.togglePause(true);step(120);assert.equal(bat.x,batPauseX);assert.equal(bat.stunned,batPauseTimer);game.togglePause(false);

// End requires both cargo items and an actual landing at the dock.
game.jungleCargo[1].got=false;Object.assign(game.player,{x:game.jungleFinishX+15,y:430,onGround:true,platform:game.junglePlatforms.length-1});game.finishJungle();assert.equal(game.snapshot().mode,'jungle');
game.jungleCargo[1].got=true;game.player.onGround=false;game.finishJungle();assert.equal(game.snapshot().mode,'jungle');game.player.onGround=true;game.finishJungle();
assert.equal(game.snapshot().mode,'cabin');assert.equal(elements.get('cabin-thought').hidden,false,'Pepe speaks on entry');game.drawJungle();step(240);assert.equal(elements.get('cabin-thought').hidden,true,'Thought clears for ending controls');assert.equal(elements.get('cabin-ending').hidden,false,'Cabin ending appears');
game.setInput(false,true,true);const boatX=game.player.x;step(60);assert.equal(game.player.x,boatX,'Ending ignores movement input');
console.log('Jungle passed: 62 platforms, both pickups, thorns, 15 bats, dash/stomp combat, 16 checkpoints, music, pause, locked progression and quiet cabin ending.');

events.get('replay-yes:click')();
assert.equal(game.snapshot().mode,'playing','Replay starts level one');
assert.equal(game.snapshot().accepted,false,'Replay resets acceptance');
assert.equal(game.snapshot().levelOneCleared,false,'Replay resets level-one completion');
assert.equal(game.soundtrack.src,'rooftop-hops.mp3','Replay restores level-one music');
game.startGarden();game.yes();assert.equal(game.snapshot().mode,'playing','Garden cannot unlock while level one is playing');
console.log(JSON.stringify({passed:true,rooftops:visited.size,rivals:game.enemies.length,gardenPlatforms:gardenVisited.size,gardenEnemies:game.gardenEnemies.length,gardenCheckpoints:game.gardenCheckpoints.length-1,keepsakes:end.found.length,quotes:game.loveQuotes.length,checks:['courage story before invitation','story and quotes never overlap','quotes across both routes','opening quote','warnings cannot hide quotes','quote pause timing','quote credits','quote replay reset','sky warning and dodge','falling object damage','locked landing zones','respawn clears hazards','goose charge warning','gnome throw warning','garden stomp and dash combat','acorn damage','garden health reset','movement','double jump','moving rooftops','full route geometry','keepsakes','city checkpoints','contact damage','invincibility','stomp','dash stun','dash cooldown','projectiles','health reset','pause','no skip control','level-one completion gate','acceptance gate','decline keeps garden locked','garden movement','companion follows','garden jump','garden pause','shared movement physics','garden dash','visible platform gaps','running companion','no auto-run completion','garden checkpoints','restaurant reached','replay resets gate','soundtrack scene mapping','replacement sprite']},null,2));

// Endless mode has independent progress, bounded terrain, and reachable double jumps.
game.openCharacters();assert.equal(elements.get('character-select').hidden,false);
for(const character of ['pepe','pink-pepe']){
 game.selectCharacter(character);game.startEndless();
 assert.equal(game.snapshot().mode,'endless');assert.equal(game.snapshot().accepted,false);assert.equal(game.snapshot().levelOneCleared,false);
 game.yes();game.startGarden();assert.equal(game.snapshot().mode,'endless','Endless cannot unlock Story');
 game.setInput(false,true,false);step(20);assert(game.player.x>100,'Both characters move');
 spriteDraws.length=0;game.drawEndless();assert(spriteDraws.some(d=>d[0].src===(character==='pink-pepe'?'pink-pepe-sheet.png':'pepe-run-cycle.png')),'Selected character runs');
 game.togglePause(true);const before={...game.player};step(120);assert.equal(game.player.x,before.x);assert.equal(game.player.y,before.y);game.togglePause(false);
}
game.startEndless();game.setInput(false,false,false);
for(let id=1;id<=60;id++){
 const from=game.endlessPlatforms.find(p=>p.id===id-1),to=game.endlessPlatforms.find(p=>p.id===id);
 assert(from&&to,'Route generated ahead');assert(to.x-from.x-from.w<=205,'Gap stays jumpable');
 let launched=false,flightFrames=0,landed=false;
 for(let frame=0;frame<600&&game.snapshot().mode==='endless';frame++){
  game.endlessRivals.forEach(e=>e.alive=false);
  const p=game.player,target=to.x+to.w/2-20;let jump=false;
  if(!launched&&p.x>=from.x+from.w-65){jump=true;launched=true}
  if(launched)flightFrames++;
  if(flightFrames===22&&p.jumps===1&&!p.onGround)jump=true;
  game.setInput(false,p.x<target,jump);step();
  if(launched&&p.onGround&&game.endlessPlatforms[p.platform]?.id===id){landed=true;break}
 }
 assert(landed,'Endless roof '+id+' reachable');assert(game.endlessPlatforms.length<22,'Old terrain is discarded');assert(game.endlessStars.length<22,'Old pickups are discarded');
}
assert(game.endlessScore>2000,'Distance and pickups score');
game.player.y=900;step();assert.equal(game.snapshot().mode,'runover');
const high=game.endlessScore;assert.equal(game.endlessBest,high);assert.equal(savedScores.get('rejected-endless-best-hard'),String(high));
events.get('run-retry:click')();assert.equal(game.endlessScore,0);assert.equal(game.player.health,1);assert.equal(game.endlessBest,high);
let enemy=game.endlessRivals[0];assert(enemy,'Rivals spawn');
Object.assign(game.player,{x:enemy.x,y:enemy.y+35,vy:0,vx:0,invincible:0,onGround:false,platform:-1});game.setInput(false,false,false);step();assert.equal(game.player.health,0,'Rival contact is lethal');assert.equal(game.snapshot().mode,'runover');
step();assert.equal(game.player.health,0,'Run remains ended');
game.startEndless();enemy=game.endlessRivals[0];
Object.assign(game.player,{x:enemy.x,y:enemy.y-game.player.h+5,vy:160,invincible:0,onGround:false});step();assert.equal(enemy.alive,false,'Stomp defeats rival');
game.player.invincible=0;game.hurtEndless(1);assert.equal(game.snapshot().mode,'runover','Health exhaustion ends run');
game.mainMenu();game.start();assert.equal(game.snapshot().mode,'playing');assert.equal(game.snapshot().accepted,false);game.startGarden();assert.equal(game.snapshot().mode,'playing','Story gate survives mode changes');
console.log('Endless checks passed: both characters, 60 roofs, bounded memory, score/best, damage, stomp, retry, pause, story isolation.');


game.mainMenu();assert.equal(game.soundtrack.src,'good-or-dont-be.m4a','Title screen plays the new song');
game.openCharacters();assert.equal(game.soundtrack.src,'good-or-dont-be.m4a','Character selection retains title song');
game.startEndless();assert.equal(game.soundtrack.src,'rooftop-hops.mp3','Endless switches to gameplay music');
console.log('Title soundtrack scene checks passed.');

game.mainMenu();game.beginWake();game.startJungle();assert.equal(game.snapshot().mode,'intro','No jungle entry from menu');
game.startEndless();game.beginWake();game.startJungle();assert.equal(game.snapshot().mode,'endless','Endless does not unlock third chapter');
game.start();game.beginWake();game.startJungle();assert.equal(game.snapshot().mode,'playing');assert.equal(game.levelTwoCleared,false,'Replay resets diner completion');

// Earned chapters replay with fresh health, checkpoint and cargo; menus preserve unlocks.
game.openLevelSelect();
assert.equal(elements.get('select-level-2').disabled,false);assert.equal(elements.get('select-level-3').disabled,false);
events.get('select-level-2:click')();assert.equal(game.snapshot().mode,'garden');assert.equal(game.snapshot().gardenCheckpoint,0);assert.equal(game.player.health,1);assert.equal(game.snapshot().accepted,true);assert.equal(elements.get('level-select').hidden,true);
game.openLevelSelect();events.get('select-level-3:click')();assert.equal(game.snapshot().mode,'jungle');assert(game.jungleCargo.every(c=>!c.got));assert.equal(game.player.health,1);assert.equal(game.jungleFalls,0);
game.startSelectedLevel(1);assert.equal(game.snapshot().mode,'playing');assert.equal(game.snapshot().accepted,false);
game.mainMenu();game.startSelectedLevel(99);assert.equal(game.snapshot().mode,'intro');
// Storage is unnecessary for chapter access, including private browsing.
const denied={...context,localStorage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')}}};vm.createContext(denied);new vm.Script(code).runInContext(denied);
for(const [level,mode] of [[1,'playing'],[2,'garden'],[3,'jungle']]){denied.gameTest.startSelectedLevel(level);assert.equal(denied.gameTest.snapshot().mode,mode)}
console.log('Level Select passed: all chapters immediately available, fresh replays, and unavailable storage.');

const cachedTheme=elements.get('jungle-soundtrack'),loads=cachedTheme.loads;
game.startSelectedLevel(2);cachedTheme.currentTime=42;game.startSelectedLevel(3);
assert.equal(game.soundtrack,cachedTheme,'Jungle uses the preloaded theme element');assert.equal(cachedTheme.loads,loads,'Chapter entry does not reload its cached soundtrack');assert.equal(cachedTheme.currentTime,0,'Jungle restarts the track');assert.equal(cachedTheme.volume,.4,'Playback starts audibly without waiting for animation frames');
console.log('Music preload and fresh jungle playback checks passed.');

const effect=elements.get('jungle-intro-sound');let played=effect.plays||0;
game.startSelectedLevel(3);assert.equal(effect.plays,played+1,'Direct chapter entry plays the supplied clip once');step(120);assert.equal(effect.plays,played+1,'Clip does not repeat during gameplay');game.resetJungle();assert.equal(effect.plays,played+1,'Respawn does not replay the intro');game.mainMenu();assert.equal(effect.paused,true,'Menu stops the effect');
assert.match(html,/id="jungle-intro-sound" src="jungle-intro.mp3" preload="auto"/);
console.log('Jungle intro clip: chapter entry, no repeat, respawn and menu checks passed.');

// Random rain has no tree/platform trigger, stays bounded, and respects safe spots.
context.Math=Object.assign(Object.create(Math),{random:()=>.5});
game.startSelectedLevel(3);Object.assign(game.player,{x:1380,y:330,health:1,invincible:0});game.updateJungleStorm(3);
const hazard=game.jungleStorm.find(h=>h.state==='warning');assert(hazard,'Drop spawns on a treeless section');assert.equal(hazard.timer,1.05);const locked=hazard.x;
game.togglePause(true);game.updateJungleStorm(2);assert.equal(hazard.timer,1.05);game.togglePause(false);
game.player.x=1500;game.updateJungleStorm(1.1);assert.equal(hazard.x,locked);
for(let i=0;i<60;i++)game.updateJungleStorm(1/60);assert.equal(game.player.health,1,'Dodging marked area avoids damage');assert.equal(hazard.state,'splat');
Object.assign(game.player,{x:hazard.x-10,y:game.junglePlatforms[hazard.plat].y-70,invincible:0});game.updateJungleStorm(.01);assert.equal(game.player.health,1);game.updateJungleStorm(.01);assert.equal(game.player.health,1);
game.resetJungle();assert(game.jungleStorm.every(h=>h.state==='idle'));
// Deterministic pseudo-random stream tests variety without flaky random assertions.
let randomSeed=1729;context.Math.random=()=>((randomSeed=(randomSeed*1664525+1013904223)>>>0)/4294967296);
game.startSelectedLevel(3);Object.assign(game.player,{x:5200,y:330,health:1,invincible:999});const targets=new Set();let drops=0;const previous=new Map();
for(let frame=0;frame<1200;frame++){
 game.updateJungleStorm(1/60);
 for(const h of game.jungleStorm){if(h.state==='warning'&&previous.get(h)!=='warning'){drops++;targets.add(Math.round(h.x));assert(h.x>game.player.x+game.player.w,'Every new drop is ahead of Pepe');assert(game.jungleCheckpoints.every(cp=>Math.abs(h.x-cp.x)>=115))}previous.set(h,h.state)}
 assert(game.jungleStorm.filter(h=>h.state!=='idle').length<=8);
}
assert(drops>=9,'Frequent drops across twenty seconds');assert(targets.size>=8,'Landing positions vary');
game.startSelectedLevel(3);game.player.x=game.jungleFinishX;game.updateJungleStorm(5);assert(game.jungleStorm.every(h=>h.state==='idle'),'Cabin approach stays safe');
assert(!code.includes('drawSeatedPepe'));assert(!code.includes('drawCargoRope(-113'));
console.log('Random rain passed: treeless spawning, varied targets, higher frequency, warning, damage, pause, safe checkpoint zones, respawn and bounded memory.');


assert.equal(game.loveQuotes.filter(q=>q.level==='jungle').length,5);
game.startSelectedLevel(3);
for(const [i,expected] of [[0,'Finally, somewhere to sit.'],[1,'Might need this for repairs.']]){
 const item=game.jungleCargo[i],p=game.junglePlatforms[item.plat];Object.assign(game.player,{x:p.x+p.w/2-20,y:p.y-game.player.h,vx:0,vy:0,onGround:true,platform:item.plat,invincible:999});game.setInput(false,false,false);step();
 assert.equal(elements.get('quote-text').textContent,expected,'Pickup narration is shown');assert.equal(game.activeQuote,null,'Narration and quotation do not overlap');assert.equal(elements.get('quote-credit').hidden,true);
 game.updateQuotes(6);game.updateQuotes(2);assert(game.activeQuote>=12,'Solitude quotation resumes after narration');assert.equal(elements.get('quote-credit').hidden,false);
}
game.mainMenu();assert.equal(game.soundtrack.src,'good-or-dont-be.m4a','Menu retains its original theme');game.startSelectedLevel(3);assert.equal(game.soundtrack.src,'jungle-theme.mp3','Chapter gets new song');
console.log('Forward-only rain, five credited solitude quotes, pickup narration, and separate menu/jungle tracks passed.');

// Endless themes use independent records, enemies, music and bounded terrain.
{
const cityBest=Number(savedScores.get('rejected-endless-best-hard')||0);
for(const world of ['city','garden','jungle']){
 game.selectEndlessWorld(world);
 assert.equal(game.endlessWorld,world);assert.equal(elements.get('endless-world-'+world).attributes['aria-pressed'],'true');
 for(const character of ['pepe','pink-pepe']){
  game.selectCharacter(character);game.startEndless();
  assert.equal(game.soundtrack.src,{city:'rooftop-hops.mp3',garden:'lush-date-adventure.mp3',jungle:'jungle-theme.mp3'}[world]);
  assert.equal(game.snapshot().accepted,false);assert.equal(game.snapshot().levelOneCleared,false);
  assert(game.endlessRivals.every(e=>world==='garden'?['goose','gnome'].includes(e.kind):e.kind===(world==='jungle'?'bat':'rival')));
  game.drawEndless();
 }
 // Full route traversal with hazards disabled isolates platform reachability.
 game.endlessDrops.length=0;game.setInput(false,false,false);
 for(let id=1;id<=50;id++){
  game.extendEndless();game.endlessRivals.forEach(e=>e.alive=false);
  const from=game.endlessPlatforms.find(p=>p.id===id-1),to=game.endlessPlatforms.find(p=>p.id===id);
  let launched=false,flight=0,landed=false;
  for(let f=0;f<600;f++){
   const p=game.player;let jump=false;
   if(!launched&&p.x>=from.x+from.w-65){jump=true;launched=true}
   if(launched)flight++;
   if(flight===22&&p.jumps===1&&!p.onGround)jump=true;
   game.setInput(false,p.x<to.x+to.w/2-20,jump);step();
   if(launched&&p.onGround&&game.endlessPlatforms[p.platform]?.id===id){landed=true;break}
  }
  assert(landed,world+' platform '+id+' reachable');assert(game.endlessPlatforms.length<22);
 }
 game.player.y=900;step();const score=game.endlessBest;
 game.selectEndlessWorld(world==='garden'?'jungle':'garden');game.selectEndlessWorld(world);
 assert.equal(game.endlessBest,score,'Record survives world selection');
}
assert(Number(savedScores.get('rejected-endless-best-hard'))>=cityBest,'Existing city record is preserved');
game.selectEndlessWorld('garden');game.startEndless();
let goose=game.endlessRivals.find(e=>e.kind==='goose');
Object.assign(game.player,{x:goose.x-120,y:goose.y,vx:0,vy:0,onGround:false,invincible:10});goose.cooldown=0;
game.updateGardenEnemies(.01,0,true);assert(goose.tell>0,'Endless goose warns before charging');
for(let i=0;i<71;i++)game.updateGardenEnemies(.01,0,true);assert(goose.charge>0,'Endless goose charges');
// Generate a later gnome and verify its projectile can damage the endless player.
game.player.x=1900;game.extendEndless();const gnome=game.endlessRivals.find(e=>e.kind==='gnome');assert(gnome);
Object.assign(game.player,{x:gnome.x-100,y:gnome.y,invincible:10});gnome.cooldown=0;
game.updateGardenEnemies(.01,0,true);game.updateGardenEnemies(.8,0,true);assert(game.endlessShots.length>0,'Endless gnome throws acorns');
const shot=game.endlessShots[0];Object.assign(shot,{x:game.player.x+20,y:game.player.y+30,vx:0,vy:0});game.player.invincible=0;
game.updateGardenEnemies(.001,0,true);assert.equal(game.player.health,0,'One acorn ends an endless run');assert.equal(game.snapshot().mode,'runover');
game.selectEndlessWorld('jungle');game.startEndless();game.player.x=650;game.extendEndless();
game.updateEndlessDrops(3);const drop=game.endlessDrops.find(h=>h.state==='warning');assert(drop,'Endless jungle generates warnings');
assert(drop.x>game.player.x+game.player.w,'Drop spawns ahead');assert(!drop.platform||drop.platform.id%7!==0,'Rest ledges stay safe');
const timer=drop.timer;game.togglePause(true);step(120);assert.equal(drop.timer,timer,'Pause freezes endless rain');game.togglePause(false);
Object.assign(drop,{state:'falling',x:game.player.x+20,y:game.player.y+20,vy:0});game.player.invincible=0;
game.updateEndlessDrops(.01);assert.equal(game.player.health,0,'One jungle drop ends an endless run');assert.equal(game.snapshot().mode,'runover');
game.drawEndless();game.player.y=900;step();game.startEndless();assert.equal(game.endlessWorld,'jungle');assert(game.endlessDrops.every(h=>h.state==='idle'));
game.mainMenu();assert.equal(game.soundtrack.src,'good-or-dont-be.m4a');
console.log('Three endless worlds passed: both characters, 150 traversed platforms, scene rendering, music, independent records, geese, gnomes, rain, pause and clean retries.');

}

// Compare playable distances with the previous release, rather than wall-clock time.
assert.equal(game.cityFinishX-80,(8270-80)*1.7,'City route is exactly 70% longer');
assert.equal(game.gardenLength-260-100,(8950-260-100)*2,'Garden route is exactly twice as long');
assert.equal(game.jungleFinishX-80,(13600-210-80)*1.7,'Jungle route is exactly 70% longer');
assert.equal(game.platforms.length,46);assert.equal(game.gardenPlatforms.length,49);
assert(game.gardenEnemies.length>24,'Garden enemy density increases alongside route length');
for(const [terrain,cps] of [[game.platforms,game.checkpoints],[game.gardenPlatforms,game.gardenCheckpoints],[game.junglePlatforms,game.jungleCheckpoints]]){
 for(const cp of cps){const p=terrain[cp.platform];assert(p,'Checkpoint platform exists');assert(cp.x>=p.baseX&&cp.x+40<p.baseX+p.w,'Checkpoint fits safely on its ledge')}
 for(let i=1;i<terrain.length;i++){const from=terrain[i-1],to=terrain[i];assert(to.baseX>from.baseX+from.w,'Route has separate platforms');assert(to.baseX-from.baseX-from.w<230,'No stretched, impossible gaps')}
}
for(const [level,oldEnd] of [[1,8300],[2,8750],[3,13400]]){
 game.startSelectedLevel(level);Object.assign(game.player,{x:oldEnd,y:300,onGround:false,platform:-1});
 game.finish();game.finishGarden();game.finishJungle();assert.equal(game.snapshot().mode,{1:'playing',2:'garden',3:'jungle'}[level],'Previous ending cannot finish the longer level');
}
console.log('Exact story distance increases passed: City 70%, Garden 100%, Jungle 70%; every platform traversed and endings relocated.');

// One hit retries the last earned checkpoint, preserving supplies and progress.
for(const level of [1,2,3]){
 game.startSelectedLevel(level);const route=level===1?game.platforms:level===2?game.gardenPlatforms:game.junglePlatforms;
 const cps=level===1?game.checkpoints:level===2?game.gardenCheckpoints:game.jungleCheckpoints;
 const cp=cps[2],platform=route[cp.platform];
 Object.assign(game.player,{x:cp.x+2,y:platform.y-70,onGround:true,platform:cp.platform,vx:0,vy:0,invincible:999});game.setInput(false,false,false);step();
 if(level===3)game.jungleCargo[0].got=true;
 game.player.x+=80;game.player.invincible=0;
 const before=level===1?game.snapshot().fallCount:level===2?game.snapshot().gardenFalls:game.jungleFalls;
 if(level===3)game.hurtJungle();else game.hurt();
 assert.equal(game.player.health,1);assert.equal(game.player.x,cp.x,'Hit returns to earned checkpoint');assert(game.player.invincible>0,'Grace after respawn');
 const after=level===1?game.snapshot().fallCount:level===2?game.snapshot().gardenFalls:game.jungleFalls;assert.equal(after,before+1);
 if(level===3){assert(game.jungleCargo[0].got,'Pickup survives a hit');game.hurtJungle()}else game.hurt();
 assert.equal(level===1?game.snapshot().fallCount:level===2?game.snapshot().gardenFalls:game.jungleFalls,after,'Grace prevents double death');
 assert.equal(elements.get('health').innerHTML,'♥');assert.equal(elements.get('health').attributes['aria-label'],'One heart remaining');
}
for(const world of ['city','garden','jungle']){
 game.selectEndlessWorld(world);game.startEndless();assert.equal(game.player.health,1);
 const pickup=game.endlessStars[0];Object.assign(game.player,{x:pickup.x-20,y:pickup.y-35,onGround:false,platform:-1,vy:0,invincible:999});step();
 assert(pickup.got);assert.equal(game.player.health,1,'Collectibles never grant an extra hit');
 game.player.invincible=0;game.hurtEndless(1);assert.equal(game.snapshot().mode,'runover');assert.equal(game.player.health,0);
}
assert.match(html,/It’s over, bro\./);assert.match(html,/<title>Its over<\/title>/);
game.mainMenu();assert.equal(elements.get('cabin-thought').hidden,true,'Cabin thought cannot leak into menu');
console.log('Single-hit health passed: every story checkpoint, retained cargo, respawn grace, all endless worlds and final cabin dialogue.');

// Easy restores the original three-hit allowance; switching is menu-only.
game.mainMenu();game.setDifficulty('easy');assert.equal(savedScores.get('its-over-difficulty'),'easy');
for(const level of [1,2,3]){
 game.startSelectedLevel(level);assert.equal(game.player.health,3);assert.equal(elements.get('difficulty').disabled,true);
 game.setDifficulty('hard');assert.equal(game.difficulty,'easy','Cannot switch difficulty mid-run');
 const before=level===1?game.snapshot().fallCount:level===2?game.snapshot().gardenFalls:game.jungleFalls;
 for(const health of [2,1]){game.player.invincible=0;if(level===3)game.hurtJungle();else game.hurt();assert.equal(game.player.health,health)}
 assert.equal(level===1?game.snapshot().fallCount:level===2?game.snapshot().gardenFalls:game.jungleFalls,before,'First two hits do not respawn');
 game.player.invincible=0;if(level===3)game.hurtJungle();else game.hurt();assert.equal(game.player.health,3);
 assert.equal(level===1?game.snapshot().fallCount:level===2?game.snapshot().gardenFalls:game.jungleFalls,before+1,'Third hit retries checkpoint');
 assert.equal(elements.get('health').innerHTML,'♥ ♥ ♥');
}
for(const difficulty of ['easy','hard'])for(const world of ['city','garden','jungle']){
 game.mainMenu();game.setDifficulty(difficulty);game.selectEndlessWorld(world);game.startEndless();
 const lives=difficulty==='easy'?3:1;assert.equal(game.player.health,lives);
 for(let n=1;n<=lives;n++){game.player.invincible=0;game.hurtEndless(1);assert.equal(game.snapshot().mode,n===lives?'runover':'endless')}
}
savedScores.set('rejected-endless-best','123');savedScores.set('rejected-endless-best-hard','45');
game.mainMenu();game.selectEndlessWorld('city');game.setDifficulty('easy');assert.equal(game.endlessBest,123,'Legacy Easy record retained');
game.setDifficulty('hard');assert.equal(game.endlessBest,45,'Hard has a separate record');game.setDifficulty('easy');assert.equal(game.endlessBest,123);
game.startEndless();game.player.x=3200;game.extendEndless();const healingStar=game.endlessStars.find(s=>s.heal);assert(healingStar);
game.player.health=2;Object.assign(game.player,{x:healingStar.x-20,y:healingStar.y-35,vy:0,onGround:false,platform:-1,invincible:999});step();assert.equal(game.player.health,3,'Easy rest pickup heals up to three');
game.mainMenu();assert.equal(elements.get('difficulty').disabled,false);assert.equal(elements.get('cabin-thought').hidden,true);
console.log('Difficulty selector passed: Easy default, 3/1 hearts, menu-only changes, all three endless worlds, separate records, healing and saved preference.');
