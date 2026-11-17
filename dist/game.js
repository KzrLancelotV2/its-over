
(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d'),stage=$('stage');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let difficulty='easy';
try{if(localStorage.getItem('its-over-difficulty')==='hard')difficulty='hard'}catch{}
function maxHealth(){return difficulty==='hard'?1:3}
function setDifficulty(value){
 if(mode!=='intro')return;
 difficulty=value==='hard'?'hard':'easy';$('difficulty').value=difficulty;
 try{localStorage.setItem('its-over-difficulty',difficulty)}catch{}
 selectEndlessWorld(endlessWorld);
}
const TAU=Math.PI*2,ink='#514154';
const pepeSprite=new Image();pepeSprite.src='pepe-run.png';
const pepeRunCycle=new Image();pepeRunCycle.src='pepe-run-cycle.png';
const pinkSprite=new Image();pinkSprite.src='pink-pepe-sheet.png';
const pinkRunSprite=pinkSprite;
// Atlas bounds: idle plus four run poses, with a shared baseline.
const pinkFrames=[[60,292],[411,446],[902,352],[1270,452],[1800,314]];
let W=1100,H=650,DPR=1,scale=1,viewW=1100,viewH=650,last=0,time=0,mode='intro',paused=false,camera=0,chapterIndex=-1,toastUntil=0,finishTimer=0;
let toastPriority=-1;
let left=false,right=false,jumpQueued=false,dashQueued=false,canopyPhase=0,found=[false,false,false],ringFound=0,fallCount=0,confetti=[];
let levelOneCleared=false;
const cityExtension=5733,cityFinishX=8270+cityExtension;
const worldWidth=8750+cityExtension,groundY=500,player={x:80,y:400,vx:0,vy:0,w:40,h:70,jumps:0,onGround:false,coyote:0,face:1,squash:0,checkpoint:0,invincible:0,walk:0,health:maxHealth(),dashTime:0,dashCooldown:0,controlLock:0,platform:-1,shake:0};
const platforms=[
{x:-100,y:500,w:470,kind:0},{x:470,y:455,w:130,kind:1},{x:715,y:382,w:125,kind:2},{x:950,y:455,w:260,kind:0},
{x:1325,y:400,w:150,kind:1},{x:1595,y:330,w:145,kind:2},{x:1865,y:408,w:210,kind:0},{x:2205,y:440,w:150,kind:1},
{x:2475,y:365,w:120,kind:2},{x:2730,y:425,w:260,kind:0},{x:3120,y:350,w:140,kind:2,moveX:32,rate:.9,moving:true},{x:3400,y:410,w:145,kind:1},
{x:3695,y:325,w:140,kind:2},{x:3970,y:385,w:270,kind:0},{x:4370,y:440,w:125,kind:1},{x:4650,y:350,w:150,kind:2,moveY:28,rate:.8,moving:true},
{x:4930,y:420,w:150,kind:1},{x:5200,y:455,w:280,kind:0},{x:5630,y:385,w:145,kind:1},
{x:5930,y:320,w:150,kind:2,moveX:28,rate:.75,moving:true},{x:6240,y:405,w:270,kind:0},{x:6650,y:345,w:140,kind:1},
{x:6930,y:410,w:140,kind:1},{x:7210,y:330,w:150,kind:2,moveY:24,rate:.7,moving:true},{x:7510,y:400,w:150,kind:1},
{x:7790,y:440,w:140,kind:2},{"x":8050,"y":435,"w":136,"kind":0},
{"x":8306,"y":365,"w":121,"kind":1,"moveY":18,"rate":0.85,"moving":true},
{"x":8557,"y":415,"w":144,"kind":2},
{"x":8841,"y":475,"w":320,"kind":0},
{"x":9286,"y":400,"w":121,"kind":1},
{"x":9527,"y":335,"w":144,"kind":2},
{"x":9801,"y":410,"w":136,"kind":0,"moveY":18,"rate":0.85,"moving":true},
{"x":10077,"y":465,"w":320,"kind":1},
{"x":10522,"y":435,"w":144,"kind":2},
{"x":10786,"y":365,"w":136,"kind":0},
{"x":11052,"y":415,"w":121,"kind":1},
{"x":11313,"y":475,"w":320,"kind":2},
{"x":11758,"y":400,"w":136,"kind":0},
{"x":12014,"y":335,"w":121,"kind":1},
{"x":12265,"y":410,"w":144,"kind":2},
{"x":12549,"y":465,"w":320,"kind":0},
{"x":12994,"y":435,"w":121,"kind":1,"moveY":18,"rate":0.85,"moving":true},
{"x":13235,"y":365,"w":144,"kind":2},
{"x":13509,"y":415,"w":134,"kind":0},
{x:8050+cityExtension,y:500,w:700,kind:0}
].map(p=>({...p,baseX:p.x,baseY:p.y,dx:0,dy:0}));
const items=[{x:777,y:325,type:0},{x:4105,y:328,type:1},{x:13307,y:300,type:2}];
const rings=[{x:418,y:330},{x:660,y:265},{x:900,y:290},{x:1260,y:300},{x:1535,y:240},{x:1795,y:220},{x:2145,y:285},{x:2410,y:260},{x:2660,y:260},{x:3050,y:220},{x:3330,y:230},{x:3620,y:220},{x:3905,y:205},{x:4300,y:280},{x:4560,y:245},{x:4865,y:245},{x:5140,y:300},{x:5550,y:275},{x:5860,y:245},{x:6170,y:235},{x:6575,y:255},{x:6860,y:250},{x:7140,y:235},{x:7440,y:225},{x:7730,y:280},{x:7990,y:320}].map(r=>({...r,got:false}));
rings.push(...platforms.slice(27,-1).map(p=>({x:p.baseX-60,y:p.baseY-130,got:false})));
const checkpoints=[{x:80,y:400,platform:0},{x:985,y:385,platform:3},{x:2760,y:355,platform:9},{x:4000,y:315,platform:13},{x:5230,y:385,platform:17},{x:6270,y:335,platform:20},{x:8876,y:405,platform:29},{x:10112,y:395,platform:33},{x:11348,y:405,platform:37},{x:12584,y:395,platform:41},
{x:8090+cityExtension,y:430,platform:45}];
const enemies=[{plat:1,offset:35,speed:58,type:0},{plat:3,offset:170,speed:75,type:0},{plat:6,offset:108,speed:63,type:1},{plat:9,offset:155,speed:90,type:0},{plat:11,offset:45,speed:75,type:0},{plat:13,offset:170,speed:75,type:1},{plat:16,offset:55,speed:80,type:0},{plat:17,offset:160,speed:86,type:0},{plat:20,offset:170,speed:70,type:1},{plat:22,offset:45,speed:78,type:0},{plat:24,offset:55,speed:82,type:0},{plat:26,offset:45,speed:65,type:0},{plat:28,offset:45,speed:81,type:1},{plat:30,offset:45,speed:73,type:0},{plat:32,offset:45,speed:65,type:0},{plat:34,offset:45,speed:81,type:0},{plat:36,offset:45,speed:73,type:0},{plat:38,offset:45,speed:65,type:1},{plat:40,offset:45,speed:81,type:0},{plat:42,offset:45,speed:73,type:0},{plat:44,offset:45,speed:65,type:0}].map((e,i)=>({...e,w:48,h:112,alive:true,x:platforms[e.plat].x+e.offset,y:platforms[e.plat].y-112,dir:i%2?-1:1,face:1,stunned:0,attackTimer:2+i*.2}));
let projectiles=[];
let particles=[],ambient=[],clouds=[],stars=[];
const seeded=(n)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
for(let i=0;i<45;i++)ambient.push({x:seeded(i+1)*1800,y:seeded(i+122)*600,r:1+seeded(i+24)*2,s:.3+seeded(i+55)*.8});
for(let i=0;i<24;i++)stars.push({x:seeded(i+900)*1800,y:35+seeded(i+840)*260,r:2+seeded(i+300)*3});
for(let i=0;i<12;i++)clouds.push({x:i*330,y:80+seeded(i+98)*200,s:.5+seeded(i+139)*.8});
function resize(){const r=stage.getBoundingClientRect();W=r.width;H=r.height;DPR=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);scale=W<700?Math.max(.58,Math.min(.88,W/520)):Math.min(1.35,H/600);viewW=W/scale;viewH=H/scale;if(mode==='cabin')camera=Math.max(0,jungleCabinX-viewW*.6);ctx.setTransform(DPR,0,0,DPR,0,0)}
new ResizeObserver(resize).observe(stage);
function path(d,fill,stroke=ink,width=2){const p=new Path2D(d);if(fill){ctx.fillStyle=fill;ctx.fill(p)}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke(p)}}
function ellipse(x,y,rx,ry,fill,stroke=null,width=2){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function line(x,y,x2,y2,color,width=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function roundRect(x,y,w,h,r,fill,stroke=null,lw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function heart(x,y,s,fill,stroke=null){ctx.save();ctx.translate(x,y);ctx.scale(s,s);path('M0 5C-17-5-10-16-3-10Q0-8 0-6Q2-12 8-11C22-7 10 5 0 12Z',fill,stroke,1);ctx.restore()}
function star(x,y,s,fill,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?s*.47:s;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore()}
function sparkle(x,y,r,color){ctx.save();ctx.translate(x,y);path('M0 -'+r+'Q1 -1 '+r+' 0Q1 1 0 '+r+'Q-1 1 -'+r+' 0Q-1 -1 0 -'+r+'Z',color,null);ctx.restore()}
function cloud(x,y,s,alpha=.55){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalAlpha*=alpha;path('M-74 13C-105 14-103-15-77-21C-76-51-35-59-21-34C-1-64 40-50 39-24C72-36 90-11 78 7C73 22 29 21 8 20Z','#fff9f1',null);ctx.restore()}
function flower(x,y,s=1,color='#db99b5',phase=0){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(phase)*.07);ctx.scale(s,s);path('M0 0Q-4-12 0-27',null,'#7d9c78',2);path('M-1-9Q-14-20-13-11Q-9-5-1-9','#9fb98d',null);path('M-1-15Q10-26 11-18Q9-12-1-15','#9fb98d',null);for(let i=0;i<5;i++){const a=i*TAU/5;ellipse(Math.cos(a)*6,-29+Math.sin(a)*6,4.7,5.7,color)}ellipse(0,-29,3.3,3.3,'#fff0b5');ctx.restore()}
function tulip(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);path('M0 0Q3-14 0-28',null,'#78916b',2.5);path('M1-8Q15-19 10-25Q0-23 1-8M0-13Q-13-17-11-27Q0-25 0-13','#94aa79',null);path('M0-27Q-12-30-9-42L-3-37L1-45L6-37L12-42Q13-28 0-27Z','#d889a4','#af6787',1.3);ctx.restore()}
function drawPepe(x,y,s=1,facing=1,walk=0,air=false,holding=false,running=false){
 if(!pepeSprite.complete||!pepeSprite.naturalWidth)return;
 ctx.save();ctx.translate(x,y);ctx.scale(s*facing,s);
 const animated=(running||air)&&pepeRunCycle.complete&&pepeRunCycle.naturalWidth>0;
 const bob=air||animated?0:Math.abs(Math.sin(walk))*2.5;
 ctx.translate(0,-bob);ctx.rotate(air?-.055:animated?0:Math.sin(walk)*.025);
 if(animated){
  const frame=air?0:Math.floor(walk*.52)%4,cw=pepeRunCycle.naturalWidth/4,ch=pepeRunCycle.naturalHeight;
  ctx.drawImage(pepeRunCycle,frame*cw,ch*.11,cw,ch*.78,-49,-96,98,96);
 }else ctx.drawImage(pepeSprite,84,118,1094,1068,-49,-96,98,96);
 if(holding){ctx.save();ctx.translate(35,-55);ctx.rotate(.15);tulip(0,0,.68);ctx.restore()}
 ctx.restore();
}

function drawPinkFrame(x,y,s,index,facing=1,breathe=0){
 if(!pinkSprite.complete||!pinkSprite.naturalWidth)return;
 const [sx,sw]=pinkFrames[index],height=128,width=sw/591*height;
 ctx.save();ctx.translate(x,y);ctx.scale(s*facing,s);
 ctx.drawImage(pinkSprite,sx,65,sw,591,-width/2,-height+breathe,width,height-breathe);ctx.restore();
}
function drawPinkPepe(x,y,s=1,t=0){drawPinkFrame(x,y,s,0,1,reducedMotion?0:Math.sin(t*1.5)*.6)}

function butterfly(x,y,s,color,t){ctx.save();ctx.translate(x,y);ctx.scale(s,s);const flap=.5+Math.abs(Math.sin(t*5))*.5;ctx.scale(flap,1);ellipse(-5,-3,6,8,color);ellipse(5,-3,6,8,color);ellipse(-4,6,4.5,5,color);ellipse(4,6,4.5,5,color);line(0,-5,0,8,'#a084a7',1.5);ctx.restore()}
function drawPinkPepeRunning(x,y,s,pose){
 const running=!pose.onGround||Math.abs(pose.vx)>=8;
 const frame=running?(pose.onGround?1+Math.floor(pose.walk*.52)%4:2):0;
 drawPinkFrame(x,y,s,frame,pose.face);
}

function drawBackground(intro=false){
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#233d84');g.addColorStop(.45,'#713a98');g.addColorStop(.8,'#df6590');g.addColorStop(1,'#ffa977');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.scale(scale,scale);const vh=viewH,vw=viewW,cam=intro?0:camera;
 const mx=vw*.79-cam*.018,my=intro?vh*.2:104;
 const glow=ctx.createRadialGradient(mx,my,4,mx,my,130);glow.addColorStop(0,'#fff1bd66');glow.addColorStop(1,'#ffe8b500');ctx.fillStyle=glow;ctx.fillRect(mx-135,my-135,270,270);
 ellipse(mx,my,33,33,'#fff0b9');ellipse(mx-8,my-9,7,5,'#f4d99f');ellipse(mx+12,my+8,9,7,'#f4d99f');
 stars.forEach((p,i)=>{const x=((p.x-cam*.04)%(vw+70)+vw+70)%(vw+70)-20;ctx.globalAlpha=.45+(Math.sin(time*.5+i)+1)*.18;sparkle(x,p.y*.7,i%5===0?3:1.8,i%3?'#fff4c9':'#93f5ed')});ctx.globalAlpha=1;
 const palettes=[['#6064ac','#657bb6','#9c6db0','#588ca9'],['#547cb6','#a957a3','#469d9c','#a66bba'],['#408dbe','#ba5f9e','#37a8a3','#df886e','#7568c4']];
 for(let layer=0;layer<3;layer++){
  const unit=layer===0?115:layer===1?155:205,par=layer===0?.05:layer===1?.13:.24,base=vh*(layer===0?.8:layer===1?.94:1.08);
  const first=Math.floor(cam*par/unit)-2,last=first+Math.ceil(vw/unit)+5;
  for(let i=first;i<last;i++){
   const n=i+77,x=i*unit-cam*par,h=90+seeded(n+layer*77)*(layer===0?150:190),w=unit-12-seeded(n+3)*30,y=base-h;
   const color=palettes[layer][Math.floor(seeded(n+layer*23)*palettes[layer].length)];
   roundRect(x,y,w,h+180,2,color,'#26305a',1.5);
   ctx.fillStyle='#ffffff12';ctx.fillRect(x+3,y+3,w*.2,h+175);
   const trim=['#ffc8df','#8bf4e6','#ffdc8d','#d0b9ff'][Math.abs(i)%4];
   roundRect(x-2,y-3,w+4,5,1,trim);
   if(i%3===0){roundRect(x+9,y-17,w-18,14,2,color,'#374375',1);line(x+w*.5,y-17,x+w*.5,y-40,trim,2);ellipse(x+w*.5,y-41,2.5,2.5,'#ffe8ad')}
   const cols=Math.floor((w-12)/18),rows=Math.floor(h/24);
   for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const lit=seeded(n*37+r*19+c+layer*101)>.27;
    ctx.fillStyle=lit?(seeded(n+c+r)>.4?'#ffe29d':'#a7ffec'):'#30365b99';ctx.fillRect(x+9+c*18,y+12+r*24,7,11);
   }
   if(layer>0&&i%3===0){
    roundRect(x+w-26,y+21,19,75,2,'#f450a2','#ffbeda',2);
    for(let j=0;j<4;j++){line(x+w-22,y+30+j*16,x+w-12,y+30+j*16,'#fff3c7',2);line(x+w-18,y+25+j*16,x+w-18,y+35+j*16,'#fff3c7',1)}
   }
   if(layer===2&&i%2===0){
    ctx.beginPath();ctx.moveTo(x,y-10);ctx.quadraticCurveTo(x+w*.5,y+18,x+w,y-10);ctx.strokeStyle='#303452';ctx.lineWidth=1.5;ctx.stroke();
    for(let b=0;b<8;b++){const q=b/7;ellipse(x+q*w,y-10+4*20*q*(1-q),2.8,3.8,['#ffdb72','#ff86bd','#80f7ea','#d6c0ff'][b%4])}
   }
  }
 }
 ctx.globalAlpha=.35;for(let i=0;i<ambient.length;i++){const p=ambient[i],x=((p.x-cam*.12)%(vw+50)+vw+50)%(vw+50),y=(p.y+time*5*p.s)%(vh+20);ellipse(x,y,1.1,1.1,i%2?'#ffdfad':'#b9fff1')}ctx.globalAlpha=1;
 ctx.restore();
}

