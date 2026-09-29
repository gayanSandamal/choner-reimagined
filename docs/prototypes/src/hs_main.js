
const btn = (label, act, o) => { o = o || {}; return `<button class="btn${o.icon&&!(o.cls||'').includes('row')?' row':''}${o.cls?' '+o.cls:''}" ${o.go?`data-go="${o.go}"`:`data-act="${act}"`} ${o.v!==undefined?`data-v="${esc(o.v)}"`:''} ${o.dis?'disabled':''}>${o.icon?ic(o.icon,2):''}${label}</button>`; };
const ghost = (label, act, v, go) => `<button class="btn-g" ${go?`data-go="${go}"`:`data-act="${act}"`} ${v!==undefined?`data-v="${esc(v)}"`:''}>${label}</button>`;
const hdr = (title) => `<div class="hdr"><button class="backc" data-back="1" aria-label="Back">${ic('back',2.2)}</button><div class="ht">${esc(title)}</div></div>`;
const initials = n => (n || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const firstName = n => (n || '').trim().split(/\s+/)[0] || '';

/* ---------- data ---------- */
const ME = 'Dinesh Doluweera';
const TPL = {
  run:{ act:'Run', noun:'run', icon:'run', unit:'km', amt:3, tg:true, go:'Start my run', sess:n=>`${n} km run` },
  walk:{ act:'Walk', noun:'walk', icon:'walk', unit:'min', amt:30, tg:true, go:'Start my walk', sess:n=>`${n}-minute walk` },
  yoga:{ act:'Yoga', noun:'session', icon:'leaf', unit:'min', amt:20, tg:true, go:'Start my session', sess:n=>`${n} minutes of yoga` },
  push:{ act:'Push-ups', noun:'session', icon:'dumb', unit:'reps', amt:20, tg:false, go:'Start my session', sess:n=>`${n} push-ups` }
};
const ACT = { run:{l:'Running',c:16,i:'run'}, walk:{l:'Walking',c:12,i:'walk'}, workout:{l:'Workouts',c:8,i:'dumb'}, yoga:{l:'Yoga',c:6,i:'leaf'} };
const PEOPLE = [
  ['Nimali P','run','Running · 3 km · 3x a week'],['Ruwan S','walk','Walking · 30 min · daily'],['Asanka K','yoga','Yoga · 20 min · 2x a week'],
  ['Tharushi M','run','Running · 5 km · 2x a week'],['Dinuka W','workout','Workout · 45 min · 3x a week'],['Ishara B','walk','Walking · 5 km · 3x a week'],
  ['Kasun R','run','Running · 10 km · daily'],['Nadeesha K','yoga','Yoga · 30 min · daily'],['Malith G','workout','Workout · 4x a week'],['Chamodi S','walk','Walking · 8 km · daily']
];
const HUES = ['#FD8302','#1E3A4C','#2E9E6B','#8E5FD9','#D9534F','#3B8FD1'];
const MOMENTS = [
  { v:'pair', t:'A pair just completed their first run.' },
  { v:'count', n:8, t:'people made new commitments today.' },
  { v:'pairs', n:6, t:'pairs are showing up today.' },
  { v:'done', n:5, t:'commitments were completed today.' }
];
const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const fmtTime = t => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; };

/* ---------- state ---------- */
function fresh(){
  return { cur:'home', hist:[], first:true, challenge:false, challengeDone:false, tpl:'run', cadence:2,
    pstate:'none', cs:'matched', mode:'together', tg:'idle', gp:'idle', youDone:false, gDone:false, together:false, kept:0,
    pulse:'live', mom:0, filter:'all', sheet:null, dlg:null, pd:null,
    plan:{ day:'Saturday', time:'7:00 AM', raw:'07:00', place:'Diyasaru Park', next:'Thursday · 7:00 AM', nextDay:'Thursday', was:null } };
}
let S = fresh();
let momT = null;
const T = () => TPL[S.tpl];
const agreed = () => S.pstate === 'partnered' && S.cs !== 'matched';
const weekTitle = () => agreed() ? `${T().act} ${S.cadence}× a week` : T().act;
const sess = () => T().sess(T().amt);
const curMode = () => T().tg ? S.mode : 'separate';
const keptTxt = n => `${n} commitment${n === 1 ? '' : 's'} kept`;
const noun = () => T().noun;
function resetDay(){ S.tg = 'idle'; S.gp = 'idle'; S.youDone = false; S.gDone = false; S.together = false; }
function finish(){ S.kept++; S.cs = 'done'; S.sheet = null; }
function sepCheck(){ if (S.youDone && S.gDone) finish(); }
function gayanStep(){
  if (S.pstate !== 'partnered'){ S.challenge = true; S.pstate = 'partnered'; S.cs = 'matched'; return; }
  if (S.cs === 'planned'){ S.gp = S.gp === 'idle' ? 'ready' : 'idle'; return; }
  if (S.cs === 'today'){
    if (curMode() === 'together') S.gp = S.gp === 'idle' ? 'ready' : 'here';
    else { S.gDone = true; sepCheck(); }
  }
}
function stateKey(){
  if (!S.challenge) return 'nochallenge';
  if (S.challengeDone) return 'complete';
  if (S.pstate === 'none') return 'nopartner';
  if (S.pstate === 'finding') return 'finding';
  if (S.pstate === 'match') return 'match';
  if (S.pstate === 'waiting') return 'invited';
  if (S.pstate === 'ended') return 'ended';
  if (S.cs === 'today'){
    if (curMode() === 'together') return S.together ? 'tg-together' : S.tg === 'idle' ? 'tg-idle' : S.tg === 'onway' ? 'tg-onway' : S.gp === 'here' ? 'tg-both' : 'tg-wait';
    return S.youDone ? 'sep-youdone' : S.gDone ? 'sep-gdone' : 'sep-none';
  }
  return S.cs;
}

