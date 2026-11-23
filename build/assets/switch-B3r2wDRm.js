import{w as L,v as q,j as k,o as Y,r as H,y as G,Z as J,_ as U}from"./vendor-radix-BWeDlapn.js";import{r as P}from"./vendor-charts-Cdgfu-b9.js";import{k as j}from"./index-C31AoKHc.js";const T=2e3,C=new Map,z=new Set,_=t=>t instanceof Error?`${t.name}: ${t.message}`:String(t);function Z(t){const e=C.get(t);if(e instanceof Error)throw e;if(e)return e;try{const o=new Function("ctx","api",`"use strict";
${t}`);return C.size>100&&C.clear(),C.set(t,o),o}catch(o){const n=o instanceof Error?o:new Error(String(o));throw C.set(t,n),n}}function K(t){const{position:e,targetPosition:o}=t,n=o?o.x-e.x:0,s=o?o.y-e.y:0;return{...t,angle:o?Math.atan2(s,n):0,distance:Math.hypot(n,s)}}function Q(t,e,o){const{preset:n,position:s}=t;return{particle:(i={})=>{const r=i.life??1e3,l=i.effectType??n.effectType,a={id:e(),x:s.x,y:s.y,vx:0,vy:0,life:r,maxLife:i.maxLife??r,size:4,color:n.color,secondaryColor:n.secondaryColor,effectType:l,texture:n.particleTexture,glowIntensity:n.glowIntensity,shapeScaleX:n.shapeScaleX,shapeScaleY:n.shapeScaleY,shapeRotation:n.shapeRotation,shapeOutlineWidth:n.shapeOutlineWidth,shapeCornerRadius:n.shapeCornerRadius,starPoints:n.starPoints,starInnerRatio:n.starInnerRatio,damage:t.damage,owner:t.owner,monsterId:t.monsterId,skillName:t.skillName};return l==="projectile"&&(a.hasHit=!1,a.startPosition={x:s.x,y:s.y},a.travelDistance=0,a.isHoming=n.isHoming,a.targetId=n.isHoming?t.targetId:void 0),{...a,...i,id:a.id}},rand:(i=0,r=1)=>i+Math.random()*(r-i),angleTo:(i,r)=>Math.atan2(r.y-i.y,r.x-i.x),groupId:o}}function V(t){if(!Array.isArray(t))throw new TypeError("코드는 파티클 배열을 return 해야 합니다. (예: return [api.particle({ ... })])");if(t.length>T)throw new RangeError(`파티클은 최대 ${T}개까지 생성할 수 있습니다.`);return t.map((e,o)=>{if(!e||typeof e!="object")throw new TypeError(`${o+1}번째 파티클이 올바르지 않습니다. api.particle을 사용하세요.`);const n=e;if(["id","x","y","vx","vy","life","maxLife","size"].some(i=>typeof n[i]!="number"||!Number.isFinite(n[i]))||typeof n.life!="number"||n.life<=0||typeof n.maxLife!="number"||n.maxLife<=0||typeof n.size!="number"||n.size<0||typeof n.color!="string"||!["projectile","trail","lightning","ring","glow"].includes(String(n.effectType)))throw new TypeError(`${o+1}번째 파티클의 속성이 올바르지 않습니다. api.particle을 사용하세요.`);return e})}function N(t,e,o,n){const s=Z(t),i=K(e);return V(s(i,Q(i,o,n)))}function ee(t,e,o,n){try{return N(t,e,o,n)}catch(s){const i=_(s);return z.has(i)||(z.add(i),console.warn(`[effect code] ${i}`)),[]}}function Re(t,e){let o=0;try{return{ok:!0,particleCount:N(t,{preset:e,position:{x:0,y:0},targetPosition:{x:200,y:0},owner:"player",skillRange:180,skillArea:120},()=>o++,()=>o).length}}catch(n){return{ok:!1,error:_(n),particleCount:0}}}const b=`// ctx: 발생 정보 (preset, position, targetPosition, angle, distance, skillRange, skillArea, damage, owner ...)
// api: 헬퍼 (api.particle, api.rand, api.angleTo, api.groupId)
// 파티클 배열을 return 하면 그대로 화면에 표시됩니다.
`,te={projectile:`${b}
// 투사체: 패턴(directional | radial | cone)에 따라 발사 각도를 계산합니다.
const { preset, angle } = ctx;
if (!preset.projectilePattern || !preset.projectileCount) return [];
const count = preset.projectileCount;
const speed = preset.projectileSpeed || 400;
const size = preset.projectileSize || 8;
const lifetime = preset.projectileLifetime || 1000;
const spread =
  preset.projectilePattern === 'cone'
    ? preset.spreadAngle || Math.PI / 4
    : preset.spreadAngle ?? 0;

const particles = [];
for (let i = 0; i < count; i++) {
  let a = angle;
  if (preset.projectilePattern === 'radial') {
    a = (i / count) * Math.PI * 2;
  } else if (count > 1 && spread) {
    a += (i - (count - 1) / 2) * (spread / (count - 1));
  }

  particles.push(
    api.particle({
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: lifetime,
      size,
      trailEnabled: true,
      trailHistory: [],
      trailLength: 20,
      trailWidth: size * 0.5,
    })
  );
}
return particles;
`,trail:`${b}
// 궤적: 베기(slash) / 찌르기(thrust) / 회전(spin) 경로를 따라 점을 찍습니다.
const { preset, position, angle } = ctx;
if (!ctx.skillRange || !preset.trailParticleCount) return [];
const radius = ctx.skillRange;
const count = preset.trailParticleCount;
const width = preset.trailWidth || 5;
const fade = preset.trailFadeSpeed || 1;
const type = preset.trailType || 'thrust';
const group = api.groupId();

const particles = [];
for (let i = 0; i < count; i++) {
  const t = i / count;
  let x = position.x;
  let y = position.y;

  if (type === 'slash') {
    const arc =
      ctx.skillArea !== undefined
        ? (ctx.skillArea * Math.PI) / 180
        : preset.trailArcAngle || Math.PI / 2.5;
    const a = angle - arc / 2 + arc * t;
    x += Math.cos(a) * radius;
    y += Math.sin(a) * radius;
  } else if (type === 'spin') {
    const a = t * Math.PI * 2;
    x += Math.cos(a) * radius;
    y += Math.sin(a) * radius;
  } else {
    const distance = t * radius;
    x += Math.cos(angle) * distance;
    y += Math.sin(angle) * distance;
  }

  // 두께감을 위한 수직 방향 흔들림
  const normal = Math.atan2(y - position.y, x - position.x) + Math.PI / 2;
  const offset = api.rand(-0.5, 0.5) * width;

  particles.push(
    api.particle({
      x: x + Math.cos(normal) * offset,
      y: y + Math.sin(normal) * offset,
      life: 500 / fade,
      size: api.rand(5, 8),
      skillType: 'trail_' + group,
    })
  );
}
return particles;
`,lightning:`${b}
// 번개: 타겟까지 지그재그 선분을 만들고, 일정 확률로 가지를 칩니다.
const { preset, position, targetPosition } = ctx;
if (!targetPosition || !preset.lightningSegments) return [];

const segmentCount = preset.lightningSegments;
const jitter = preset.lightningJitter || 10;
const forkChance = preset.lightningForkChance || 0.2;
const dx = (targetPosition.x - position.x) / segmentCount;
const dy = (targetPosition.y - position.y) / segmentCount;

const segments = [];
let current = { x: position.x, y: position.y };
for (let i = 0; i < segmentCount; i++) {
  const next = {
    x: position.x + dx * (i + 1) + api.rand(-0.5, 0.5) * jitter,
    y: position.y + dy * (i + 1) + api.rand(-0.5, 0.5) * jitter,
  };
  segments.push({ start: current, end: next, brightness: 0.8 + Math.random() * 0.2 });

  if (Math.random() < forkChance && i < segmentCount - 2) {
    const forkAngle = api.rand(-0.5, 0.5) * (Math.PI / 2);
    const forkLength = (segmentCount - i) * Math.sqrt(dx * dx + dy * dy) * 0.5;
    segments.push({
      start: next,
      end: {
        x: next.x + Math.cos(forkAngle) * forkLength,
        y: next.y + Math.sin(forkAngle) * forkLength,
      },
      brightness: 0.5 + Math.random() * 0.3,
    });
  }
  current = next;
}

return [
  api.particle({
    life: 200,
    size: 2,
    texture: 'spark',
    lightningSegments: segments,
    lightningTarget: targetPosition,
  }),
];
`,ring:`${b}
// 링: 원주 위 파티클이 바깥으로 퍼져나갑니다. (ringCount 만큼 동심원)
const { preset, position } = ctx;
if (!preset.ringRadius || !preset.ringExpansionSpeed) return [];
const maxRadius = preset.ringRadius;
const speed = preset.ringExpansionSpeed;
const ringCount = preset.ringCount || 1;
const interval = preset.ringInterval || 0;
const startRadius = 10;
const pointCount = Math.floor(maxRadius / 3);

const particles = [];
for (let ring = 0; ring < ringCount; ring++) {
  const life = ((maxRadius - startRadius) / speed) * 1000 + ring * interval;
  if (life <= 0) continue;
  for (let j = 0; j < pointCount; j++) {
    const a = (j / pointCount) * Math.PI * 2;
    particles.push(
      api.particle({
        x: position.x + Math.cos(a) * startRadius,
        y: position.y + Math.sin(a) * startRadius,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life,
        size: 4,
        ringRadius: startRadius,
        ringStartRadius: startRadius,
        ringExpansionSpeed: speed,
      })
    );
  }
}
return particles;
`,glow:`${b}
// 글로우: 중앙의 큰 빛 + 위로 떠오르는 작은 파티클.
const { preset, position } = ctx;
if (!preset.glowRadius || !preset.glowParticleCount) return [];
const radius = preset.glowRadius;
const count = preset.glowParticleCount;
const rise = preset.glowRiseSpeed || 60;
const fade = preset.glowFadeSpeed || 0.8;

const particles = [
  api.particle({
    life: 1000 / fade,
    size: radius,
    texture: 'circle',
  }),
];

for (let i = 0; i < count; i++) {
  const a = Math.random() * Math.PI * 2;
  const dist = Math.random() * radius * 0.8;
  particles.push(
    api.particle({
      x: position.x + Math.cos(a) * dist,
      y: position.y + Math.sin(a) * dist,
      vx: (Math.random() - 0.5) * 20,
      vy: -rise,
      life: 1500 / fade,
      size: api.rand(3, 5),
      glowIntensity: preset.glowIntensity * 0.7,
      riseSpeed: rise,
    })
  );
}
return particles;
`};function Ee(t){return te[t.effectType]}const Te=`ctx.preset            현재 이펙트 프리셋 (color, projectileSpeed 등 GUI 설정값)
ctx.position          발생 위치 {x, y}
ctx.targetPosition    타겟 위치 (없을 수 있음)
ctx.angle / distance  발생 위치 → 타겟의 각도(라디안) / 거리
ctx.skillRange / skillArea  스킬 사거리(px) / 범위 각도(도)
ctx.damage, owner, monsterId, skillName, targetId

api.particle({...})   프리셋 색상·텍스처·형태가 채워진 파티클 생성
                      주요 속성: x, y, vx, vy, life(ms), size, color, texture,
                      effectType, gravity(px/s²), drag(0~1), glowIntensity
api.rand(min, max)    난수
api.angleTo(a, b)     a → b 각도
api.groupId()         trail 파티클을 한 선으로 묶을 때 skillType: 'trail_' + groupId

반드시 파티클 배열을 return 하세요. (최대 ${T}개)`;let w=0;const W=(...t)=>{},v=t=>({shapeScaleX:t.shapeScaleX,shapeScaleY:t.shapeScaleY,shapeRotation:t.shapeRotation,shapeOutlineWidth:t.shapeOutlineWidth,shapeCornerRadius:t.shapeCornerRadius,starPoints:t.starPoints,starInnerRatio:t.starInnerRatio});function ne(t){const{preset:e,position:o,targetPosition:n,owner:s,monsterId:i,damage:r,skillName:l}=t,a=[];if(!e.projectilePattern||!e.projectileCount)return a;const c=e.projectileCount,d=e.projectileSpeed||400,g=e.projectileSize||8,h=e.projectileLifetime||1e3;let u=0;if(n){const f=n.x-o.x,p=n.y-o.y;u=Math.atan2(p,f)}for(let f=0;f<c;f++){let p=u;switch(e.projectilePattern){case"directional":if(c>1&&e.spreadAngle){const M=(f-(c-1)/2)*(e.spreadAngle/(c-1));p+=M}break;case"radial":p=f/c*Math.PI*2;break;case"cone":{const M=e.spreadAngle||Math.PI/4;if(c>1){const x=(f-(c-1)/2)*(M/(c-1));p+=x}break}}const m=Math.cos(p)*d,y=Math.sin(p)*d;a.push({id:w++,x:o.x,y:o.y,vx:m,vy:y,life:h,maxLife:h,size:g,color:e.color,secondaryColor:e.secondaryColor,effectType:"projectile",texture:e.particleTexture,glowIntensity:e.glowIntensity,...v(e),damage:r,owner:s,monsterId:i,hasHit:!1,startPosition:{x:o.x,y:o.y},travelDistance:0,isHoming:e.isHoming,targetId:e.isHoming?t.targetId:void 0,skillName:l,trailEnabled:!0,trailHistory:[],trailLength:20,trailWidth:g*.5})}return a}function oe(t){const{preset:e,position:o,targetPosition:n,skillArea:s,skillRange:i}=t,r=[];if(W("🔴 [createTrailEffect] 호출됨",{presetId:e.id,skillRange:i,skillArea:s,hasTargetPosition:!!n}),!i||!e.trailParticleCount)return r;let l=0;if(n){const f=n.x-o.x,p=n.y-o.y;l=Math.atan2(p,f)}const a=i,c=e.trailParticleCount,d=e.trailWidth||5,g=e.trailFadeSpeed||1,h=e.trailType||"thrust",u=w;for(let f=0;f<c;f++){const p=f/c;let m=o.x,y=o.y;switch(h){case"slash":{const S=s!==void 0?s*Math.PI/180:e.trailArcAngle||Math.PI/2.5,A=l-S/2+S*p;m=o.x+Math.cos(A)*a,y=o.y+Math.sin(A)*a;break}case"thrust":{const S=p*a;m=o.x+Math.cos(l)*S,y=o.y+Math.sin(l)*S;break}case"spin":{const S=p*Math.PI*2;m=o.x+Math.cos(S)*a,y=o.y+Math.sin(S)*a;break}}const M=Math.atan2(y-o.y,m-o.x)+Math.PI/2,x=(Math.random()-.5)*d,E=m+Math.cos(M)*x,X=y+Math.sin(M)*x;r.push({id:w++,x:E,y:X,vx:0,vy:0,life:500/g,maxLife:500/g,size:5+Math.random()*3,color:e.color,secondaryColor:e.secondaryColor,effectType:"trail",texture:e.particleTexture,glowIntensity:e.glowIntensity,...v(e),skillType:`trail_${u}`})}return r}function se(t){const{preset:e,position:o,targetPosition:n}=t,s=[];if(!n||!e.lightningSegments)return s;const i=e.lightningSegments,r=e.lightningJitter||10,l=e.lightningForkChance||.2,a=[];let c={...o};const d=(n.x-o.x)/i,g=(n.y-o.y)/i;for(let h=0;h<i;h++){const u=o.x+d*(h+1)+(Math.random()-.5)*r,f=o.y+g*(h+1)+(Math.random()-.5)*r;if(a.push({start:{...c},end:{x:u,y:f},brightness:.8+Math.random()*.2}),Math.random()<l&&h<i-2){const p=(Math.random()-.5)*Math.PI/2,m=(i-h)*Math.sqrt(d*d+g*g)*.5,y=u+Math.cos(p)*m,M=f+Math.sin(p)*m;a.push({start:{x:u,y:f},end:{x:y,y:M},brightness:.5+Math.random()*.3})}c={x:u,y:f}}return s.push({id:w++,x:o.x,y:o.y,vx:0,vy:0,life:200,maxLife:200,size:2,color:e.color,secondaryColor:e.secondaryColor,effectType:"lightning",texture:"spark",glowIntensity:e.glowIntensity,...v(e),lightningSegments:a,lightningTarget:n}),s}function re(t){const{preset:e,position:o}=t,n=[];if(!e.ringRadius||!e.ringExpansionSpeed)return n;const s=e.ringCount||1,i=e.ringInterval||0;for(let r=0;r<s;r++){const l=r*i,a=10,c=e.ringRadius,d=e.ringExpansionSpeed,g=Math.floor(c/3);for(let h=0;h<g;h++){const u=h/g*Math.PI*2;n.push({id:w++,x:o.x+Math.cos(u)*a,y:o.y+Math.sin(u)*a,vx:Math.cos(u)*d,vy:Math.sin(u)*d,life:(c-a)/d*1e3+l,maxLife:(c-a)/d*1e3+l,size:4,color:e.color,secondaryColor:e.secondaryColor,effectType:"ring",texture:e.particleTexture,glowIntensity:e.glowIntensity,...v(e),ringRadius:a,ringStartRadius:a,ringExpansionSpeed:d})}}return n}function ie(t){const{preset:e,position:o}=t,n=[];if(!e.glowRadius||!e.glowParticleCount)return n;const s=e.glowRadius,i=e.glowParticleCount,r=e.glowRiseSpeed||60,l=e.glowFadeSpeed||.8;n.push({id:w++,x:o.x,y:o.y,vx:0,vy:0,life:1e3/l,maxLife:1e3/l,size:s,color:e.color,secondaryColor:e.secondaryColor,effectType:"glow",texture:"circle",glowIntensity:e.glowIntensity,...v(e)});for(let a=0;a<i;a++){const c=Math.random()*Math.PI*2,d=Math.random()*s*.8,g=o.x+Math.cos(c)*d,h=o.y+Math.sin(c)*d,u=(Math.random()-.5)*20,f=-r;n.push({id:w++,x:g,y:h,vx:u,vy:f,life:1500/l,maxLife:1500/l,size:3+Math.random()*2,color:e.color,secondaryColor:e.secondaryColor,effectType:"glow",texture:e.particleTexture,glowIntensity:e.glowIntensity*.7,...v(e),riseSpeed:r})}return n}function Ae(t){const{preset:e,skillRange:o,skillArea:n}=t;if(e.useCustomCode&&e.customCode?.trim())return ee(e.customCode,t,()=>w++,()=>w);switch(W("🟢 [createEffect] 호출됨",{presetId:e.id,effectType:e.effectType,skillRange:o,skillArea:n}),e.effectType){case"projectile":return ne(t);case"trail":return oe(t);case"lightning":return se(t);case"ring":return re(t);case"glow":return ie(t);default:return[]}}function ae(t,e){if(!t.gravity&&!t.drag)return t;const o=t.drag?Math.max(0,1-t.drag*e):1;return{...t,vx:t.vx*o,vy:(t.vy+(t.gravity??0)*e)*o}}function le(t,e,o){const n=ae(t,e),s={...n};switch(s.life=n.life-e*1e3,n.effectType){case"projectile":if(n.isHoming&&n.targetId!==void 0&&o){const i=o.find(r=>r.id===n.targetId&&!r.isDead);if(i){const r=i.position.x-n.x,l=i.position.y-n.y,a=Math.sqrt(r*r+l*l);if(a>0){const d=r/a*300*e,g=l/a*300*e;s.vx=n.vx+d,s.vy=n.vy+g;const h=Math.sqrt(s.vx*s.vx+s.vy*s.vy),u=600;h>u&&(s.vx=s.vx/h*u,s.vy=s.vy/h*u)}}}if(s.x=n.x+n.vx*e,s.y=n.y+n.vy*e,n.startPosition){const i=s.x-n.startPosition.x,r=s.y-n.startPosition.y;s.travelDistance=Math.sqrt(i*i+r*r)}if(n.trailEnabled&&n.trailLength){const i=Date.now();let r=n.trailHistory||[];r=[...r,{x:n.x,y:n.y,timestamp:i}],r.length>n.trailLength&&(r=r.slice(-n.trailLength)),s.trailHistory=r}break;case"trail":s.x=n.x+n.vx*e,s.y=n.y+n.vy*e;break;case"lightning":break;case"ring":s.x=n.x+n.vx*e,s.y=n.y+n.vy*e,n.ringRadius&&n.ringExpansionSpeed&&(s.ringRadius=n.ringRadius+n.ringExpansionSpeed*e);break;case"glow":s.x=n.x+n.vx*e,s.y=n.y+n.vy*e;break}return s}function je(t,e,o){return t.map(n=>le(n,e,o)).filter(n=>n.life>0&&isFinite(n.x)&&isFinite(n.y))}function ce(t,e){const o=Math.max(0,Math.min(1,e.life/e.maxLife));switch(e.effectType){case"projectile":e.trailEnabled&&e.trailHistory&&e.trailHistory.length>1&&de(t,e,o),I(t,e,o);break;case"trail":I(t,e,o);break;case"lightning":he(t,e,o);break;case"ring":ue(t,e,o);break;case"glow":fe(t,e,o);break;default:I(t,e,o)}}function de(t,e,o){if(!e.trailHistory||e.trailHistory.length<2)return;const n=Date.now(),s=1e3;t.save(),t.strokeStyle=e.color,t.lineWidth=e.trailWidth||2,t.lineCap="round",t.lineJoin="round";for(let i=1;i<e.trailHistory.length;i++){const r=e.trailHistory[i-1],l=e.trailHistory[i],a=n-l.timestamp,d=Math.max(0,1-a/s)*o*.7,g=Math.floor(d*255).toString(16).padStart(2,"0");t.strokeStyle=e.color+g,t.beginPath(),t.moveTo(r.x,r.y),t.lineTo(l.x,l.y),t.stroke()}t.restore()}function I(t,e,o){const n=e.size*2*(e.glowIntensity||.5);if(e.glowIntensity&&e.glowIntensity>0){const l=t.createRadialGradient(e.x,e.y,0,e.x,e.y,n),a=Math.floor(o*e.glowIntensity*255).toString(16).padStart(2,"0");l.addColorStop(0,e.color+a),l.addColorStop(1,`${e.color}00`),t.fillStyle=l,t.beginPath(),t.arc(e.x,e.y,n,0,Math.PI*2),t.fill()}const s=Math.floor(o*255).toString(16).padStart(2,"0");t.fillStyle=e.color+s,t.save(),t.translate(e.x,e.y),t.rotate((e.shapeRotation??0)*Math.PI/180),t.scale(e.shapeScaleX??1,e.shapeScaleY??1);const i=e.shapeOutlineWidth??0,r=()=>{i<=0||(t.lineWidth=i,t.strokeStyle=(e.secondaryColor??e.color)+s,t.stroke())};switch(e.texture){case"circle":t.beginPath(),t.arc(0,0,e.size,0,Math.PI*2),t.fill(),r();break;case"star":ge(t,0,0,e.size,e.starPoints??5,e.starInnerRatio??.5),r();break;case"square":{const l=Math.min(e.shapeCornerRadius??0,e.size);t.beginPath(),t.roundRect(-e.size,-e.size,e.size*2,e.size*2,l),t.fill(),r();break}case"diamond":pe(t,0,0,e.size),r();break;case"spark":t.lineWidth=Math.max(1,i||1),t.strokeStyle=e.color+s,ye(t,0,0,e.size);break;default:t.beginPath(),t.arc(0,0,e.size,0,Math.PI*2),t.fill()}t.restore()}function he(t,e,o){if(e.lightningSegments){t.save(),t.strokeStyle=e.color,t.lineWidth=2,t.lineCap="round",t.shadowBlur=10,t.shadowColor=e.color;for(const n of e.lightningSegments){const s=o*n.brightness,i=Math.floor(s*255).toString(16).padStart(2,"0");t.strokeStyle=e.color+i,t.beginPath(),t.moveTo(n.start.x,n.start.y),t.lineTo(n.end.x,n.end.y),t.stroke()}t.restore()}}function ue(t,e,o){I(t,e,o)}function fe(t,e,o){if(e.size>20){const n=t.createRadialGradient(e.x,e.y,0,e.x,e.y,e.size),s=Math.floor(o*.3*255).toString(16).padStart(2,"0"),i=Math.floor(o*.05*255).toString(16).padStart(2,"0");n.addColorStop(0,e.color+s),n.addColorStop(.5,e.secondaryColor+i),n.addColorStop(1,`${e.color}00`),t.fillStyle=n,t.beginPath(),t.arc(e.x,e.y,e.size,0,Math.PI*2),t.fill()}else I(t,e,o)}function ge(t,e,o,n,s,i){t.beginPath();for(let r=0;r<s*2;r++){const l=r*Math.PI/s,a=r%2===0?n:n*i,c=e+Math.cos(l-Math.PI/2)*a,d=o+Math.sin(l-Math.PI/2)*a;r===0?t.moveTo(c,d):t.lineTo(c,d)}t.closePath(),t.fill()}function pe(t,e,o,n){t.beginPath(),t.moveTo(e,o-n),t.lineTo(e+n,o),t.lineTo(e,o+n),t.lineTo(e-n,o),t.closePath(),t.fill()}function ye(t,e,o,n){t.beginPath(),t.moveTo(e-n,o),t.lineTo(e+n,o),t.moveTo(e,o-n),t.lineTo(e,o+n),t.stroke()}function ze(t,e,o,n){const s=new Map,i=[];e.forEach(r=>{if(r.effectType==="trail"&&r.skillType){const l=r.skillType;s.has(l)||s.set(l,[]);const a=s.get(l);a&&a.push(r)}else i.push(r)}),s.forEach(r=>{r.length>1&&me(t,r)}),i.forEach(r=>{r.effectType&&ce(t,r)})}function me(t,e){if(e.length===0)return;const o=Math.max(...e.map(a=>a.life)),n=Math.max(...e.map(a=>a.maxLife)),s=Math.max(0,Math.min(1,o/n)),i=e[0],r=e[0].size||4;i.glowIntensity&&i.glowIntensity>0&&(t.save(),t.strokeStyle=i.color,t.lineWidth=r*3,t.lineCap="round",t.lineJoin="round",t.globalAlpha=s*i.glowIntensity*.3,t.shadowBlur=15,t.shadowColor=i.color,t.beginPath(),e.forEach((a,c)=>{c===0?t.moveTo(a.x,a.y):t.lineTo(a.x,a.y)}),t.stroke(),t.restore()),t.save();const l=Math.floor(s*255).toString(16).padStart(2,"0");t.strokeStyle=i.color+l,t.lineWidth=r,t.lineCap="round",t.lineJoin="round",t.beginPath(),e.forEach((a,c)=>{c===0?t.moveTo(a.x,a.y):t.lineTo(a.x,a.y)}),t.stroke(),i.secondaryColor&&(t.strokeStyle=i.secondaryColor+l,t.lineWidth=r*.5,t.beginPath(),e.forEach((a,c)=>{c===0?t.moveTo(a.x,a.y):t.lineTo(a.x,a.y)}),t.stroke()),t.restore()}var R="Switch",[Me]=Y(R),[xe,we]=Me(R),$=P.forwardRef((t,e)=>{const{__scopeSwitch:o,name:n,checked:s,defaultChecked:i,required:r,disabled:l,value:a="on",onCheckedChange:c,form:d,...g}=t,[h,u]=P.useState(null),f=L(e,x=>u(x)),p=P.useRef(!1),m=h?d||!!h.closest("form"):!0,[y,M]=q({prop:s,defaultProp:i??!1,onChange:c,caller:R});return k.jsxs(xe,{scope:o,checked:y,disabled:l,children:[k.jsx(H.button,{type:"button",role:"switch","aria-checked":y,"aria-required":r,"data-state":O(y),"data-disabled":l?"":void 0,disabled:l,value:a,...g,ref:f,onClick:G(t.onClick,x=>{M(E=>!E),m&&(p.current=x.isPropagationStopped(),p.current||x.stopPropagation())})}),m&&k.jsx(B,{control:h,bubbles:!p.current,name:n,value:a,checked:y,required:r,disabled:l,form:d,style:{transform:"translateX(-100%)"}})]})});$.displayName=R;var F="SwitchThumb",D=P.forwardRef((t,e)=>{const{__scopeSwitch:o,...n}=t,s=we(F,o);return k.jsx(H.span,{"data-state":O(s.checked),"data-disabled":s.disabled?"":void 0,...n,ref:e})});D.displayName=F;var Se="SwitchBubbleInput",B=P.forwardRef(({__scopeSwitch:t,control:e,checked:o,bubbles:n=!0,...s},i)=>{const r=P.useRef(null),l=L(r,i),a=J(o),c=U(e);return P.useEffect(()=>{const d=r.current;if(!d)return;const g=window.HTMLInputElement.prototype,u=Object.getOwnPropertyDescriptor(g,"checked").set;if(a!==o&&u){const f=new Event("click",{bubbles:n});u.call(d,o),d.dispatchEvent(f)}},[a,o,n]),k.jsx("input",{type:"checkbox","aria-hidden":!0,defaultChecked:o,...s,tabIndex:-1,ref:l,style:{...s.style,...c,position:"absolute",pointerEvents:"none",opacity:0,margin:0}})});B.displayName=Se;function O(t){return t?"checked":"unchecked"}var ke=$,Pe=D;function Le({className:t,...e}){return k.jsx(ke,{"data-slot":"switch",className:j("peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",t),...e,children:k.jsx(Pe,{"data-slot":"switch-thumb",className:j("bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0")})})}export{Te as E,Le as S,Ae as c,Ee as g,ze as r,je as u,Re as v};
