
IC.bike = '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l-1.5-3H6M15 9l-2 7"/>';
IC.menu = '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>';
const btn = (label, act, o) => { o = o || {}; return `<button class="btn${o.icon&&!(o.cls||'').includes('row')?' row':''}${o.cls?' '+o.cls:''}" ${o.go?`data-go="${o.go}"`:`data-act="${act}"`} ${o.v!==undefined?`data-v="${esc(o.v)}"`:''} ${o.dis?'disabled':''}>${o.icon?ic(o.icon,2):''}${label}</button>`; };
const ghost = (label, act, v, go) => `<button class="btn-g" ${go?`data-go="${go}"`:`data-act="${act}"`} ${v!==undefined?`data-v="${esc(v)}"`:''}>${label}</button>`;
const hdr = (title, menu) => `<div class="hdr"><button class="backc" data-back="1" aria-label="Back">${ic('back',2.2)}</button><div class="ht">${esc(title)}</div>${menu?`<button class="cl" data-act="menu" aria-label="More">${ic('menu',2)}</button>`:''}</div>`;
const esc2 = esc;

/* ---------- MVP activities (decided 2026-09-26) ---------- */
const ACTS = {
  run:{l:'Running',verb:'Run',noun:'run',i:'run',u:'km',d:3,step:0.5},
  jog:{l:'Jogging',verb:'Jog',noun:'jog',i:'run',u:'km',d:3,step:0.5},
  walk:{l:'Walking',verb:'Walk',noun:'walk',i:'walk',u:'km',d:4,step:0.5},
  cycle:{l:'Cycling',verb:'Cycle',noun:'ride',i:'bike',u:'km',d:10,step:1},
  yoga:{l:'Yoga',verb:'Yoga',noun:'session',i:'leaf',u:'min',d:30,step:5},
  work:{l:'Workouts',verb:'Workout',noun:'workout',i:'dumb',u:'',d:0,step:1}
};
const EX = { push:['Push-ups','reps',20,5], squat:['Squats','reps',30,5], lunge:['Lunges','reps per leg',12,2], situp:['Sit-ups','reps',30,5], pull:['Pull-ups','reps',10,1], plank:['Plank','sec',60,10], burpee:['Burpees','reps',15,5], jj:['Jumping jacks','reps',50,10], stretch:['Stretching routine','min',10,5] };
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const fmtTime = t => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const REASONS = [['sleep','Too tired'],['clock','No time'],['cloud','Weather'],['briefcase','Work'],['cross','Not feeling well'],['pencil','Something else']];

/* ---------- state ---------- */
function sess(n, day, o){ return Object.assign({ n, day, time:'7:00 AM', place:'Diyasaru Park', mode:'together', st:'planned', you:'idle', gy:'idle', moved:null, repair:false }, o||{}); }
function fresh(){
  return { cur:'tab', hist:[], has:true, canMeet:true, act:'run', ex:'push', amt:3, cadence:2, partner:'paired', matchedOn:'Friday', week:3,
    // starget: the streak the person chose. circles: what has actually
    // happened, in order - 'done', 'missed', and everything after is 'todo'.
    // kept is the PAIR count behind the heart, which is a different number.
    starget:12, circles:['done','done','done','done','done','done'],
    owed:0, searching:false,
    sessions:[], kept:6, broken:null, repairUsed:false, proposal:null, missFor:null, matchEnded:false, justDone:false,
    sheet:null, dlg:null, menu:false, sel:0, counterFrom:null, reason:null, reasonText:'', missRecorded:false, pd:null, planKind:'next', nw:null,
    history:[{t:'Walk 3× a week', m:'Ended · August 2026'}] };
}
let S = fresh();
const A = () => ACTS[S.act];
const exOf = () => EX[S.ex];
const agreed = () => S.sessions.length > 0 || S.kept > 0;
const title = () => !agreed() ? (S.act === 'work' ? exOf()[0] : A().l) : (S.act === 'work' ? `${exOf()[0]} ${S.cadence}× a week` : `${A().verb} ${S.cadence}× a week`);
// Before a match only the ACTIVITY exists, and it is editable until a search
// starts. How much and how often are agreed with the partner, at the first plan.
const amtTxt = () => {
  if (agreed()) return S.act === 'work' ? `${S.amt} ${exOf()[1]}` : `${S.amt} ${A().u}`;
  if (S.partner === 'paired') return "You'll agree how much and how often at your first plan";
  if (S.searching || S.partner === 'searching' || S.partner === 'pending') return "Locked while you're looking for a match";
  return 'You can change this until you start searching for a match';
};
// Sessions are named by the day they fall on, never by number. "Run 2" only
// made sense inside the weekly card, and that card is gone.
const sName = s => `${s.day}'s ${S.act==='work' ? exOf()[0].toLowerCase() : A().noun}`;
const keptTxt = n => `${n} session${n === 1 ? '' : 's'}`;
// The streak row: always exactly starget circles. A miss does not add one, and
// a repair turns a missed circle back to done rather than appending.
const circleRow = () => {
  const c = S.circles.slice(0, S.starget);
  while (c.length < S.starget) c.push('todo');
  return c;
};
const circlesDone = () => circleRow().filter(x => x === 'done').length;
// target / cadence, shown as an estimate and never stored. Misses and repairs
// move it, which is exactly why it is not a fact.
const weeksLeft = () => Math.max(1, Math.ceil((S.starget - circlesDone()) / Math.max(1, S.cadence)));
const daysLeft = d => 7 - DAYS.indexOf(d);
const target = () => S.week === 1 ? Math.min(S.cadence, Math.max(1, Math.round(S.cadence * daysLeft(S.matchedOn) / 7))) : S.cadence;
const weekDone = () => S.sessions.filter(s => s.st === 'done' && !s.repair).length;
const cur = () => S.sessions.find(s => s.st === 'planned' || s.st === 'today');
const today = () => S.sessions.find(s => s.st === 'today');

/* ---------- visual pieces ---------- */
const seat = (label, on, cls) => `<div class="seat ${on?'on':''} ${cls||''}">${esc(label)}</div>`;
const youG = () => `<div class="youg"><span class="seat on sm">DD</span>${miniHeart()}<span class="seat on sm p2s">GS</span><b>You + Gayan</b></div>`;
const miniHeart = () => `<svg viewBox="0 0 24 22" width="16" height="15" aria-hidden="true" style="margin:0 4px 0 18px;"><path d="M12 21C6 17 1.5 13.4 1.5 8.5 1.5 5.5 3.7 3.5 6.3 3.5 8.7 3.5 10.7 5 12 7 13.3 5 15.3 3.5 17.7 3.5 20.3 3.5 22.5 5.5 22.5 8.5 22.5 13.4 18 17 12 21z" fill="#FD5B01"/></svg>`;
const stline = (label, ok, txt) => `<div class="stline"><span class="stic ${ok?'ok':''}">${ic(ok?'check':'clock',2.4)}</span><span>${label}</span><b>${txt}</b></div>`;
const hrow = (icn, txt) => `<div class="hrow">${ic(icn,1.8)}<span>${txt}</span></div>`;
function heartSvg(you, partner){
  const right = partner ? '<path fill="url(#gR)" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>' : '<path class="h-empty" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>';
  return `<svg class="heart" viewBox="0 0 132 124" aria-hidden="true"><defs><linearGradient id="gL" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD5B01"/><stop offset="100%" stop-color="#FD8302"/></linearGradient><linearGradient id="gR" x1="1" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD8302"/><stop offset="100%" stop-color="#FFA83D"/></linearGradient></defs>
    <path fill="${you?'url(#gL)':'none'}" stroke="${you?'none':'var(--dim)'}" stroke-width="2.4" d="M66 30 C 56 14, 32 10, 20 24 C 6 39, 10 62, 24 78 C 34 90, 52 104, 66 114 Z"/>${right}</svg>`;
}
const STAGES = [1,5,10,25,50];
const stageOf = k => STAGES.filter(m => k >= m).length;
const youStat = s => ({idle:'Not yet',onway:'On the way',here:'Here',done:'Done',later:'Later today',missed:'Missed'})[s.you];
const gyStat = s => ({idle:'Not yet',ready:'Ready',onway:'On the way',here:'Here',done:'Done',missed:'Missed'})[s.gy];