function island(p,decor=true){
 const {x,y,w}=p;ctx.save();ctx.translate(x,y);
 const swatch=Math.floor(seeded((p.baseX??p.x)+15)*5),walls=['#358fbc','#c5528a','#2caa97','#b678cf','#e18957'],trims=['#9ff4ed','#ffb9df','#bdffbb','#e1baff','#ffe39a'];
 const wall=walls[swatch],trim=trims[swatch];
 roundRect(0,0,w,800,0,wall,'#253256',3);
 ctx.fillStyle='#ffffff13';ctx.fillRect(4,9,w*.2,790);ctx.fillStyle='#17245422';ctx.fillRect(w-20,9,18,790);
 roundRect(-5,-8,w+10,11,1,'#f3e7ca','#253256',2);roundRect(-4,-8,w+8,3,0,'#fffbe4');
 ctx.fillStyle=trim;ctx.fillRect(0,8,w,4);
 for(let yy=28;yy<600;yy+=39){for(let xx=14;xx<w-15;xx+=31){
  const lit=seeded((p.baseX??p.x)+xx*13+yy)>.22;
  roundRect(xx-2,yy-2,17,24,1,'#24365a');roundRect(xx,yy,13,19,0,lit?(seeded(xx+yy)>.4?'#ffe49c':'#b6ffef'):'#426582');
  line(xx+6,yy,xx+6,yy+19,'#507077',1.5);line(xx,yy+9,xx+13,yy+9,'#507077',1.5);
 }}
 line(6,16,6,700,trim,2);line(w-7,16,w-7,700,'#304870',2);
 if(w>115){
  ctx.beginPath();ctx.moveTo(7,18);ctx.quadraticCurveTo(w*.5,46,w-7,18);ctx.strokeStyle='#30405f';ctx.lineWidth=1.5;ctx.stroke();
  for(let j=0;j<7;j++){const q=j/6;ellipse(7+q*(w-14),18+4*17*q*(1-q),3,3.6,['#ffe77a','#ffa1dc','#a3ffdf'][j%3])}
 }
 if(decor&&w>205){roundRect(w-58,-31,37,23,2,'#82b7c5','#253256',2);for(let i=0;i<4;i++)line(w-51,-25+i*4,w-29,-25+i*4,'#416587',1.5);line(w-39,-31,w-39,-45,'#a7d7da',2)}
 if(p.moving){ctx.fillStyle='#7f4b9f';for(let i=0;i<w;i+=20){ctx.beginPath();ctx.moveTo(i,1);ctx.lineTo(i+10,1);ctx.lineTo(i+1,9);ctx.lineTo(i-9,9);ctx.fill()}}
 ctx.restore();
}

function ring(r){
 if(r.got)return;ctx.save();ctx.translate(r.x,r.y);ctx.rotate(Math.sin(time*.8+r.x)*.06);
 ctx.shadowColor='#ffeadb';ctx.shadowBlur=13;ctx.beginPath();ctx.ellipse(0,0,18,30,0,0,TAU);ctx.strokeStyle='#ecd5b2';ctx.lineWidth=5;ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle='#bd9b95';ctx.lineWidth=1;ctx.stroke();
 heart(0,-29,.35,'#c995ad','#ab7b99');sparkle(-22,4,3,'#fff7db');ctx.restore();
}
function drawItem(item){if(found[item.type])return;ctx.save();ctx.translate(item.x,item.y+Math.sin(time*2+item.type)*5);
 const g=ctx.createRadialGradient(0,0,0,0,0,35);g.addColorStop(0,'#fff3d999');g.addColorStop(1,'#fff3d900');ctx.fillStyle=g;ctx.fillRect(-40,-40,80,80);
 ctx.beginPath();ctx.arc(0,0,25,0,TAU);ctx.setLineDash([2,6]);ctx.strokeStyle='#bb91b1aa';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
 if(item.type===0)tulip(0,19,.87);
 if(item.type===1){star(0,0,17,'#f2d69c',Math.sin(time)*.05);star(-3,-3,7,'#fff0c5')}
 if(item.type===2){ctx.rotate(-.13);roundRect(-18,-12,36,25,3,'#fff8ea','#b78b9d',1.5);path('M-17-10L0 4L17-10',null,'#c192a4',1.3);heart(0,3,.37,'#c4809c')}
 ctx.restore();
}
function sign(x,y,text,w=130){
 w=Math.max(w,text.length*8+20);ctx.save();ctx.translate(x,y);line(0,0,0,-44,'#405881',4);roundRect(-w/2,-71,w,29,2,'#29516d','#baffb2',2);
 ctx.font='bold 13px Arial,sans-serif';ctx.textAlign='center';ctx.fillStyle='#f5ffdc';ctx.fillText(text.toUpperCase(),0,-53);ctx.restore();
}

function pavilion(x,y){
 ctx.save();ctx.translate(x,y);
 roundRect(-80,-186,230,178,2,'#c65d91','#263456',3);
 roundRect(-70,-174,210,42,2,'#614a92','#ffd4eb',2);ctx.shadowColor='#ff86c3';ctx.shadowBlur=13;ctx.fillStyle='#fff1ba';ctx.font='bold 22px "Courier New",monospace';ctx.textAlign='center';ctx.fillText('AFTER HOURS',35,-146);ctx.shadowBlur=0;
 roundRect(-56,-119,74,95,1,'#ffd698','#263456',3);roundRect(40,-119,74,95,1,'#ffe9b5','#263456',3);
 path('M-50-111L9-111L-50-50Z','#fff7d988',null);path('M46-111L106-111L46-50Z','#fff7d988',null);
 roundRect(-83,-132,235,14,1,'#82e2c4','#263456',2);for(let i=0;i<8;i++)roundRect(-81+i*29,-131,15,12,0,'#fbf4bc');
 roundRect(-83,-25,235,9,0,'#ecacbb','#263456',2);
 roundRect(-24,-49,91,8,1,'#f3c8ad','#263456',2);line(-11,-41,-14,0,'#eac6ad',4);line(54,-41,58,0,'#eac6ad',4);
 for(let i=0;i<2;i++){const xx=-6+i*44;roundRect(xx,-64,12,15,1,i?'#8ae4d4':'#ffb8d5','#473f63',1.2);path('M'+(xx+12)+'-61Q'+(xx+22)+'-62 '+(xx+19)+'-55L'+(xx+12)+'-54',null,'#b6fff0',2);path('M'+(xx+4)+'-70Q'+(xx-1)+'-77 '+(xx+5)+'-83',null,'#fff1cb99',1.3)}
 roundRect(128,-32,24,31,2,'#a2dca0','#263456',2);tulip(139,-32,.95);
 ctx.restore();
}

function worldOffsetY(){return W<700?viewH*.76-500:Math.max(-50,viewH-620)}
function drawIntro(){
 drawBackground(true);ctx.save();const mobile=W<700;
 if(mobile){
  const sc=Math.min(W/405,1),yy=H*.84+Math.max(0,650-H)*.28;ctx.translate(W*.5,yy);ctx.scale(sc,sc);
  island({x:-188,y:0,w:155,kind:1});island({x:63,y:-24,w:134,kind:2});
  drawPepe(-111,-9,1.08,1,time*.8,false,true);drawPinkPepe(124,-33,.95,time);
  ctx.setLineDash([3,7]);path('M-56-102Q17-179 90-115',null,'#c785a7',1.5);ctx.setLineDash([]);heart(19,-138,.6,'#ef81a3','#2c233c');
  ctx.fillStyle='#d6e7a2';ctx.font='bold 10px "Courier New",monospace';ctx.textAlign='center';ctx.fillText('PLAYER 1',-110,27);ctx.fillStyle='#e5a3bb';ctx.fillText('HER',130,5);
 }else{
  const sc=Math.min(W/1250,H/630),xx=W*.73,yy=H*.68;ctx.translate(xx,yy);ctx.scale(sc,sc);
  island({x:-235,y:35,w:218,kind:1});island({x:149,y:-25,w:210,kind:2});
  drawPepe(-125,25,1.56,1,time*.7,false,true);drawPinkPepe(250,-35,1.35,time);
  roundRect(28,41,87,200,0,'#282b3e','#101525',3);roundRect(23,33,97,9,0,'#6b7087','#101525',2);drawEnemy({x:47,y:33-112,w:45,h:112,face:-1,type:0,alive:true,stunned:0},time);
  ctx.fillStyle='#e9b9b5';ctx.font='bold 10px "Courier New",monospace';ctx.textAlign='center';ctx.fillText('NOT THIS GUY.',73,69);
  ctx.setLineDash([5,8]);path('M-40-128Q70-253 200-170',null,'#b67496',2);ctx.setLineDash([]);heart(85,-207,.7,'#ea799e','#271f35');
  ctx.fillStyle='#c8de94';ctx.font='bold 12px "Courier New",monospace';ctx.fillText('PEPE. HE VOLUNTEERED.',-126,71);ctx.fillStyle='#e7a7bd';ctx.fillText('HER.',253,11);
 }
 ctx.restore();
}

function drawEnemy(e,t){
 if(!e.alive)return;ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h);ctx.scale(e.face||1,1);const walk=Math.sin(t*7+e.x)*3;
 ellipse(-13+walk,0,11,4,'#16192b','#0a0e1c',2);ellipse(14-walk,0,11,4,'#16192b','#0a0e1c',2);
 path('M-19-39L-20-8L-6-5L0-24L7-6L22-9L19-39Z',e.type===1?'#6e3d65':'#314160','#14172a',2.5);
 path('M-20-76Q-37-77-39-59Q-40-47-27-45L-16-56M19-76Q37-77 39-59Q40-47 27-45L17-56','#c89377','#292334',2.5);
 ellipse(-33,-60,10,11,'#cb967b','#292334',2);ellipse(33,-60,10,11,'#cb967b','#292334',2);
 path('M-19-78L-25-64L-19-37Q0-28 20-38L25-64L17-78Z',e.type===1?'#d9989b':'#e0dac4','#222136',2.5);
 path('M-9-78Q0-59 10-78L11-62L-11-62Z','#bd846b','#292334',1.5);
 path('M-4-52L4-52M-15-45L15-45',null,e.type===1?'#a66b81':'#aca58f',1.5);
 path('M-8-93L-8-76Q0-69 8-77L8-93Z','#b87f68','#292334',1.5);
 path('M-16-108Q0-124 17-106L14-89Q0-76-14-90Z','#ce9a7c','#292334',2.3);
 path('M-17-105L-20-113L-10-121L-3-118L4-124L19-113L17-104Q1-111-17-105Z','#272538','#141827',2);
 roundRect(-16,-104,14,8,2,'#151b2e');roundRect(3,-104,14,8,2,'#151b2e');line(-3,-101,4,-101,'#151b2e',3);line(-12,-102,-6,-102,'#8790a4',1);
 path('M-7-91L8-91',null,'#704f4c',2);path('M-14-92L-6-85L6-85L14-93L12-88L4-82L-5-83L-14-89Z','#564238',null);
 path('M-11-76Q0-60 11-76',null,'#ddc279',2);ellipse(0,-65,3,4,'#dec883','#a58255',1);
 if(e.stunned>0){star(-17,-132,5,'#e8d790',t*2);star(17,-132,5,'#e8d790',-t*2)}
 ctx.restore();
}

// Each drop locks its position before falling: a warning is a promise, not a homing attack.
const skyZones=[3,6,9,13,17,20,24,28,32,36,40,44].map((plat,i)=>({plat,cooldown:.3+i*.04,count:0}));
let skyDrops=[],skyGrace=2,skyIntroduced=false;
function resetSky(){skyDrops=[];skyGrace=2;skyZones.forEach((z,i)=>{z.cooldown=.3+i*.04;z.count=0})}
function updateSky(dt){
 skyGrace=Math.max(0,skyGrace-dt);
 for(const z of skyZones){
  const p=platforms[z.plat];
  if(skyGrace>0||player.x<p.x-350||player.x>p.x+p.w+100)continue;
  z.cooldown-=dt;if(z.cooldown>0)continue;
  const x=Math.max(p.x+24,Math.min(p.x+p.w-24,player.x+20+player.vx*1.7));
  skyDrops.push({x,y:p.y-320,floor:p.y,warning:1.2,vy:260,kind:z.count++%2,dead:false});z.cooldown=3.1;
  if(!skyIntroduced)skyIntroduced=true;
 }
 for(const d of skyDrops){
  if(d.warning>0){d.warning=Math.max(0,d.warning-dt);continue}
  const previous=d.y;d.vy=Math.min(850,d.vy+1350*dt);d.y+=d.vy*dt;
  if(Math.abs(player.x+20-d.x)<player.w/2+15&&d.y+17>player.y&&previous-17<player.y+player.h){hurt(player.x+20<d.x?-1:1);d.dead=true}
  if(d.y>=d.floor-15){d.dead=true;emit(d.x,d.floor-10,8,'dot',d.kind?'#b8a0d8':'#e5aa72')}
 }
 skyDrops=skyDrops.filter(d=>!d.dead);
}
function drawSky(){
 for(const d of skyDrops){
  if(d.warning>0){
   ctx.fillStyle='#ffdc6633';ctx.fillRect(d.x-26,d.floor-370,52,370);
   line(d.x-26,d.floor-8,d.x+26,d.floor-8,'#ffdc66',5);
   roundRect(d.x-53,d.floor-185,106,31,6,'#262039','#ffe38b',2);
   ctx.fillStyle='#fff2ba';ctx.textAlign='center';ctx.font='bold 16px sans-serif';ctx.fillText('↓ LOOK UP!',d.x,d.floor-165);
   continue;
  }
  ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.y*.012);
  if(d.kind){roundRect(-22,-4,44,8,2,'#d8deea','#29253e',2);roundRect(-25,-15,11,30,3,'#a48aca','#29253e',2);roundRect(14,-15,11,30,3,'#a48aca','#29253e',2)}
  else{path('M-17-14L17-14L12 17L-12 17Z','#e29a6b','#623d44',2);roundRect(-20,-17,40,9,2,'#ffbc80','#623d44',2);path('M0-17Q-13-36-20-25Q-16-15 0-17M0-17Q5-42 16-33Q21-22 0-17','#8ed47d','#3b704f',2)}
  ctx.restore();
 }
}