/* ---------- visual pieces ---------- */
const anon = (i, sz) => `<span class="anon" style="width:${sz||22}px;height:${sz||22}px;background:linear-gradient(135deg,${HUES[i % HUES.length]},#001827);">${ic('user',2)}</span>`;
const seat = (label, on, cls) => `<div class="seat ${on?'on':''} ${cls||''}">${esc(label)}</div>`;
const youG = () => `<div class="youg"><span class="seat on sm">${esc(initials(ME))}</span><span class="seat on sm p2s">GS</span><b>You + Gayan</b></div>`;
const stline = (label, ok, txt) => `<div class="stline"><span class="stic ${ok?'ok':''}">${ic(ok?'check':'clock',2.4)}</span><span>${label}</span><b>${txt}</b></div>`;
const hrow = (icn, txt) => `<div class="hrow">${ic(icn,1.8)}<span>${txt}</span></div>`;
function heartSvg(you, partner){
  const right = partner
    ? '<path fill="url(#gR)" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>'
    : '<path class="h-empty" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>';
  return `<svg class="heart" viewBox="0 0 132 124" aria-hidden="true"><defs>
    <linearGradient id="gL" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD5B01"/><stop offset="100%" stop-color="#FD8302"/></linearGradient>
    <linearGradient id="gR" x1="1" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD8302"/><stop offset="100%" stop-color="#FFA83D"/></linearGradient></defs>
    <path fill="${you?'url(#gL)':'none'}" stroke="${you?'none':'var(--dim)'}" stroke-width="2.4" d="M66 30 C 56 14, 32 10, 20 24 C 6 39, 10 62, 24 78 C 34 90, 52 104, 66 114 Z"/>${right}</svg>`;
}
const STAGES = [1,5,10,25,50];
const stageOf = k => STAGES.filter(m => k >= m).length;
function relCard(){
  const partnered = S.pstate === 'partnered' && !S.challengeDone;
  const st = partnered ? stageOf(S.kept) : 0;
  const label = partnered ? 'You + Gayan' : 'You + ?';
  const you = true, other = partnered;
  const pulseCls = partnered && (S.cs === 'today') ? ' beat' : '';
  const sub = partnered ? (S.kept > 0 ? `<div class="rel-k">${ic('fire',1.8)}${keptTxt(S.kept)}</div>` : '<div class="rel-l">Your first shared commitment is next.</div>')
    : S.pstate === 'finding' ? '<div class="rel-l">Looking for your partner.</div>' : S.pstate === 'match' ? '<div class="rel-l">A match is waiting for you.</div>' : S.pstate === 'waiting' ? '<div class="rel-l">Waiting for your partner to join.</div>' : '';
  const dots = partnered ? `<div class="stg">${STAGES.map(m => `<i class="${S.kept>=m?'on':''}" title="${m}"></i>`).join('')}</div>` : '';
  return `<div class="relc"><div class="hwrap st${st}${pulseCls}"><div class="glow"></div><div class="rings"><i></i><i></i></div>${heartSvg(you, other)}${partnered?'':'<div class="qmark">?</div>'}</div>
    <div class="rel-h">${label}</div>${sub}${dots}${partnered && S.kept > 0 ? `<button class="btn" style="padding:12px 0;font-size:13.5px;margin-top:4px;" data-go="journey">See your journey</button>` : ''}</div>`;
}
function tile(k){
  const a = ACT[k];
  return `<button class="tile" data-act="tile" data-v="${k}" aria-label="${a.l}, ${a.c} people. Open Find."><span class="ti"><i class="tp"></i>${ic(a.i,1.8)}</span><b class="cu" data-to="${a.c}">${a.c}</b><span class="tl">${a.l}</span><span class="tav">${anon(a.c,16)}${anon(a.c+1,16)}${anon(a.c+2,16)}</span></button>`;
}
function pulseCard(){
  if (S.pulse === 'quiet') return `<div class="pulse2 quiet"><div class="pl-h"><span class="live"></span>Choner Pulse</div><div class="pl-n" style="font-size:16px;">Be one of the first to show up today.</div><div class="pl-dots"><i></i><i></i><i></i></div></div>`;
  return `<div class="pulse2"><div class="pl-h"><span class="live"></span>Choner Pulse</div><div class="pl-n"><b class="cu" data-to="42">42</b> people are showing up today</div>
    <div class="tiles">${['run','walk','workout','yoga'].map(tile).join('')}</div>
    <div class="dsum"><span>+8 commitments</span><span>+2 new pairs</span><span>+5 completed</span></div></div>`;
}
function momentVisual(m){
  const hm = `<svg class="hm" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C6 17 1.5 13.4 1.5 8.5 1.5 5.5 3.7 3.5 6.3 3.5 8.7 3.5 10.7 5 12 7 13.3 5 15.3 3.5 17.7 3.5 20.3 3.5 22.5 5.5 22.5 8.5 22.5 13.4 18 17 12 21z" fill="#FD5B01"/></svg>`;
  if (m.v === 'pair') return `<div class="mv pairg">${anon(0,64)}${hm}${anon(1,64)}</div>`;
  if (m.v === 'count') return `<div class="mv col"><b class="mn">${m.n}</b><span class="tav">${anon(2,26)}${anon(3,26)}${anon(4,26)}</span></div>`;
  if (m.v === 'pairs') return `<div class="mv pairs">${[0,1,2].map(i => `<span class="pairg s">${anon(i,30)}${hm}${anon(i+3,30)}</span>`).join('')}</div>`;
  return `<div class="mv col"><span class="okc">${ic('check',2.6)}</span><b class="mn">${m.n}</b></div>`;
}
function momentInner(){
  const m = MOMENTS[S.mom % MOMENTS.length];
  return `<div class="fadein jvis">${momentVisual(m)}</div><div class="fadein mt">${m.v==='pairs' ? m.n+' ' : ''}${m.t}</div><div class="mdots">${MOMENTS.map((_,i) => `<i class="${i===S.mom%MOMENTS.length?'on':''}"></i>`).join('')}</div>`;
}
function justHappened(){
  if (S.pulse === 'quiet') return '';
  return `<div class="jsq" role="status"><div class="jtop"><span class="live"></span>Just Happened</div><div id="mbox" class="jcont">${momentInner()}</div></div>`;
}
function comingUp(){
  if (S.pstate !== 'partnered' || S.challengeDone || (S.cs !== 'planned' && S.cs !== 'today' && S.cs !== 'resched')) return '';
  return `<div class="coming"><div class="rc-h">Coming up</div><div class="h-title" style="font-size:15px;">${ic(T().icon,1.8)}<span>${T().act}</span></div><div class="h-when" style="font-size:13px;">${S.plan.next}</div><div class="youg" style="margin:0;"><b style="font-weight:500;">You + Gayan</b></div>${S.cs==='planned'?`<div class="chip" style="margin-top:8px;">${ic('clock',2)}2 days until your next commitment</div>`:''}</div>`;
}