/* ---------- Challenges tab ---------- */
function activeCard(){
  const s = cur(), t = today();
  let partner;
  // No "Partner: not found yet" row: the state carries the button instead.
  if (S.partner === 'none') partner = btn('Find a Match','go-find');
  else if (S.partner === 'searching') partner = `<div class="pline"><span class="sd"><i></i><i></i><i></i></span><span>Partner: searching…</span></div><button class="linkq" data-act="go-find">Go to Find ${ic('chev',2)}</button>`;
  else if (S.partner === 'invited') partner = `<div class="pline">${ic('clock',1.8)}<span>Partner: invited, waiting to join</span></div><button class="linkq" data-act="go-find">Go to Find ${ic('chev',2)}</button>`;
  else if (S.partner === 'pending') partner = `<div class="pline">${ic('clock',1.8)}<span>Gayan · Pending. Waiting for Gayan to accept.</span></div>`;
  else partner = youG();
  // The weekly counter is gone. The streak is the only standing number, and
  // the weekly commitment speaks only when it is owed or when it is kept.
  const prog = '';
  let action = '';
  if (S.partner === 'paired'){
    const p = S.proposal;
    if (p && p.type === 'plan' && p.by === 'gy') action = `<div class="notice">${ic('calendar',1.8)}<span>Gayan suggested <b>${p.mode==='together'?'Together':'Separately, together'} · ${p.day} · ${p.time}</b>${p.mode==='together'?` at ${esc(p.place)}`:''}.</span></div><div class="btn-2">${btn('Accept','prop-accept')}<button class="btn-o" data-act="plan-counter">Suggest another</button></div>`;
    else if (p && p.type === 'plan' && p.by === 'dd') action = `<div class="notice">${ic('clock',1.8)}<span>Waiting for Gayan to accept <b>${p.mode==='together'?'Together':'Separately, together'} · ${p.day} · ${p.time}</b>. Nothing is planned until they do.</span></div>`;
    else if (p && p.by === 'gy') action = `<div class="notice">${ic('calendar',1.8)}<span>Gayan asked to ${p.type==='move'?`move ${esc(sName(s))} to <b>${p.day} · ${p.time}</b>`:`cancel ${esc(sName(s))}`}.</span></div><div class="btn-2">${btn('Accept','prop-accept')}<button class="btn-o" data-act="prop-decline">${p.type==='move'?'Keep the plan':'Keep it'}</button></div>`;
    else if (p && p.by === 'dd') action = `<div class="notice">${ic('clock',1.8)}<span>Waiting for Gayan to accept your ${p.type==='move'?`move to ${p.day} · ${p.time}`:'cancel'}. If Gayan doesn't answer before the day ends, the original plan stands.</span></div>`;
    // Nothing ended. A session needs both people, so if Gayan missed it did
    // not happen for either of you and you both owe one against the week.
    else if (S.missFor === 'gy') action = `<div class="notice">${ic('heart',1.8)}<span>Gayan missed ${esc(sName(S.sessions.find(x=>x.gy==='missed')||{day:'this one'}))}. You both owe one this week.</span></div>${!S.repairUsed?`<div class="btn-2">${btn('Repair this week','repair-plan',{v:'this'})}<button class="btn-o" data-act="repair-plan" data-v="next">Add to next week</button></div>`:ghost('Plan the next one','plan-next')}`;
    else if (S.missFor === 'dd') action = `<div class="notice">${ic('heart',1.8)}<span>You missed ${esc(sName(S.sessions.find(x=>x.you==='missed')||{day:'this one'}))}.</span></div>${btn("Tell Gayan what happened",'',{go:'miss'})}`;
    else if (t) action = t.you === 'done' ? `<div class="notice ok">${ic('check',2)}<span>You showed up. Waiting for Gayan.</span></div>${ghost('View session','open-sel',S.sessions.indexOf(t))}` : btn("Open today's session",'open-today');
    else if (s) action = btn('View session','open-sel',{v:S.sessions.indexOf(s)});
    // Nothing about the week before the first plan: the cadence is not agreed
    // yet, so the screen cannot know how many sessions a week holds.
    else if (!S.sessions.length) action = `<div class="h-sub">Now let's plan your first ${A().noun}.</div>${btn(`Plan your first ${A().noun}`,'plan-first')}`;
    else if (weekDone() >= target()) action = `<div class="notice ok">${ic('fire',1.8)}<span>You kept this week's commitment.</span></div>${btn('Plan the next one','plan-next')}`;
    else action = btn('Plan the next one','plan-next');
  }
  const mEnded = S.matchEnded ? `<div class="notice">${ic('x',2)}<span>This match has ended. Your challenge continues.</span></div>` : '';
  const tappable = S.partner === 'paired' && s;
  return `<div class="hero acard"><div class="h-eb">${agreed()?'Your commitment':"Let's make it happen"}</div>${mEnded}
    <${tappable?`button class="atap" data-act="open-sel" data-v="${S.sessions.indexOf(s)}"`:'div class="atap"'}><span class="bigic">${ic(A().i,1.8)}</span><span><span class="h-title" style="display:block;">${esc(title())}</span><small class="amt">${agreed()?esc(amtTxt())+' each time':esc(amtTxt())}</small></span>${tappable?ic('chev',2).replace('<svg','<svg class="chev2"'):''}</${tappable?'button':'div'}>
    ${prog}${partner}${action}</div>`;
}
// THIS WEEK is cut. A circle carries its own day, so the card was showing the
// same information twice. Kept as a stub so nothing has to be unwired.
function weekCard(){ return ''; }
function weekCardOld(){
  if (S.partner !== 'paired') return '';
  const tg = target(), n = weekDone();
  const nodes = [];
  const wk = S.sessions.filter(s => !s.repair);
  for (let i = 0; i < Math.max(tg, wk.length); i++){
    const s = wk[i];
    if (!s) { nodes.push(`<div class="wnode"><span class="wdot"></span><div><b>${esc(S.act==='work'?exOf()[0]:A().verb)} ${i+1}</b><small>Not planned yet</small></div></div>`); continue; }
    const cls = s.st === 'done' ? 'ok' : s.st === 'missed' ? 'miss' : s.st === 'cancelled' ? 'cx' : s.st === 'today' ? 'now' : '';
    const lab = s.st === 'done' ? 'Done' : s.st === 'missed' ? 'Missed' : s.st === 'cancelled' ? 'Cancelled by both' : s.st === 'today' ? 'Today' : 'Upcoming';
    nodes.push(`<button class="wnode" data-act="open-sel" data-v="${S.sessions.indexOf(s)}"><span class="wdot ${cls}">${s.st==='done'?ic('check',3):''}</span><div><b>${esc(sName(s))}</b><small>${esc(amtTxt())} · ${s.day}${s.moved?` · moved from ${s.moved}`:''}</small></div><span class="wlab ${cls}">${lab}</span></button>`);
  }
  S.sessions.filter(s => s.repair).forEach(s => nodes.push(`<button class="wnode" data-act="open-sel" data-v="${S.sessions.indexOf(s)}"><span class="wdot rep ${s.st==='done'?'ok':''}">${s.st==='done'?ic('check',3):''}</span><div><b>Repair session</b><small>${s.day} · keeps your streak if you both finish</small></div><span class="wlab">${s.st==='done'?'Done':'Upcoming'}</span></button>`));
  const copy = n >= tg ? "You kept this week's commitment." : tg - n === 1 ? "1 more to keep this week's commitment." : `${tg - n} commitments still ahead.`;
  return `<div class="wcard"><div class="rc-h">This week</div>${nodes.join('')}<div class="wcopy">${copy}</div></div>`;
}
// The streak. Nothing here resets, ever: a miss marks one circle and costs a
// session against the week, and that is the whole consequence.
function streakCard(){
  if (S.partner !== 'paired' && !S.matchEnded) return '';
  const row = circleRow(), done = circlesDone();
  const dots = row.map(x => `<i class="cdot ${x}"></i>`).join('');
  const complete = done >= S.starget;
  const est = complete ? '' : `<div class="rel-l">About ${weeksLeft()} more week${weeksLeft()===1?'':'s'} at ${S.cadence}\u00d7 a week.</div>`;
  const owed = S.owed && !complete
    ? `<div class="rel-l owe">You owe ${S.owed} session${S.owed===1?'':'s'} this week.</div>` : '';
  return `<div class="relc"><div class="rel-k">${ic('fire',1.8)}${done} of ${S.starget}</div>
    <div class="crow">${dots}</div>
    ${complete ? `<div class="rel-l"><b>Streak complete.</b> Ready for the next one?</div>${btn('Extend your streak','streak-extend')}` : est + owed}
    <div class="hwrap st${stageOf(S.kept)}" style="margin-top:14px;"><div class="glow"></div><div class="rings"><i></i><i></i></div>${heartSvg(true, S.partner==='paired')}</div>
    <div class="rel-h">${S.kept} together with Gayan</div>
    <div class="rel-l">${S.kept ? `You've both shown up ${S.kept} time${S.kept===1?'':'s'}.` : 'Your first session together is next.'}</div></div>`;
}
function historyCard(){
  return `<div class="hist"><div class="rc-h">History</div>${S.history.length ? S.history.map(h => `<div class="hrow2"><span>${esc(h.t)}</span><small>${esc(h.m)}</small></div>`).join('') : '<div class="tl-e">Nothing finished yet.</div>'}</div>`;
}
const SC = {};
SC.tab = { bar:() => appBar(), nav:() => navBar('tab'), body:() => {
  const head = `<div class="p-h1" style="margin-bottom:2px;">Challenges</div>${S.has && agreed() ? `<div class="p-sub">What you've committed to.</div>` : ''}`;
  // Ending a challenge does not end the match, so the empty state still shows
  // who you are partnered with.
  if (!S.has) return `${head}<div class="hero acard"><div class="h-eb">Start something together</div><div class="h-title">Pick what you want to do with your partner.</div>${S.partner === 'paired' ? youG() : ''}${btn("Let's do this",'new-open')}</div>${historyCard()}`;
  return `${head}${activeCard()}${weekCard()}${streakCard()}${historyCard()}`; } };