function resetGardenEnemies(){
 gardenShots=[];
 gardenEnemies.forEach((e,i)=>{const p=gardenPlatforms[e.plat];e.x=p.x+e.offset;e.y=p.y-e.h;e.alive=true;e.dir=i%2?1:-1;e.face=e.dir;e.stunned=0;e.tell=0;e.charge=0;e.cooldown=1.5+i*.12});
}
function updateGardenEnemies(dt,prevFoot,endless=false){
 let shots=endless?endlessShots:gardenShots;const fallsBefore=gardenFalls;
 for(const e of (endless?endlessRivals:gardenEnemies)){
  if(!e.alive)continue;
  const p=endless?e.platform:gardenPlatforms[e.plat];e.y=p.y-e.h;e.stunned=Math.max(0,e.stunned-dt);
  if(e.stunned<=0){
   e.cooldown-=dt;
   if(e.tell>0){e.tell-=dt;if(e.tell<=0){if(e.kind==='goose')e.charge=.85;else shots.push({x:e.x+e.w/2,y:e.y+18,vx:e.face*200,vy:-200,life:3})}}
   else if(e.cooldown<=0&&Math.abs(player.x-e.x)<380&&Math.abs(player.y-e.y)<200){e.face=player.x<e.x?-1:1;e.dir=e.face;e.tell=.7;e.cooldown=e.kind==='goose'?(endless?2.8:2.55):(endless?3.4:3.05)}
   if(e.kind==='goose'&&e.tell<=0){e.charge=Math.max(0,e.charge-dt);e.x+=e.dir*(e.charge>0?(endless?190:205):48)*dt;
    const lo=p.x+(!endless&&gardenCheckpoints.some(cp=>cp.platform===e.plat)?150:12),hi=p.x+p.w-e.w-12;
    if(e.x<lo){e.x=lo;e.dir=1;e.charge=0}if(e.x>hi){e.x=hi;e.dir=-1;e.charge=0}e.face=e.dir;
   }
  }
  const hit=player.x+player.w-5>e.x+3&&player.x+5<e.x+e.w-3&&player.y+player.h>e.y+4&&player.y<e.y+e.h;
  if(!hit)continue;
  if(player.vy>40&&prevFoot<=e.y+22){e.alive=false;if(endless)endlessBonus+=50;player.vy=-430;player.jumps=1;player.onGround=false;player.platform=-1;emit(e.x+e.w/2,e.y,14,'star','#ffe08f');tone(410,.1,.04)}
  else if(player.dashTime>0){e.stunned=1.6;e.tell=0;e.charge=0}
  else if(e.stunned<=0)(endless?hurtEndless:hurt)(player.x<e.x?-1:1);
  if(endless?mode!=='endless':gardenFalls!==fallsBefore)return;
 }
 for(const a of shots){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vy+=380*dt;a.life-=dt;
  if(a.x>player.x-9&&a.x<player.x+player.w+9&&a.y>player.y-7&&a.y<player.y+player.h+7){if(player.dashTime<=0)(endless?hurtEndless:hurt)(a.vx>0?1:-1);a.life=0}
  if(endless?mode!=='endless':gardenFalls!==fallsBefore)return;
 }
 shots=shots.filter(a=>a.life>0&&a.y<850&&(!endless||a.x>camera-150));
 if(endless)endlessShots=shots;else gardenShots=shots;
}
function drawGardenEnemy(e){
 if(!e.alive)return;ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h);ctx.scale(e.face,1);
 const stride=e.stunned?0:Math.sin(time*(e.charge>0?22:8))*4;
 if(e.kind==='goose'){
  line(-12, -8,-17+stride,0,'#dc9544',4);line(9,-8,15-stride,0,'#dc9544',4);
  ellipse(-3,-25,26,18,'#fff6df','#3d554b',2);path('M-23-27L-36-39L-31-21Z','#fff6df','#3d554b',2);
  path('M8-24Q10-41 12-53Q23-68 30-53L25-25Z','#fff6df','#3d554b',2);ellipse(22,-52,13,12,'#fff6df','#3d554b',2);
  path('M33-55L46-49L33-44Z','#eea149','#754e36',1.5);ellipse(26,-55,2.5,2.5,'#243d38');line(20,-61,30,-58,'#243d38',2);
  path('M-16-29Q-3-14 13-28',null,'#bdc9ac',2);roundRect(-16,-37,22,12,2,'#376857');
 }else{
  ellipse(-12,-3,12,6,'#483c43');ellipse(12,-3,12,6,'#483c43');roundRect(-21,-41,42,37,6,'#5d86a1','#354b48',2);
  ellipse(0,-48,19,19,'#efbb92','#594b42',2);path('M-18-43Q-23-17 0-9Q23-18 18-43L0-30Z','#fff3d7','#698071',2);
  path('M-23-58L-1-94L24-58Z','#dc7376','#754e4d',2);ellipse(0,-45,7,6,'#ecaa82');ellipse(-8,-51,2,2,'#343e37');ellipse(8,-51,2,2,'#343e37');
  ellipse(25,-32,7,7,'#bc8555','#5d4835',2);
 }
 ctx.restore();
 if(e.tell>0){roundRect(e.x-21,e.y-38,100,26,5,'#305344','#ffe8a4',2);ctx.fillStyle='#fff4c9';ctx.font='bold 16px sans-serif';ctx.textAlign='center';ctx.fillText(e.kind==='goose'?'HONK!':'CATCH!',e.x+29,e.y-20)}
 if(e.stunned>0){star(e.x+12,e.y-15,6,'#ffe28d',time);star(e.x+38,e.y-20,5,'#ffe28d',-time)}
}
function drawGardenThreats(){
 gardenEnemies.forEach(e=>{if(e.x>camera-150&&e.x<camera+viewW+150)drawGardenEnemy(e)});
 gardenShots.forEach(a=>{ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.life*7);ellipse(0,2,8,10,'#c49a64','#624a37',2);roundRect(-10,-7,20,7,3,'#836347');line(0,-7,2,-12,'#604a38',2);ctx.restore()});
}

function updateHealth(){
 $('health').innerHTML=Array.from({length:maxHealth()},(_,i)=>i<player.health?'♥':'<span class="empty">♥</span>').join(' ');
 $('health').setAttribute('aria-label',player.health===1?'One heart remaining':player.health===0?'No hearts remaining':player.health+' hearts remaining');
}

function resetEnemies(){
 enemies.forEach((e,i)=>{const p=platforms[e.plat];e.x=p.x+e.offset;e.y=p.y-e.h;e.alive=true;e.dir=i%2?-1:1;e.face=e.dir;e.stunned=0;e.attackTimer=1.8+i*.21});
}

function hurt(direction=0){
 if(player.invincible>0||(mode!=='playing'&&mode!=='garden'))return;
 player.health=Math.max(0,player.health-1);player.invincible=1.6;player.shake=.22;player.controlLock=.28;player.vx=direction?direction*330:-player.face*330;player.vy=-350;player.onGround=false;player.jumps=1;player.dashTime=0;
 emit(player.x+20,player.y+35,15,'star','#f0769b');tone(130,.16,.07,'triangle');updateHealth();
 if(player.health<=0){if(mode==='garden')resetGarden();else respawn()};
}

function drawHerNameplate(x,y){
 ctx.save();ctx.translate(x,y);ctx.scale(1/scale,1/scale);
 roundRect(-52,-38,104,34,7,'#142a25','#fff5c4',2);
 path('M-6-4L0 3L6-4Z','#fff5c4',null);
 ctx.fillStyle='#ffffff';ctx.font='bold 20px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('HER',0,-14);
 ctx.restore();
}

function drawGame(){
 drawBackground();ctx.save();ctx.scale(scale,scale);
 const shake=player.shake>0&&!reducedMotion?(Math.random()-.5)*8:0;
 ctx.translate(-camera+shake,worldOffsetY()+shake);
 const visible=(x,w=150)=>x+w>camera-120&&x<camera+viewW+150;
 platforms.forEach(p=>{if(visible(p.x,p.w))island(p)});
 if(visible(150))sign(155,490,'TO HER →',125);
 if(visible(1020))sign(1005,445,'CHECKPOINT',112);
 if(visible(2780))sign(2768,415,'CHECKPOINT',125);
 if(visible(4010))sign(4005,375,'CHECKPOINT',130);
 for(const cp of checkpoints.slice(6,-1))if(visible(cp.x))sign(cp.x,cp.y+70,'CHECKPOINT',120);
 drawSky();
 rings.forEach(r=>{if(visible(r.x,0))ring(r)});
 items.forEach(i=>{if(visible(i.x,0))drawItem(i)});
 if(visible(8350+cityExtension,500)){pavilion(8570+cityExtension,492);drawPinkPepe(8390+cityExtension,491,.76,time);drawHerNameplate(8390+cityExtension,385)}
 enemies.forEach(e=>{if(visible(e.x,60))drawEnemy(e,time)});
 projectiles.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);roundRect(-12,-3,24,6,1,'#b6b7c3','#161c30',1.5);roundRect(-16,-9,7,18,1,'#966c91','#161c30',2);roundRect(9,-9,7,18,1,'#966c91','#161c30',2);ctx.restore()});
 particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;if(p.type==='heart')heart(p.x,p.y,p.size,p.color);else if(p.type==='star')star(p.x,p.y,p.size,p.color,p.life);else ellipse(p.x,p.y,p.size,p.size,p.color)});ctx.globalAlpha=1;
 if(player.dashTime>0){for(let i=1;i<4;i++){ctx.globalAlpha=.12*(4-i);drawPepe(player.x+20-player.face*i*20,player.y+player.h,.89,player.face,player.walk,true,found[0])}}
 ctx.globalAlpha=player.invincible>0&&Math.floor(player.invincible*12)%2===0?.35:1;
 ctx.save();ctx.translate(player.x+player.w/2,player.y+player.h);ctx.scale(1+player.squash*.1,1-player.squash*.12);
 if(player.onGround)ellipse(0,2,25,4,'#080d1a66');
 drawPepe(0,0,.89,player.face,player.walk,!player.onGround,found[0],Math.abs(player.vx)>8);ctx.restore();ctx.globalAlpha=1;
 ctx.restore();
}

let accepted=false,companionX=45,companionY=500,gardenCheckpoint=0,gardenFalls=0,companionTrail=[],companionPose={x:45,y:500,walk:0,face:1,onGround:true,vx:0};
const gardenExtension=8590,gardenLength=8950+gardenExtension;
const gardenPlatforms=[
 {x:-100,y:500,w:600,kind:0},{x:610,y:455,w:180,kind:1},{x:905,y:390,w:170,kind:0},
 {x:1190,y:470,w:340,kind:0},{x:1660,y:410,w:155,kind:1},{x:1935,y:335,w:170,kind:1,moveY:22,rate:.8,moving:true},
 {x:2240,y:425,w:350,kind:0},{x:2720,y:370,w:155,kind:0},{x:3010,y:435,w:180,kind:1},
 {x:3310,y:360,w:165,kind:1,moveX:26,rate:.8,moving:true},{x:3620,y:440,w:340,kind:0},
 {x:4090,y:390,w:160,kind:1},{x:4380,y:465,w:190,kind:0},{x:4700,y:500,w:360,kind:0},
 {x:5200,y:425,w:185,kind:1},{x:5520,y:350,w:170,kind:1,moveX:30,rate:.85,moving:true},
 {x:5835,y:420,w:205,kind:0},{x:6175,y:470,w:370,kind:0},
 {x:6680,y:400,w:170,kind:1},{x:6985,y:335,w:175,kind:1,moveY:26,rate:.75,moving:true},
 {x:7300,y:425,w:350,kind:0},{x:7790,y:365,w:170,kind:1},
 {x:8100,y:440,w:180,kind:0},{"x":8420,"y":435,"w":152,"kind":0},
{"x":8717,"y":365,"w":135,"kind":1,"moveY":24,"rate":0.95,"moving":true},
{"x":9007,"y":415,"w":160,"kind":0,"moveX":18,"rate":0.85,"moving":true},
{"x":9332,"y":475,"w":320,"kind":1},
{"x":9802,"y":400,"w":135,"kind":0,"moveY":24,"rate":0.95,"moving":true},
{"x":10082,"y":335,"w":160,"kind":1},
{"x":10397,"y":410,"w":152,"kind":0},
{"x":10714,"y":465,"w":320,"kind":1},
{"x":11184,"y":435,"w":160,"kind":0},
{"x":11489,"y":365,"w":152,"kind":1},
{"x":11796,"y":415,"w":135,"kind":0,"moveY":24,"rate":0.95,"moving":true},
{"x":12096,"y":475,"w":320,"kind":1},
{"x":12566,"y":400,"w":152,"kind":0,"moveX":18,"rate":0.85,"moving":true},
{"x":12863,"y":335,"w":135,"kind":1,"moveY":24,"rate":0.95,"moving":true},
{"x":13153,"y":410,"w":160,"kind":0},
{"x":13478,"y":465,"w":320,"kind":1},
{"x":13948,"y":435,"w":135,"kind":0,"moveY":24,"rate":0.95,"moving":true},
{"x":14228,"y":365,"w":160,"kind":1,"moveX":18,"rate":0.85,"moving":true},
{"x":14543,"y":415,"w":152,"kind":0},
{"x":14860,"y":475,"w":320,"kind":1},
{"x":15330,"y":400,"w":160,"kind":0},
{"x":15635,"y":335,"w":152,"kind":1},
{"x":15942,"y":410,"w":135,"kind":0,"moveY":24,"rate":0.85,"moving":true,"moveX":18},
{"x":16242,"y":465,"w":320,"kind":1},
{"x":16712,"y":435,"w":153,"kind":0},
{x:8420+gardenExtension,y:500,w:530,kind:0}
].map(p=>({...p,baseX:p.x,baseY:p.y,dx:0,dy:0}));
const gardenCheckpoints=[{x:100,y:430,platform:0},{x:1230,y:400,platform:3},{x:2280,y:355,platform:6},{x:3660,y:370,platform:10},{x:4740,y:430,platform:13},{x:6215,y:400,platform:17},{x:7340,y:355,platform:20},{x:9367,y:405,platform:26},{x:10749,y:395,platform:30},{x:12131,y:405,platform:34},{x:13513,y:395,platform:38},{x:14895,y:405,platform:42},{x:16277,y:395,platform:46}];
const gardenEnemies=[
 {plat:1,kind:'goose',offset:60},{plat:3,kind:'goose',offset:210},{plat:6,kind:'gnome',offset:245},
 {plat:8,kind:'goose',offset:65},{plat:10,kind:'goose',offset:230},{plat:12,kind:'gnome',offset:115},
 {plat:13,kind:'goose',offset:240},{plat:14,kind:'goose',offset:75},{plat:16,kind:'gnome',offset:125},
 {plat:17,kind:'goose',offset:255},{plat:20,kind:'gnome',offset:250},{plat:22,kind:'goose',offset:75}
,{plat:23,kind:'goose',offset:45},{plat:24,kind:'goose',offset:45},{plat:25,kind:'gnome',offset:45},{plat:27,kind:'goose',offset:45},{plat:28,kind:'gnome',offset:45},{plat:29,kind:'goose',offset:45},{plat:31,kind:'gnome',offset:45},{plat:32,kind:'goose',offset:45},{plat:33,kind:'goose',offset:45},{plat:35,kind:'goose',offset:45},{plat:36,kind:'goose',offset:45},{plat:37,kind:'gnome',offset:45},{plat:39,kind:'goose',offset:45},{plat:40,kind:'gnome',offset:45},{plat:41,kind:'goose',offset:45},{plat:43,kind:'gnome',offset:45},{plat:44,kind:'goose',offset:45},{plat:45,kind:'goose',offset:45},{plat:47,kind:'goose',offset:45}].map(e=>({...e,w:50,h:e.kind==='goose'?65:88,alive:true,x:0,y:0,dir:1,face:1,stunned:0,tell:0,charge:0,cooldown:2}));
let gardenShots=[],gardenChapter=-1;
const gardenHearts=gardenPlatforms.slice(1,-1).map(p=>({x:p.x+p.w/2,y:p.y-78,got:false}));
function resetCompanion(x,y){
 companionX=x-80;companionY=y+player.h;companionPose={x:companionX,y:companionY,walk:0,face:1,onGround:true,vx:0};
 companionTrail=Array.from({length:30},(_,i)=>({...companionPose,x:x-80+i*80/30,at:time-.30+i*.01}));
}
function updateCompanion(){
 companionTrail.push({x:player.x,y:player.y+player.h,walk:player.walk,face:player.face,onGround:player.onGround,vx:player.vx,at:time});
 while(companionTrail.length>2&&companionTrail[1].at<=time-.7)companionTrail.shift();
 const delay=Math.min(.30,85/Math.max(1,Math.abs(player.vx)));
 let following=companionTrail[0];for(const sample of companionTrail){if(sample.at>time-delay)break;following=sample}
 if(player.onGround&&following.onGround&&companionPose.onGround&&Math.abs(player.vx)<8&&Math.abs(player.x-following.x)<78)companionPose={...companionPose,vx:0};else companionPose=following;
 companionX=companionPose.x;companionY=companionPose.y;
}
function startGarden(){
 if(!levelOneCleared||!accepted||mode!=='letter')return;
 mode='garden';paused=false;resetQuotes();toastUntil=0;toastPriority=-1;camera=0;gardenCheckpoint=0;gardenFalls=0;gardenChapter=-1;particles=[];resetGardenEnemies();resetSky();confetti=[];left=right=jumpQueued=dashQueued=false;
 Object.assign(player,{x:100,y:430,health:maxHealth(),vx:0,vy:0,onGround:true,jumps:0,walk:0,face:1,coyote:.1,platform:0,invincible:0,dashTime:0,dashCooldown:0,controlLock:0,shake:0,squash:0});resetCompanion(player.x,player.y);gardenHearts.forEach(h=>h.got=false);
 stage.classList.add('garden');$('letter-overlay').hidden=true;$('hud').hidden=false;$('play-tools').hidden=false;$('dash').hidden=false;
 updateHealth();$('chapter').innerHTML='<small>LEVEL 2 / THE GARDEN</small>Reach the diner together.';
 $('footer-right').textContent='OST // LUSH DATE ADVENTURE';$('pause-copy').textContent='Your checkpoint is saved.';
 audioWake();$('pause').focus({preventScroll:true});
}
function resetGarden(){
 gardenFalls++;resetGardenEnemies();const cp=gardenCheckpoints[gardenCheckpoint];Object.assign(player,{x:cp.x,y:cp.y,health:maxHealth(),vx:0,vy:0,onGround:false,jumps:0,coyote:0,platform:-1,invincible:2.2,dashTime:0,dashCooldown:0,controlLock:0,squash:0});resetCompanion(player.x,player.y);
 updateHealth();camera=Math.max(0,Math.min(gardenLength-viewW,cp.x-viewW*.32));emit(cp.x+20,cp.y+45,12,'star','#ed759e');toast('Back at the checkpoint.',2.5,2);
}
function gardenPhysics(dt){
 if(mode!=='garden'||paused)return;
 const prevFoot=stepPlatformPlayer(dt,gardenPlatforms,gardenLength);
 if(player.y>850){resetGarden();return}
 for(let i=1;i<gardenCheckpoints.length;i++){const cp=gardenCheckpoints[i];if(i>gardenCheckpoint&&player.onGround&&player.platform===cp.platform&&player.x>cp.x-15){gardenCheckpoint=i;player.health=maxHealth();updateHealth();chime([440,554,659],.08)}}
 updateGardenEnemies(dt,prevFoot);updateCompanion();
 const chapter=player.x<4300?0:player.x<9300?1:player.x<16400?2:3;
 if(chapter!==gardenChapter){gardenChapter=chapter;
  $('chapter').innerHTML='<small>LEVEL 2 / '+['THE GARDEN','THE GROVE','THE GARDEN PATH','THE DINER'][chapter]+'</small>'+['Reach the diner together.','Watch for acorns.','Follow the garden path.','The diner is just ahead.'][chapter];
 }

 const desired=Math.max(0,Math.min(Math.max(0,gardenLength-viewW),player.x-viewW*.32));camera+=(desired-camera)*Math.min(1,dt*5.5);
 gardenHearts.forEach(h=>{if(!h.got&&Math.hypot(player.x+20-h.x,player.y+30-h.y)<62){h.got=true;emit(h.x,h.y,9,'heart','#ed759e');tone(660,.15,.025)}});
 if(player.x>gardenLength-260&&player.onGround)finishGarden();
}