/* ---------- hero (Your first / next commitment) ---------- */
function hero(inTab){
  const icon = T().icon, P2 = S.plan, mode = curMode();
  const k = stateKey();
  if (k === 'nochallenge') return inTab
    ? `<div class="hero empty"><div class="h-eb">No active commitment</div><div class="h-sub" style="font-size:14px;color:var(--pink);">Your first commitment starts here.</div>${btn('Create my first commitment','',{go:'browse'})}</div>`
    : `<div class="hero empty"><div class="h-eb">Ready when you are</div><div class="h-sub" style="font-size:14px;color:var(--pink);">Pick a challenge in Challenges, then find someone to do it with.</div>${btn('Go to Challenges','',{go:'tab-challenges'})}</div>`;
  if (k === 'complete') return `<div class="hero done"><div class="h-eb">Challenge complete</div><div class="h-title">${ic('fire',1.8)}<span>${weekTitle()}, done</span></div>${S.pstate==='partnered'?youG():''}<div class="h-kept">${ic('fire',1.8)}${keptTxt(S.kept)}</div>${inTab?btn('Create my next commitment','',{go:'browse'}):btn('Start your next challenge','',{go:'tab-challenges'})}</div>`;
  if (k === 'nopartner' || k === 'finding' || k === 'invited'){
    const line = k === 'invited' ? 'Waiting for your partner to join.' : k === 'finding' ? "We're looking for your partner. We'll notify you the moment you're matched." : "Someone to show up with is all that's missing.";
    const cta = k === 'invited' ? btn('See your invite','',{go:'find'})
      : k === 'finding' ? ''
      : btn('Find a partner','',{go:'find'});
    const ind = k === 'finding' ? `<button class="sdots" data-go="find" aria-label="Searching. Open Find."><i></i><i></i><i></i><span>Searching</span>${ic('chev',2)}</button>` : '';
    return `<div class="hero"><div class="h-eb">Your first commitment</div><div class="h-title">${ic(icon,1.8)}<span>${weekTitle()}</span></div><div class="h-prog">You will agree how much and how often together</div>${ind}<div class="h-sub">${line}</div>${cta}</div>`;
  }
  if (k === 'match') return `<div class="hero"><div class="h-eb">You found a match</div><div class="h-title">${ic(icon,1.8)}<span>${weekTitle()}</span></div><div class="h-sub">Take a look and say yes.</div>${btn('See your match','',{go:'find'})}</div>`;
  if (k === 'ended') return `<div class="hero"><div class="h-eb">This match has ended.</div><div class="h-title">${ic(icon,1.8)}<span>${weekTitle()}</span></div><div class="h-sub">Your challenge continues. You can look for a new partner anytime.</div>${btn('Find a partner','',{go:'find'})}</div>`;
  if (k === 'matched') return `<div class="hero"><div class="h-eb">You found your person</div>${youG()}<div class="h-title">${ic(icon,1.8)}<span>${weekTitle()}</span></div><div class="h-sub">Now let's plan your first ${noun()}.</div>${btn(`Plan your first ${noun()}`,'',{go:'plan'})}</div>`;
  if (k === 'planned') return `<div class="hero"><div class="h-eb">${S.first?'Your first commitment':'Your next commitment'}</div><div class="h-title">${ic(icon,1.8)}<span>${sess()}</span></div><div class="h-when">${P2.day} · ${P2.time}</div>${mode==='together'?hrow('pin',esc(P2.place)):hrow('separate','Separately, together')}${youG()}
    ${stline('Gayan',S.gp!=='idle',S.gp!=='idle'?'Ready':'Not checked in')}${stline('You',false,'Not checked in')}${btn('View commitment','',{go:'commit'})}</div>`;
  if (k === 'resched') return `<div class="hero"><div class="h-eb">Gayan moved your ${noun()}</div><div class="h-title">${ic(icon,1.8)}<span>${sess()}</span></div><div class="h-when">Sunday · 7:00 AM</div><div class="h-sub" style="margin:0;">Was ${P2.day} · ${P2.time}</div>${youG()}<div class="btn-2">${btn('Accept','accept-resched')}<button class="btn-o" data-go="plan">Suggest another</button></div></div>`;
  if (k === 'missed') return `<div class="hero"><div class="h-eb">You missed ${P2.day}'s ${noun()}.</div><div class="h-sub" style="margin:0;color:var(--pink);font-size:14px;">It happens to everyone. What matters is that you keep showing up.</div>${youG()}${btn('Move it','',{go:'plan'})}${ghost("I'll catch up",'catchup')}</div>`;
  if (k === 'tg-together') return `<div class="hero"><div class="h-eb">You're together.</div><div class="h-title">${ic('fire',1.8)}<span>${sess()} starts now.</span></div>${youG()}${btn('Finish','finish-tg')}</div>`;
  if (k === 'tg-both') return `<div class="hero"><div class="h-eb">You're here.</div><div class="h-sub" style="margin:0;color:var(--pink);font-size:14px;">Gayan is here too.</div>${youG()}${btn('Confirm with QR','open-qr',{icon:'qr'})}</div>`;
  if (k === 'tg-wait') return `<div class="hero"><div class="h-eb">You're here.</div><div class="h-sub" style="margin:0;">Waiting for Gayan.</div>${youG()}<button class="waitbtn" disabled>Waiting for Gayan...</button></div>`;
  if (k === 'tg-onway') return `<div class="hero"><div class="h-eb">You're on your way.</div><div class="h-title">${ic(icon,1.8)}<span>${sess()}</span></div><div class="h-when">${P2.time}</div>${hrow('pin',esc(P2.place))}${stline('Gayan',S.gp!=='idle',S.gp==='here'?'Here':S.gp==='ready'?'Ready':'Not checked in')}${btn("I'm here",'tg-here')}</div>`;
  if (k === 'tg-idle') return `<div class="hero"><div class="h-eb">Today's the day.</div>${youG()}<div class="h-title">${ic(icon,1.8)}<span>${sess()}</span></div><div class="h-when">${P2.time}</div>${hrow('pin',esc(P2.place))}${stline('Gayan',S.gp!=='idle',S.gp==='ready'?'Ready':'Not checked in')}${btn("I'm on my way",'tg-onway')}</div>`;
  if (k.startsWith('sep-')){
    const sub = k === 'sep-youdone' ? 'You showed up. Waiting for Gayan.' : k === 'sep-gdone' ? 'Gayan has shown up. Your turn.' : 'Do it whenever suits you today.';
    return `<div class="hero"><div class="h-eb">Today's commitment</div><div class="h-title">${ic(icon,1.8)}<span>${sess()}</span></div><div class="h-when">${P2.day}</div>${youG()}${stline('You',S.youDone,S.youDone?'Done':'Not yet')}${stline('Gayan',S.gDone,S.gDone?'Done':'Not yet')}<div class="h-sub">${sub}</div>${S.youDone?'<button class="waitbtn" disabled>Waiting for Gayan...</button>':btn(T().go,'start-sep')}</div>`;
  }
  if (k === 'done') return `<div class="hero done"><div class="h-eb">You both showed up.</div><div class="h-title">${ic('fire',1.8)}<span>${sess()} completed</span></div>${youG()}<div class="h-kept">${ic('fire',1.8)}${keptTxt(S.kept)}</div></div>
    <div class="hero"><div class="h-eb">Your next commitment</div><div class="h-title">${ic(icon,1.8)}<span>${T().act}</span></div><div class="h-when">${P2.next}</div>${btn("See what's next",'see-next')}</div>`;
  return `<div class="hero"><div class="h-eb">You're all set.</div><div class="h-sub" style="margin:0;">Next commitment</div><div class="h-title">${ic(icon,1.8)}<span>${T().act}</span></div><div class="h-when">${P2.next}</div>${youG()}${ghost('View commitment','',undefined,'commit')}</div>`;
}