/* ---------- Session details ---------- */
SC.details = { bar:() => '', nav:() => navBar('tab'), body:() => {
  const s = S.sessions[S.sel] || cur() || S.sessions[S.sessions.length-1]; if (!s) return `${hdr('Session')}<div class="tl-e">No session planned yet.</div>`; S.sel = S.sessions.indexOf(s);
  const isToday = s.st === 'today', open = s.st === 'planned' || isToday;
  let action = '';
  if (isToday && s.you !== 'done') action = btn("Open today's session",'open-today');
  else if (s.st === 'done') action = `<div class="notice ok">${ic('fire',1.8)}<span>Shared commitment completed.</span></div>`;
  else if (s.st === 'missed') action = `<div class="notice">${ic('heart',1.8)}<span>Shared commitment not completed. ${s.you==='done'?'Your own session still counts in the record.':''}</span></div>`;
  else if (s.st === 'cancelled') action = `<div class="notice">${ic('x',2)}<span>Cancelled by both. No change to your streak.</span></div>`;
  else action = `<div class="notice">${ic('calendar',1.8)}<span>Upcoming. On the day, this becomes "Open today's session".</span></div>`;
  const partnerActs = isToday ? `${s.gy !== 'done' && s.gy !== 'here' ? `<button class="lrow" data-act="nudge">${ic('bolt',1.8)}<span class="lt">Nudge Gayan<small>${S.nudged?'You nudged Gayan today.':'A gentle push, once a day'}</small></span></button>` : ''}${s.you !== 'done' ? `<button class="lrow" data-act="late-open">${ic('clock',1.8)}<span class="lt">Running late?<small>${S.late?`Gayan sees: "${esc(S.late)}"`:'Tell Gayan'}</small></span></button>` : ''}` : '';
  return `${hdr(sName(s), true)}${S.menu?`<div class="ov-menu" style="right:22px;top:118px;"><button class="ov-item" data-act="endmatch-open">${ic('user',2)}End this match</button><button class="ov-item danger" data-act="end-open">${ic('x',2)}End this challenge</button></div>`:''}
    <div class="hero">${s.repair?'<div class="h-eb">Repair session</div>':''}<div class="h-title"><span class="bigic sm">${ic(A().i,1.8)}</span><span>${esc(amtTxt())}</span></div>
    <div class="h-when">${s.day} · ${s.time}</div>${s.moved?`<div class="h-sub" style="margin:0;">Rescheduled: ${s.moved} → ${s.day}</div>`:''}
    ${s.mode==='together'?hrow('pin',esc(s.place)):hrow('separate','Separately, together')}${hrow(s.mode==='together'?'together':'separate', s.mode==='together'?'Mode: Together':'Mode: Separately, together')}
    ${youG()}${stline('You',s.you==='done'||s.you==='here',youStat(s))}${stline('Gayan',s.gy==='done'||s.gy==='here'||s.gy==='ready',gyStat(s))}${action}</div>
    ${partnerActs}
    ${open && !S.proposal ? `<button class="lrow" data-act="move-open">${ic('calendar',1.8)}<span class="lt">Move this session<small>Gayan needs to agree</small></span>${ic('chev',2).replace('<svg','<svg class="chev"')}</button><button class="lrow" data-act="cancel-open">${ic('x',2)}<span class="lt">Cancel this session<small>Gayan needs to agree. No change to your streak.</small></span></button>` : ''}
    ${s.mode==='together' && open ? `<div class="center"><button class="report-link" data-act="report-open">Report a problem</button></div>` : ''}`; } };