function gardenTree(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);path('M-13 0L-8-155L8-155L16 0Z','#947652',null);line(1,-75,-40,-122,'#947652',9);ellipse(-40,-150,61,53,'#4c9b5e');ellipse(43,-153,66,56,'#389769');ellipse(0,-199,69,61,'#64af5e');ellipse(-16,-216,38,28,'#82c66d');ellipse(51,-173,25,17,'#75ba61');ctx.restore()}
function restaurant(x,y){
 ctx.save();ctx.translate(x,y);roundRect(-145,-245,310,245,10,'#fff0cd','#8c6955',3);
 path('M-170-234L10-310L188-234Z','#d77871','#8c6955',3);roundRect(-129,-223,278,47,5,'#366e55');ctx.fillStyle='#fff3cc';ctx.textAlign='center';ctx.font='bold 19px Georgia';ctx.fillText('CUPID’S DINER',10,-194);
 roundRect(-120,-157,75,105,3,'#f8ca73','#a27b53',3);roundRect(65,-157,75,105,3,'#f8ca73','#a27b53',3);roundRect(-25,-151,73,151,27,'#598578','#a27b53',3);
 for(let i=0;i<6;i++)roundRect(-145+i*52,-174,52,23,0,i%2?'#fff0cd':'#e99191');
 line(-82,-156,-82,-52,'#fff2d2',4);line(101,-156,101,-52,'#fff2d2',4);
 roundRect(-62,-47,120,9,4,'#faf3dd','#977255',2);line(-38,-38,-40,0,'#977255',4);line(36,-38,38,0,'#977255',4);tulip(-2,-47,.7);
 for(const xx of [-132,151]){roundRect(xx-17,-28,34,28,3,'#cc8c72');flower(xx,-28,1.6,'#fbb1c2',time)}ctx.restore();
}
function drawGarden(endless=false){
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#96dfe2');sky.addColorStop(.6,'#e1f5cc');sky.addColorStop(1,'#8ec97a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.scale(scale,scale);ellipse(viewW*.78,85,49,49,'#fff3ab');cloud(150-camera*.04,95,.8,.65);cloud(610-camera*.04,140,1.1,.65);
 for(let i=-1;i<Math.ceil(viewW/220)+2;i++){const x=i*220-(camera*.15%220);ellipse(x,viewH*.7,220,160,i%2?'#a9d88c':'#8bc782')}
 ctx.translate(-camera,worldOffsetY());
 for(let i=Math.max(0,Math.floor(camera/350)-1);i<Math.ceil((endless?camera+viewW+400:gardenLength)/350);i++){const x=i*350+70;if(x>camera-220&&x<camera+viewW+220)gardenTree(x,690,.8+(i%3)*.18)}
 const river=ctx.createLinearGradient(0,600,0,1000);river.addColorStop(0,'#7bd3c2');river.addColorStop(1,'#3a9eaa');ctx.fillStyle=river;ctx.fillRect(camera-30,650,viewW+60,500);
 for(let i=0;i<14;i++){const xx=camera+i*100;line(xx,675+Math.sin(time+i)*8,xx+42,675+Math.sin(time+i)*8,'#c4f3dc',3)}
 for(const p of (endless?endlessPlatforms:gardenPlatforms)){
  if(p.x+p.w<camera-120||p.x>camera+viewW+120)continue;
  const stone=p.kind===1;roundRect(p.x,p.y,p.w,850,5,stone?'#829f8a':'#b48b61','#527456',2);
  for(let yy=32;yy<650;yy+=48){line(p.x+10,p.y+yy,p.x+p.w-10,p.y+yy,stone?'#6f8d7d':'#a37c59',1);for(let j=0;j<3;j++)ellipse(p.x+17+j*(p.w-30)/3,p.y+yy+13,4,3,stone?'#b3c4a3':'#d1ae7e')}
  roundRect(p.x-4,p.y-8,p.w+8,13,4,'#6ebd62','#426c48',2);roundRect(p.x-3,p.y-8,p.w+6,4,2,'#b5e784');
  if(p.moving){for(let j=9;j<p.w;j+=25)line(p.x+j,p.y+9,p.x+j+10,p.y+9,'#f9e6a2',4)}
  for(let j=15;j<p.w-15;j+=54)flower(p.x+j,p.y-8,.5+(j%3)*.08,['#ffd0e0','#fff3ae','#dac5f8'][Math.floor(j/54)%3],time+j);
  if(p.w>300){gardenTree(p.x+p.w-80,p.y-9,.72);butterfly(p.x+95,p.y-160+Math.sin(time)*10,.8,'#ffd77d',time)}
 }
 if(endless){ctx.restore();return}
 for(let i=1;i<gardenCheckpoints.length;i++){const cp=gardenCheckpoints[i],x=cp.x,y=gardenPlatforms[cp.platform].y;line(x,y,x,y-82,'#627c55',3);path('M'+x+' '+(y-82)+'L'+(x+43)+' '+(y-69)+'L'+x+' '+(y-56)+'Z',i<=gardenCheckpoint?'#e985aa':'#e0e8a0','#70875e',1);heart(x+14,y-70,.3,'#fff1d1')}
 gardenHearts.forEach(h=>{if(!h.got)heart(h.x,h.y+Math.sin(time*2+h.x)*5,.7,'#f28aa5','#c96288')});
 if(camera<350){ctx.fillStyle='#275c48';ctx.font='bold 19px Georgia';ctx.textAlign='center';ctx.fillText('To the diner →',280,250)}
 if(camera>gardenLength-viewW-700)restaurant(gardenLength-260,500);
 drawGardenThreats();
 if(companionPose.onGround)ellipse(companionX+20,companionY+2,22,4,'#346a5833');drawPinkPepeRunning(companionX+20,companionY,.72,companionPose);
 ctx.globalAlpha=player.invincible>0&&Math.floor(player.invincible*12)%2===0?.35:1;
 if(player.onGround)ellipse(player.x+20,player.y+72,24,4,'#346a5833');drawPepe(player.x+20,player.y+70,.89,player.face,player.walk,!player.onGround,true,Math.abs(player.vx)>8);ctx.globalAlpha=1;
 particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;heart(p.x,p.y,p.size,p.color)});ctx.globalAlpha=1;ctx.restore();
}
function finishGarden(){
 if(!levelOneCleared||!accepted||mode!=='garden'||player.x<=gardenLength-260||!player.onGround||player.platform!==gardenPlatforms.length-1)return;mode='dinner';levelTwoCleared=true;resetQuotes();left=right=jumpQueued=dashQueued=false;$('hud').hidden=true;$('play-tools').hidden=true;$('toast').classList.remove('show');$('toast').textContent='';$('announcement').textContent='';$('letter-overlay').hidden=false;showLetterView('yes');
 $('footer-right').textContent='CUPID’S DINER';chime([523,659,784,1047],.16);
}


function drawConfetti(){confetti.forEach(p=>{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.globalAlpha=Math.min(1,p.life);if(p.heart)heart(0,0,p.s*.1,p.color);else roundRect(-p.s/2,-p.s/2,p.s,p.s*.55,1,p.color);ctx.restore()})}
function emit(x,y,count=12,type='star',color='#f4dba8'){for(let i=0;i<count;i++){const a=Math.random()*TAU,v=30+Math.random()*100;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-50,life:.8+Math.random()*.5,max:1.3,type,color,size:type==='heart'?.2+Math.random()*.22:2+Math.random()*4})}}
// Public-domain excerpts. Source texts and punctuation are recorded with each quote.
const loveQuotes=[
 {level:'playing',x:0,text:'The course of true love never did run smooth.',author:'William Shakespeare',work:'A Midsummer Night’s Dream',source:'https://www.folger.edu/explore/shakespeares-works/a-midsummer-nights-dream/quotes/'},
 {level:'playing',x:1300,text:'The very essence of romance is uncertainty.',author:'Oscar Wilde',work:'The Importance of Being Earnest',source:'https://www.gutenberg.org/files/844/844-h/844-h.htm'},
 {level:'playing',x:2700,text:'How do I love thee? Let me count the ways.',author:'Elizabeth Barrett Browning',work:'Sonnets from the Portuguese, 43',source:'https://poets.org/poem/how-do-i-love-thee-sonnet-43'},
 {level:'playing',x:4100,text:'Love looks not with the eyes but with the mind;',author:'William Shakespeare',work:'A Midsummer Night’s Dream',source:'https://www.folger.edu/explore/shakespeares-works/a-midsummer-nights-dream/read/'},
 {level:'playing',x:5500,text:'Love seeketh not itself to please,',author:'William Blake',work:'The Clod and the Pebble',source:'https://www.poetryfoundation.org/poems/43655/the-clod-and-the-pebble'},
 {level:'playing',x:6900,text:'There is no charm equal to tenderness of heart.',author:'Jane Austen',work:'Emma',source:'https://www.gutenberg.org/files/158/158-h/158-h.htm'},
 {level:'garden',x:0,text:'If music be the food of love, play on.',author:'William Shakespeare',work:'Twelfth Night',source:'https://www.folger.edu/explore/shakespeares-works/twelfth-night/read/'},
 {level:'garden',x:1400,text:'Who, being loved, is poor?',author:'Oscar Wilde',work:'A Woman of No Importance',source:'https://www.gutenberg.org/files/854/854-h/854-h.htm'},
 {level:'garden',x:2800,text:'O my luve’s like a red, red rose,\nThat’s newly sprung in June;',author:'Robert Burns',work:'A Red, Red Rose',source:'https://poets.org/poem/red-red-rose'},
 {level:'garden',x:4200,text:'Love gives naught but itself and takes naught but from itself.',author:'Kahlil Gibran',work:'The Prophet',source:'https://www.gutenberg.org/files/58585/58585-h/58585-h.htm'},
 {level:'garden',x:5600,text:'I do love nothing in the world so well as you. Is not that strange?',author:'William Shakespeare',work:'Much Ado About Nothing',source:'https://www.folger.edu/explore/shakespeares-works/much-ado-about-nothing/read/'},
 {level:'garden',x:7000,text:'Journeys end in lovers meeting,',author:'William Shakespeare',work:'Twelfth Night',source:'https://www.folger.edu/explore/shakespeares-works/twelfth-night/read/'},
 {"level": "jungle", "x": 180, "text": "I wandered lonely as a Cloud\nThat floats on high o’er Vales and Hills,", "author": "William Wordsworth", "work": "I Wandered Lonely as a Cloud", "source": "https://www.gutenberg.org/cache/epub/8824/pg8824-images.html"},
 {"level": "jungle", "x": 2700, "text": "There is a solitude of space\nA solitude of Sea", "author": "Emily Dickinson", "work": "There is a solitude of space", "source": "https://www.emilydickinson.org/node/981"},
 {"level": "jungle", "x": 5000, "text": "O Solitude! if I must with thee dwell,", "author": "John Keats", "work": "Sonnet VII", "source": "https://poets.org/poem/sonnet-vii-o-solitude-if-i-must-thee-dwell/embed"},
 {"level": "jungle", "x": 8500, "text": "I never found the companion that was so companionable as solitude.", "author": "Henry David Thoreau", "work": "Walden — Solitude", "source": "https://www.gutenberg.org/cache/epub/205/pg205-images.html"},
 {"level": "jungle", "x": 11200, "text": "There is a pleasure in the pathless woods,\nThere is a rapture on the lonely shore,", "author": "Lord Byron", "work": "Childe Harold’s Pilgrimage", "source": "https://poets.org/poem/childe-harolds-pilgrimage-there-pleasure-pathless-woods/print"}
];
for(const q of loveQuotes){const start=q.level==='garden'?100:80,factor=q.level==='garden'?2:1.7;if(q.x>start)q.x=Math.round(start+(q.x-start)*factor)}
const storyBeats=[
 {x:0,text:'Okay. What do I even say?'},
 {x:5894,text:'Maybe I’m overthinking the hello.'},
 {x:10824,text:'Just be myself. Go say hi.'}
];
let pickupNarration=[],quoteQueue=[],activeQuote=null,quoteRemaining=0,quoteGap=0,activeStory=null,storyRemaining=0;
const shownQuotes=new Set();
const shownStories=new Set();
function hideQuote(){if(!$('quote-card').hidden){$('quote-card').hidden=true;stage.classList.remove('quote-visible')}}
function revealQuote(){if($('quote-card').hidden){$('quote-card').hidden=false;stage.classList.add('quote-visible')}}
function resetQuotes(clearHistory=false){pickupNarration=[];quoteQueue=[];activeQuote=null;quoteRemaining=0;quoteGap=0;activeStory=null;storyRemaining=0;hideQuote();if(clearHistory){shownQuotes.clear();shownStories.clear()}}
function queueQuote(index){if(loveQuotes[index]?.level===mode&&!shownQuotes.has(index)&&!quoteQueue.includes(index))quoteQueue.push(index)}
function updateQuotes(dt=0){
 if(mode!=='playing'&&mode!=='garden'&&mode!=='jungle'){hideQuote();return}
 if(paused||document.hidden)return;
 loveQuotes.forEach((quote,index)=>{if(quote.level===mode&&player.x>=quote.x)queueQuote(index)});
 const pendingStory=mode==='playing'?storyBeats.findIndex((beat,index)=>player.x>=beat.x&&!shownStories.has(index)):-1;
 if(pickupNarration.length&&activeQuote!==null){quoteQueue.unshift(activeQuote);shownQuotes.delete(activeQuote);activeQuote=null;quoteRemaining=0;quoteGap=0;hideQuote()}
 if(activeStory!==null){
  storyRemaining=Math.max(0,storyRemaining-dt);
  if(storyRemaining===0){activeStory=null;quoteGap=1.4;hideQuote();return}
  revealQuote();return;
 }
 if(activeQuote!==null){
  quoteRemaining=Math.max(0,quoteRemaining-dt);
  // Fast players still reach the later quotes: advance after five readable seconds
  // when another milestone is waiting. Otherwise keep the full ten seconds.
  if(quoteRemaining===0||(quoteRemaining<=5&&(quoteQueue.length||pendingStory!==-1))){activeQuote=null;quoteGap=1.4;hideQuote();return}
  revealQuote();return;
 }
 quoteGap=Math.max(0,quoteGap-dt);
 if(quoteGap>0||!player.onGround)return;
 if(pickupNarration.length){
  activeStory='pickup';storyRemaining=4.5;
  $('quote-card').setAttribute('data-kind','story');$('quote-number').hidden=false;$('quote-number').textContent='PEPE, TO HIMSELF';
  $('quote-text').textContent=pickupNarration.shift();$('quote-credit').hidden=true;revealQuote();return;
 }
 if(pendingStory!==-1){
  activeStory=pendingStory;storyRemaining=4.2;shownStories.add(pendingStory);
  $('quote-card').setAttribute('data-kind','story');$('quote-number').hidden=false;$('quote-number').textContent='PEPE, TO HIMSELF';
  $('quote-text').textContent=storyBeats[pendingStory].text;$('quote-credit').hidden=true;revealQuote();return;
 }
 if(quoteQueue.length===0)return;
 const index=quoteQueue.shift(),quote=loveQuotes[index];
 activeQuote=index;quoteRemaining=10;shownQuotes.add(index);
 $('quote-card').setAttribute('data-kind','quote');$('quote-number').hidden=true;$('quote-credit').hidden=false;
 $('quote-text').textContent='“'+quote.text+'”';
 $('quote-author').textContent=quote.author;$('quote-work').textContent=quote.work;
 revealQuote();
}