/* ---------- chrome ---------- */
const greet = () => { const h = new Date().getHours(); return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night'; };
const appBar = () => `<div class="topbar"><div class="logo">choner<span>.</span></div><div class="avatar-chip">${esc(initials(ME))}</div></div>`;
const BADGE_KEYS = ['matched','resched','missed','tg-idle','tg-onway','tg-both','tg-together','sep-none','sep-gdone'];
const badgeFor = to => {
  if (to === 'find') return S.pstate === 'match';
  if (to === 'tab-challenges') return S.challenge && !S.challengeDone && S.pstate === 'partnered' && BADGE_KEYS.includes(stateKey());
  return false;
};
function navBar(active){
  const items = [['home','Home','home'],['target','Challenges','tab-challenges'],['find','Find','find'],['community','Community','tab-community']];
  return `<div class="nav">${items.map(([k,l,to]) => { const on = to === active; const dot = badgeFor(to) ? '<i class="nbadge" aria-label="Needs you"></i>' : '';
    return `<button class="navitem ${on?'on':'off'}" data-go="${to}" style="background:none;border:none;cursor:pointer;font-family:inherit;"><span style="color:${on?'#FD5B01':'#fff'};position:relative;display:inline-flex;">${ic(k,2)}${dot}</span><div class="lbl">${l}</div></button>`; }).join('')}</div>`;
}
function qrSvg(){
  const N = 21; let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let d = ''; const finder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (finder(x, y)) continue; if (rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`; }
  const f = (x, y) => `<path fill="#001827" fill-rule="evenodd" d="M${x} ${y}h7v7h-7zM${x+1} ${y+1}v5h5v-5z"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="#001827"/>`;
  return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" aria-label="Session QR code"><rect width="${N}" height="${N}" fill="#fff"/><path fill="#001827" d="${d}"/>${f(0,0)}${f(N-7,0)}${f(0,N-7)}</svg>`;
}

/* ---------- notes ---------- */
const NOTES = {
  nochallenge:['No challenge','Onboarding always creates a challenge now, so nobody starts here. It is reached by ending or finishing one. Nothing to show, so the whole page is one invitation.',['One card and one button: "Go to Challenges". Challenges owns creating, ending and the history, so Home hands over rather than opening the picker itself','The same card inside the Challenges tab says "Create my first commitment" and opens the picker there','No heart and no Pulse energy is needed yet: the Pulse below still shows Choner is alive','Empty states are never "no check-ins yet". They tell the user what to do'],null],
  nopartner:['First login, challenge, no partner','The most common first Home. The challenge exists, a person to do it with is what is missing. The heart shows "You + ?".',['Hero: "Your first commitment", the activity, and no weekly numbers until a pair agrees them: "Someone to show up with is all that\'s missing."','One button only: "Find a partner", and all it does is switch to the Find tab. Home never starts a search, opens a share sheet or resumes a half-filled form: a Home button may only change tab, and it lands on that tab\'s own top screen',
     'Find\'s screen carries all three doors (radar, "Invite someone you know", "Have an invite code?"), so the choice is made in one place and the search state can only be set from one place','Heart card shows You + ? (the left half is filled, the right half is dashed)','Nobody can log anything without a partner (no Solo mode)'],null],
  match:['A match is waiting','A search found someone. Accepting happens in Find, which owns matching, so Home only points there. The Find tab shows an orange dot until the user has answered.',['Hero: "You found a match", Take a look and say yes, See your match (opens Find)','Find shows the match with Let\'s do this / Not quite right','Orange dot on the Find tab while a match needs an answer'],null],
  finding:['Searching for a partner','Same page, the hero now shows the shared radar in its searching state.',['Home shows only a small pulsing "Searching" indicator. Tapping it opens the Find tab, which owns the full radar and Stop looking','"We\'ll notify you the moment you\'re matched."','Invite instead is still offered on Home'],null],
  invited:['Invite sent, waiting','The invite went out by link (or email), with a 6-character code as backup. The challenge starts the moment they join.',['"Waiting for your partner to join."','See your invite opens Find, which shows the code, Copy, Share again and Cancel invite','One at a time: finding a match cancels the invite (asks first)'],null],
  matched:['Partner found, nothing planned yet','A match is not the destination. The destination is two people agreeing to show up.',['"You found your person", You + Gayan, "Now let\'s plan your first run."','Primary: Plan your first run (opens the planning screen in the Challenges tab, which owns planning)','Heart is now full and the relationship label reads You + Gayan'],null],
  planned:['Commitment planned','The next action is unmistakable without opening Challenges.',['Title, day and time, place (together) or "Separately, together"','Gayan and You status lines','CTA before the day: View commitment (opens Challenges)','Coming Up is removed from Home: Challenges owns upcoming commitments'],null],
  resched:['Partner moved the plan','Not in the Home doc: derived from the reschedule step in the Find and Challenges prototype.',['Shows the new time and the old one','Accept, or Suggest another (opens planning)'],'Confirm wording and whether Home should carry this at all, or leave it to a notification and the Challenges tab.'],
  'tg-idle':['The day, together mode','Today\'s the day. Partner status and one action.',['CTA: I\'m on my way','Both must say they are here before anything opens'],null],
  'tg-onway':['On my way','Tracked per person. No live location, only taps.',['CTA: I\'m here','Gayan\'s status shown'],null],
  'tg-wait':['Here, waiting for the partner','You are here, Gayan is not yet.',['A disabled waiting button, no dead end: use "Gayan: next step" above to move him on'],null],
  'tg-both':['Both here, confirm with QR','Both people are physically together, so the existing QR flow confirms it.',['CTA: Confirm with QR (opens the QR screen in Challenges)','A successful scan returns to Home showing "You\'re together."'],null],
  'tg-together':['Together, confirmed','"You\'re together. 3 km run starts now."',['Finish is one tap, no photo, no question','It completes the commitment and adds one to the shared count'],null],
  'sep-none':['The day, separately together','Same commitment, own place. Both status lines visible.',['CTA: Start my run (opens the Log screen in Challenges, which owns the day-of flow)','Habit challenges use the same state with a different button label'],null],
  'sep-gdone':['Separately: your partner showed up','"Gayan has shown up. Your turn."',['The nudge is the point: my partner has shown up, now it is my turn'],null],
  'sep-youdone':['Separately: you showed up, waiting','You are done, Gayan is not yet.',['Waiting button, then "You both showed up" the moment Gayan finishes'],null],
  missed:['Missed the session','Not in the Home doc: derived from the recovery flow ("Can\'t today") in the Find and Challenges prototype.',['Tone: "It happens to everyone. What matters is that you keep showing up."','Move it opens planning; I\'ll catch up dismisses'],'Open: does a miss reset "in a row"? The doc does not say.'],
  done:['Both showed up','Accomplishment first, then the next commitment.',['"You both showed up.", the session, the kept count','Below it: Your next commitment and See what\'s next','Kept count rose by one, the heart grew if a milestone was crossed'],null],
  idle:['All set, nothing due','Never empty: it shows what is next.',['"You\'re all set." then the next commitment','View commitment is optional'],null],
  complete:['Challenge complete','Not in the Home doc: the finish line of a challenge. The relationship count stays.',['"Challenge complete", the kept count, Start your next challenge','Heart keeps its stage'],'Open: what happens to the partner when the next challenge starts? Same partner by default, or back to Find?'],
  ended:['Match ended','Not in the Home doc. Uses the neutral copy locked earlier: never who blocked or reported whom.',['"This match has ended." then "Your challenge continues. You can look for a new partner anytime."','Heart returns to You + ?'],null]
};
const OWN = [['Matching, searching, radar, Stop looking','Find'],['Invite share sheet','Home or Find (same sheet); the waiting invite and its code live in Find'],['One at a time','An invite and a search never run together; switching asks first'],['Plan, move, recover, QR, log','Challenges'],['One-tap: I\'m on my way, I\'m here, Finish, Accept move','Home shortcut, same action as Challenges'],['Upcoming, past, browse challenges','Challenges'],['Partner photo, Report/Block, who is here','Find'],['Relationship heart, kept count, journey','Home'],['Pulse and Just Happened (anonymous counts)','Home'],['Shared milestones (named)','Community']];
const SHARED_NOTES = ['Home flow: header, the shared heart on top, Your First / Next Commitment, Choner Pulse, Just Happened.','Choner Pulse is one card (it replaces "Choner is moving" and "People are showing up"). Tap a tile to open Find filtered to that activity. No profiles inside the Pulse.','Just Happened is a square dark card that changes by itself. It is not tappable and never a feed.'];

/* ---------- presets (rail) ---------- */
const P = (id, group, label, set) => ({ id, group, label, set });
const PRESETS = [
  P('nochallenge','First login','No challenge',{first:true,challenge:false}),
  P('nopartner','First login','Challenge, no partner',{first:true,challenge:true,pstate:'none'}),
  P('finding','First login','Searching for a partner',{first:true,challenge:true,pstate:'finding'}),
  P('match','First login','Match to accept',{first:true,challenge:true,pstate:'match'}),
  P('invited','First login','Invite sent',{first:true,challenge:true,pstate:'waiting'}),
  P('matched','First login','Partner found, not planned',{first:true,challenge:true,pstate:'partnered',cs:'matched'}),
  P('planned','Partnered','Planned',{first:false,challenge:true,pstate:'partnered',cs:'planned',kept:6}),
  P('resched','Partnered','Partner moved the plan',{first:false,challenge:true,pstate:'partnered',cs:'resched',kept:6}),
  P('tg-idle','Day of, together','Today\'s the day',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'together',tg:'idle',kept:6}),
  P('tg-onway','Day of, together','On my way',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'together',tg:'onway',gp:'ready',kept:6}),
  P('tg-wait','Day of, together','Here, waiting for Gayan',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'together',tg:'here',gp:'ready',kept:6}),
  P('tg-both','Day of, together','Both here, QR',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'together',tg:'here',gp:'here',kept:6}),
  P('tg-together','Day of, together','Together, confirmed',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'together',tg:'here',gp:'here',together:true,kept:6}),
  P('sep-none','Day of, separately','Not started',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'separate',kept:6}),
  P('sep-gdone','Day of, separately','Gayan showed up',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'separate',gDone:true,kept:6}),
  P('sep-youdone','Day of, separately','You showed up',{first:false,challenge:true,pstate:'partnered',cs:'today',mode:'separate',youDone:true,kept:6}),
  P('missed','After the day','Missed the session',{first:false,challenge:true,pstate:'partnered',cs:'missed',kept:6}),
  P('done','After the day','Both showed up',{first:false,challenge:true,pstate:'partnered',cs:'done',kept:7}),
  P('idle','After the day','All set',{first:false,challenge:true,pstate:'partnered',cs:'idle',kept:7}),
  P('complete','Other','Challenge complete',{first:false,challenge:true,challengeDone:true,pstate:'partnered',cs:'idle',kept:14}),
  P('ended','Other','Match ended',{first:false,challenge:true,pstate:'ended',kept:0})
];
const GROUPS = []; PRESETS.forEach(p => { let g = GROUPS.find(x => x[0] === p.group); if (!g) GROUPS.push(g = [p.group, []]); g[1].push(p); });
function applyPreset(id){
  const p = PRESETS.find(x => x.id === id); const keep = { pulse:S.pulse };
  S = Object.assign(fresh(), keep, p.set); S.hist = []; S.cur = 'home'; render();
}