/* ---------- Plan (first / next / repair / move) ---------- */
SC.plan = { bar:() => '', nav:() => navBar('tab'), onEnter:() => {
  const base = S.planKind === 'move' ? S.sessions[S.sel] : null;
  const opts = planDays();
  if (S.counterFrom){ const c = S.counterFrom; S.pd = { mode:S.canMeet?c.mode:'separate', day:c.day, time:'07:00', place:c.place }; return; }
  S.pd = { mode: !S.canMeet ? 'separate' : (base ? base.mode : 'together'), day: base ? (opts.find(d => d !== base.day) || opts[0]) : opts[0], time:'07:00', place: base ? base.place : 'Diyasaru Park' };
}, body:() => {
  const k = S.planKind, d = S.pd, opts = planDays();
  const cf = S.counterFrom;
  const ttl = k === 'move' ? `Move ${sName(S.sessions[S.sel])}` : k === 'repair' ? 'Repair your streak' : k === 'first' ? `Plan your first ${A().noun}` : `Plan the next ${A().noun}`;
  const sub = k === 'repair' ? `One extra ${A().noun} within 3 days. If you both finish it, your streak of ${S.broken} carries on.` : k === 'move' ? 'Gayan gets your new time and needs to agree.' : `${title()} · ${amtTxt()}`;
  return `${hdr(ttl)}<div class="p-sub">${sub}</div>${cf?`<div class="notice">${ic('chat',1.8)}<span>Gayan suggested <b>${cf.mode==='together'?'Together':'Separately, together'} · ${cf.day} · ${cf.time}</b>. Change what you need and send it back.</span></div>`:''}
    ${k !== 'move' ? (S.canMeet
      ? `<div class="flabel">How will you do it?</div><button class="choice ${d.mode==='together'?'on':''}" data-act="pd-mode" data-v="together"><div class="ic">${ic('together',1.8)}</div><div><div class="t">Together</div><div class="d">Meet up, confirm with a QR code.</div></div></button><button class="choice ${d.mode==='separate'?'on':''}" data-act="pd-mode" data-v="separate"><div class="ic">${ic('separate',1.8)}</div><div><div class="t">Separately, together</div><div class="d">Same commitment, your own place.</div></div></button>`
      : `<div class="flabel">How will you do it?</div><div class="choice on" style="cursor:default;"><div class="ic">${ic('separate',1.8)}</div><div><div class="t">Separately, together</div><div class="d">Same commitment, your own place. One of you chose to do this on your own in Find, so there is no meeting place to agree.</div></div></div>`) : ''}
    <div class="flabel" style="margin-top:8px;">Day</div><div class="sel-wrap" style="margin-bottom:14px;"><select id="pd-day" aria-label="Day">${opts.map(x => `<option ${x===d.day?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="flabel">Time</div><input class="txt" type="time" id="pd-time" value="${d.time}" aria-label="Time" style="margin-bottom:14px;">
    ${d.mode==='together' && S.canMeet && k !== 'move' ? `<div class="flabel">Place</div><input class="txt" id="pd-place" value="${esc(d.place)}" placeholder="Where will you meet?" aria-label="Place">` : ''}
    <div class="foot">${btn('Send to Gayan','plan-confirm')}<div class="hint center">Gayan sees this and accepts, or suggests another. Nothing is planned until you both say yes.</div></div>`; } };
function planDays(){
  if (S.planKind === 'repair') return DAYS.slice(4, 7);
  if (S.planKind === 'first' && S.week === 1) return DAYS.slice(DAYS.indexOf(S.matchedOn));
  return DAYS;
}

/* ---------- Day of ---------- */
SC.today = { bar:() => '', nav:() => navBar('tab'), body:() => {
  const s = today(); if (!s) return `${hdr("Today's session")}<div class="tl-e">Nothing today.</div>`;
  if (s.mode === 'together'){
    let body;
    if (s.you === 'idle') body = `${stline('Gayan', s.gy!=='idle', gyStat(s))}${btn("I'm on my way",'d-onway')}`;
    else if (s.you === 'onway') body = `${stline('Gayan', s.gy!=='idle', gyStat(s))}${btn("I'm here",'d-here')}`;
    else if (s.you === 'here' && s.gy !== 'here') body = `<div class="notice">${ic('clock',1.8)}<span>You're here. Waiting for Gayan.</span></div><button class="waitbtn" disabled>Waiting for Gayan...</button>`;
    else if (s.you === 'here' && !S.together) body = `<div class="notice ok">${ic('together',1.8)}<span>Gayan is here too.</span></div>${btn('Confirm with QR','',{go:'qr',icon:'qr'})}`;
    else body = `<div class="notice ok">${ic('fire',1.8)}<span>You're together. ${esc(amtTxt())} starts now.</span></div>${btn('Finish','d-finish')}`;
    return `${hdr("Today's the day")}<div class="hero"><div class="h-title"><span class="bigic sm">${ic(A().i,1.8)}</span><span>${esc(amtTxt())}</span></div><div class="h-when">${s.time}</div>${hrow('pin',esc(s.place))}${youG()}${body}</div>${s.you==='idle'?ghost("Can't make it today",'cant-open'):''}`;
  }
  return `${hdr("Today's session")}<div class="hero"><div class="h-title"><span class="bigic sm">${ic(A().i,1.8)}</span><span>${esc(amtTxt())}</span></div><div class="h-when">${s.day}</div>${youG()}${stline('You',s.you==='done',youStat(s))}${stline('Gayan',s.gy==='done',gyStat(s))}
    ${s.gy==='done' && s.you!=='done' ? '<div class="h-sub">Gayan has shown up. Your turn.</div>' : ''}</div>
    <div class="p-h1" style="font-size:20px;">Did you <b>do it today?</b></div>
    <button class="choice mini" data-act="d-done"><div class="ic">${ic('check',2.2)}</div><div class="t">Done</div></button>
    <button class="choice mini ${s.you==='later'?'on':''}" data-act="d-later"><div class="ic">${ic('clock',1.8)}</div><div><div class="t">Doing it later</div><div class="d">Counts if you finish before midnight</div></div></button>
    <button class="choice mini" data-act="cant-open"><div class="ic">${ic('x',2)}</div><div class="t">Can't today</div></button>`; } };
SC.qr = { bar:() => '', nav:() => navBar('tab'), body:() => `${hdr("Confirm you're together")}<div class="p-sub">Show this to Gayan, or scan theirs. Live camera only.</div><div class="cam"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i><div class="scan"></div><div class="cap">Point at Gayan's code</div></div><div class="qrbox">${qrSvg()}<small>Your code, valid for this session only</small></div><button class="proto" data-act="qr-ok" style="margin-top:10px;">Simulate: the scan succeeds</button>` };