function toast(text,duration=3.7,priority=0,label=null){
 if(time<toastUntil&&priority<toastPriority)return;
 toastPriority=priority;$('toast').setAttribute('data-label',label||(priority>0?'HEADS UP':'PROGRESS'));$('toast').setAttribute('data-kind',priority>0?'instruction':'progress');
 $('toast').textContent=text;$('toast').classList.add('show');
 toastUntil=time+Math.max(duration,2.5+text.length/22);$('announcement').textContent=text;
}
function start(){
 levelTwoCleared=false;stage.classList.remove('jungle');['wake-scene','cabin-ending','jungle-cargo','cabin-thought'].forEach(id=>$(id).hidden=true);
 stage.classList.remove('endless');$('intro').inert=false;['level-select','character-select','run-over','endless-stats','wake-scene','cabin-ending','jungle-cargo','cabin-thought'].forEach(id=>$(id).hidden=true);
 accepted=false;levelOneCleared=false;stage.classList.remove('garden');$('dash').hidden=false;$('pause-copy').textContent='Paused. Your progress is safe.';mode='playing';paused=false;resetQuotes(true);toastUntil=0;toastPriority=-1;found=[false,false,false];ringFound=0;fallCount=0;camera=0;chapterIndex=-1;finishTimer=0;particles=[];confetti=[];projectiles=[];resetSky();skyIntroduced=false;rings.forEach(r=>r.got=false);resetEnemies();
 Object.assign(player,{x:80,y:400,vx:0,vy:0,jumps:0,onGround:false,coyote:0,face:1,squash:0,checkpoint:0,invincible:0,walk:0,health:maxHealth(),dashTime:0,dashCooldown:0,controlLock:0,platform:-1,shake:0});
 left=right=jumpQueued=dashQueued=false;
 $('intro').hidden=true;$('hud').hidden=false;$('play-tools').hidden=false;$('letter-overlay').hidden=true;$('paused').hidden=true;$('footer-right').textContent='LEVEL 1 // OST: ROOFTOP HOPS';
 found.forEach((_,i)=>{$('keepsake-'+i).classList.remove('found');$('keepsake-'+i).setAttribute('aria-label',['Flower','Courage','Letter'][i]+': not collected')});
 updateHealth();
 try{soundtrack.currentTime=0;soundtrack.volume=.4}catch{}
 audioWake();updateChapter();$('pause').focus({preventScroll:true});
}

function updateChapter(){
 const idx=player.x<4364?0:player.x<9464?1:2;if(idx===chapterIndex)return;chapterIndex=idx;
 const names=['LEVEL 1 / THE BUTTERFLIES','LEVEL 1 / A LITTLE COURAGE','LEVEL 1 / HERE GOES'];
 const titles=['A little nervous.','Getting out of my head.','Ready to say hi.'];
 $('chapter').innerHTML='<small>'+names[idx]+'</small>'+titles[idx];

}

function collectItem(i){
 found[i]=true;$('keepsake-'+i).classList.add('found');$('keepsake-'+i).setAttribute('aria-label',['Flower','Courage','Letter'][i]+': collected');emit(items[i].x,items[i].y,18,'heart','#ec80a9');chime([659,784,988],.1);
}

function respawn(){
 fallCount++;resetSky();player.health=maxHealth();
 const cp=checkpoints[player.checkpoint];
 Object.assign(player,{x:cp.x,y:cp.y,vx:0,vy:0,jumps:0,onGround:false,coyote:0,invincible:1.8,dashTime:0,dashCooldown:0,controlLock:0,platform:-1});
 projectiles=[];camera=Math.max(0,Math.min(worldWidth-viewW,player.x-viewW*.3));updateHealth();
 emit(player.x+20,player.y+45,12,'star','#dce9a5');
 toast('Back at the checkpoint.',3,2);
}

function stepPlatformPlayer(dt,terrain,width){
 terrain.forEach(p=>{const ox=p.x,oy=p.y;if(p.moveX)p.x=p.baseX+Math.sin(time*p.rate)*p.moveX;if(p.moveY)p.y=p.baseY+Math.sin(time*p.rate)*p.moveY;p.dx=p.x-ox;p.dy=p.y-oy});
 if(player.onGround&&player.platform>=0){player.x+=terrain[player.platform].dx;player.y+=terrain[player.platform].dy}
 player.invincible=Math.max(0,player.invincible-dt);player.dashCooldown=Math.max(0,player.dashCooldown-dt);player.dashTime=Math.max(0,player.dashTime-dt);player.controlLock=Math.max(0,player.controlLock-dt);player.shake=Math.max(0,player.shake-dt);
 $('dash').classList.toggle('cooldown',player.dashCooldown>0);
 if(dashQueued){dashQueued=false;if(player.dashCooldown<=0){player.dashTime=.18;player.dashCooldown=1.05;player.vx=player.face*650;player.vy=0;player.squash=-.5;emit(player.x+20,player.y+35,10,'dot','#c4df92');tone(280,.12,.035,'triangle')}}
 if(jumpQueued){jumpQueued=false;if(player.onGround||player.coyote>0||player.jumps<2){if(player.onGround||player.coyote>0)player.jumps=0;player.vy=player.jumps===0?-550:-490;player.jumps++;player.onGround=false;player.platform=-1;player.coyote=0;player.squash=-.65;player.dashTime=0;emit(player.x+20,player.y+70,6,'dot','#c5c2a9');tone(player.jumps===1?440:580,.08,.022,'sine')}}
 const dir=(right?1:0)-(left?1:0),target=dir*280;
 if(player.dashTime>0){player.vx=player.face*650;player.vy=0}
 else if(player.controlLock<=0)player.vx+=(target-player.vx)*Math.min(1,dt*(dir?14:18));
 if(dir&&player.controlLock<=0)player.face=dir;if(player.onGround)player.walk+=Math.abs(player.vx)*dt*.075;
 const prevY=player.y,prevFoot=prevY+player.h;
 if(player.dashTime<=0)player.vy=Math.min(player.vy+1450*dt,760);
 player.x+=player.vx*dt;player.y+=player.vy*dt;player.x=Math.max(-60,Math.min(player.x,width-player.w-45));
 const wasGround=player.onGround;player.onGround=false;player.platform=-1;
 if(player.vy>=0){for(let i=0;i<terrain.length;i++){const p=terrain[i];if(player.x+player.w-5>p.x&&player.x+5<p.x+p.w&&prevFoot<=p.y+Math.max(7,Math.abs(p.dy)+3)&&player.y+player.h>=p.y){player.y=p.y-player.h;player.vy=0;player.onGround=true;player.platform=i;player.jumps=0;player.coyote=.1;if(!wasGround)player.squash=1;break}}}
 if(!player.onGround){player.coyote-=dt;if(wasGround&&player.jumps===0)player.jumps=1}
 player.squash*=Math.max(0,1-dt*10);
 return prevFoot;
}

function physics(dt){
 if(mode!=='playing'||paused)return;
 const prevFoot=stepPlatformPlayer(dt,platforms,worldWidth);
 for(let i=1;i<checkpoints.length;i++){const cp=checkpoints[i];if(i>player.checkpoint&&player.onGround&&player.platform===cp.platform&&player.x>cp.x-15){player.checkpoint=i;player.health=maxHealth();updateHealth();chime([392,523,659],.09)}}
 if(player.y>850){player.health=Math.max(0,player.health-1);respawn();return}
 updateSky(dt);
 enemies.forEach((e,index)=>{
  if(!e.alive)return;
  const p=platforms[e.plat];e.y=p.y-e.h;e.stunned=Math.max(0,e.stunned-dt);
  if(e.stunned<=0){e.x+=e.dir*e.speed*dt;if(e.x<p.x+8){e.x=p.x+8;e.dir=1}if(e.x+e.w>p.x+p.w-8){e.x=p.x+p.w-8-e.w;e.dir=-1}e.face=e.dir;
   if(e.type===1&&Math.abs(player.x-e.x)<560){e.attackTimer-=dt;if(e.attackTimer<=0){const d=player.x<e.x?-1:1;projectiles.push({x:e.x+24,y:e.y+46,vx:d*210,vy:-70,life:4,rot:0,source:index});e.attackTimer=2.7}}
  }
  const overlap=player.x+player.w-5>e.x+3&&player.x+5<e.x+e.w-3&&player.y+player.h>e.y+4&&player.y<e.y+e.h;
  if(!overlap)return;
  if(player.vy>40&&prevFoot<=e.y+26){e.alive=false;player.vy=-430;player.jumps=1;player.onGround=false;player.squash=-.7;projectiles=projectiles.filter(p=>p.source!==index);emit(e.x+24,e.y+40,22,'star','#d8e7a0');chime([294,440],.06)}
  else if(player.dashTime>0){e.stunned=1.4;emit(e.x+24,e.y+40,6,'star','#f4d195')}
  else if(e.stunned<=0)hurt(player.x<e.x?-1:1);
 });
 projectiles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.rot+=dt*5;p.life-=dt;if(p.x>player.x-9&&p.x<player.x+player.w+9&&p.y>player.y&&p.y<player.y+player.h){if(player.dashTime<=0)hurt(p.vx>0?1:-1);p.life=0}});
 projectiles=projectiles.filter(p=>p.life>0&&p.y<900);
 items.forEach((p,i)=>{if(!found[i]&&Math.hypot(player.x+20-p.x,player.y+35-p.y)<51)collectItem(i)});
 rings.forEach(r=>{if(!r.got&&Math.abs(player.x+20-r.x)<35&&Math.abs(player.y+35-r.y)<55){r.got=true;ringFound++;emit(r.x,r.y,10,'star','#e5d5a7');tone(700+ringFound*20,.12,.018,'sine')}});
 const desired=Math.max(0,Math.min(Math.max(0,worldWidth-viewW),player.x-viewW*.32));camera+=(desired-camera)*Math.min(1,dt*5.5);updateChapter();
 if(player.x>cityFinishX&&player.onGround){finishTimer+=dt;if(finishTimer>.5)finish()}else finishTimer=0;
}

function finish(){
 if(mode!=='playing'||!player.onGround||player.platform!==platforms.length-1||player.x<=cityFinishX||finishTimer<=.5)return;levelOneCleared=true;mode='letter';resetQuotes();left=right=jumpQueued=dashQueued=false;paused=false;$('paused').hidden=true;$('hud').hidden=true;$('play-tools').hidden=true;$('toast').classList.remove('show');$('toast').textContent='';$('announcement').textContent='';
 Object.assign(player,{x:cityFinishX+20,y:430,vx:0,vy:0,onGround:true,face:1,invincible:0});camera=Math.max(0,Math.min(worldWidth-viewW,cityFinishX+20-viewW*.36));projectiles=[];skyDrops=[];
 $('letter-overlay').hidden=false;showLetterView('ask');$('footer-right').textContent='PEPE HAS DELIVERED THE NOTE.';audioWake();chime([523,659,784,1047],.14);$('letter-card').focus({preventScroll:true});
}

function showLetterView(v){['ask','yes','no'].forEach(n=>$(n+'-view').hidden=n!==v);$('letter-card').setAttribute('aria-labelledby',v==='ask'?'letter-title':v+'-title');$('letter-card').focus({preventScroll:true})}
function yes(){if(mode!=='letter'||!levelOneCleared)return;accepted=true;startGarden();chime([659,784,988,1318],.12);}

function togglePause(force){
 if(!isGameplay())return;paused=typeof force==='boolean'?force:!paused;left=right=jumpQueued=dashQueued=false;$('paused').hidden=!paused;
 if(paused){$('jungle-intro-sound').pause();$('resume').focus({preventScroll:true});soundtrack.pause()}else{$('pause').focus({preventScroll:true});audioWake()}
}