/* ---------- screens ---------- */
const SC = {};
SC.home = { bar:() => appBar(), nav:() => navBar('home'), body:() => {
  const head = `<div class="greet1">${S.first ? 'Welcome' : greet()}, <b>${esc(firstName(ME))}</b></div>`;
  const rel = S.challenge ? relCard() : '';
  return `${head}${rel}${hero()}${pulseCard()}${justHappened()}`; } };
SC.find = { bar:() => appBar(), nav:() => navBar('find'), body:() => {
  const list = PEOPLE.filter(p => S.filter === 'all' || p[1] === S.filter);
  const partnered = S.pstate === 'partnered' && !S.challengeDone, finding = S.pstate === 'finding';
  let top;
  if (S.pstate === 'match') top = `<div class="center" style="margin:4px 0 12px;"><div style="display:flex;justify-content:center;margin-bottom:12px;">${anon(1,96)}</div><div class="p-h1" style="margin-bottom:6px;">You found <b>a Match.</b></div><div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--green);font-weight:500;">${ic('check',2.4).replace('<svg','<svg style="width:14px;height:14px"')} Gayan, photo confirmed</div></div><ul class="reasons"><li><span class="ck">${ic('check',2.6)}</span>You both want to run.</li><li><span class="ck">${ic('check',2.6)}</span>You're both in the Nugegoda area.</li><li><span class="ck">${ic('check',2.6)}</span>You're both looking for someone to keep you accountable.</li></ul><div style="margin:8px 0 6px;">${btn("Let's do this",'accept-match')}${ghost('Not quite right','decline-match')}</div>`;
  else if (partnered) top = `<div class="procard center"><div class="seats" style="margin-bottom:8px;">${seat(initials(ME),true)}${seat('GS',true,'p2s')}</div><b>You and Gayan</b><div class="hint">Paired on ${weekTitle()}</div></div>`;
  else if (S.pstate === 'waiting') top = `<div class="hero"><div class="h-eb">Waiting for your friend to join</div><div class="h-sub" style="margin:0;">Your challenge starts the moment they join.</div><div class="codebox"><div><small>Invite code</small><b>RUN4K7</b></div><button class="pill" data-act="copy-code">Copy</button></div>${btn('Share again','open-share')}</div><div class="center">${ghost('Find a match instead','begin-find')}${ghost('Cancel invite','cancel-invite')}</div>`;
  else if (finding) top = `<div class="radar act" role="img" aria-label="Searching"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="rc">Looking\u2026</span></div><div class="center"><b>Looking for your partner</b><div class="hint">We'll notify you the moment you're matched.</div></div><button class="btn-g" data-act="stop-find">Stop looking</button><button class="btn-g" data-act="open-share">Invite someone you know instead</button>`;
  else if (!S.challenge) top = `<div class="procard center"><b>Pick a challenge first</b><div class="hint" style="margin-bottom:10px;">Find matches you around a challenge.</div>${btn('Go to Challenges','',{go:'tab-challenges'})}</div>`;
  else top = `<button class="radar act" data-act="begin-find" aria-label="Find a match"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="rc">Find a<br>Match</span></button><div class="tap">Tap to find a match</div><div class="orl"><span>or</span></div><button class="btn-o" data-act="open-share">Invite someone you know</button><div class="center" style="margin-top:6px;"><button class="linkq" style="margin:0 auto;" data-act="code-entry">Have an invite code?</button></div>`;
  return `<div class="p-h1" style="margin-bottom:4px;">Find</div><div class="p-sub">${partnered?'Your match is here.':'Someone else is looking for you too.'}</div>${top}
    <div class="sect">Who else is here</div>
    <div class="fchips">${[['all','All'],['run','Running'],['walk','Walking'],['workout','Workouts'],['yoga','Yoga']].map(([k,l]) => `<button class="${S.filter===k?'on':''}" data-act="filter" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="card" style="padding:4px 16px;">${list.length ? list.map((p,i) => `<div class="feed-row"><div class="feed-init" style="background:${HUES[i%HUES.length]};">${initials(p[0])}</div><div><div class="feed-name">${p[0]}</div><div class="feed-meta">${p[2]}</div></div></div>`).join('') : '<div class="tl-e">Nobody here yet.</div>'}</div>`; } };
SC.browse = { bar:() => '', nav:() => navBar('tab-challenges'), body:() => `${hdr('Choose a challenge')}${Object.keys(TPL).map(k => { const t = TPL[k]; return `<button class="choice" data-act="start-tpl" data-v="${k}"><div class="ic">${ic(t.icon,1.8)}</div><div><div class="t">${t.act} ${S.cadence}× this week</div><div class="d">${t.sess(t.amt)}</div></div></button>`; }).join('')}` };
SC.plan = { bar:() => '', nav:() => navBar('tab-challenges'), onEnter:() => { S.pd = { day:S.plan.day, time:S.plan.raw, place:S.plan.place, next:S.plan.nextDay }; }, body:() => { const m = curMode();
  return `${hdr(`Plan your ${noun()}`)}<div class="habit"><b>${weekTitle()}</b><small>with Gayan</small></div>
    ${T().tg ? `<div class="flabel">How will you do it?</div><button class="choice ${m==='together'?'on':''}" data-act="set-mode" data-v="together"><div class="ic">${ic('together',1.8)}</div><div><div class="t">${T().act} together</div><div class="d">Meet in person, confirm with a QR code.</div></div></button><button class="choice ${m==='separate'?'on':''}" data-act="set-mode" data-v="separate"><div class="ic">${ic('separate',1.8)}</div><div><div class="t">${T().act} separately, together</div><div class="d">Same commitment, your own place.</div></div></button>` : `<div class="banner">This one is done separately, together.</div>`}
    <div class="flabel" style="margin-top:8px;">Day</div><div class="sel-wrap" style="margin-bottom:14px;"><select id="pl-day" aria-label="Day">${DAYS.map(d => `<option ${d===S.pd.day?'selected':''}>${d}</option>`).join('')}</select></div>
    <div class="flabel">Time</div><input class="txt" type="time" id="pl-time" value="${S.pd.time}" aria-label="Time" style="margin-bottom:14px;">
    ${m==='together' ? `<div class="flabel">Place</div><input class="txt" id="pl-place" value="${esc(S.pd.place)}" placeholder="Where will you meet?" aria-label="Place">` : ''}
    <div class="foot">${btn('Confirm plan','plan-confirm')}</div>`; } };
SC.commit = { bar:() => '', nav:() => navBar('tab-challenges'), body:() => `${hdr('Your commitment')}<div class="hero"><div class="h-eb">${curMode()==='together'?'Together':'Separately, together'}</div><div class="h-title">${ic(T().icon,1.8)}<span>${sess()}</span></div><div class="h-when">${S.plan.day} · ${S.plan.time}</div>${curMode()==='together'?hrow('pin',esc(S.plan.place)):''}${youG()}</div><div class="procard"><div class="hint" style="margin:0 0 4px;">Next after that</div><b style="font-weight:500;">${S.plan.next}</b></div><button class="btn" data-go="plan" style="margin-bottom:10px;">Change the plan</button>${ghost('Back to Home','',undefined,'home')}` };
SC.qr = { bar:() => '', nav:() => navBar('tab-challenges'), body:() => `${hdr("Confirm you're together")}<div class="p-sub">Show this to Gayan, or scan theirs.</div><div class="cam"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i><div class="scan"></div><div class="cap">Point at Gayan's code</div></div><div class="qrbox">${qrSvg()}<small>Your session code</small></div><button class="proto" data-act="qr-scanned" style="margin-top:10px;">Simulate: the scan succeeds</button>` };
SC.journey = { bar:() => '', nav:() => navBar('home'), body:() => { const k = S.kept, next = STAGES.find(m => m > k); const cap = ['First sign of progress','Feels established','A stronger shared history','Meaningful long-term consistency','A significant shared journey'];
  return `${hdr('Your journey')}<div class="center"><div class="hwrap st${stageOf(k)}" style="margin:6px auto;"><div class="glow"></div><div class="rings"><i></i><i></i></div>${heartSvg(true,true)}</div><div class="streak"><div class="n">${k}</div><div class="l">commitments kept</div></div></div>
    <div class="p-sub center" style="margin-top:12px;">The longer two people keep showing up together, the more their shared relationship evolves.</div>
    <div class="procard">${STAGES.map((m,i) => `<div class="run" style="margin-bottom:10px;"><span class="stic ${k>=m?'ok':''}" style="flex:none;">${ic(k>=m?'check':'clock',2.4)}</span><div><b style="font-weight:500;">${m} ${m===1?'commitment':'commitments'}</b><small>${cap[i]}</small></div></div>`).join('')}${next?`<div class="hint">${next-k} more to reach ${next}.</div>`:''}</div>`; } };
SC.log = { bar:() => '', nav:() => navBar('tab-challenges'), body:() => `${hdr('Log your '+noun())}<div class="hero"><div class="h-eb">Today's commitment</div><div class="h-title">${ic(T().icon,1.8)}<span>${sess()}</span></div>${youG()}</div><div class="p-sub">Tap done when you have finished. Gayan is told you showed up.</div>${btn('Done','sep-done')}` };
SC['tab-challenges'] = { bar:() => appBar(), nav:() => navBar('tab-challenges'), body:() => {
  const has = S.challenge, partnered = S.pstate === 'partnered' && !S.challengeDone;
  const upcoming = partnered && ['planned','today','resched','idle','missed'].includes(S.cs);
  return `<div class="p-h1" style="margin-bottom:4px;">Challenges</div><div class="p-sub">What you've committed to.</div>
    ${has ? `<div class="own">Same card as Home</div>${hero(1)}` : hero(1)}
    ${upcoming ? `<div class="sect">Upcoming</div><div class="lrow" style="cursor:default;">${ic('calendar',1.8)}<span class="lt">${sess()}<small>${S.plan.day} \u00b7 ${S.plan.time}</small></span></div><div class="lrow" style="cursor:default;">${ic('calendar',1.8)}<span class="lt">${T().act}<small>${S.plan.next}</small></span></div>` : ''}
    ${partnered && S.kept > 0 ? `<div class="sect">Past</div>${Array.from({length:Math.min(S.kept,3)},(_, i) => `<div class="lrow" style="cursor:default;">${ic('check',2)}<span class="lt">Both showed up<small>${sess()}</small></span></div>`).join('')}` : ''}
    ${has && !S.challengeDone ? '<div class="banner" style="margin-top:14px;">One active commitment at a time. End this one to start another.</div>' : ''}`; } };
SC['tab-community'] = { bar:() => appBar(), nav:() => navBar('tab-community'), body:() => `<div class="p-h1" style="margin-bottom:4px;">Community</div><div class="p-sub">What people are sharing.</div><div class="banner">Placeholder in this Home prototype.</div>` };

/* ---------- overlays ---------- */
function oneAtATime(to, then){
  if (to === 'invite' && S.pstate === 'finding'){ S.dlg = { t:'Stop searching?', m:'Inviting someone you know stops your search for a match. You can search again any time.', btns:[['Keep searching', null], ['Invite instead', () => { S.pstate = 'none'; then(); }]] }; render(); return; }
  if (to === 'find' && S.pstate === 'waiting'){ S.dlg = { t:'Cancel your invite?', m:'Finding a match cancels your invite. The link and code RUN4K7 stop working.', btns:[['Keep my invite', null], ['Find a match instead', () => { S.pstate = 'none'; then(); }]] }; render(); return; }
  then();
}
function sheetHTML(){
  if (S.sheet === 'share') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Share your <b>invite</b></div><div class="p-sub">Your message, the link and code RUN4K7 always travel together, whichever you pick.</div>${[['WhatsApp','chat'],['Messages','chat'],['Copy','share']].map(o => `<button class="choice mini" data-act="share-via" data-v="${o[0]}"><div class="ic">${ic(o[1],1.8)}</div><div class="t">${o[0]}</div></button>`).join('')}<button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  if (S.sheet === 'finish-sep') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Log your <b>${noun()}</b></div><div class="p-sub">Tap done when you have finished. Gayan is told you showed up.</div><button class="btn" data-act="sep-done">Done</button><button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  return '';
}
function dlgHTML(){ if (!S.dlg) return ''; return `<div class="dlgwrap"><div class="dlg" role="alertdialog"><b>${esc(S.dlg.t)}</b><p style="white-space:pre-line;">${esc(S.dlg.m)}</p><div class="db">${S.dlg.btns ? S.dlg.btns.map((b,i) => `<button data-act="dlg" data-v="${i}">${esc(b[0])}</button>`).join('') : '<button data-act="dlg">OK</button>'}</div></div></div>`; }

/* ---------- render ---------- */
function renderRail(){
  const key = stateKey(); const cur = PRESETS.find(p => p.id === key);
  document.getElementById('rail').innerHTML = GROUPS.map(([g, ps]) => `<div><div class="grp-t">${g}</div><div class="rail-list">${ps.map(p => `<button data-preset="${p.id}" class="${cur && cur.id===p.id && S.cur==='home'?'on':''}"><span class="ph"></span>${p.label}</button>`).join('')}</div></div>`).join('');
}
function renderNotes(){
  const n = NOTES[stateKey()];
  document.getElementById('notes').innerHTML = `<div class="note-card"><div class="note-ph">${S.first?'First login':'Returning'}</div><div class="note-t">${n[0]}</div><div class="note-what">${n[1]}</div>
    <div><div class="note-h" style="margin-bottom:8px;">What you see</div><ul class="note-ul">${n[2].map(b => `<li>${b}</li>`).join('')}</ul></div>${n[3]?`<div class="flag"><b>Note.</b> ${n[3]}</div>`:''}</div>
    <div class="note-card"><div class="note-h">Who owns what</div><ul class="note-ul">${OWN.map(o => `<li><b style="font-weight:600;">${o[0]}:</b> ${o[1]}</li>`).join('')}</ul></div><div class="note-card"><div class="note-h">Across every state</div><ul class="note-ul">${SHARED_NOTES.map(b => `<li>${b}</li>`).join('')}<li>Pulse numbers are examples. They must be real aggregates, hidden or reworded below a minimum (see Quiet).</li></ul></div>`;
}
function syncSegs(){
  const set = (id, attr, val) => document.querySelectorAll('#'+id+' button').forEach(b => b.classList.toggle('on', b.dataset[attr] === val));
  set('sLogin','v', S.first ? 'first' : 'ret');
  set('sChal','v', !S.challenge ? 'none' : S.challengeDone ? 'done' : 'active');
  set('sPart','v', S.pstate === 'none' ? 'none' : S.pstate === 'waiting' ? 'waiting' : S.pstate);
  set('sCs','v', S.cs);
  set('sMode','v', curMode());
  set('sPulse','v', S.pulse);
}
function countUp(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('#phone .cu').forEach(el => {
    const to = +el.dataset.to; if (reduce){ el.textContent = to; return; }
    const t0 = performance.now(), d = 650;
    const step = t => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function startMoments(){
  clearInterval(momT);
  momT = setInterval(() => { if (S.cur !== 'home' || S.pulse === 'quiet' || S.sheet || S.dlg) return; S.mom++; const b = document.getElementById('mbox'); if (b) b.innerHTML = momentInner(); }, 4200);
}
let lastHomeSig = '';
function render(){
  const s = SC[S.cur]; const phone = document.getElementById('phone');
  const keep = phone.querySelector('.content') ? phone.querySelector('.content').scrollTop : 0;
  const bar = s.bar(), nav = s.nav();
  phone.innerHTML = `<div class="statusbar"><span>9:41</span><span>5G</span></div>${bar}<div class="content${bar?' tb':''}${nav?' bn':''}" id="content">${s.body()}</div>${nav}${sheetHTML()}${dlgHTML()}`;
  if (phone.dataset.cur === S.cur) phone.querySelector('.content').scrollTop = keep;
  phone.dataset.cur = S.cur;
  renderRail(); renderNotes(); syncSegs();
  if (S.cur === 'home'){ const sig = stateKey() + S.pulse; if (sig !== lastHomeSig) countUp(); lastHomeSig = sig; } else lastHomeSig = '';
}
function go(id, o){
  o = o || {}; S.dlg = null; S.sheet = null;
  if (o.jump) S.hist = []; else if (o.replace) {} else if (id !== S.cur) S.hist.push(S.cur);
  S.cur = id; if (SC[id].onEnter) SC[id].onEnter();
  lastHomeSig = ''; render(); const c = document.getElementById('content'); if (c) c.scrollTop = 0;
}
function goBack(){ S.dlg = null; S.sheet = null; S.cur = S.hist.length ? S.hist.pop() : 'home'; lastHomeSig = ''; render(); const c = document.getElementById('content'); if (c) c.scrollTop = 0; }

/* ---------- actions ---------- */
function act(a, v){
  switch (a){
    case 'noop': return;
    case 'dlg': { const d = S.dlg; S.dlg = null; if (d && d.btns && d.btns[+v] && d.btns[+v][1]) { d.btns[+v][1](); return; } break; }
    case 'begin-find': oneAtATime('find', () => { S.pstate = 'finding'; render(); }); return;
    case 'copy-code': S.dlg = { t:'Code copied', m:'RUN4K7 is on your clipboard.' }; break;
    case 'code-entry': S.dlg = { t:'Have an invite code?', m:'Opens the invite code screen (see the app-flow prototype, A6). Enter the 6-character code from your friend\'s message.' }; break;
    case 'cancel-invite': S.dlg = { t:'Cancel your invite?', m:'The link and code RUN4K7 stop working.', btns:[['Keep it', null], ['Cancel invite', () => { S.pstate = 'none'; render(); }]] }; break;
    case 'stop-find': S.pstate = 'none'; break;
    case 'accept-match': S.pstate = 'partnered'; S.cs = 'matched'; break;
    case 'decline-match': S.pstate = 'finding'; break;
    case 'open-share': oneAtATime('invite', () => { S.sheet = 'share'; render(); }); return;
    case 'sheet-close': S.sheet = null; break;
    case 'share-via': S.sheet = null; S.pstate = 'waiting'; if (v === 'Copy'){ S.dlg = { t:'Copied', m:['Dinesh is challenging you to go for a run. Are you up for it?','https://choner.app/i/RUN4K7','Code: RUN4K7'].join(String.fromCharCode(10)) }; } break;
    case 'start-tpl': S.tpl = v; S.challenge = true; S.challengeDone = false; S.pstate = S.pstate === 'partnered' ? 'partnered' : 'none'; S.first = S.first; go('home', {replace:true}); S.hist = []; return;
    case 'tile': S.filter = v; go('find'); return;
    case 'filter': S.filter = v; break;
    case 'tg-onway': S.tg = 'onway'; S.gp = S.gp === 'idle' ? 'ready' : S.gp; break;
    case 'tg-here': S.tg = 'here'; break;
    case 'open-qr': go('qr'); return;
    case 'qr-scanned': S.together = true; goBack(); return;
    case 'finish-tg': finish(); break;
    case 'start-sep': go('log'); return;
    case 'sep-done': S.sheet = null; S.youDone = true; sepCheck(); goBack(); return;
    case 'see-next': S.cs = 'idle'; resetDay(); break;
    case 'accept-resched': S.plan.day = 'Sunday'; S.plan.time = '7:00 AM'; S.plan.raw = '07:00'; S.cs = 'planned'; break;
    case 'catchup': S.cs = 'idle'; resetDay(); break;
    case 'set-mode': S.mode = v; break;
    case 'plan-confirm': { const d = S.pd; S.plan.day = d.day; S.plan.raw = d.time; S.plan.time = fmtTime(d.time); S.plan.place = (d.place || '').trim() || 'Your meeting place'; S.plan.nextDay = d.next; S.plan.next = d.next + ' · ' + fmtTime(d.time); S.cs = 'planned'; resetDay(); go('home', {replace:true}); S.hist = []; return; }
  }
  render();
}

/* ---------- events ---------- */
const phoneEl = document.getElementById('phone');
phoneEl.addEventListener('input', e => { const id = e.target.id; if (!S.pd) return;
  if (id === 'pl-day') S.pd.day = e.target.value; else if (id === 'pl-time') S.pd.time = e.target.value || '07:00'; else if (id === 'pl-place') S.pd.place = e.target.value; });
phoneEl.addEventListener('click', e => {
  const back = e.target.closest('[data-back]'); if (back){ goBack(); return; }
  const t = e.target.closest('[data-go],[data-act]'); if (!t || t.disabled) return;
  if (t.dataset.act){ act(t.dataset.act, t.dataset.v); return; }
  go(t.dataset.go, {jump: ['home','find','tab-challenges','tab-community'].includes(t.dataset.go)});
});
document.getElementById('rail').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (b) applyPreset(b.dataset.preset); });
const seg = (id, fn) => document.getElementById(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b){ fn(b.dataset.v); S.cur = S.cur; render(); } });
seg('sLogin', v => { S.first = v === 'first'; });
seg('sChal', v => { if (v === 'none'){ S.challenge = false; S.challengeDone = false; } else { S.challenge = true; S.challengeDone = v === 'done'; } });
seg('sPart', v => { S.challenge = true; S.pstate = v; if (v === 'partnered' && !S.cs) S.cs = 'matched'; });
seg('sCs', v => { S.challenge = true; S.pstate = 'partnered'; S.cs = v; resetDay(); if (v === 'done' || v === 'idle') S.kept = Math.max(S.kept, 1); });
seg('sMode', v => { S.mode = v; if (S.cs === 'today') resetDay(); });
seg('sPulse', v => { S.pulse = v; lastHomeSig = ''; });
document.getElementById('sim-g').onclick = () => { gayanStep(); render(); };
document.getElementById('sim-km').onclick = () => { S.kept = Math.max(0, S.kept - 1); render(); };
document.getElementById('sim-kp').onclick = () => { S.kept++; render(); };
document.getElementById('sim-reset').onclick = () => { S = fresh(); lastHomeSig = ''; render(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape'){ S.sheet = null; S.dlg = null; render(); } });
applyPreset('nopartner');
startMoments();