/* ---------- Completion: streak visual + next plan straight away ---------- */
SC.done = { bar:() => '', nav:() => navBar('tab'), onEnter:() => { S.planKind = 'next'; SC.plan.onEnter(); }, body:() => {
  const weekKept = weekDone() >= target(), d = S.pd;
  return `<div class="center" style="padding-top:6px;"><div class="hwrap st${stageOf(S.kept)} beat" style="height:150px;"><div class="glow"></div><div class="rings"><i></i><i></i></div>${heartSvg(true,true)}</div>
    <div class="p-h1" style="margin-bottom:4px;">You both <b>showed up.</b></div><div class="rel-k" style="justify-content:center;">${ic('fire',1.8)}${keptTxt(S.kept)}</div>
    ${weekKept?`<div class="notice ok" style="margin-top:10px;">${ic('check',2)}<span>You kept this week's commitment. Next week starts Monday.</span></div>`:`<div class="hint">${circlesDone()} of ${S.starget} on your streak</div>`}</div>
    <div class="hero" style="margin-top:14px;"><div class="h-eb">Plan the next one</div>
      ${S.canMeet ? `<div class="pill-row">${['together','separate'].map(m => `<button class="pill ${d.mode===m?'on':''}" data-act="pd-mode" data-v="${m}">${m==='together'?'Together':'Separately'}</button>`).join('')}</div>` : `<div class="pline">${ic('separate',1.8)}<span>Separately, together</span></div>`}
      <div class="sel-wrap"><select id="pd-day" aria-label="Day">${DAYS.map(x => `<option ${x===d.day?'selected':''}>${x}</option>`).join('')}</select></div>
      <input class="txt" type="time" id="pd-time" value="${d.time}" aria-label="Time">
      ${d.mode==='together' && S.canMeet?`<input class="txt" id="pd-place" value="${esc(d.place)}" aria-label="Place">`:''}
      ${btn('Send to Gayan','plan-confirm')}</div>
    <div class="soft" style="display:flex;align-items:center;gap:10px;margin-top:4px;">${ic('share',1.8)}<span style="flex:1;font-size:12.5px;">${S.shared?'Shared to Community.':'Share this with Community?'}</span>${S.shared?'':`<button class="pill" data-act="share">Share</button>`}</div>
    ${ghost('Later','',undefined,'tab')}`; } };

/* ---------- One-sided miss (recorded) ---------- */
SC.miss = { bar:() => '', nav:() => navBar('tab'), body:() => {
  const s = S.sessions.find(x => x.you === 'missed');
  if (S.missRecorded) return `${hdr('Recorded')}<div class="hero"><div class="h-eb">Thanks for telling us</div><div class="h-sub" style="color:var(--pink);font-size:14px;margin:0;">Your streak ended at ${S.broken}. One miss doesn't erase what you built.</div>${youG()}</div>
    <div class="notice">${ic('chat',1.8)}<span>Gayan sees: "Dinesh missed this one. Your streak ended at ${S.broken}. Ready for the next one?"</span></div>
    ${!S.repairUsed?`${btn('Repair with Gayan','repair-plan')}<div class="hint center" style="margin:-4px 0 6px;">One extra session within 3 days. If you both finish it, your ${S.broken} carries on.</div>`:''}${ghost('Plan the next one','plan-next')}`;
  return `${hdr('What happened?')}<div class="p-sub">You missed ${s?esc(sName(s)):'this session'}. It happens to everyone. What matters is that you keep showing up.</div>
    <div class="pill-row" style="margin-bottom:14px;">${REASONS.map(([i,t]) => `<button class="pill ${S.reason===t?'on':''}" data-act="reason" data-v="${esc(t)}">${t}</button>`).join('')}</div>
    <input class="txt" id="miss-line" placeholder="Add a line (optional)" value="${esc(S.reasonText)}" aria-label="Optional line">
    <div class="foot">${btn('Record','miss-record',{dis:!S.reason})}</div>`; } };

/* ---------- New challenge (only after ending) ---------- */
SC.newc = { bar:() => '', nav:() => navBar('tab'), onEnter:() => { S.nw = { act:'run', ex:'push', amt:3, cad:2 }; }, body:() => {
  const n = S.nw, a = ACTS[n.act];
  const unit = n.act === 'work' ? EX[n.ex][1] : a.u;
  return `${hdr('Your commitment')}<div class="flabel">Activity</div><div class="agrid">${Object.keys(ACTS).map(k => `<button class="gcard ${n.act===k?'on':''}" data-act="nw-act" data-v="${k}">${ic(ACTS[k].i,1.8)}<div class="t">${ACTS[k].l}</div></button>`).join('')}</div>
    ${n.act==='work'?`<div class="flabel" style="margin-top:14px;">Exercise</div><div class="pill-row">${Object.keys(EX).map(k => `<button class="pill ${n.ex===k?'on':''}" data-act="nw-ex" data-v="${k}">${EX[k][0]}</button>`).join('')}</div>`:''}
    <div class="sect">How much each time?</div><div class="stepper"><button data-act="nw-amt" data-v="-1" aria-label="Less">−</button><div class="v">${n.amt}<small>${unit}</small></div><button data-act="nw-amt" data-v="1" aria-label="More">+</button></div>
    <div class="sect">How often?</div><div class="segt">${[1,2,3].map(c => `<button class="${n.cad===c?'on':''}" data-act="nw-cad" data-v="${c}">${c}× a week</button>`).join('')}</div>
    <div class="foot">${btn('Create commitment','nw-create')}</div>`; } };
SC.find = { bar:() => appBar(), nav:() => navBar('find'), body:() => `<div class="p-h1" style="margin-bottom:4px;">Find</div><div class="p-sub">Who can I do this with?</div><div class="banner">Placeholder. Matching, Report and Block live in Find (see the Find and Challenges prototype). Use "Gayan: next step" to move the search along.</div>` };
SC.home = { bar:() => appBar(), nav:() => navBar('home'), body:() => `<div class="banner">Placeholder. See the Home prototype.</div>` };
SC.community = { bar:() => appBar(), nav:() => navBar('community'), body:() => `<div class="banner">Placeholder.</div>` };

/* ---------- chrome ---------- */
const appBar = () => `<div class="topbar"><div class="logo">choner<span>.</span></div><div class="avatar-chip">DD</div></div>`;
function navBar(active){
  const items = [['home','Home','home'],['target','Challenges','tab'],['find','Find','find'],['community','Community','community']];
  const badge = to => to === 'tab' && S.partner === 'paired' && (today() && today().you !== 'done' || S.missFor || (S.proposal && S.proposal.by === 'gy') || (!S.sessions.length && S.has));
  return `<div class="nav">${items.map(([k,l,to]) => { const on = to === active; return `<button class="navitem ${on?'on':'off'}" data-go="${to}" data-jump="1" style="background:none;border:none;cursor:pointer;font-family:inherit;"><span style="color:${on?'#FD5B01':'#fff'};position:relative;display:inline-flex;">${ic(k,2)}${badge(to)?'<i class="nbadge"></i>':''}</span><div class="lbl">${l}</div></button>`; }).join('')}</div>`;
}
function qrSvg(){
  const N = 21; let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let d = ''; const finder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (finder(x, y)) continue; if (rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`; }
  const f = (x, y) => `<path fill="#001827" fill-rule="evenodd" d="M${x} ${y}h7v7h-7zM${x+1} ${y+1}v5h5v-5z"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="#001827"/>`;
  return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" aria-label="Session QR code"><rect width="${N}" height="${N}" fill="#fff"/><path fill="#001827" d="${d}"/>${f(0,0)}${f(N-7,0)}${f(0,N-7)}</svg>`;
}
const END_REASONS = [
  ['no_time_worked', "We couldn't find a time that worked"],
  ['stopped_replying', 'They stopped replying'],
  ['pace_mismatch', "Our pace or level didn't match"],
  ['changing_what_i_do', "I'm changing what I'm doing"],
  ['something_felt_off', 'Something felt off'],
  ['prefer_not_to_say', 'Prefer not to say']
];
function endMatchSheet(){
  const off = S.endReason === 'something_felt_off';
  return `<div class="sheet2-handle"></div><div class="p-h1" style="font-size:20px;">End your match with <b>Gayan?</b></div>
    <div class="p-sub">Your challenge and your streak both continue.</div>
    ${END_REASONS.map(r => `<button class="choice mini ${S.endReason===r[0]?'on':''}" data-act="end-reason" data-v="${r[0]}"><div><div class="t">${r[1]}</div></div></button>`).join('')}
    <div class="hint">Gayan won't see your reason. He'll just see that the match has ended.</div>
    <div style="margin-top:14px;">${btn(off?'Continue to report':'End match','endmatch-send',{dis:!S.endReason})}${ghost('Keep going','sheet-close')}</div>`;
}
function sheetHTML(){
  if (S.sheet === 'end') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">End this <b>challenge?</b></div><div class="p-sub">Your streak ends here, at ${circlesDone()} of ${S.starget}. It'll be saved to your history.<br><b>Gayan stays your partner.</b></div><button class="btn" data-act="end-confirm" style="background:#C0392B;box-shadow:none;">End challenge</button><button class="btn-g" data-act="sheet-close">Keep going</button></div></div>`;
  if (S.sheet === 'cancel') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Cancel this <b>session?</b></div><div class="p-sub">Gayan needs to agree. A cancelled session costs you nothing: no circle, and the week's slot is free again.</div><button class="btn" data-act="cancel-send">Ask Gayan to cancel</button><button class="btn-g" data-act="sheet-close">Keep it</button></div></div>`;
  if (S.sheet === 'cant') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Can't make it <b>today?</b></div><div class="p-sub">Move it if Gayan agrees, or skip it. Skipping costs you the circle and one session against this week, nothing more.</div><button class="btn" data-act="move-open">Ask Gayan to move it</button><button class="btn-o" data-act="skip" style="margin-top:8px;">Skip this one</button><button class="btn-g" data-act="sheet-close">Back</button></div></div>`;
  if (S.sheet === 'late') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Tell <b>Gayan</b></div>${["Running late, doing it tonight","Running 10 minutes late","On my way, give me a bit"].map(t => `<button class="choice mini" data-act="late-send" data-v="${esc(t)}"><div class="t">${t}</div></button>`).join('')}<button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  if (S.sheet === 'endmatch') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop">${endMatchSheet()}</div></div>`;
  if (S.sheet === 'report') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">What's <b>going on?</b></div><div class="p-sub">Same report sheet as Find. It also ends the match; your challenge continues.</div><div class="pill-row" style="margin-bottom:14px;">${["Didn't show up","Made me uncomfortable","Safety concern at a meetup","Fake profile","Something else"].map(c => `<button class="pill ${S.repCat===c?'on':''}" data-act="rep-cat" data-v="${esc(c)}">${c}</button>`).join('')}</div><button class="btn" data-act="rep-send" ${S.repCat?'':'disabled'}>Submit report</button><button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  return '';
}
function dlgHTML(){ if (!S.dlg) return ''; return `<div class="dlgwrap"><div class="dlg" role="alertdialog"><b>${esc(S.dlg.t)}</b><p>${esc(S.dlg.m)}</p><div class="db"><button data-act="dlg">OK</button></div></div></div>`; }