// Endless runs own their terrain and progress; they never unlock story scenes.
let endlessWorld='city',endlessShots=[],endlessDrops=[],endlessDropNext=2.5;
const endlessWorlds={city:{name:'City Lights',hint:'Rooftops, rivals and neon nights.'},garden:{name:'The Garden',hint:'Charging geese. Gnomes with terrible aim.'},jungle:{name:'The Jungle',hint:'Bats above. Watch the incoming warnings.'}};
function endlessBestKey(){const key=endlessWorld==='city'?'rejected-endless-best':'its-over-endless-best-'+endlessWorld;return key+(difficulty==='hard'?'-hard':'')}
function selectEndlessWorld(world){
 endlessWorld=Object.hasOwn(endlessWorlds,world)?world:'city';endlessBest=0;
 try{const saved=Number(localStorage.getItem(endlessBestKey()));if(Number.isFinite(saved)&&saved>0)endlessBest=Math.floor(saved)}catch{}
 for(const key of Object.keys(endlessWorlds))$('endless-world-'+key).setAttribute('aria-pressed',String(key===endlessWorld));
 $('endless-world-hint').textContent=endlessWorlds[endlessWorld].hint;
 $('select-best').textContent=endlessWorlds[endlessWorld].name.toUpperCase()+' / '+difficulty.toUpperCase()+' BEST · '+endlessBest;
}
let endlessCharacter='pepe',endlessPlatforms=[],endlessRivals=[],endlessStars=[];
let endlessSeed=0,endlessNext=0,endlessFarthest=80,endlessBonus=0,endlessScore=0,endlessBest=0,endlessHudScore=-1;
try{const saved=Number(localStorage.getItem(endlessBestKey()));if(Number.isFinite(saved)&&saved>0)endlessBest=Math.floor(saved)}catch{}
function isGameplay(){return mode==='playing'||mode==='garden'||mode==='endless'||mode==='jungle'}
function selectCharacter(character){
 endlessCharacter=character==='pink-pepe'?'pink-pepe':'pepe';
 $('choose-pepe').setAttribute('aria-pressed',String(endlessCharacter==='pepe'));
 $('choose-pink-pepe').setAttribute('aria-pressed',String(endlessCharacter==='pink-pepe'));
 $('character-caption').textContent=endlessCharacter==='pepe'?'Pepe · still going.':'Pink Pepe · her own adventure.';
}
function openCharacters(){
 mainMenu();$('intro').inert=true;$('character-select').hidden=false;
 selectEndlessWorld(endlessWorld);
 selectCharacter(endlessCharacter);$('choose-'+endlessCharacter).focus({preventScroll:true});
}
function mainMenu(){
 $('jungle-intro-sound').pause();
 mode='intro';paused=false;accepted=false;levelOneCleared=false;levelTwoCleared=false;left=right=jumpQueued=dashQueued=false;
 resetQuotes(true);resetSky();particles=[];confetti=[];projectiles=[];camera=0;
 stage.classList.remove('garden','endless','jungle');$('intro').hidden=false;$('intro').inert=false;
 ['hud','play-tools','paused','letter-overlay','level-select','character-select','run-over','endless-stats','wake-scene','cabin-ending','jungle-cargo','cabin-thought'].forEach(id=>$(id).hidden=true);
 $('toast').classList.remove('show');toastUntil=0;toastPriority=-1;$('announcement').textContent='';
 $('footer-right').textContent='A STORY. OR ONE MORE RUN.';audioWake();$('start').focus({preventScroll:true});
}
function extendEndless(){
 const edge=Math.max(player.x,camera+viewW)+1300;
 while(endlessPlatforms.at(-1).x+endlessPlatforms.at(-1).w<edge){
  const lastPlatform=endlessPlatforms.at(-1),id=++endlessNext,challenge=Math.min(1,id/45);
  const rand=n=>seeded(endlessSeed+id*31+n);
  const rest=id%7===0,w=rest?310:190+Math.floor(rand(1)*70)-Math.floor(challenge*25);
  const gap=110+Math.floor(rand(2)*(40+challenge*55));
  const y=Math.max(340,Math.min(500,lastPlatform.baseY+Math.round((rand(3)-.5)*100)));
  const p={id,x:lastPlatform.baseX+lastPlatform.w+gap,y,w,kind:id%3,baseX:0,baseY:y,dx:0,dy:0};p.baseX=p.x;
  if(id>7&&!rest&&id%5===0){p.moveY=14;p.rate=.8;p.moving=true}
  endlessPlatforms.push(p);
  endlessStars.push({x:p.x+w*.5,y:y-55,got:false,platform:p,heal:rest&&difficulty==='easy'});
  if(id>2&&!rest&&id%3===0){
   const kind=endlessWorld==='garden'?(id%2?'goose':'gnome'):endlessWorld==='jungle'?'bat':'rival';
   const h=kind==='goose'?65:kind==='gnome'?88:kind==='bat'?28:112;
   endlessRivals.push({platform:p,x:p.x+w*.55,y:y-h,w:kind==='bat'?46:48,h,alive:true,dir:-1,face:-1,speed:45+challenge*35,stunned:0,type:0,kind,tell:0,charge:0,cooldown:2,phase:rand(9)*6,rate:1+challenge*.4,range:Math.min(60,w*.25)});
  }
 }
 // Keep memory and drawing cost bounded as the route grows.
 let removed=0;
 while(endlessPlatforms.length>2&&endlessPlatforms[0].x+endlessPlatforms[0].w<camera-450){endlessPlatforms.shift();removed++}
 if(player.platform>=0)player.platform-=removed;
 endlessRivals=endlessRivals.filter(e=>e.alive&&e.platform.x+e.platform.w>=camera-450);
 endlessStars=endlessStars.filter(s=>!s.got&&s.x>=camera-450);
}
function startEndless(){
 mainMenu();mode='endless';stage.classList.add('endless');if(endlessWorld!=='city')stage.classList.add(endlessWorld);$('intro').hidden=true;
 $('hud').hidden=false;$('play-tools').hidden=false;$('endless-stats').hidden=false;$('dash').hidden=false;
 endlessSeed=Math.floor(Math.random()*100000);endlessNext=0;endlessFarthest=80;endlessBonus=0;endlessScore=0;endlessHudScore=-1;
 endlessShots=[];endlessDrops=Array.from({length:8},()=>({state:'idle'}));endlessDropNext=2.5;
 endlessPlatforms=[{id:0,x:-100,y:500,w:600,kind:0,baseX:-100,baseY:500,dx:0,dy:0}];endlessRivals=[];endlessStars=[];
 Object.assign(player,{x:80,y:430,vx:0,vy:0,onGround:true,platform:0,health:maxHealth(),jumps:0,coyote:.1,face:1,walk:0,invincible:0,dashTime:0,dashCooldown:0,controlLock:0,shake:0,squash:0});
 $('chapter').innerHTML='<small>ENDLESS / '+(endlessCharacter==='pink-pepe'?'PINK PEPE':'PEPE')+'</small>'+endlessWorlds[endlessWorld].name;
 $('footer-right').textContent='STARS +25 · RIVALS +50';$('pause-copy').textContent='Your run is paused.';
 updateHealth();extendEndless();updateEndlessScore();audioWake();$('pause').focus({preventScroll:true});
}
function updateEndlessScore(){
 endlessScore=Math.floor(Math.max(0,endlessFarthest-80)/10)+endlessBonus;
 if(endlessScore===endlessHudScore)return;endlessHudScore=endlessScore;
 $('endless-score').textContent=String(endlessScore);$('endless-best').textContent=String(Math.max(endlessBest,endlessScore));
}
function finishEndless(){
 if(mode!=='endless')return;
 updateEndlessScore();const record=endlessScore>endlessBest;endlessBest=Math.max(endlessBest,endlessScore);
 try{localStorage.setItem(endlessBestKey(),String(endlessBest))}catch{}
 mode='runover';paused=false;left=right=jumpQueued=dashQueued=false;
 $('hud').hidden=true;$('play-tools').hidden=true;$('paused').hidden=true;$('run-over').hidden=false;
 $('run-score').textContent=String(endlessScore);$('run-best').textContent=String(endlessBest);
 $('run-message').textContent=endlessWorlds[endlessWorld].name+' · '+(record?'A new personal best.':'There’s always another run.');
 $('run-retry').focus({preventScroll:true});
}
function hurtEndless(direction){
 if(player.invincible>0||mode!=='endless')return;
 player.health=Math.max(0,player.health-1);updateHealth();player.invincible=1.8;player.shake=.2;player.vx=direction*200;player.vy=-240;player.controlLock=.2;player.onGround=false;
 tone(140,.12,.04,'triangle');if(player.health<=0)finishEndless();
}
function endlessPhysics(dt){
 if(mode!=='endless'||paused)return;
 extendEndless();const prevFoot=stepPlatformPlayer(dt,endlessPlatforms,Infinity);
 player.x=Math.max(camera-40,player.x);
 if(player.y>850){finishEndless();return}
 if(endlessWorld==='garden')updateGardenEnemies(dt,prevFoot,true);
 else for(const e of endlessRivals){
  if(!e.alive)continue;const p=e.platform;e.y=p.y-e.h;e.stunned=Math.max(0,e.stunned-dt);
  if(e.kind==='bat'){e.x=p.x+p.w/2+Math.sin(time*e.rate+e.phase)*e.range-e.w/2;e.y=p.y-115+Math.sin(time*.85+e.phase)*23}
  else if(e.stunned<=0){e.x+=e.dir*e.speed*dt;if(e.x<p.x+8){e.x=p.x+8;e.dir=1}if(e.x+e.w>p.x+p.w-8){e.x=p.x+p.w-8-e.w;e.dir=-1}e.face=e.dir}
  if(player.x+player.w-5<=e.x+3||player.x+5>=e.x+e.w-3||player.y+player.h<=e.y+4||player.y>=e.y+e.h)continue;
  if(player.vy>40&&prevFoot<=e.y+26){e.alive=false;player.vy=-430;player.jumps=1;player.onGround=false;endlessBonus+=50;emit(e.x+24,e.y,12,'star','#f1ce8d');chime([294,440],.06)}
  else if(player.dashTime>0)e.stunned=1.4;
  else if(e.stunned<=0)hurtEndless(player.x<e.x?-1:1);
 }
 if(mode!=='endless')return;
 if(endlessWorld==='jungle')updateEndlessDrops(dt);
 if(mode!=='endless')return;
 for(const s of endlessStars){s.y=s.platform.y-55;if(!s.got&&Math.hypot(player.x+20-s.x,player.y+35-s.y)<40){s.got=true;endlessBonus+=25;if(s.heal){player.health=Math.min(maxHealth(),player.health+1);updateHealth()}emit(s.x,s.y,8,'star','#f0cf91');tone(740,.1,.02)}}
 endlessFarthest=Math.max(endlessFarthest,player.x);updateEndlessScore();
 const desired=Math.max(0,endlessFarthest-viewW*.32);camera+=(desired-camera)*Math.min(1,dt*5.5);
}
function updateEndlessDrops(dt){
 for(const h of endlessDrops){
  if(h.state==='idle')continue;
  const p=h.platform,ground=p?p.y:760;
  if(h.x<camera-100){h.state='idle';continue}
  if(h.state==='warning'){h.timer-=dt;if(h.timer<=0)h.state='falling'}
  else if(h.state==='falling'){
   const oldY=h.y;h.vy+=1100*dt;h.y+=h.vy*dt;
   if(player.x+player.w-5>h.x-24&&player.x+5<h.x+24&&player.y+player.h>oldY-10&&player.y<h.y+10)hurtEndless(0);
   if(h.y>=ground-8){if(!p)h.state='idle';else{h.y=ground-8;h.state='splat';h.timer=2}}
  }else{
   h.timer-=dt;h.x+=p.dx||0;h.y=p.y-8;
   if(player.x+player.w-5>h.x-25&&player.x+5<h.x+25&&player.y+player.h>h.y-11&&player.y<h.y+11)hurtEndless(0);
   if(h.timer<=0)h.state='idle';
  }
 }
 endlessDropNext-=dt;
 if(endlessDropNext>0||player.x<400||mode!=='endless')return;
 endlessDropNext=1.3+Math.random()*.7;
 const h=endlessDrops.find(h=>h.state==='idle');if(!h)return;
 for(let attempt=0;attempt<10;attempt++){
  const x=player.x+player.w+80+Math.random()*320;
  const p=endlessPlatforms.find(p=>x>=p.x-25&&x<=p.x+p.w+25);
  if(p&&p.id%7===0)continue;
  if(endlessDrops.some(other=>other.state!=='idle'&&Math.abs(other.x-x)<70))continue;
  const landing=p&&x>p.x+18&&x<p.x+p.w-18?p:null;
  Object.assign(h,{platform:landing,plat:-1,state:'warning',timer:1.1,x,y:Math.min(player.y-230,(landing?landing.y:510)-290),vy:0});break;
 }
}
function drawEndless(){
 if(endlessWorld==='garden')drawGarden(true);else if(endlessWorld==='jungle')drawJungle(true);else drawBackground();
 ctx.save();ctx.scale(scale,scale);ctx.translate(-camera,worldOffsetY());
 if(endlessWorld==='city')for(const p of endlessPlatforms)if(p.x+p.w>camera-80&&p.x<camera+viewW+100)island(p);
 for(const s of endlessStars){if(s.got||s.x<camera-30||s.x>camera+viewW+30)continue;const y=s.y+Math.sin(time*2+s.x)*4;if(s.heal)heart(s.x,y,.9,'#f294b2');else star(s.x,y,13,'#ffe0a4',time*.3)}
 for(const e of endlessRivals)if(e.x+60>camera-80&&e.x<camera+viewW+80){if(endlessWorld==='garden')drawGardenEnemy(e);else if(endlessWorld==='jungle')drawJungleBat(e);else drawEnemy(e,time)}
 for(const a of endlessShots){ellipse(a.x,a.y,8,10,'#c49a64','#624a37',2);roundRect(a.x-10,a.y-7,20,7,3,'#836347')}
 if(endlessWorld==='jungle')drawJungleStorm(endlessDrops,endlessPlatforms);
 ctx.globalAlpha=player.invincible>0&&Math.floor(player.invincible*12)%2===0?.35:1;
 if(endlessCharacter==='pink-pepe')drawPinkPepeRunning(player.x+20,player.y+70,.7,player);
 else drawPepe(player.x+20,player.y+70,.89,player.face,player.walk,!player.onGround,false,Math.abs(player.vx)>8);
 ctx.globalAlpha=1;for(const p of particles){ctx.globalAlpha=p.life/p.max;star(p.x,p.y,p.size,p.color,p.life)}ctx.globalAlpha=1;ctx.restore();
}
for(const world of Object.keys(endlessWorlds))$('endless-world-'+world).addEventListener('click',()=>selectEndlessWorld(world));
$('endless-menu').addEventListener('click',openCharacters);
$('choose-pepe').addEventListener('click',()=>selectCharacter('pepe'));
$('choose-pink-pepe').addEventListener('click',()=>selectCharacter('pink-pepe'));
$('endless-start').addEventListener('click',startEndless);
$('character-back').addEventListener('click',mainMenu);
$('pause-menu').addEventListener('click',mainMenu);
$('letter-menu').addEventListener('click',mainMenu);
$('run-menu').addEventListener('click',mainMenu);
$('run-retry').addEventListener('click',startEndless);
$('run-character').addEventListener('click',openCharacters);