/* ---------- logic ---------- */
function newSession(kind){
  const d = S.pd; const n = kind === 'repair' ? 0 : S.sessions.filter(s => !s.repair).length + 1;
  S.sessions.push(sess(n, d.day, { time:/[AP]M/.test(d.time) ? d.time : fmtTime(d.time), place:(d.place||'').trim()||'Your meeting place', mode:d.mode, repair:kind==='repair' }));
  S.missFor = null; S.missRecorded = false;
}
function complete(s){
  s.st = 'done'; s.you = 'done'; s.gy = 'done'; S.together = false;
  if (s.repair && S.broken !== null){ S.kept = S.broken + 1; S.broken = null; } else S.kept++;
  go('done');
}
function gayanStep(){
  if (!S.has) return;
  if (S.partner === 'none'){ S.partner = 'searching'; return; }
  if (S.partner === 'searching'){ S.partner = 'pending'; return; }
  if (S.partner === 'invited'){ S.partner = 'paired'; S.week = 1; S.sessions = []; S.kept = 0; return; }
  if (S.partner === 'pending'){ S.partner = 'paired'; S.week = 1; S.sessions = []; S.kept = S.matchEnded ? 0 : S.kept; return; }
  if (S.proposal && S.proposal.by === 'dd'){ acceptProposal(); return; }
  const t = today();
  if (t){
    if (t.mode === 'together'){ t.gy = t.gy === 'idle' ? 'onway' : 'here'; }
    else { t.gy = 'done'; if (t.you === 'done'){ complete(t); return 'nav'; } }
    return;
  }
  const s = cur(); if (s && s.gy === 'idle') s.gy = 'ready';
}
function acceptProposal(){
  const p = S.proposal; S.proposal = null;
  if (p.type === 'plan'){
    S.pd = { mode:p.mode, day:p.day, time:p.time, place:p.place };
    // A repair fills the circle that was missed rather than adding a
    // thirteenth, so the row stays at starget.
    if (p.kind === 'repair'){
      S.repairUsed = true;
      const i = S.circles.indexOf('missed');
      if (i >= 0) S.circles[i] = 'done';
      S.owed = Math.max(0, S.owed - 1);
      newSession('repair');
    }
    else { if (S.cur === 'done' && weekDone() >= target()){ S.week++; S.sessions = []; } newSession('plan'); }
    S.dlg = { t:"You're in", m:`You've got something to show up for together. ${p.mode==='together'?'Together':'Separately, together'} · ${p.day} · ${p.time}.` };
    return;
  }
  const s = cur(); if (!s) return;
  if (p.type === 'move'){ s.moved = s.day; s.day = p.day; s.time = p.time; s.st = 'planned'; S.dlg = { t:'Moved', m:`${sName(s)} is now ${p.day} · ${p.time}. Still one commitment.` }; }
  else { s.st = 'cancelled'; S.dlg = { t:'Cancelled by both', m:'Recorded. Your streak is unchanged. Plan the next one when you are ready.' }; }
}
function skipToDay(){ const s = cur(); if (s){ s.st = 'today'; s.gy = s.gy === 'ready' ? 'idle' : s.gy; } }
function dayEnds(){
  const t = today(); if (!t) return;
  if (t.you === 'done' && t.gy === 'done') return;
  if (t.you !== 'done' && t.you !== 'here'){ t.you = 'missed'; t.st = 'missed'; S.broken = S.kept; S.kept = 0; S.missFor = 'dd'; S.missRecorded = false; S.reason = null; go('miss'); return 'nav'; }
  if (t.gy !== 'done'){ t.gy = 'missed'; t.st = 'missed'; S.broken = S.kept; S.kept = 0; S.missFor = 'gy'; }
}

/* ---------- presets ---------- */
const PR = (id, group, label, fn) => ({ id, group, label, fn });
const base = o => { S = Object.assign(fresh(), o || {}); };
const PRESETS = [
  PR('none','Before a partner','Nothing picked yet', () => base({ has:false, partner:'none', kept:0 })),
  PR('nopartner','Before a partner','Partner not found yet', () => base({ partner:'none', kept:0 })),
  PR('searching','Before a partner','Searching', () => base({ partner:'searching', kept:0 })),
  PR('invited','Before a partner','Invite sent, waiting', () => base({ partner:'invited', kept:0 })),
  PR('pending','Before a partner','Waiting for Gayan to accept', () => base({ partner:'pending', kept:0 })),
  // A brand new pair: nothing agreed, nothing on the streak yet.
  PR('matched','Week 1','Matched Friday, plan first', () => base({ week:1, matchedOn:'Friday', kept:0, circles:[] })),
  PR('matchedmon','Week 1','Matched Monday, plan first', () => base({ week:1, matchedOn:'Monday', kept:0, circles:[] })),
  PR('planned','Sessions','Planned, upcoming', () => base({ sessions:[sess(1,'Saturday')] })),
  PR('today-tg','Sessions','Today, together', () => base({ sessions:[sess(1,'Saturday',{st:'today'})] })),
  PR('today-sep','Sessions','Today, separately', () => base({ sessions:[sess(1,'Saturday',{st:'today',mode:'separate',gy:'done'})] })),
  PR('waitg','Sessions','You did it, waiting for Gayan', () => base({ sessions:[sess(1,'Saturday',{st:'today',mode:'separate',you:'done'})] })),
  PR('justdone','Sessions','Both showed up, next plan', () => { base({ sessions:[sess(1,'Tuesday',{st:'done',you:'done',gy:'done'})], kept:7 }); S.cur = 'done'; SC.done.onEnter(); }),
  PR('weekkept','Sessions',"Week kept", () => base({ sessions:[sess(1,'Tuesday',{st:'done',you:'done',gy:'done'}), sess(2,'Saturday',{st:'done',you:'done',gy:'done'})], kept:8 })),
  PR('gymove','Changes','Gayan asked to move', () => base({ sessions:[sess(2,'Saturday')], proposal:{type:'move',by:'gy',day:'Sunday',time:'7:00 AM'} })),
  PR('youcancel','Changes','You asked to cancel', () => base({ sessions:[sess(2,'Saturday')], proposal:{type:'cancel',by:'dd'} })),
  PR('moved','Changes','Moved and agreed', () => base({ sessions:[sess(1,'Tuesday',{st:'done',you:'done',gy:'done'}), sess(2,'Sunday',{moved:'Saturday'})] })),
  PR('cancelled','Changes','Cancelled by both', () => base({ sessions:[sess(1,'Tuesday',{st:'cancelled'})] })),
  // A miss marks one circle and leaves a session owed against the week.
  // Nothing resets: the streak still reads 6 of 12.
  PR('youmiss','Misses','You missed (record it)', () => { base({ sessions:[sess(1,'Saturday',{st:'missed',you:'missed',gy:'done'})], missFor:'dd', circles:['done','done','done','done','done','done','missed'], owed:1 }); S.cur = 'miss'; }),
  PR('gymiss','Misses','Gayan missed', () => base({ sessions:[sess(1,'Saturday',{st:'missed',you:'done',gy:'missed'})], missFor:'gy', circles:['done','done','done','done','done','done','missed'], owed:1 })),
  PR('repair','Misses','Repair planned', () => base({ sessions:[sess(1,'Saturday',{st:'missed',you:'done',gy:'missed'}), sess(0,'Tuesday',{repair:true})], circles:['done','done','done','done','done','done','missed'], owed:1, repairUsed:true })),
  // The match ended, the challenge and the streak both carry on untouched.
  PR('ended','Endings','Match ended', () => base({ partner:'none', matchEnded:true })),
  // The challenge ended, the PARTNER did not. Still You + Gayan.
  PR('ch-ended','Endings','Challenge ended', () => base({ has:false, circles:[], history:[{t:'Run 2× a week', m:'Ended · 7 of 12 · September 2026'},{t:'Walk 3× a week', m:'Ended · August 2026'}] })),
  PR('complete','Endings','Streak complete', () => base({ circles:Array(12).fill('done'), kept:12 }))
];
const GROUPS = []; PRESETS.forEach(p => { let g = GROUPS.find(x => x[0] === p.group); if (!g) GROUPS.push(g = [p.group, []]); g[1].push(p); });
let presetOn = 'planned';
function applyPreset(id){ const p = PRESETS.find(x => x.id === id); presetOn = id; p.fn(); S.hist = []; render(); }