// The third chapter ends at a quiet wooden cabin.
let levelTwoCleared=false,wakeElapsed=0,jungleCheckpoint=0,jungleFalls=0,cabinElapsed=0;
const jungleExtension=9317,jungleLength=13600+jungleExtension,jungleFinishX=jungleLength-210,jungleCabinX=jungleLength-105;
let jungleChapter=-1;
const junglePlatforms=[
 {x:-100,y:500,w:540},{x:555,y:455,w:175},{x:845,y:385,w:185},
 {x:1145,y:465,w:330},{x:1600,y:400,w:180},{x:1910,y:340,w:155,moveY:24,rate:.85},
 {x:2220,y:420,w:340},{x:2680,y:365,w:180},{x:2980,y:440,w:190},
 {x:3290,y:385,w:155,moveX:24,rate:.85},{x:3600,y:460,w:330},
 {x:4060,y:400,w:150},{x:4365,y:330,w:160,moveX:22,rate:.8},{x:4675,y:415,w:350},
 {x:5180,y:365,w:145},{x:5490,y:440,w:150,moveY:26,rate:.9},{x:5820,y:365,w:145},
 {x:6135,y:450,w:350},{x:6640,y:390,w:150,moveX:24,rate:.75},{x:6960,y:320,w:150},
 {x:7280,y:400,w:155,moveY:22,rate:.85},{x:7600,y:465,w:350},
 {x:8100,y:390,w:145},{x:8410,y:325,w:155,moveX:22,rate:.8},{x:8735,y:400,w:150},
 {x:9050,y:460,w:350},{x:9555,y:400,w:170},{x:9875,y:440,w:350},
 {x:10380,y:370,w:155,moveY:22,rate:.9},{x:10700,y:425,w:180},
 {x:11050,y:350,w:160,moveX:20,rate:.9},{x:11400,y:455,w:350},
 {x:11910,y:390,w:170},{x:12240,y:325,w:155,moveY:22,rate:.85},
 {x:12580,y:420,w:210},{"x":12980,"y":435,"w":184,"kind":0},
{"x":13299,"y":365,"w":164,"kind":1,"moveY":18,"rate":0.85,"moving":true},
{"x":13613,"y":415,"w":194,"kind":0},
{"x":13962,"y":475,"w":320,"kind":1},
{"x":14427,"y":400,"w":164,"kind":0},
{"x":14726,"y":335,"w":194,"kind":1},
{"x":15070,"y":410,"w":184,"kind":0,"moveY":18,"rate":0.85,"moving":true},
{"x":15409,"y":465,"w":320,"kind":1},
{"x":15874,"y":435,"w":194,"kind":0},
{"x":16203,"y":365,"w":184,"kind":1},
{"x":16537,"y":415,"w":164,"kind":0},
{"x":16856,"y":475,"w":320,"kind":1},
{"x":17321,"y":400,"w":184,"kind":0},
{"x":17640,"y":335,"w":164,"kind":1},
{"x":17954,"y":410,"w":194,"kind":0},
{"x":18303,"y":465,"w":320,"kind":1},
{"x":18768,"y":435,"w":164,"kind":0,"moveY":18,"rate":0.85,"moving":true},
{"x":19067,"y":365,"w":194,"kind":1},
{"x":19411,"y":415,"w":184,"kind":0},
{"x":19750,"y":475,"w":320,"kind":1},
{"x":20215,"y":400,"w":194,"kind":0},
{"x":20544,"y":335,"w":184,"kind":1,"moveY":18,"rate":0.85,"moving":true},
{"x":20878,"y":410,"w":164,"kind":0},
{"x":21197,"y":465,"w":320,"kind":1},
{"x":21662,"y":435,"w":184,"kind":0},
{"x":21981,"y":365,"w":166,"kind":1},
{x:12980+jungleExtension,y:500,w:620}
].map(p=>({...p,baseX:p.x,baseY:p.y,dx:0,dy:0}));
const jungleCheckpoints=[{x:80,platform:0},{x:1180,platform:3},{x:2255,platform:6},{x:3635,platform:10},{x:4710,platform:13},{x:6170,platform:17},{x:7635,platform:21},{x:9085,platform:25},{x:9910,platform:27},{x:11435,platform:31},{x:13997,platform:38},{x:15444,platform:42},{x:16891,platform:46},{x:18338,platform:50},{x:19785,platform:54},{x:21232,platform:58}];
const jungleCargo=[{name:'Chair',plat:2,got:false},{name:'Rope',plat:43,got:false}];
const jungleThorns=[{plat:3,offset:175,w:56},{plat:6,offset:190,w:66},{plat:10,offset:185,w:68},{plat:13,offset:180,w:74},{plat:17,offset:185,w:78},{plat:21,offset:180,w:74},{plat:25,offset:190,w:80},{plat:27,offset:190,w:70},{plat:31,offset:180,w:76},{plat:38,offset:190,w:68},{plat:42,offset:190,w:68},{plat:46,offset:190,w:68},{plat:50,offset:190,w:68},{plat:54,offset:190,w:68},{plat:58,offset:190,w:68}];
const jungleBats=[5,9,13,17,21,25,29,33,36,40,44,48,52,56,60].map((plat,i)=>({plat,phase:i*1.7,x:0,y:0,w:46,h:28,stunned:0,range:plat<10?48:70,rate:1+Math.min(i,7)*.08}));
// Time-based random showers follow the route, independent of trees or fixed zones.
const jungleStorm=Array.from({length:8},()=>({plat:-1,state:'idle',x:0,y:0,vy:0,timer:0}));
let stormGrace=2.5,stormNext=0;
function resetJungleStorm(){stormGrace=2.5;stormNext=0;for(const h of jungleStorm)h.state='idle'}
function spawnJungleDrop(){
 const h=jungleStorm.find(h=>h.state==='idle');if(!h||player.x<400||player.x>jungleFinishX-220)return;
 for(let attempt=0;attempt<10;attempt++){
  // Always choose a new landing point ahead of Pepe; it stays fixed after warning.
  const x=player.x+player.w+80+Math.random()*400;
  if(x<420||x>junglePlatforms.at(-1).x-40||jungleCheckpoints.some(cp=>Math.abs(x-cp.x)<115)||jungleStorm.some(other=>other.state!=='idle'&&Math.abs(other.x-x)<70))continue;
  const plat=junglePlatforms.findIndex(p=>x>=p.x+18&&x<=p.x+p.w-18);
  Object.assign(h,{plat,state:'warning',timer:1.05,x,y:Math.min(player.y-230,(plat<0?510:junglePlatforms[plat].y)-290),vy:0});return;
 }
}
function updateJungleStorm(dt){
 if(mode!=='jungle'||paused)return;
 stormGrace=Math.max(0,stormGrace-dt);
 for(const h of jungleStorm){
  if(h.state==='idle')continue;
  const p=junglePlatforms[h.plat],ground=p&&h.x>=p.x&&h.x<=p.x+p.w?p.y:760;
  if(h.state==='warning'){
   h.timer-=dt;if(h.timer<=0)h.state='falling';
  }else if(h.state==='falling'){
   const oldY=h.y;h.vy+=1100*dt;h.y+=h.vy*dt;
   if(player.x+player.w-5>h.x-24&&player.x+5<h.x+24&&player.y+player.h>oldY-10&&player.y<h.y+10)hurtJungle();
   if(h.state!=='falling')continue;
   if(h.y>=ground-8){if(ground===760){h.state='idle';continue}h.y=ground-8;h.state='splat';h.timer=2;emit(h.x,h.y,8,'dot','#ae8c59')}
  }else if(h.state==='splat'){
   h.timer-=dt;if(p){h.x+=p.dx||0;h.y=p.y-8}
   if(player.x+player.w-5>h.x-25&&player.x+5<h.x+25&&player.y+player.h>h.y-11&&player.y<h.y+11)hurtJungle();
   if(h.timer<=0)h.state='idle';
  }
 }
 if(stormGrace)return;
 stormNext-=dt;
 if(stormNext<=0){spawnJungleDrop();stormNext=.95+Math.random()*.65}
}
function drawJungleStorm(drops=jungleStorm,route=junglePlatforms){
 for(const h of drops){
  if(h.state==='idle')continue;
  const p=h.platform||route[h.plat],landingY=p?p.y:Math.min(650,player.y+player.h+120);if(h.x<camera-100||h.x>camera+viewW+100)continue;
  if(h.state==='warning'){
   ellipse(h.x,landingY-5,34,7,'#ffce7977');
   ctx.fillStyle='#ffe5ab';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillText('INCOMING ↓',h.x,landingY-51);
   // The culprit flaps above the marked landing spot before releasing it.
   const flap=Math.sin(time*13)*12;
   ellipse(h.x,h.y-25,19,12,'#aab6bb','#27393f',2);
   path('M'+(h.x-3)+' '+(h.y-29)+'q-25 '+(-28+flap)+'-38 -8',null,'#d3dadd',7);
   path('M'+(h.x+3)+' '+(h.y-29)+'q25 '+(-28-flap)+'38 -8',null,'#d3dadd',7);
   path('M'+(h.x+17)+' '+(h.y-27)+'l14 4-14 5Z','#d8b26a');ellipse(h.x+11,h.y-29,2.5,2.5,'#182528');
  }else{
   ctx.save();ctx.translate(h.x,h.y);
   if(h.state==='splat'){
    ctx.globalAlpha=Math.min(1,h.timer/.5);ellipse(0,2,32,8,'#ad8955','#543c2e',2);ellipse(-27,5,8,3,'#ad8955');ellipse(29,-3,7,4,'#ad8955');ellipse(3,-1,15,3,'#d2b581');
   }else{
    ellipse(0,5,24,11,'#987142','#503a2b',2);ellipse(0,-5,18,10,'#ae8752','#503a2b',2);ellipse(0,-15,11,9,'#c19a62','#503a2b',2);
    path('M-7-19Q8-24 3-32Q20-21 8-14Z','#c19a62','#503a2b',2);
    line(-10,-5,5,-7,'#dcc391',2);line(-14,6,11,4,'#cdb17b',2);
   }ctx.restore();
  }
 }
}
function updateJungleBats(dt,prevFoot){
 for(const b of jungleBats){
  const p=junglePlatforms[b.plat];b.stunned=Math.max(0,b.stunned-dt);
  b.x=p.x+p.w/2+Math.sin(time*b.rate+b.phase)*b.range-b.w/2;
  b.y=p.y-125+Math.sin(time*.85+b.phase)*23;
  if(b.stunned>0)continue;
  if(player.x+player.w-6<=b.x||player.x+6>=b.x+b.w||player.y+player.h<=b.y||player.y>=b.y+b.h)continue;
  if(player.dashTime>0){b.stunned=2.5;emit(b.x+23,b.y+14,8,'star','#d5c5d7')}
  else if(player.vy>40&&prevFoot<=b.y+16){b.stunned=3;player.vy=-400;player.onGround=false;player.platform=-1;player.jumps=1;emit(b.x+23,b.y,8,'star','#d5c5d7')}
  else hurtJungle();
 }
}
function drawJungleBat(b){
 if(b.x+b.w<camera-90||b.x>camera+viewW+90)return;
 ctx.save();ctx.translate(b.x+23,b.y+14);const flap=b.stunned?3:Math.sin(time*11+b.phase)*12;
 ctx.globalAlpha=b.stunned?.5:1;
 path('M-6 2Q-19 '+(-21+flap)+'-39 '+(-9+flap)+'L-29 7L-18 4L-10 12Z','#786d90','#b7aac6',1.5);
 path('M6 2Q19 '+(-21+flap)+' 39 '+(-9+flap)+'L29 7L18 4L10 12Z','#786d90','#b7aac6',1.5);
 ellipse(0,3,10,13,'#554b6a','#c4b1ce',1.5);path('M-9-5L-9-19L-1-10L8-19L9-5Z','#665674','#c4b1ce',1.5);
 ellipse(-4,-2,2,2,'#f6dca5');ellipse(4,-2,2,2,'#f6dca5');
 if(b.stunned){star(-13,-22,4,'#e7d6ad',time);star(14,-21,4,'#e7d6ad',-time)}ctx.restore();
}
function playDreamPop(){
 if(!soundOn)return;
 const effect=$('jungle-intro-sound');effect.currentTime=0;effect.volume=.85;
 effect.play().catch(()=>{});
}
function beginWake(){
 if(mode!=='dinner'||!levelTwoCleared||!levelOneCleared||!accepted)return;
 mode='waking';paused=false;wakeElapsed=0;resetQuotes();left=right=jumpQueued=dashQueued=false;
 $('letter-overlay').hidden=true;$('hud').hidden=true;$('play-tools').hidden=true;soundtrack.pause();
 $('wake-scene').hidden=false;$('wake-title').textContent='…';$('wake-copy').textContent='';
 $('footer-right').textContent='THE DREAM ENDS.';
}
function startJungle(){
 if(mode!=='waking'||!levelTwoCleared||!levelOneCleared||!accepted)return;
 mode='jungle';paused=false;camera=0;jungleCheckpoint=0;jungleFalls=0;jungleChapter=-1;particles=[];resetQuotes();
 jungleCargo.forEach(c=>c.got=false);junglePlatforms.forEach(p=>{p.x=p.baseX;p.y=p.baseY;p.dx=p.dy=0});
 stage.classList.remove('garden');stage.classList.add('jungle');$('wake-scene').hidden=true;
 $('jungle-cargo').hidden=false;$('hud').hidden=false;$('play-tools').hidden=false;$('pause-copy').textContent='Your checkpoint is saved.';
 $('chapter').innerHTML='<small>LEVEL 3 / AWAKE</small>Find the wooden cabin.';
 $('footer-right').textContent='A CHAIR, SOME ROPE, AND A PLACE TO REST.';
 resetJungle(false);updateJungleCargo();jungleAudio.currentTime=0;audioWake();playDreamPop();$('pause').focus({preventScroll:true});
}
function resetJungle(fell=true){
 resetJungleStorm();
 if(fell)jungleFalls++;jungleBats.forEach(b=>b.stunned=0);
 const cp=jungleCheckpoints[jungleCheckpoint],p=junglePlatforms[cp.platform];
 Object.assign(player,{x:cp.x,y:p.y-player.h,vx:0,vy:0,health:maxHealth(),onGround:true,platform:cp.platform,jumps:0,coyote:.1,face:1,walk:0,invincible:fell?1.8:0,dashTime:0,dashCooldown:0,controlLock:0,shake:0,squash:0});
 left=right=jumpQueued=dashQueued=false;camera=Math.max(0,Math.min(jungleLength-viewW,cp.x-viewW*.32));updateHealth();
 if(fell)toast('Back at the lantern.',2,2);
}
function updateJungleCargo(){
 for(let i=0;i<2;i++){$('cargo-'+i).textContent=(jungleCargo[i].got?'✓ ':'○ ')+jungleCargo[i].name;$('cargo-'+i).classList.toggle('collected',jungleCargo[i].got)}
}
function hurtJungle(){
 if(player.invincible>0||mode!=='jungle')return;
 player.health=Math.max(0,player.health-1);updateHealth();player.invincible=1.6;player.vy=-280;player.vx=-player.face*220;player.onGround=false;player.platform=-1;player.controlLock=.25;player.dashTime=0;
 tone(120,.12,.035,'triangle');if(player.health<=0)resetJungle();
}
function finishJungle(){
 if(mode!=='jungle'||!levelTwoCleared||!accepted||!jungleCargo.every(c=>c.got)||!player.onGround||player.platform!==junglePlatforms.length-1||player.x<jungleFinishX)return;
 mode='cabin';resetQuotes();$('cabin-thought').hidden=false;cabinElapsed=0;left=right=jumpQueued=dashQueued=false;$('hud').hidden=true;$('play-tools').hidden=true;
 $('toast').classList.remove('show');toastUntil=0;camera=Math.max(0,jungleCabinX-viewW*.6);
 $('footer-right').textContent='INSIDE, AT LAST. THE RAIN CAN WAIT.';$('announcement').textContent='Pepe enters the cabin and closes the door. The lights go out.';
}
function junglePhysics(dt){
 if(paused||document.hidden)return;
 if(mode==='waking'){
  wakeElapsed+=dt;
  if(wakeElapsed>.65){$('wake-title').textContent='Oh.';$('wake-copy').textContent='That was a dream.'}
  if(wakeElapsed>3.1)startJungle();return;
 }
 if(mode==='cabin'){
  cabinElapsed+=dt;
  if(cabinElapsed>3.5&&$('cabin-ending').hidden){$('cabin-thought').hidden=true;$('cabin-ending').hidden=false;$('cabin-menu').focus({preventScroll:true})}
  return;
 }
 if(mode!=='jungle')return;
 const prevFoot=stepPlatformPlayer(dt,junglePlatforms,jungleLength);
 if(player.y>850){resetJungle();return}
 for(let i=1;i<jungleCheckpoints.length;i++){const cp=jungleCheckpoints[i];if(i>jungleCheckpoint&&player.onGround&&player.platform===cp.platform&&player.x>=cp.x-15){jungleCheckpoint=i;player.health=maxHealth();updateHealth();chime([220,330],.08)}}
 for(const t of jungleThorns){const p=junglePlatforms[t.plat],x=p.x+t.offset;if(player.x+player.w-6>x&&player.x+6<x+t.w&&player.y+player.h>p.y-23&&player.y<p.y)hurtJungle()}
 updateJungleBats(dt,prevFoot);updateJungleStorm(dt);
 const zone=player.x<5554?0:player.x<10994?1:player.x<16604?2:player.x<21800?3:4;
 if(zone!==jungleChapter){jungleChapter=zone;$('chapter').innerHTML='<small>LEVEL 3 / '+['THE UNDERGROWTH','THE DEEP GROVE','THE NIGHT CROSSING','THE LONG WAY HOME','THE CLEARING'][zone]+'</small>'+['Find the wooden cabin.','Keep moving through the grove.','Cross the moving ledges.','Of course there is more forest.','A light through the trees.'][zone]}
 for(const c of jungleCargo){const p=junglePlatforms[c.plat];if(!c.got&&Math.hypot(player.x+20-(p.x+p.w/2),player.y+35-(p.y-45))<58){c.got=true;pickupNarration.push(c.name==='Chair'?'Finally, somewhere to sit.':'Might need this for repairs.');quoteGap=0;updateJungleCargo();emit(p.x+p.w/2,p.y-45,10,'star','#d9cf9d');chime([330,440],.1)}}
 const desired=Math.max(0,Math.min(Math.max(0,jungleLength-viewW),player.x-viewW*.32));camera+=(desired-camera)*Math.min(1,dt*5.5);
 if(player.x>jungleFinishX&&player.onGround){
  if(jungleCargo.every(c=>c.got))finishJungle();
  else if(!toastUntil||time>toastUntil)toast('Bring the chair and rope to the cabin.',3,2);
 }
}
function drawCargoChair(x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 roundRect(-15,-44,6,45,2,'#99765a','#302c30',1.5);roundRect(10,-44,6,45,2,'#99765a','#302c30',1.5);
 roundRect(-16,-43,33,17,3,'#b3916a','#302c30',1.5);roundRect(-19,-22,42,7,2,'#b3916a','#302c30',1.5);
 line(-13,-15,-17,3,'#99765a',5);line(17,-15,23,3,'#99765a',5);ctx.restore();
}
function drawCargoRope(x,y){
 // Rope stays coiled as an ordinary cabin supply.
 for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(x,y,18-i*4,12-i*2,0,0,TAU);ctx.strokeStyle='#dec79d';ctx.lineWidth=2.5;ctx.stroke()}
 path('M'+(x+18)+' '+y+'q12 6 4 15',null,'#dec79d',3);
}
function jungleTree(x,y,s=1,tint='#18312f'){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 path('M-21 0Q-9-115-21-280L-3-324L13-289Q8-140 25 0Z',tint,null);
 path('M-3-185Q-64-216-81-279M4-236Q52-258 68-314',null,tint,13);
 for(let j=0;j<5;j++)ellipse(-70+j*35,-280-Math.sin(j)*48,60,31,tint);
 ctx.restore();
}
function drawJungleLantern(x,y){
 const glow=ctx.createRadialGradient(x,y-21,2,x,y-21,52);glow.addColorStop(0,'#d6c08033');glow.addColorStop(1,'#d6c08000');ctx.fillStyle=glow;ctx.fillRect(x-55,y-76,110,110);
 roundRect(x-8,y-35,16,27,3,'#b3a679','#29332d',2);roundRect(x-5,y-29,10,14,2,'#f7dda1');line(x-11,y-8,x+11,y-8,'#596d5b',3);
}
function drawForestCabin(arrived){
 const x=jungleCabinX,y=500,enter=arrived?Math.min(1,cabinElapsed/2):0,dark=arrived&&enter===1;
 ctx.save();ctx.translate(x,y);
 if(!dark){const glow=ctx.createRadialGradient(30,-80,8,30,-80,200);glow.addColorStop(0,'#e9b35b24');glow.addColorStop(1,'#e9b35b00');ctx.fillStyle=glow;ctx.fillRect(-180,-280,400,380);}
 // Timber walls, shingled roof and a sheltered porch.
 roundRect(-137,-166,274,166,3,'#5e4738','#172727',3);
 for(let yy=-157;yy<0;yy+=17){line(-136,yy,136,yy,'#302e29',2);line(-130,yy+3,130,yy+3,'#836348',1)}
 roundRect(78,-252,28,73,2,'#3b4140','#192a2b',2);
 path('M-158-161L-12-252L156-161Z','#273536','#111e22',4);
 for(let j=0;j<5;j++)line(-130+j*25,-175-j*14,133-j*25,-175-j*14,'#52615b',2);
 line(-158,-161,-12,-252,'#6d7667',4);line(-12,-252,156,-161,'#6d7667',4);
 roundRect(-93,-106,63,106,2,'#171f21','#b18b55',4);
 // The open doorway glows during entry, then closes.
 if(!arrived||enter<1)roundRect(-89,-102,55,102,1,'#c18b49');
 else{roundRect(-89,-102,55,102,1,'#4e3b2f');for(let j=0;j<4;j++)line(-84+j*13,-98,-84+j*13,-3,'#70513c',1);ellipse(-43,-49,3,3,'#c5a16b')}
 roundRect(16,-133,97,94,3,dark?'#101b21':'#e5b866','#302b25',5);
 line(64,-132,64,-39,'#554230',4);line(17,-86,111,-86,'#554230',4);roundRect(9,-38,112,7,2,'#8a6d4a');
 roundRect(-157,0,315,14,2,'#897552','#263b34',2);line(-150,7,150,7,'#c3a375',2);
 if(!dark)drawJungleLantern(-119,-115);else roundRect(-127,-150,16,27,3,'#26332f','#172323',2);
 if(arrived&&enter<1){const from=player.x+20-x,px=from+(-62-from)*enter;ctx.save();ctx.globalAlpha=1-Math.max(0,(enter-.75)*4);drawPepe(px,0,.89,1,cabinElapsed*5,false,false,true);ctx.restore()}
 ctx.restore();
}
function drawJungle(endless=false){
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#08131e');sky.addColorStop(.6,'#1d353c');sky.addColorStop(1,'#111f29');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.scale(scale,scale);
 ellipse(viewW*.7-camera*.01,100,34,34,'#8b9ea333');
 for(let layer=0;layer<2;layer++){
  const unit=layer?210:150,par=layer?.2:.08,first=Math.floor(camera*par/unit)-2;
  for(let i=first;i<first+Math.ceil(viewW/unit)+5;i++)jungleTree(i*unit-camera*par+seeded(i+71)*60,viewH*.89+seeded(i+42)*30,(layer?1.12:.78)+seeded(i+53)*.3,layer?'#142b30':'#244048');
 }
 ctx.translate(-camera,worldOffsetY());
 const water=ctx.createLinearGradient(0,510,0,900);water.addColorStop(0,'#264752');water.addColorStop(1,'#0b1c2b');ctx.fillStyle=water;ctx.fillRect(camera-30,510,viewW+60,750);
 for(let i=0;i<18;i++){const x=camera+i*80;line(x,545+(i%4)*27+Math.sin(time+i)*3,x+42,545+(i%4)*27+Math.sin(time+i)*3,'#79939022',2)}
 for(const p of (endless?endlessPlatforms:junglePlatforms)){
  if(p.x+p.w<camera-100||p.x>camera+viewW+100)continue;
  const dock=!endless&&p===junglePlatforms.at(-1);
  if(dock){roundRect(p.x,p.y,p.w,15,2,'#7f7257','#273c37',2);for(let xx=p.x+10;xx<p.x+p.w;xx+=25)line(xx,p.y+1,xx,p.y+14,'#373d32',2);for(let xx=p.x+20;xx<p.x+p.w-10;xx+=100)roundRect(xx,p.y+15,11,180,1,'#494a3b')}
  else{
   roundRect(p.x,p.y,p.w,390,4,'#34413b','#182d29',2);roundRect(p.x-3,p.y-7,p.w+6,12,4,'#6b8c79','#263e32',2);line(p.x,p.y-7,p.x+p.w,p.y-7,'#b0c6a1',2);
   for(let j=0;j<4;j++)line(p.x+12+j*p.w/4,p.y+18,p.x+5+j*p.w/4,p.y+50+j*7,'#26382e',3);
   if(p.w>300)jungleTree(p.x+p.w-65,p.y-6,.72,'#233d33');
   for(let j=18;j<p.w-15;j+=60){const x=p.x+j;for(let k=-2;k<=2;k++){path('M'+x+' '+(p.y-7)+'q'+(k*5)+'-18 '+(k*11)+'-22',null,'#658b69',2);ellipse(x+k*7,p.y-20-Math.abs(k)*3,5,2,'#7b9a72')}line(x,p.y+7,x-3,p.y+29+seeded(j)*18,'#627754',2)}
   for(let j=0;j<3;j++){const x=p.x+28+j*(p.w-50)/3;ellipse(x,p.y+48+j*17,12,5,'#42554a');line(x-8,p.y+49+j*17,x+9,p.y+46+j*17,'#667261',1)}
  }
 }
 if(endless){ctx.restore();return}
 for(const t of jungleThorns){const p=junglePlatforms[t.plat],x=p.x+t.offset;for(let j=0;j<t.w;j+=12)path('M'+(x+j)+' '+p.y+'l4-25 8 25Z','#b0b89a','#30463a',1.5)}
 if(mode==='jungle'){jungleBats.forEach(drawJungleBat);drawJungleStorm()}
 for(const cp of jungleCheckpoints)if(cp.x>camera-60&&cp.x<camera+viewW+60)drawJungleLantern(cp.x,junglePlatforms[cp.platform].y);
 for(const c of jungleCargo){if(c.got)continue;const p=junglePlatforms[c.plat],x=p.x+p.w/2,y=p.y-42+Math.sin(time*2)*3;ellipse(x,y-14,34,34,'#d7cc9b19');if(c.name==='Chair')drawCargoChair(x,y+10,.85);else drawCargoRope(x,y-6);ctx.fillStyle='#f4e5c4';ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.fillText(c.name,x,y-45)}
 if(camera>jungleLength-viewW-500){drawForestCabin(mode==='cabin');ctx.fillStyle='#c5d2bd';ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.fillText('CABIN →',junglePlatforms.at(-1).x+50,440)}
 if(mode!=='cabin'){ctx.globalAlpha=player.invincible>0&&Math.floor(player.invincible*12)%2===0?.4:1;drawPepe(player.x+20,player.y+70,.89,player.face,player.walk,!player.onGround,false,Math.abs(player.vx)>8);ctx.globalAlpha=1}
 ctx.restore();
 for(let i=0;i<12;i++){const x=((seeded(i+19)*W-camera*.08)%W+W)%W,y=H*.35+seeded(i+93)*H*.4;ctx.globalAlpha=.18+(Math.sin(time+i)+1)*.12;ellipse(x,y,1.8,1.8,'#d8d5a0')}ctx.globalAlpha=1;
 // Sparse rain and ground mist preserve visibility of every landing edge.
 ctx.save();ctx.globalAlpha=.18;for(let i=0;i<35;i++){const x=seeded(i+720)*W,y=(seeded(i+440)*H+(reducedMotion?0:time*85))%H;line(x,y,x-3,y+11,'#bfd3cf',1)}ctx.restore();
}
$('diner-next').addEventListener('click',beginWake);
$('cabin-menu').addEventListener('click',mainMenu);
$('cabin-replay').addEventListener('click',start);

// Level Select is independent of Story Mode progression.
function openLevelSelect(){
 mainMenu();$('intro').inert=true;$('level-select').hidden=false;
 for(const n of [1,2,3]){
  const unlocked=true;
  $('select-level-'+n).disabled=!unlocked;
  $('level-state-'+n).textContent=unlocked?'PLAY ↗':'LOCKED';
 }
 $('level-note-2').textContent='The garden, the geese, the diner.';
 $('level-note-3').textContent='The long jungle route to the wooden cabin.';
 $('select-level-1').focus({preventScroll:true});
}
function startSelectedLevel(level){
 if(level===1){start();return}
 if(level!==2&&level!==3)return;
 // Initialize the selected chapter without changing normal Story Mode gates.
 mainMenu();$('intro').hidden=true;levelOneCleared=true;accepted=true;
 if(level===2){mode='letter';startGarden()}
 else{levelTwoCleared=true;mode='waking';startJungle()}
}
$('level-menu').addEventListener('click',openLevelSelect);
$('level-back').addEventListener('click',mainMenu);
for(const n of [1,2,3])$('select-level-'+n).addEventListener('click',()=>startSelectedLevel(n));

let selectedDate='drinks';const replies={drinks:'Coffee or tea sounds good. When are you free?',park:'A walk sounds good. When are you free?',surprise:'You pick. What did you have in mind?'};
document.querySelectorAll('.date-option').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.date;document.querySelectorAll('.date-option').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));$('reply-text').textContent=replies[selectedDate];$('copy-reply').textContent='Copy message';$('reply-status').innerHTML='Send it to me in chat. I can’t see what you pick here.'}));
$('copy-reply').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(replies[selectedDate]);$('copy-reply').textContent='Copied';$('reply-status').textContent='Copied. Paste it into our chat.'}catch{const sel=window.getSelection(),range=document.createRange();range.selectNodeContents($('reply-text'));sel.removeAllRanges();sel.addRange(range);$('reply-status').textContent='Copy the highlighted message and paste it into our chat.'}});
if(navigator.share){$('share-reply').hidden=false;$('share-reply').addEventListener('click',async()=>{try{await navigator.share({text:replies[selectedDate]})}catch(e){if(e.name!=='AbortError')$('reply-status').textContent='Use “Copy message” and paste it into our chat.'}})}
$('start').addEventListener('click',start);$('yes').addEventListener('click',yes);$('no').addEventListener('click',()=>{accepted=false;showLetterView('no')});$('back-letter').addEventListener('click',()=>showLetterView('ask'));$('replay-yes').addEventListener('click',start);$('replay-no').addEventListener('click',start);$('pause').addEventListener('click',()=>togglePause());$('resume').addEventListener('click',()=>togglePause(false));
document.addEventListener('keydown',e=>{
 const modal=!$('level-select').hidden?$('level-select'):!$('cabin-ending').hidden?$('cabin-ending'):!$('character-select').hidden?$('character-select'):!$('run-over').hidden?$('run-over'):paused?$('paused'):(mode==='letter'||mode==='dinner')?$('letter-overlay'):null;
 if(e.code==='Escape'&&(!$('character-select').hidden||!$('level-select').hidden)){e.preventDefault();mainMenu();return}
 if(modal&&e.key==='Tab'){const buttons=[...modal.querySelectorAll('button')].filter(b=>b.offsetParent!==null);const first=buttons[0],last=buttons.at(-1);if(first&&e.shiftKey&&(document.activeElement===first||!buttons.includes(document.activeElement))){e.preventDefault();last.focus()}else if(first&&!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}return}
 if(e.code==='Escape'&&isGameplay()){e.preventDefault();togglePause();return}
 if(!isGameplay()||paused)return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW'].includes(e.code))e.preventDefault();
 if(e.code==='ArrowLeft'||e.code==='KeyA')left=true;if(e.code==='ArrowRight'||e.code==='KeyD')right=true;
 if(['ArrowUp','Space','KeyW'].includes(e.code)&&!e.repeat)jumpQueued=true;
 if(['ShiftLeft','ShiftRight','KeyX'].includes(e.code)&&!e.repeat){e.preventDefault();dashQueued=true;}
});
document.addEventListener('keyup',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')left=false;if(e.code==='ArrowRight'||e.code==='KeyD')right=false});
function bindControl(id,down,up){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('held');down()});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>{b.classList.remove('held');up()}))}
bindControl('left',()=>left=true,()=>left=false);bindControl('right',()=>right=true,()=>right=false);bindControl('jump',()=>jumpQueued=true,()=>{});bindControl('dash',()=>dashQueued=true,()=>{});
window.addEventListener('blur',()=>{left=right=jumpQueued=false;if(isGameplay()&&!paused)togglePause(true)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){left=right=jumpQueued=false;if(isGameplay()&&!paused)togglePause(true);if(audioCtx)audioCtx.suspend();soundtrack.pause()}else if(soundOn&&!paused)audioWake()});
let audioCtx=null,master=null,soundOn=true;
const gameplayAudio=$('soundtrack'),themeAudio=$('theme-soundtrack'),jungleAudio=$('jungle-soundtrack');
let soundtrack=themeAudio,audioRequest=0;
themeAudio.src='good-or-dont-be.m4a';themeAudio.preload='auto';themeAudio.load();
jungleAudio.src='jungle-theme.mp3';jungleAudio.preload='auto';jungleAudio.load();
gameplayAudio.volume=themeAudio.volume=jungleAudio.volume=.4;
$('difficulty').value=difficulty;
$('difficulty').addEventListener('change',()=>setDifficulty($('difficulty').value));
$('sound').setAttribute('aria-pressed','false');$('sound').setAttribute('aria-label','Play title music');$('sound-label').textContent='Tap for music';
$('sound-waves').setAttribute('d','M14 7q3 3 0 6M17 4q6 6 0 12');
function audioWake(){
 $('difficulty').disabled=mode!=='intro';$('difficulty').value=difficulty;
 const endlessScene=mode==='endless'||mode==='runover';
 const gardenMusic=endlessScene?endlessWorld==='garden':levelOneCleared&&accepted&&(mode==='garden'||mode==='dinner');const jungleMusic=['jungle','cabin'].includes(mode)||(endlessScene&&endlessWorld==='jungle');const trackFile=jungleMusic?'jungle-theme.mp3':mode==='intro'?'good-or-dont-be.m4a':gardenMusic?'lush-date-adventure.mp3':'rooftop-hops.mp3';
 const next=trackFile==='jungle-theme.mp3'?jungleAudio:trackFile==='good-or-dont-be.m4a'?themeAudio:gameplayAudio;
 if(soundtrack!==next){soundtrack.pause();soundtrack=next}
 if(soundtrack.getAttribute('src')!==trackFile){soundtrack.src=trackFile;soundtrack.load()}
 soundtrack.volume=mode==='letter'?.22:(mode==='garden'||mode==='dinner')?.38:.4;
 $('sound').title=jungleMusic?'Untitled — Level 3':mode==='intro'?'Good, or Don’t Be':gardenMusic?'Lush Date Adventure':'Rooftop Hops';
 if(!soundOn)return;
 try{if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();master=audioCtx.createGain();master.gain.value=.24;master.connect(audioCtx.destination)}if(audioCtx.state==='suspended')audioCtx.resume()}catch{}
 const playing=soundtrack,request=++audioRequest;
 $('sound-label').textContent='Loading music…';
 playing.play().then(()=>{if(request!==audioRequest||playing!==soundtrack||!soundOn||paused)return;$('sound-label').textContent='Music on';$('sound').setAttribute('aria-pressed','true');$('sound').setAttribute('aria-label','Turn music off')}).catch(()=>{if(request!==audioRequest||playing!==soundtrack||!soundOn)return;$('sound-label').textContent='Tap for music';$('sound').setAttribute('aria-pressed','false');$('sound').setAttribute('aria-label','Play music')});
}
// A real input gesture retries playback if the browser blocked the scene transition.
function retryMusic(e){if(e.target===$('sound')||$('sound').contains?.(e.target))return;if(soundOn&&!paused&&mode!=='waking'&&soundtrack.paused)audioWake()}
document.addEventListener('pointerdown',retryMusic);
document.addEventListener('keydown',retryMusic,{capture:true});
function tone(freq,duration=.3,volume=.05,type='sine',delay=0){
 if(!soundOn||!audioCtx||audioCtx.state!=='running')return;
 const o=audioCtx.createOscillator(),g=audioCtx.createGain(),at=audioCtx.currentTime+delay;o.type=type;o.frequency.value=freq;o.connect(g);g.connect(master);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.01);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.start(at);o.stop(at+duration+.03);
}
function chime(notes,step=.13){notes.forEach((n,i)=>tone(n,.4,.08,'sine',i*step))}
function music(){if(soundOn&&!soundtrack.paused){const target=!$('jungle-intro-sound').paused&&!$('jungle-intro-sound').ended?.1:mode==='letter'?.22:(mode==='garden'||mode==='dinner')?.38:.4;soundtrack.volume+=(target-soundtrack.volume)*.045}}
$('sound').addEventListener('click',()=>{
 if($('sound-label').textContent==='Tap for music'){soundOn=true;audioWake()}else{soundOn=!soundOn;if(soundOn)audioWake();else{soundtrack.pause();$('jungle-intro-sound').pause()}}
 if(master)master.gain.setTargetAtTime(soundOn?.24:0,audioCtx.currentTime,.08);
 $('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Turn music off':'Turn music on');$('sound-label').textContent=soundOn?'Music on':'Music off';$('sound-waves').setAttribute('d',soundOn?'M14 7q3 3 0 6M17 4q6 6 0 12':'m14 7 5 6m0-6-5 6');
});

function frame(stamp){
 const dt=Math.min((stamp-last)/1000||.016,1/30);last=stamp;if(!document.hidden&&!paused)time+=dt;
 physics(dt);gardenPhysics(dt);endlessPhysics(dt);junglePhysics(dt);updateQuotes(dt);
 if(!paused){particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;p.life-=dt});particles=particles.filter(p=>p.life>0)}
 confetti.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.r+=p.vr*dt;p.life-=dt});confetti=confetti.filter(p=>p.life>0&&p.y<H+30);
 if(toastUntil&&time>toastUntil){$('toast').classList.remove('show');toastUntil=0}
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
 if(mode==='intro'){ctx.fillStyle='#11151c';ctx.fillRect(0,0,W,H)}else if(mode==='endless'||mode==='runover')drawEndless();else if(mode==='jungle'||mode==='cabin')drawJungle();else if(mode==='garden'||mode==='dinner'||mode==='waking')drawGarden();else drawGame();drawConfetti();music();requestAnimationFrame(frame);
}
resize();requestAnimationFrame(frame);
})();