/* ---------- notes ---------- */
const NOTES = {
  tab:['Challenges: the home of commitments','Your commitment, the streak, History. Nothing else: no partner search, no Pulse, no Community.',['REBUILT 29 September. THIS WEEK is gone and so is the weekly counter: a circle carries its own day, so the card was showing the same thing twice','THE STREAK IS THE ONLY STANDING NUMBER. The weekly commitment speaks twice and is otherwise silent: "You owe one session this week" when behind, "You kept this week's commitment" when met','A CIRCLE IS A SESSION. Solid orange = done. Dashed outline = planned, the day passed, not done. Plain = ahead, unplanned','NOTHING RESETS. A miss costs the circle and one session owed against the week. Repair fills the MISSED circle rather than adding a thirteenth, so the row never grows','A circle fills only when BOTH people finish. Showing up alone earns nothing','Personal in ownership, shared in earning: it is your 12, and Gayan keeps his own','Ending a CHALLENGE ends the streak and saves it to History; it does NOT end the match','Ending a MATCH leaves the challenge and the streak untouched','Before a match only the ACTIVITY exists and it is editable until a search starts. How much and how often are agreed at the first plan','Sessions are named by their day, never by number','A planned session appears only after BOTH agree','Active card is tappable when a session exists (opens Session Details)','History rows are finished challenges, not tappable']],
  details:['Session Details','The only details screen. Everything about one session, and the partner actions tied to it.',['Day, time, place, mode, You and Gayan status','DECIDED 27 September: the why is PRIVATE. The card that used to sit here, showing the partner why, has been REMOVED. Nobody reads anyone else answers; they come back only to the person who wrote them, from Profile','Nudge Gayan and Running late? live here only (on the day)','Move and Cancel both need Gayan to agree','Report a problem (meetups only) opens the same sheet as Find','··· menu: End this challenge (either person)']],
  plan:['Plan a session','A PROPOSAL, not a fact. One session at a time: first, next, repair (within 3 days) or move.',['DECIDED 28 September: mode rides in the proposal with day, time and place. Whoever plans first proposes the whole session; the other accepts or suggests another. There is no separate mode-conflict state, because only one person is ever setting the value','Asked on EVERY plan, not agreed once, so a rainy or travel week can be done separately without touching the match','If the responder counters with Separately, that is what happens: you cannot make someone turn up. Together needs both, Separately can always be delivered by one','Use "Gayan: suggests another" above the phone to see the counter come back','DECIDED 28 September: How will you do it is asked FIRST in the Find form, before matching, as a hard filter (In person / Separately / Either). This screen no longer asks it for the first time',
    'Use the Pair can meet control above the phone. No means one of them chose Separately in Find: the mode becomes a plain statement, no place is asked, and the day-of flow drops the QR step, because there is nothing to confirm being together for',
    'Yes keeps both options, so a rainy week can be done separately without changing the match','Together shows a place field; separately does not','Week 1 first session can only fall between the match day and Sunday','Repair: next 3 days only','In the app this goes through the shared suggest/accept negotiation']],
  today:["Today's session",'The day-of flow. Together: on my way, here, QR, finish. Separately: done, later, can\'t today.',['"Doing it later" counts if done before midnight local time','Can\'t today: ask to move, or skip (a miss)']],
  qr:['QR check-in','Live camera only, one code per session.',['A scan confirms you are together, then Finish completes']],
  done:['Both showed up, next plan right away','The streak visual, then the next session plan straight away, as decided.',['Heart grows at 1, 5, 10, 25, 50','Week kept message when the target is reached','Share to Community lives only here']],
  miss:['One-sided miss (recorded)','Simple screen: a reason and an optional line, recorded. Then repair or plan the next one.',['Missed = no check-in by midnight of the planned day, local time','Gayan sees a neutral line: "Dinesh missed this one. Your streak ended at 6."','One repair a week: one extra session within 3 days, both must finish']],
  newc:['New challenge','Only after the current one ends. One active challenge per user.',['Six MVP activities; Workouts pick an exercise','1×, 2× or 3× a week','Then Find for a partner']],
  find:['Find (placeholder)','',[]], home:['Home (placeholder)','',[]], community:['Community (placeholder)','',[]]
};
function renderNotes(){
  const n = NOTES[S.cur] || NOTES.tab;
  document.getElementById('notes').innerHTML = `<div class="note-card"><div class="note-t">${n[0]}</div><div class="note-what">${n[1]}</div>${n[2].length?`<ul class="note-ul">${n[2].map(b => `<li>${b}</li>`).join('')}</ul>`:''}</div>
  <div class="note-card"><div class="note-h">Decided 2026-09-26</div><ul class="note-ul"><li>Rolling weekly, no end date, same partner</li><li>Weeks Monday to Sunday; week 1 from the match day, target scaled</li><li>Streak = commitments both completed; current streak only</li><li>No solo mode; one active challenge per user</li><li>Move and cancel need both; neither breaks the streak</li><li>Removed from Challenges: partner search, invites, match banner, Mark as done, share card, Pulse</li><li>Journey timeline: later</li></ul></div>`;
}

/* ---------- render ---------- */
function renderRail(){ document.getElementById('rail').innerHTML = GROUPS.map(([g, ps]) => `<div><div class="grp-t">${g}</div><div class="rail-list">${ps.map(p => `<button data-preset="${p.id}" class="${p.id===presetOn?'on':''}"><span class="ph"></span>${p.label}</button>`).join('')}</div></div>`).join(''); }
function syncMeetSeg(){ document.querySelectorAll('#sMeet button').forEach(b => b.classList.toggle('on', (b.dataset.v === 'yes') === !!S.canMeet)); }
function render(){
  const s = SC[S.cur]; const phone = document.getElementById('phone');
  const bar = s.bar(), nav = s.nav();
  const keep = phone.querySelector('.content') ? phone.querySelector('.content').scrollTop : 0;
  phone.innerHTML = `<div class="statusbar"><span>9:41</span><span>5G</span></div>${bar}<div class="content${bar?' tb':''}${nav?' bn':''}" id="content">${s.body()}</div>${nav}${sheetHTML()}${dlgHTML()}`;
  if (phone.dataset.cur === S.cur) phone.querySelector('.content').scrollTop = keep;
  phone.dataset.cur = S.cur; renderRail(); renderNotes(); syncMeetSeg();
}
function go(id, o){ o = o || {}; S.sheet = null; S.menu = false; if (o.jump) S.hist = []; else if (id !== S.cur) S.hist.push(S.cur); S.cur = id; if (SC[id].onEnter) SC[id].onEnter(); render(); const c = document.getElementById('content'); if (c) c.scrollTop = 0; }
function goBack(){ S.sheet = null; S.menu = false; S.cur = S.hist.length ? S.hist.pop() : 'tab'; render(); }

function act(a, v){
  const s = S.sessions[S.sel];
  switch (a){
    case 'noop': return;
    case 'dlg': S.dlg = null; break;
    case 'menu': S.menu = !S.menu; break;
    case 'go-find': go('find', {jump:true}); return;
    case 'open-sel': S.sel = +v; go('details'); return;
    case 'open-today': S.sel = S.sessions.indexOf(today()); go('today'); return;
    case 'plan-first': S.planKind = 'first'; S.counterFrom = null; go('plan'); return;
    case 'plan-next': S.planKind = 'next'; S.missFor = null; S.counterFrom = null; go('plan'); return;
    case 'repair-plan': S.planKind = 'repair'; S.counterFrom = null; go('plan'); return;
    case 'move-open': S.sel = S.sessions.indexOf(cur()); S.planKind = 'move'; S.counterFrom = null; go('plan'); return;
    case 'pd-mode': S.pd.mode = v; break;
    case 'plan-confirm': {
      if (S.planKind === 'move'){ S.proposal = { type:'move', by:'dd', day:S.pd.day, time:fmtTime(S.pd.time) }; S.hist = []; S.cur = 'tab'; break; }
      S.proposal = { type:'plan', by:'dd', kind:S.planKind, mode:S.pd.mode, day:S.pd.day, time:fmtTime(S.pd.time), place:(S.pd.place||'').trim()||'Your meeting place' };
      S.hist = []; S.cur = 'tab'; break; }
    case 'prop-accept': acceptProposal(); break;
    case 'plan-counter': { const p = S.proposal; S.planKind = p.kind || 'next'; S.proposal = null;
      S.counterFrom = { mode:p.mode, day:p.day, time:p.time, place:p.place }; go('plan'); return; }
    case 'prop-decline': S.proposal = null; S.dlg = { t:'Plan kept', m:'The original plan stands.' }; break;
    case 'cancel-open': S.sheet = 'cancel'; break;
    // Cancelling cannot be taken back, so it says so before it is sent. The
    // timeout rule goes here too, which is where it actually matters.
    case 'cancel-send': {
      const s = cur();
      S.sheet = null;
      S.proposal = { type:'cancel', by:'dd' };
      S.hist = []; S.cur = 'tab';
      S.dlg = { t:`Cancel ${s ? sName(s) : 'this session'}?`,
                m:"You can't undo this. Gayan has until the end of today to accept. If he doesn't answer, the plan stands." };
      break; }
    case 'end-open': S.menu = false; S.sheet = 'end'; break;
    // Ending a challenge ends the STREAK, which goes to history, but it does
    // NOT end the match: Gayan is still your partner on the next activity.
    case 'end-confirm': {
      const done = circlesDone();
      S.history.unshift({ t:title(), m:`Ended \u00b7 ${done} of ${S.starget} \u00b7 September 2026` });
      Object.assign(S, { has:false, sessions:[], circles:[], owed:0, broken:null,
                         proposal:null, missFor:null, sheet:null, repairUsed:false });
      S.hist = []; S.cur = 'tab';
      break; }
    // A neutral way out, separate from block and report. The reason is private:
    // Gayan is told only that the match ended.
    case 'endmatch-open': S.menu = false; S.sheet = 'endmatch'; S.endReason = null; break;
    case 'end-reason': S.endReason = v; break;
    case 'endmatch-send': {
      if (S.endReason === 'something_felt_off'){ S.sheet = 'report'; S.repCat = null; break; }
      S.sheet = null; S.matchEnded = true; S.partner = 'none'; S.proposal = null;
      S.dlg = { t:'This match has ended.', m:'Your challenge continues, and your streak is untouched. You can look for a new partner anytime.' };
      break; }
    case 'streak-extend': S.starget += 10; S.dlg = { t:'Streak extended', m:`Going for ${S.starget} sessions now.` }; break;
    case 'sheet-close': S.sheet = null; break;
    case 'nudge': S.nudged = true; S.dlg = { t:'Nudged', m:'Gayan gets a gentle push.' }; break;
    case 'late-open': S.sheet = 'late'; break;
    case 'late-send': S.late = v; S.sheet = null; break;
    case 'report-open': S.sheet = 'report'; S.repCat = null; break;
    case 'rep-cat': S.repCat = v; break;
    case 'rep-send': Object.assign(S, { sheet:null, partner:'none', matchEnded:true, kept:0, broken:null, sessions:[], proposal:null }); S.hist = []; S.cur = 'tab'; break;
    case 'd-onway': today().you = 'onway'; break;
    case 'd-here': today().you = 'here'; break;
    case 'qr-ok': S.together = true; goBack(); return;
    case 'd-finish': complete(today()); return;
    case 'd-done': { const t = today(); t.you = 'done'; if (t.gy === 'done'){ complete(t); return; } S.hist = []; S.cur = 'tab'; break; }
    case 'd-later': today().you = 'later'; break;
    case 'cant-open': S.sheet = 'cant'; break;
    case 'skip': { const t = today(); t.you = 'missed'; t.st = 'missed'; S.broken = S.kept; S.kept = 0; S.missFor = 'dd'; S.missRecorded = false; S.reason = null; S.sheet = null; go('miss'); return; }
    case 'reason': S.reason = v; break;
    case 'miss-record': S.missRecorded = true; S.missFor = null; break;
    case 'share': S.shared = true; break;
    case 'new-open': go('newc'); return;
    case 'nw-act': S.nw.act = v; S.nw.amt = v === 'work' ? EX[S.nw.ex][2] : ACTS[v].d; break;
    case 'nw-ex': S.nw.ex = v; S.nw.amt = EX[v][2]; break;
    case 'nw-amt': { const st = S.nw.act === 'work' ? EX[S.nw.ex][3] : ACTS[S.nw.act].step; S.nw.amt = Math.max(st, +(S.nw.amt + (+v) * st).toFixed(1)); break; }
    case 'nw-cad': S.nw.cad = +v; break;
    case 'nw-create': Object.assign(S, { has:true, act:S.nw.act, ex:S.nw.ex, amt:S.nw.amt, cadence:S.nw.cad, partner:'none', matchEnded:false, sessions:[], kept:0 }); S.hist = []; S.cur = 'tab'; break;
  }
  render();
}

/* ---------- events ---------- */
const phoneEl = document.getElementById('phone');
phoneEl.addEventListener('input', e => { const id = e.target.id;
  if (id === 'pd-day') S.pd.day = e.target.value; else if (id === 'pd-time') S.pd.time = e.target.value || '07:00'; else if (id === 'pd-place') S.pd.place = e.target.value; else if (id === 'miss-line') S.reasonText = e.target.value; });
phoneEl.addEventListener('click', e => {
  const back = e.target.closest('[data-back]'); if (back){ goBack(); return; }
  const t = e.target.closest('[data-go],[data-act]'); if (!t || t.disabled) return;
  if (t.dataset.act){ act(t.dataset.act, t.dataset.v); return; }
  go(t.dataset.go, {jump: !!t.dataset.jump});
});
document.getElementById('rail').addEventListener('click', e => { const b = e.target.closest('[data-preset]'); if (b) applyPreset(b.dataset.preset); });
document.getElementById('sim-g').onclick = () => { if (gayanStep() !== 'nav') render(); };
document.getElementById('sim-day').onclick = () => { skipToDay(); render(); };
document.getElementById('sim-end').onclick = () => { if (dayEnds() !== 'nav') render(); };
document.getElementById('sim-reset').onclick = () => applyPreset('planned');
document.getElementById('sim-counter').onclick = () => {
  const p = S.proposal;
  if (!p || p.type !== 'plan' || p.by !== 'dd'){ S.dlg = { t:'Nothing to answer', m:'Plan a session first, then Gayan has something to suggest another for.' }; render(); return; }
  S.proposal = { type:'plan', by:'gy', kind:p.kind,
    mode: (S.canMeet && p.mode === 'together') ? 'separate' : p.mode,
    day: p.day === 'Sunday' ? 'Saturday' : 'Sunday', time:'6:30 AM', place:p.place };
  S.hist = []; S.cur = 'tab'; render();
};
document.getElementById('sMeet').addEventListener('click', e => {
  const b = e.target.closest('[data-v]'); if (!b) return;
  S.canMeet = b.dataset.v === 'yes';
  if (!S.canMeet) S.sessions.forEach(x => { x.mode = 'separate'; });
  if (S.pd) S.pd.mode = S.canMeet ? S.pd.mode : 'separate';
  if (S.cur === 'today' && !S.canMeet) { S.hist = []; S.cur = 'tab'; }
  render();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape'){ S.sheet = null; S.dlg = null; S.menu = false; render(); } });
applyPreset('planned');
