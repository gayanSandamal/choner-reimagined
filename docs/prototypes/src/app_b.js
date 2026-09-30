
Object.assign(IC, {
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 01-8 0zM8 6H4v1a3 3 0 003 3M16 6h4v1a3 3 0 01-3 3M12 13v4M8.5 20h7M10 17h4"/>',
  user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  eye:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeoff:'<path d="M3 3l18 18M6.4 7.6A16 16 0 002 12s3.6 6.5 10 6.5c1.3 0 2.5-.3 3.6-.7M10.6 5.6c.4-.1.9-.1 1.4-.1 6.4 0 10 6.5 10 6.5a17 17 0 01-3.2 3.9M9.9 9.9a3 3 0 004.2 4.2"/>',
  login:'<path d="M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5M4 12h10M10.5 8.5L14 12l-3.5 3.5"/>',
  useradd:'<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c0-3.8 2.9-6 6.5-6M18 9v6M15 12h6"/>',
  chev:'<path d="M9 5l7 7-7 7"/>',
  share:'<path d="M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 001 1h12a1 1 0 001-1v-6"/>',
  bell:'<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15zM10 20a2 2 0 004 0"/>',
  logout:'<path d="M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h5M10 12h10M16.5 8.5L20 12l-3.5 3.5"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  book:'<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  infinity:'<path d="M7 8c-2.2 0-4 1.8-4 4s1.8 4 4 4c4 0 6-8 10-8 2.2 0 4 1.8 4 4s-1.8 4-4 4c-4 0-6-8-10-8z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  drop:'<path d="M12 3s6 6.4 6 11a6 6 0 01-12 0c0-4.600 6-11 6-11z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  doc:'<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>',
  trend:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  bike:'<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l-1.5-3H6M15 9l-2 7"/>',
  walk:'<circle cx="13" cy="4.5" r="1.6"/><path d="M11 21l1.5-6-2.5-2 1-5 3 1 2 3M8 12l-1 3M15 11l3 2"/>',
  dumb:'<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  separate:'<rect x="3" y="6" width="7" height="12" rx="1.5"/><rect x="14" y="6" width="7" height="12" rx="1.5"/>',
  qr:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3h-3zM19 14v1M17 19h3M20 17v1"/>'
});
// A match is answered within 24 hours or it expires for both people. ONE
// clock, started when the MATCH is created rather than when either side
// answers, so the two of them always see the same number.
const MATCH_WINDOW_H = 24;
const matchLeft = () => `${S.matchH}h ${String(S.matchM).padStart(2,'0')}m left`;

// Everyone on Choner, shown by default. A new user opening Find has to see
// that the app is alive. No location: without it this is a first name and an
// activity rather than a way to find someone in person.
const DIR_NAMES = ['Nimali P','Ruwan S','Asanka K','Tharushi M','Dinuka W','Ishara B','Kasun J','Amaya R','Sachini L','Pasan G','Hiruni D','Chamath S','Nadeesha K','Tharindu A','Malsha P','Roshan F','Dilini W','Kavinda N','Sanduni H','Tharaka B','Piyumi S','Lahiru M','Yasas D','Nethmi C','Gayan S','Upeksha R','Janith K','Shenali T','Vishwa P','Anjali M'];
// Workout rows carry their exercises, because the directory is the only place
// exercises appear at all now: colour for a human reading a card, never an
// input to matching.
const DIR_ACTS = [
  ['Running','3 km','3\u00d7 a week',null],
  ['Walking','30 min','daily',null],
  ['Yoga','20 min','2\u00d7 a week',null],
  ['Running','5 km','2\u00d7 a week',null],
  ['Workout','45 min','3\u00d7 a week','Push-ups, Squats, Plank'],
  ['Cycling','10 km','2\u00d7 a week',null],
  ['Jogging','2 km','4\u00d7 a week',null],
  ['Workout','30 min','2\u00d7 a week','Burpees, Jumping jacks'],
  ['Walking','5 km','3\u00d7 a week',null],
  ['Workout','20 min','daily','Stretching, Plank, Sit-ups, Lunges']
];
const DIR_COLS = ['#FD8302','#1E3A4C','#2E9E6B','#B04A00','#5C371F','#7C8C96'];
function dirCards(){
  const rows = DIR_NAMES.map((n, i) => {
    const a = DIR_ACTS[i % DIR_ACTS.length];
    const ini = n.split(' ').map(w => w[0]).join('');
    return `<div class="dcard big"><span class="dav" style="background:${DIR_COLS[i % DIR_COLS.length]};">${esc(ini)}</span><div class="dtx"><b>${esc(n)}</b><small>${esc(a[0])}  ·  ${esc(a[1])}  ·  ${a[2]}</small>${a[3]?`<em class="dex">${esc(a[3])}</em>`:''}</div></div>`;
  }).join('');
  // The list never ends, visually. Thirty rows is everyone we have, but a
  // spinner at the bottom is what an alive app looks like. Flagged as a small
  // lie and kept on purpose.
  const more = `<div class="dmore"><span class="dspin"></span><span>Finding more people\u2026</span></div>`;
  return `<div class="dgrid">${rows}</div>${more}`;
}


// The six reasons a match ends, separate from the report categories: report
// answers what was wrong with the person, this answers why the pairing did not
// work. "Something felt off" is a door, not an outcome - it hands off to the
// report flow rather than ending quietly, and it sits IN the list because
// someone scanning for it who cannot find it picks "Prefer not to say".
// DECIDED 22 September, refined 26 September: Find owns the full Report/Block
// menu on the partner card; Session Details keeps a small "Report a problem"
// link to the same sheet so safety is reachable at a meetup.
//
// The category list is SCOPED. Until the pair has actually met - a QR scan
// together, or a first check-in separately - only the two that can be judged
// from a profile are offered. Reporting someone for not showing up before you
// have ever arranged to meet is not a thing that can have happened.
const REPORT_CATS_PRE = ['Fake profile', 'Something else'];
const REPORT_CATS_MET = ['Didn\'t show up', 'Made me uncomfortable', 'Safety concern at a meetup', 'Fake profile', 'Something else'];
const metUp = () => S.cs === 'today' || S.cs === 'done' || S.kept > 0 || S.together;
const reportCats = () => metUp() ? REPORT_CATS_MET : REPORT_CATS_PRE;

const END_REASONS = [
  ['no_time', "We couldn't find a time that worked"],
  ['no_reply', 'They stopped replying'],
  ['pace', "Our pace or level didn't match"],
  ['changing', "I'm changing what I'm doing"],
  ['off', 'Something felt off'],
  ['quiet', 'Prefer not to say']
];

const FIND_URL = '__FIND_URL__';
const CH_URL = 'https://claude.ai/artifact/6ZrGVeuv7gRSoP2tmWkRav';

/* ---------- data (from features/onboarding/constants.ts) ---------- */
const GOALS = [['move_more','Move more','Build an active routine','run'],['sleep_better','Sleep better','Rest and recover well','sleep'],['reduce_stress','Reduce stress','Feel calmer day to day','leaf'],['improve_energy','Improve energy','Stay sharp and focused','bolt']];
const STRUGGLES = [['start_but_stop','I start but stop','Good intentions, hard to stay consistent','redo'],['lack_accountability','I lack accountability','No one keeping me on track','community'],['too_busy',"I'm too busy",'Life gets in the way every time','clock'],['overwhelmed','I feel overwhelmed',"Don't even know where to begin",'cloud']];
const TONES = [['competitive','Competitive','I like a friendly rivalry','trophy'],['momentum','Momentum-driven','I hate breaking a streak','fire'],['encouraging','Encouraging','I need warmth, not pressure','chat'],['team','Team-minded','I show up for others','together']];
const ENERGY = [['low','Low','Running on empty','sleep'],['medium','Medium','Getting by','bolt'],['high','High','Firing on all cylinders','fire']];
const AGES = [['18-24','18–24'],['25-34','25–34'],['35-44','35–44'],['45-54','45–54'],['55+','55+']];
const GENDERS = [['male','Male'],['female','Female'],['prefer_not_to_say','Prefer not to say']];
const FIRST_WEEK = { low:'A gentle start: one small win at a time', medium:'A steady pace: build the habit as you go', high:'A strong start: momentum from day one' };
const TONE_SUM = {
  competitive:'You push harder when someone is keeping score. Choner turns your challenge into a friendly rivalry worth winning.',
  momentum:'Once you get going, you hate to stop. Choner protects your streak so one hard day never undoes your progress.',
  encouraging:'Pressure has never worked on you. Support does. Choner keeps things warm, steady, and on your side.',
  team:'You show up for others more than yourself. Choner pairs you with someone who needs you as much as you need them.'
};
const DEMO_PICK = { goal:'move_more', struggle:'start_but_stop', tone:'momentum', energy:'medium', age:'25-34', gender:'male' };
/* challenge templates: titles/units are stand-ins, the real ones are rows in challenge_templates */
const EX = { push:['Push-ups','reps',20,5], squat:['Squats','reps',30,5], lunge:['Lunges','reps per leg',12,2], situp:['Sit-ups','reps',30,5], pull:['Pull-ups','reps',10,1], plank:['Plank','sec',60,10], burpee:['Burpees','reps',15,5], jj:['Jumping jacks','reps',50,10], stretch:['Stretching routine','min',10,5] };
/* The six MVP activities (decided 2026-09-26). Every one plans weekly sessions, together or separately. */
const TPL = {
  run:{t:'Running',verb:'Run',noun:'run',unit:'km',def:3,step:0.5,icon:'run'},
  jog:{t:'Jogging',verb:'Jog',noun:'jog',unit:'km',def:3,step:0.5,icon:'run'},
  walk:{t:'Walking',verb:'Walk',noun:'walk',unit:'km',def:4,step:0.5,icon:'walk'},
  cycle:{t:'Cycling',verb:'Cycle',noun:'ride',unit:'km',def:10,step:1,icon:'bike'},
  yoga:{t:'Yoga',verb:'Yoga',noun:'session',unit:'min',def:30,step:5,icon:'leaf'},
  // DECIDED 1 October: Workouts are measured in MINUTES like everything else.
  // Per-exercise units (reps / sec / min) could not survive four exercises on
  // one commitment, and one shared unit is what lets two people match on
  // "Workouts, 30 min" without both having picked push-ups.
  work:{t:'Workouts',verb:'Workout',noun:'workout',unit:'min',def:30,step:5,icon:'dumb'}
};
const INVITE_PHRASE = { run:'go for a run', jog:'go for a jog', walk:'go for a walk', cycle:'go for a ride', yoga:'do yoga' };
const invitePhrase = () => S.chosen === 'work' ? 'work out' : INVITE_PHRASE[S.chosen];
/* goal -> recommended activities, first one carries the Recommended badge */
const GOAL_OPTS = { move_more:['run','jog','cycle','walk'], sleep_better:['walk','yoga','work'], reduce_stress:['yoga','walk'], improve_energy:['work','run'] };
const GOAL_EX = { sleep_better:['stretch'], improve_energy:['push','burpee'] };
const MAX_EX = 4;
// What the card and the directory say. Never what the matcher reads.
const exList = () => S.exs.map(k => EX[k][0]).join(', ');
const optsFor = g => g ? GOAL_OPTS[g].concat(Object.keys(TPL).filter(k => !GOAL_OPTS[g].includes(k))) : Object.keys(TPL);
const recFor = g => g ? GOAL_OPTS[g][0] : 'walk';
/* the four "why" questions (features/challenges/reflections.ts) */
const WHYQ = [
  {k:'purpose',q:"What's your purpose for doing this?",pre:'Your reason',o:['Build a healthier routine','Prove I can stick with something','Feel better day to day']},
  {k:'matters',q:'Why does this matter to you right now?',pre:'Why it matters right now',o:['A specific goal or event coming up',"I've tried before and stopped",'Someone I care about inspired this']},
  {k:'gain',q:'What will you gain if you stick with it?',pre:'What you gain',o:['More energy','Better health','Confidence in myself']},
  {k:'lose',q:"What will you lose if you don't?",pre:'What you lose',o:["Another attempt that didn't stick","Progress I've already made",'A chance to prove this to myself']}
];
const lab = (arr, v) => { const r = arr.find(a => a[0] === v); return r ? r[1] : null; };
const initials = n => (n || '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '··';
const firstName = n => (n || '').trim().split(/\s+/)[0] || '';

/* ---------- state ---------- */
const DEMO = { email:'demo@choner.app', pw:'password123', name:'Dinesh Doluweera', verified:true, onb:true };
function fresh(){
  return { cur:'splash', hist:[], accts:[Object.assign({}, DEMO)], user:null, f:{}, err:{}, formErr:null, showPw:{}, terms:false,
    goal:null, struggle:null, tone:null, age:null, gender:null, energy:null,
    // exs: up to four exercises, and ONLY for Workouts. They are descriptive:
    // they show on the card and in the directory and they never reach matching.
    // partnerAmount: their number, which does not have to be yours.
    partnerPick:null, chosen:'run', exs:['push','squat'], customTitle:null, amount:3, partnerAmount:3, cadence:2, agreed:false, why:{}, invitee:false,
    planProp:null, counterFrom:null, invPhase:'choose', sentEmail:null, sentVia:null, invMsg:null, sheet:null, searches:0, find:{ intent:false, mode:null, gender:null, areas:[] }, pstate:'solo', explore:false, photo:null, photoFrom:null,
    cs:'matched', mode:'together', tg:'idle', gPartner:'idle', youDone:false, gDone:false, together:false, kept:6, weekDone:0, pulseH:0, shared:null,
    plan:{ day:'Saturday', time:'7:00 AM', timeRaw:'07:00', place:'Diyasaru Park', next:'Thursday \u00b7 7:00 AM', nextDay:'Thursday', amt:null }, pd:null,
    // the match clock, and which side has answered
    matchH:23, matchM:12, iAccepted:false, matchExpired:false, endReason:null,
    // the partner-card overflow menu, the report category, and how long you
    // have been paired - shown on the matched card
    menu:false, repCat:null, matchedAgo:'6 days ago',
    cam:null, dlg:null, legalTab:'terms', codePhase:'success', pendingCode:null, forgotEmail:null, verifyEmail:null,
    ginvSent:null, notif:{ reminders:true, partner:true, nudges:false }, deadline:'9:00 PM' };
}
let S = fresh();
let splashTimer = null;
const me = () => S.user || DEMO;
const myName = () => me().name;
// Workouts no longer inherit the exercise's unit. Minutes, like Yoga, because
// four exercises on one commitment have no single rep count between them.
const tpl = () => TPL[S.chosen];
const habitTitle = () => S.agreed ? `${TPL[S.chosen].verb} ${S.cadence}\u00d7 a week` : TPL[S.chosen].t;
// DECIDED 1 October: the AMOUNT is per person, the cadence is shared. Two
// people who cannot agree on 5 km versus 3 km should not lose the match over
// it - what matters is that they show up for each other. The circle still
// fills only when BOTH finish THEIR number.
const amtLine = () => !S.agreed ? "You'll agree how much and how often together"
  : S.partnerAmount === S.amount ? `${S.amount} ${tpl().unit} each time`
  : `You ${S.amount} ${tpl().unit} · ${partnerName()} ${S.partnerAmount} ${tpl().unit}`;
const partnerName = () => 'Gayan';
const AREA_GROUPS = [["Colombo city", ["Fort (Colombo 1)", "Slave Island (Colombo 2)", "Union Place (Colombo 2)", "Kollupitiya (Colombo 3)", "Bambalapitiya (Colombo 4)", "Havelock Town (Colombo 5)", "Narahenpita (Colombo 5)", "Kirulapone North (Colombo 5)", "Wellawatte (Colombo 6)", "Pamankada (Colombo 6)", "Kirulapone South (Colombo 6)", "Cinnamon Gardens (Colombo 7)", "Borella (Colombo 8)", "Dematagoda (Colombo 9)", "Maradana (Colombo 10)", "Maligawatta (Colombo 10)", "Panchikawatte (Colombo 10)", "Pettah (Colombo 11)", "Hulftsdorp (Colombo 12)", "Kotahena (Colombo 13)", "Kochchikade (Colombo 13)", "Bloemendhal (Colombo 13)", "Grandpass (Colombo 14)", "Mattakkuliya (Colombo 15)", "Modara (Colombo 15)", "Mutwal (Colombo 15)", "Madampitiya (Colombo 15)"]], ["Greater Colombo", ["Ambatale", "Athurugiriya", "Batuwatta", "Boralesgamuwa", "Dalugama", "Dehiwala", "Hokandara", "Homagama", "Ja-Ela", "Kadawatha", "Kaduwela", "Kalubowila", "Kandana", "Katunayake", "Kelaniya", "Kesbewa", "Kohuwala", "Kolonnawa", "Koswatte", "Kotikawatta", "Kottawa", "Maharagama", "Malabe", "Moratuwa", "Mount Lavinia", "Mulleriyawa", "Nawala", "Nugegoda", "Oruwala", "Pannipitiya", "Pelawatte", "Peliyagoda", "Piliyandala", "Ragama", "Rajagiriya", "Ratmalana", "Sri Jayawardenepura Kotte", "Thalawathugoda", "Wattala", "Welikada", "Wickramasinghapura"]]];
const AREAS = AREA_GROUPS.reduce((a, g) => a.concat(g[1]), []);
function locPicker(){
  const left = 2 - S.find.areas.length;
  const opts = AREA_GROUPS.map(([g, list]) => { const free = list.filter(a => !S.find.areas.includes(a));
    return free.length ? `<optgroup label="${esc(g)}">${free.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join('')}</optgroup>` : ''; }).join('');
  return `<div class="sel-wrap"><select id="loc-sel" aria-label="Choose an area"><option value="" selected>${S.find.areas.length ? 'Add one more' : 'Choose an area'}</option>${opts}</select></div>`;
}
const needsArea = () => S.find.mode === 'person' || S.find.mode === 'either';
const findDone = () => !!S.find.mode && !!S.find.gender && (!needsArea() || S.find.areas.length > 0);
const fdNext = () => findDone() ? 'fd3' : 'fd2';
/* the pair can only meet when BOTH sides could: 'separate' on either side rules it out */
const pairCanMeet = () => S.find.mode !== 'separate';
const inviteMsgDefault = () => `${firstName(myName())} is challenging you to ${invitePhrase()}. Are you up for it?`;
const inviteMsg = () => S.invMsg !== null ? S.invMsg : inviteMsgDefault();
const shareText = () => `${inviteMsg()}
${invLink()}
Code: ${invCode()}`;
const invLink = () => `https://choner.app/i/${invCode()}`;
const invCode = () => S.invCodeVal || 'RUN4K7';
const newCode = () => { const L = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let c = TPL[S.chosen].verb.replace(/[^A-Za-z]/g,'').slice(0,3).toUpperCase(); while (c.length < 6) c += L[Math.floor(Math.random()*L.length)]; S.invCodeVal = c; };
const codeBox = () => `<div class="codebox"><div><small>Invite code</small><b>${invCode()}</b></div><button class="pill" data-act="copy-code">${ic('share',1.8)} Copy</button></div>`;
/* one at a time: an invite and a search never run together */
function confirmSwitch(to, then){
  if (to === 'invite' && S.pstate === 'finding') { dlg('Stop searching?', 'Inviting someone you know stops your search for a match. You can search again any time.', [['Keep searching', null], ['Invite instead', () => { S.pstate = 'solo'; S.find.intent = false; then(); }]]); return; }
  if (to === 'find' && S.pstate === 'waiting') { dlg('Cancel your invite?', `Finding a match cancels your invite. The link and code ${invCode()} stop working.`, [['Keep my invite', null], ['Find a match instead', () => { S.pstate = 'solo'; S.invPhase = 'choose'; S.sentEmail = null; S.invCodeVal = null; then(); }]]); return; }
  then();
}
function radarSearching(){ return `<div class="radar act" role="img" aria-label="Searching for your partner"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="rc">Searching<br>\u2026</span></div>`; }
function sheetHTML(){
  if (S.sheet === 'report') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">What's <b>going on?</b></div><div class="p-sub">This ends the match. Your challenge and your streak both continue.</div><div class="pill-row" style="margin-bottom:14px;">${reportCats().map(c => `<button class="pill ${S.repCat===c?'on':''}" data-act="rep-cat" data-v="${esc(c)}">${c}</button>`).join('')}</div>${!metUp()?`<div class="hint" style="margin:-6px 0 12px;">More reasons appear once you have actually met.</div>`:''}<button class="btn" data-act="rep-send" ${S.repCat?'':'disabled'}>Submit report</button><button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  if (S.sheet === 'block') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Block <b>${esc(partnerName())}?</b></div><div class="p-sub">The match ends and you will not be shown to each other again. They are told the match ended, nothing more.</div><button class="btn" data-act="block-send" style="background:#C0392B;box-shadow:none;">Block</button><button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  if (S.sheet === 'finish-sep') return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Log your <b>${TXc().noun}</b></div><div class="p-sub">Tap done when you have finished. Gayan is told you showed up.</div><button class="btn" data-act="sep-done">Done</button><button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
  if (S.sheet !== 'share') return '';
  return `<div class="scrim2" data-act="sheet-close"><div class="sheet2" data-act="noop"><div class="sheet2-handle"></div><div class="p-h1">Share your <b>invite</b></div><div class="p-sub">Your message, the link and code ${invCode()} always travel together, whichever you pick.</div>
    ${[['WhatsApp','chat'],['Messages','chat'],['Copy','share']].map(o => `<button class="choice mini" data-act="share-via" data-v="${o[0]}"><div class="ic">${ic(o[1],1.8)}</div><div class="t">${o[0]}</div></button>`).join('')}
    <button class="btn-g" data-act="sheet-close">Cancel</button></div></div>`;
}
/* invite block shared by the onboarding choice screen and Invite a friend on Home */
function inviteBlock(home){
  const p = S.invPhase;
  const msgBox = `<div class="fld"><label for="ta-msg">Your message</label><textarea class="txt" id="ta-msg" rows="3" aria-label="Invite message">${esc(inviteMsg())}</textarea></div><div class="linkbox">${invLink()}<br>Code: <b>${invCode()}</b></div><div class="hint" style="margin:-8px 0 12px;">The link and the code go with your message. The code is for a friend who installs the app first. <b>It expires in 48 hours.</b><br>How far and how often is not in the invite: you will agree that together once they join.</div>`;
  if (p === 'email') return { mid:`${msgBox}${fld('inv-email','Their email',{ph:'name@example.com'})}`, foot:`${btn('Send by email','inv-send',{primary:true})}${ghost('Share a link instead','inv-share-back')}` };
  if (p === 'pending') return { mid:`<div class="pstat ok" style="margin-bottom:12px;">${ic('check',2)}${S.sentEmail?`Emailed to ${esc(S.sentEmail)}`:`Shared via ${esc(S.sentVia||'link')}`}</div>${codeBox()}<div class="procard"><div class="hint" style="margin:0 0 6px;">Your message</div><div style="font-size:13px;line-height:1.5;">${esc(inviteMsg())}<br>${invLink()}<br>Code: ${invCode()}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px;"><button class="btn" data-act="inv-resend" style="padding:13px 0;font-size:14px;">Resend</button>${ghost('Invite someone else instead','inv-share-back')}</div>`,
    foot:`<button class="waitbtn" disabled>Waiting for your partner...</button>${ghost(home?'Done':'Done, take me home','inv-home')}` };
  return { mid:`${msgBox}<div class="sw" style="margin-top:0;">or <button data-act="inv-email">send it by email</button></div>`, foot:`${btn('Share invite','open-share',{primary:true,icon:'share'})}${home?'':ghost('Back','inv-back')}` };
}

/* ---------- chrome ---------- */
function appBar(){ return `<div class="topbar"><div class="logo">choner<span>.</span></div><button class="avatar-chip" data-go="profile" aria-label="Your profile" style="border:none;cursor:pointer;">${esc(initials(myName()))}</button></div>`; }
function authBar(title){ return `<div class="topbar"><button class="back" data-back="1" aria-label="Back">${ic('back',2.2)}</button><div class="ttl">${esc(title)}</div><div class="slot"></div></div>`; }
function stepBar(dot){
  const d = [1,2,3,4,5,6].map(i => `<i class="${i === dot ? 'on' : i < dot ? 'done' : ''}"></i>`).join('');
  return `<div class="stepbar"><button class="back" data-back="1" aria-label="Back" style="background:none;border:none;color:#fff;cursor:pointer;display:flex;">${ic('back',2.2)}</button><div class="dots">${d}</div><div style="width:20px"></div></div>`;
}
function navBar(active){
  const items = [['home','Home','home'],['target','Challenges','challenges'],['find','Find','find'],['community','Community','community']];
  const badge = to => to === 'challenges' && S.pstate === 'partnered' && (S.cs === 'matched' || S.cs === 'today' || S.cs === 'done');
  return `<div class="nav">${items.map(([k,l,to]) => { const on = k === active || to === active;
    return `<button class="navitem ${on?'on':'off'}" data-go="${to}" style="background:none;border:none;cursor:pointer;font-family:inherit;"><span style="color:${on?'#FD5B01':'#fff'};position:relative;display:inline-flex;">${ic(k,2)}${badge(to)?'<i class="nbadge" aria-label="Needs you"></i>':''}</span><div class="lbl">${l}</div></button>`; }).join('')}</div>`;
}
const btn = (label, act, o={}) => `<button class="btn${o.icon&&!(o.cls||'').includes('row')?' row':''}${o.cls?' '+o.cls:''}" ${o.primary?'data-primary="1"':''} ${o.go?`data-go="${o.go}"`:`data-act="${act}"`} ${o.v!==undefined?`data-v="${esc(o.v)}"`:''} ${o.dis?'disabled':''}>${o.icon?ic(o.icon,2):''}${label}</button>`;
const ghost = (label, act, v, go) => `<button class="btn-g" ${go?`data-go="${go}"`:`data-act="${act}"`} ${v!==undefined?`data-v="${esc(v)}"`:''}>${label}</button>`;
const proto = (label, act, v) => `<button class="proto" data-act="${act}" ${v!==undefined?`data-v="${esc(v)}"`:''} style="margin-top:8px;">${esc(label)}</button>`;
function fld(id, label, o){
  o = o || {};
  const type = o.pwd ? (S.showPw[id] ? 'text' : 'password') : 'text';
  const bad = S.err[id];
  return `<div class="fld">${label?`<label for="f-${id}">${label}</label>`:''}<div class="inwrap${o.pill?' pillin':''}">${o.lead?`<span class="lead">${ic(o.lead,1.8)}</span>`:''}<input class="txt${bad?' bad':''}" id="f-${id}" type="${type}" placeholder="${esc(o.ph||'')}" value="${esc(S.f[id]||'')}" autocomplete="off" ${o.max?`maxlength="${o.max}"`:''}>${o.pwd?`<button class="eye" type="button" data-act="pw" data-v="${id}" aria-label="Show or hide password">${ic(S.showPw[id]?'eyeoff':'eye',1.8)}</button>`:''}</div>${bad?`<div class="ferr">${esc(bad)}</div>`:''}</div>`;
}
const legalLine = lead => `<div class="terms" style="margin-top:16px;">${lead} our<br><button data-go="legal">Terms of use, privacy and policy &amp; cookie policy</button></div>`;
const heading = (lead, em, sub) => `<div class="p-h1"${sub?'':' style="margin-bottom:20px;"'}>${lead}<b>${em}</b></div>${sub?`<div class="p-sub">${sub}</div>`:''}`;
const hdr = (title, close) => `<div class="hdr">${close?'':`<button class="backc" data-back="1" aria-label="Back">${ic('back',2.2)}</button>`}<div class="ht">${esc(title)}</div>${close?`<button class="cl" data-back="1" aria-label="Close">${ic('x',2)}</button>`:''}</div>`;
function heart(you, partner){
  const right = partner
    ? '<path fill="url(#gR)" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>'
    : '<path class="h-empty" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>';
  return `<div class="stage-h"><div class="glow"></div><svg class="heart" viewBox="0 0 132 124" aria-hidden="true"><defs>
    <linearGradient id="gL" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD5B01"/><stop offset="100%" stop-color="#FD8302"/></linearGradient>
    <linearGradient id="gR" x1="1" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD8302"/><stop offset="100%" stop-color="#FFA83D"/></linearGradient></defs>
    <path fill="${you?'url(#gL)':'none'}" stroke="${you?'none':'var(--dim)'}" stroke-width="2.4" d="M66 30 C 56 14, 32 10, 20 24 C 6 39, 10 62, 24 78 C 34 90, 52 104, 66 114 Z"/>${right}</svg></div>`;
}
function whyLine(){
  for (const q of WHYQ){ const a = S.why[q.k]; if (!a) continue;
    if (a.c === 'custom' && a.t && a.t.trim()) return `${q.pre}: ${a.t.trim()}`;
    if (a.c !== undefined && a.c !== 'custom') return `${q.pre}: ${q.o[a.c]}`; }
  return null;
}
const whyCount = () => WHYQ.filter(q => { const a = S.why[q.k]; return a && (a.c === 'custom' ? (a.t || '').trim() : a.c !== undefined && a.c !== null); }).length;
function reflect(){
  return WHYQ.map(q => { const a = S.why[q.k] || {};
    return `<div class="qprompt">${q.q}</div>` + q.o.map((o,i) => `<button class="choice mini ${a.c===i?'on':''}" data-act="why" data-v="${q.k}:${i}"><div class="t">${o}</div></button>`).join('')
      + `<button class="choice mini ${a.c==='custom'?'on':''}" data-act="why" data-v="${q.k}:custom"><div class="t">Something else</div></button>`
      + (a.c === 'custom' ? `<input class="txt" id="w-${q.k}" placeholder="In your own words" value="${esc(a.t||'')}" maxlength="120" aria-label="${esc(q.q)}">` : ''); }).join('');
}
const seat = (label, on) => `<div class="seat ${on?'on':''}">${esc(label)}</div>`;
/* ---------- dialogs ---------- */
function dlg(title, msg, btns){ S.dlg = { title, msg, btns: btns || [['OK', null]] }; render(); }
function dlgHTML(){
  if (!S.dlg) return '';
  return `<div class="dlgwrap"><div class="dlg" role="alertdialog" aria-label="${esc(S.dlg.title)}"><b>${esc(S.dlg.title)}</b><p style="white-space:pre-line;">${esc(S.dlg.msg)}</p><div class="db">${S.dlg.btns.map((b,i) => `<button data-act="dlg" data-v="${i}">${esc(b[0])}</button>`).join('')}</div></div></div>`;
}
/* ---------- screens ---------- */
const SC = {}; const def = (id, o) => { SC[id] = o; };
const N = (t, what, build, flag, dnb) => ({ t, what, build, flag, dnb });

/* ===== Launch ===== */
def('splash', { ph:'L1', group:'Launch', label:'Splash', flush:true, bar:() => '', nav:() => '',
  onEnter:() => { clearTimeout(splashTimer); splashTimer = setTimeout(() => { if (S.cur === 'splash') go('welcome'); }, 2300); },
  body:() => `<button class="splash" data-go="welcome" aria-label="Continue to welcome">choner<span>.</span></button>`,
  note:N('Wordmark only, then on', 'Held for a minimum time while the stored session and (for signed-in users) the profile load. Nothing else appears: no logo image, no tagline. It moves on by itself after about two seconds; tap it or use Next to skip.',
    ['app/index.tsx renders SplashView while session or profile is loading or the splash hold has not elapsed','Signed out goes to Welcome. Signed in goes to onboarding if profile.onboarding_complete is false, otherwise to Home (or to the screen a tapped notification asked for)','On a profile load error it fails open to Home so nobody is trapped on the splash'], null, 'The wordmark is text, not the logo image. The logo image is Welcome only.') });

def('welcome', { ph:'L2', group:'Launch', label:'Welcome', flush:true, bar:() => '', nav:() => '',
  body:() => `<div class="welcome"><div class="sp"></div><div class="brand"><div class="wordmark">choner<span>.</span></div></div><div class="sp"></div>
    <div class="acts"><button class="btn" data-go="signin">Sign in</button>
    <button class="btn-o brand" data-go="signup">Create an account</button>
    <button class="btn-g" data-go="invitecode">I have an invite code</button></div></div>`,
  note:N('Brand name, three ways in', 'The wordmark only. The logo image and the tagline moved to the onboarding intro, so Welcome carries just the name and the three ways in.',
    ['app/(auth)/welcome.tsx','Sign in is the filled orange button, "Create an account" the orange-outlined one, "I have an invite code" a ghost button. Same size, height and corner radius as every other primary button in the app','The button says "Create an account", the same words used everywhere else the account is made','No legal line here, and none on Sign in either. Decided 29 September: the tick box on Create an account is the only place the agreement appears, because it is the only thing that records consent'], null) });

/* ===== Account ===== */
def('signin', { ph:'A1', group:'Account', label:'Sign in', bar:() => authBar('Log in'), nav:() => '',
  body:() => `${heading('Welcome ','back',"Someone's been waiting for you.")}
    ${fld('si-email','Email',{ph:'you@email.com'})}${fld('si-pw','Password',{ph:'••••••••',pwd:true})}
    <div style="text-align:right;margin:-4px 0 6px;"><button class="link" data-go="forgot" style="font-size:12.5px;font-weight:500;">Forgot password?</button></div>
    ${S.formErr?`<div class="formerr">${esc(S.formErr)}</div>`:''}
    <div class="foot">${btn('Log in','signin',{primary:true})}<div class="sw">New here? <button data-act="replace" data-v="signup">Create an account</button></div>${proto('Fill the demo account (already onboarded)','demo-fill')}</div>`,
  note:N('Log in', 'Email and password with inline validation. A failed attempt shows the reason on the form itself as well as in an alert, including the possibility that they never made an account.',
    ['app/(auth)/sign-in.tsx, zod signInSchema: valid email, password of 8+','Errors map through authErrorMessage(): wrong credentials, unconfirmed email, rate limit, no network','Success replaces to "/" and the index gate decides onboarding or Home','Switching to Create an account replaces the screen, it does not stack','NO legal line here. Decided 29 September: signing in is not consent, it is proof of consent already given. The documents live in Settings'],
    'Try a wrong password, an unknown email, or the demo account. Accounts you create in Sign up also work here for this session.') });

def('signup', { ph:'A2', group:'Account', label:'Sign up', bar:() => authBar('Create account'), nav:() => '',
  body:() => `${heading("Let's get ",'started','')}
    ${fld('su-name','Your name',{ph:'Your full name'})}${fld('su-email','Email',{ph:'you@email.com'})}
    ${fld('su-pw','Password',{ph:'••••••••',pwd:true})}${fld('su-pw2','Confirm password',{ph:'••••••••',pwd:true})}
    <button class="chk ${S.terms?'on':''}" data-act="terms" type="button"><i>${S.terms?ic('check',3):''}</i><span>I agree to Choner's <u>Terms of use</u>, <u>Privacy policy</u>, <u>Cookie policy</u> and <u>Health disclaimer</u>.</span></button>
    ${S.err.terms?`<div class="ferr">${esc(S.err.terms)}</div>`:''}
    <div class="foot">${btn('Create account','signup',{primary:true})}<div class="sw">Already have one? <button data-act="replace" data-v="signin">Log in</button></div></div>`,
  note:N('Create account', 'Name, email, password, a confirm-password field and the terms checkbox. The app keeps the confirm field even though the older design artifact dropped it.',
    ['app/(auth)/sign-up.tsx, zod signUpSchema: name 2+ chars, valid email, password 8+, passwords match, terms accepted','If the project requires email verification it goes to Verify email, otherwise straight into onboarding','An email that already exists shows the "already has an account" alert','The tick box is the only place the agreement appears and it names all four documents as separate links. The bottom legal line is gone: the tick box is what records consent'],
    'Settled 29 September: the tick box stays and carries the links, the bottom line is gone. There is no cookie policy screen yet, so that link points at Privacy for now.') });

def('verify', { ph:'A3', group:'Account', label:'Verify email', bar:() => '', nav:() => '',
  body:() => `<div style="padding-top:34px;"><div class="head-c"><img src="__LOGO__" alt=""><div class="capn">Check your email</div><div class="hp">We sent a verification link to ${esc(S.verifyEmail || 'your inbox')}. Tap it to finish creating your account.</div></div>
    <button class="btn" data-act="resend" style="margin-bottom:12px;">Resend email</button>
    <button class="btn-o brand" data-act="replace" data-v="signin">Back to sign in</button>${proto('Simulate: tap the link in the email','verify-link')}${proto('Simulate: the link has expired','link-expired','verify')}</div>`,
  note:N('Check your email', 'Shown after sign-up when email confirmation is on. Resend sends a fresh link. Tapping the link in the email should open the app, sign the person in and show "You\'re verified".',
    ['app/(auth)/verify-email.tsx','Resend needs the email param; Back to sign in replaces','Tap the first dashed button for the success path, the second for an expired or already-used link'],
    ['BUG in the app today: the link verifies the account on Supabase, but the app ignores the login tokens in the link (detectSessionInUrl is off and nothing reads the link). The user lands back on this "Check your email" screen, not signed in, with "your inbox" in the text and Resend disabled (no email in the link). The only way on is Back to sign in and logging in by hand. Fix: read the tokens from the link and create the session, then show You\'re verified','Add choner://verify-email and choner://reset-password to the Supabase allowed redirect URLs, or Supabase sends people to the Site URL instead of the app']) });

def('verified', { ph:'A3a', group:'Account', label:'Email verified', bar:() => '', nav:() => '',
  body:() => `<div class="center" style="padding-top:60px;"><div class="big-ok">${ic('check',2.6)}</div><div class="p-h1" style="text-align:center;">You're <b>verified.</b></div><div class="p-sub" style="text-align:center;">Your email is confirmed and you're signed in.</div></div>
    <div class="foot">${btn('Continue','verified-continue',{primary:true})}</div>`,
  note:N('You\'re verified', 'New screen. What the person sees after tapping the link in their verification email: the app opens, signs them in from the link, confirms it, and Continue goes on (onboarding for a new account).', ['Read the tokens from the link, create the session, then show this screen','Continue always goes to the onboarding intro: verifying an email only ever happens right after sign-up, so the profile is never complete yet','If they were invited by code before signing up, Continue goes to the invite result instead'], 'This screen does not exist in the app yet (see the bug on Check your email).') });

def('linkexpired', { ph:'A3b', group:'Account', label:'Link expired', bar:() => '', nav:() => '',
  body:() => { const reset = S.expiredKind === 'reset';
    return `<div class="center" style="padding-top:40px;"><div class="icobig bad">${ic('clock',1.8)}</div><div class="p-h1" style="text-align:center;">This link has <b>expired.</b></div><div class="p-sub" style="text-align:center;">Links work once and only for a while. We'll send you a fresh one.</div></div>
    ${fld('exp-email','Your email',{ph:'you@email.com'})}
    <div class="foot">${btn(reset?'Send a new reset link':'Send a new link','resend-fresh',{primary:true,icon:'mail',cls:'row'})}${ghost('Back to sign in','replace','signin')}</div>`; },
  note:N('Link expired or already used', 'New screen for a verification or reset link that has expired or was already used. It asks for the email because the link does not carry it.', ['Prefilled when the app still knows the email','Sends a fresh verification link, or a fresh reset link when it came from Forgot password','Back to sign in always works: a verified account can simply log in'], 'This screen does not exist in the app yet.') });

def('forgot', { ph:'A4', group:'Account', label:'Forgot password', bar:() => '', nav:() => '',
  body:() => `<button class="backc" data-back="1" aria-label="Back">${ic('back',2.2)}</button><div class="head-c"><img src="__LOGO__" alt=""><div class="capn">Forgot password</div><div class="hp">Enter your email and we'll send a link to set a new password.</div></div>
    ${fld('fp-email','Email',{ph:'you@email.com'})}${btn('Send reset link','forgot',{primary:true})}${proto('Simulate: tap the reset link in the email','reset-link')}${proto('Simulate: the reset link has expired','link-expired','reset')}`,
  note:N('Forgot password', 'One email field. Sends the reset link, tells the person to check their email, and returns to Sign in.', ['app/(auth)/forgot-password.tsx, forgotPasswordSchema (valid email)','On success: alert "Check your email", then router.back()','Restyled to match Sign in and Sign up: sentence case, standard fields and buttons'], ['Same bug as the verify link: the reset link opens /reset-password, but the app does not create the session from the link, so Save password fails. Fix it the same way','Styling now matches the orange button colours']) });

def('reset', { ph:'A5', group:'Account', label:'Reset password', bar:() => '', nav:() => '',
  body:() => `<div class="head-c" style="padding-top:34px;"><img src="__LOGO__" alt=""><div class="capn">Set new password</div><div class="hp">Choose a new password for your account.</div></div>
    ${fld('rp-pw','New password',{ph:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',pwd:true})}${fld('rp-pw2','Confirm new password',{ph:'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022',pwd:true})}${btn('Save password','reset',{primary:true})}`,
  note:N('Set new password', 'Reached from the reset email link. New password plus confirmation, then it signs the person in and lands on Home.', ['app/(auth)/reset-password.tsx, resetPasswordSchema (8+, must match)','Success alert: "Password updated. You are signed in with your new password." then the index gate decides: onboarding if the profile is not complete, otherwise Home'], ['The helper sentence on this screen is a stand-in','BUG in the app today: without a session from the reset link, Save password fails. Read the tokens from the link first (same fix as the verify link)']) });

def('invitecode', { ph:'A6', group:'Account', label:'Enter invite code', bar:() => '', nav:() => '',
  onEnter:() => { S.f.code = ''; },
  body:() => `${hdr('Enter invite code')}<div class="p-sub" style="margin-bottom:18px;">Enter the 6-character code from your friend's message or invite email and we'll pull you into the challenge.</div>
    ${fld('code','Invite code',{ph:'e.g. RUN4K7',max:6})}${btn('Join the challenge','joincode',{primary:true})}${proto('Fill a sample code','code-fill','RUN4K7')}${proto('Fill a code that will fail','code-fill','invalid')}`,
  note:N('Invite code', 'The way in for someone whose invite link would not open the app. Paste the code, join the challenge.', ['app/invite/code.tsx, then app/invite/[token].tsx','The button stays disabled until something is typed','Signed out: shows "One step first" with Sign in and Create an account on it, so nobody is bounced back to Welcome to pick again; the code is kept and accepted the moment they are in']) });

def('inviteaccept', { ph:'A7', group:'Account', label:'Invite result', bar:() => '', nav:() => '',
  body:() => {
    const p = S.codePhase;
    if (p === 'needs-auth') return `<div class="center"><div class="icobig">${ic('community',1.8)}</div><div class="p-h1">One step first</div><div class="p-sub">Sign in or create your account and we'll pull you straight into the challenge.</div>
      <div class="acts" style="margin-top:22px;">${btn('Sign in','',{go:'signin'})}<button class="btn-o brand" data-go="signup">Create an account</button></div></div>`;
    if (p === 'error') return `<div class="center"><div class="icobig bad">${ic('flag',1.8)}</div><div class="p-h1">That didn't work</div><div class="p-sub">This invite code isn't valid or has already been used.</div>${btn(S.user?'Go home':'Back to sign in','',{go:S.user?'home':'signin'})}</div>`;
    return `<div class="center"><div class="icobig">${ic('fire',1.8)}</div><div class="p-h1">You're connected.</div><div class="p-sub">Your shared fire is lit. You and your partner are in this together now.</div>${btn('Continue','invite-continue')}</div>`; },
  note:N('Joined, or not', 'Three outcomes: joined, needs an account first, or the invite failed. A brand-new invitee goes to the onboarding intro and builds a profile; someone who already has one goes straight to the why.', ['app/invite/[token].tsx','New account: Continue goes to the onboarding intro. They answer goal, struggle, style, about you and energy, see the reveal and the photo step, then skip the challenge picker and the starting point (they inherit their partner\'s challenge) and finish on the why','Existing account: Continue goes straight to the why, prefilled and skippable, then Home','BUG in the app today: app/invite/[token].tsx replaces to /onboarding/why for everyone, so a brand-new invitee reaches Home with no profile at all (no goal, struggle, style, age, gender or energy), which the matching and the tone of the app both depend on'], 'Check: the invitee path never sets onboarding_complete. Confirm whether the index gate sends them back into onboarding on the next launch.') });

def('legal', { ph:'A8', group:'Account', label:'Terms and privacy', bar:() => '', nav:() => '',
  body:() => { const T = { terms:['Terms of use','These terms govern your use of Choner. By creating an account you agree to them.','Using Choner','Choner pairs you with a partner for daily habits. You are responsible for what you do and for how you treat your partner.','Your content','Photos and notes you add are shown to your partner and, only if you choose, shared with your city.'], privacy:['Privacy','How Choner collects and uses your information.','What we collect','Your name, email, profile answers, check-ins and photos you upload.','Who sees it','Your partner sees your check-ins. Nothing is shared publicly unless you say yes.'], health:['Health disclaimer','Choner is not medical advice.','Before you start','Talk to a doctor before beginning any new exercise routine.','Listen to your body','Stop if something hurts. Choner never asks you to push through pain.'] }; const t = T[S.legalTab];
    return `${hdr(t[0])}<div class="legalseg">${[['terms','Terms'],['privacy','Privacy'],['health','Health']].map(([k,l]) => `<button class="${S.legalTab===k?'on':''}" data-act="legal" data-v="${k}">${l}</button>`).join('')}</div><div class="legal"><p>${t[1]}</p><h4>${t[2]}</h4><p>${t[3]}</p><h4>${t[4]}</h4><p>${t[5]}</p></div>`; },
  note:N('Terms, privacy, health', 'Three legal pages reached from the Welcome footer.', ['app/legal/terms.tsx, privacy.tsx, health-disclaimer.tsx'], 'Body text here is placeholder. The real wording lives in those three files.') });

/* ===== Onboarding ===== */
def('ob-intro', { ph:'O1', group:'Onboarding', label:'Intro', bar:() => '', nav:() => '',
  body:() => `<div class="pdots"><i class="on"></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="head-c" style="margin-top:18px;"><img src="__LOGO__" alt="" style="width:120px;"><div class="p-h1" style="margin:0;">Turn &ldquo;I should&rdquo;<br>into <span class="grad">&ldquo;I did&rdquo;</span></div><div class="hp">Choner helps you stay <b>consistent with the healthy habits</b> you want to build.</div></div>
    <div style="display:flex;flex-direction:column;gap:10px;">
    ${[['together','One partner, real accountability',"Not a crowd, not a stranger's app. One person counting on you"],['target','Personalised from day one','Your goals and struggles shape your first challenge'],['trend','Built to grow with you','More ways to stay consistent are coming']].map(p => `<div class="promise"><div class="pi">${ic(p[0],1.8)}</div><div><b>${p[1]}</b><span>${p[2]}</span></div></div>`).join('')}</div>
    <div class="foot">${btn('Build my profile','',{go:'goal',icon:'arrow',cls:'row rev'})}</div>`,
  note:N('Start of onboarding', 'Three promises, then one way forward: build the profile. Everyone answers the questions, because matching needs them.', ['app/onboarding/index.tsx','"I\'ll explore on my own" was REMOVED 2026-09-26. Every user builds a profile: matching needs age and gender, and there is no way back into those questions from Home. The only route to an empty Home is ending a challenge','Progress dots run 1 to 6 across the intro and the five steps'], 'The app shows emoji on the promise cards and in every option below. This prototype shows the design system line icons instead.') });

const grid = (arr, key) => `<div class="grid2">${arr.map(o => `<button class="gcard ${S[key]===o[0]?'on':''}" data-act="pick" data-v="${key}:${o[0]}">${ic(o[3],1.8)}<div class="t">${o[1]}</div><div class="d">${o[2]}</div></button>`).join('')}</div>`;
const rows = (arr, key) => arr.map(o => `<button class="choice ${S[key]===o[0]?'on':''}" data-act="pick" data-v="${key}:${o[0]}"><div class="ic">${ic(o[3],1.8)}</div><div><div class="t">${o[1]}</div><div class="d">${o[2]}</div></div></button>`).join('');
const ttl = (step, a, b, sub) => `<div class="steplbl">Step ${step} of 5</div><div class="p-h1">${a}<b>${b}</b></div><div class="p-sub">${sub}</div>`;

def('goal', { ph:'O2', group:'Onboarding', label:'Goal', bar:() => stepBar(2), nav:() => '',
  body:() => `${ttl(1,'What matters most to you ','right now?','Choner shapes your first challenge around this.')}${grid(GOALS,'goal')}
    <div class="foot">${btn('Continue','next-goal',{dis:!S.goal})}</div>`,
  note:N('Step 1: goal', 'Four goals in a 2 by 2 grid. It picks which challenges are offered later and which one is recommended.', ['app/onboarding/goal.tsx, values in features/onboarding/constants.ts','Required: Continue stays disabled until one is picked. The skip was removed because this screen directly orders the next one, and a skipped goal could never be recovered except through Edit profile','Editable later in Edit profile']) });
def('struggle', { ph:'O3', group:'Onboarding', label:'Struggle', bar:() => stepBar(3), nav:() => '',
  body:() => `${ttl(2,"What's stopped you ",'before?',"Be honest. This is how Choner knows where to support you most.")}${rows(STRUGGLES,'struggle')}
    <div class="foot">${btn('Continue','next-struggle',{dis:!S.struggle})}</div>`,
  note:N('Step 2: struggle', 'What has stopped them before. It shapes the tone of the personality summary.', ['app/onboarding/struggle.tsx','Required: the skip was removed. One tap, and today there is no way to set it afterwards'], 'Add struggle to Edit profile so it can be changed later. It is not there today.') });
def('style', { ph:'O4', group:'Onboarding', label:'Style', bar:() => stepBar(4), nav:() => '',
  body:() => `${ttl(3,'How do you want Choner to ','talk to you?','This shapes how Choner supports you and how your partner challenge feels.')}${rows(TONES,'tone')}<div class="reass">You can change this any time in your settings.</div>
    <div class="foot">${btn("This is me, let's go",'next-style',{dis:!S.tone})}</div>`,
  note:N('Step 3: style', 'Four accountability tones. This one cannot be skipped: it drives the reveal screen.', ['app/onboarding/style.tsx','Stored as profile.accountability_mode']) });
def('age', { ph:'O5', group:'Onboarding', label:'About you', bar:() => stepBar(5), nav:() => '',
  body:() => `${ttl(4,'How old are ','you?','Helps us pair you with someone at a similar stage.')}
    <div class="prow">${AGES.slice(0,3).map(a => `<button class="pillcard ${S.age===a[0]?'on':''}" data-act="pick" data-v="age:${a[0]}"><div class="t">${a[1]}</div></button>`).join('')}</div>
    <div class="prow">${AGES.slice(3).map(a => `<button class="pillcard ${S.age===a[0]?'on':''}" data-act="pick" data-v="age:${a[0]}"><div class="t">${a[1]}</div></button>`).join('')}</div>
    <div class="sect">What's your gender?</div>
    <div class="prow">${GENDERS.map(a => `<button class="pillcard ${S.gender===a[0]?'on':''}" data-act="pick" data-v="gender:${a[0]}"><div class="t">${a[1]}</div></button>`).join('')}</div>
    <div class="foot">${btn('Continue','next-age',{dis:!S.age||!S.gender})}</div>`,
  note:N('Step 4: age and gender', 'Age band plus the person\'s own gender, asked together. Matching cannot work without them.', ['app/onboarding/age.tsx','Required: Continue needs both, and the skip was removed. Matching depends on it: gender drives the "Same gender only" filter and the age band feeds the scoring','Gender already offers "Prefer not to say", which is the proper opt-out; skipping left no answer at all','This is the user\'s own gender, separate from the gender preference on the Find form']) });
def('energy', { ph:'O6', group:'Onboarding', label:'Energy', bar:() => stepBar(6), nav:() => '',
  body:() => `${ttl(5,'How are you feeling ','this week?','Choner adjusts your first week based on this. No pressure either way.')}
    <div class="prow">${ENERGY.map(o => `<button class="pillcard ${S.energy===o[0]?'on':''}" data-act="pick" data-v="energy:${o[0]}">${ic(o[3],1.8)}<div class="t">${o[1]}</div><div class="d">${o[2]}</div></button>`).join('')}</div>
    <div class="reass">This isn't a test. There's no wrong answer.</div>
    <div class="foot">${btn('See my profile','next-energy',{dis:!S.energy})}</div>`,
  note:N('Step 5: energy', 'The last question. Tapping See my profile is where everything is saved.', ['app/onboarding/energy.tsx','One write to the profile: goal, struggle, age, gender, tone, energy, timezone, city, onboarding_complete = true','It then creates the default challenge for the goal so Home has something to show']) });
def('reveal', { ph:'O7', group:'Onboarding', label:'Reveal', bar:() => '', nav:() => '',
  body:() => { const v = k => S[k] || DEMO_PICK[k]; const skipped = 'You skipped this. Choner adapts as you go'; const fn = firstName(myName());
    return `<button class="backc" data-back="1" aria-label="Back">${ic('back',2.2)}</button>
    <div class="center" style="padding-top:10px;"><div class="steplbl">We see you, ${esc(fn)}</div><div class="p-h1" style="font-size:34px;line-height:1.2;margin:6px 0 10px;">${lab(TONES,v('tone'))}</div><div class="p-sub">${TONE_SUM[v('tone')]}</div></div>
    <div class="card setup" style="margin-top:6px;">${[['target','Your goal',S.goal?lab(GOALS,S.goal):skipped],['fire','Your struggle',S.struggle?lab(STRUGGLES,S.struggle):skipped],['chat','Your style',lab(TONES,v('tone'))],['bolt','Your first week',FIRST_WEEK[v('energy')]]].map(r => `<div class="r"><div class="ib">${ic(r[0],1.8)}</div><div><small>${r[1]}</small><b>${r[2]}</b></div></div>`).join('')}</div>
    <div class="center" style="margin-top:16px;"><span class="okbadge">${ic('check',3)}Profile saved</span><div class="hint">Choner will refine this as you build your streak.</div></div>
    <div class="foot">${btn("Let's set up your first challenge",'',{go:'photo'})}</div>`; },
  note:N('Personality reveal', 'Their accountability style named back to them, with a summary of what they told us. Profile is already saved at this point.', ['app/onboarding/reveal.tsx, features/onboarding/mappings.ts','Rows that were skipped read "You skipped this. Choner adapts as you go"','The summary is one per tone; the 16 struggle-by-tone combinations are still an open content item','Back returns to the energy question, so an answer can be changed once they see what it produced'], 'The app redirects to the start of onboarding if tone or energy is missing. Here it falls back to example answers so you can jump straight to this screen.') });

def('photo', { ph:'O8', group:'Onboarding', label:'Add your photo', bar:() => '', nav:() => '',
  body:() => { const p = S.photo; const fromProfile = S.photoFrom === 'profile';
    const cam = p === 'confirmed'
      ? `<div class="photo-ok"><div class="pfpbig">${esc(initials(myName()))}</div><span class="okbadge">${ic('check',3)}Photo confirmed</span></div>`
      : `<div class="cam" style="height:250px;"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i><div class="faceguide"></div><div class="scan"></div><div class="cap" style="position:absolute;bottom:16px;">Live camera</div></div>`;
    return `${fromProfile?hdr('Your photo'):''}<div class="steplbl" style="margin-top:${fromProfile?0:8}px;">Your profile</div><div class="p-h1">Add your <b>photo</b></div><div class="p-sub">Take it live with your camera. Photos from your gallery can't be used.</div>${cam}
    ${p==='confirmed'?'':`<div class="badgenote"><span class="okbadge">${ic('check',3)}Photo confirmed</span><span>A photo earns this badge on your profile, so a match can see you are a real person. You can retake it any time in Profile.</span></div>`}
    <div class="foot">${p==='confirmed' ? `${btn('Continue','photo-next')}${ghost('Retake','photo-retake')}` : `${btn('Take photo','photo-take',{icon:'camera'})}${ghost('Set up later','photo-later')}`}</div>`; },
  note:N('Live photo (after the reveal)', 'One optional screen after the reveal: a live camera photo, or "Set up later". Camera only, no gallery import anywhere in this flow.', ['Source: Choner_31_Changes_Full_Detail.md #1 and #2, Choner_Branch_Plan_31_Changes.md Branch 3','Stored as photo_url and photo_status = photo_confirmed or no_photo','Shown to a match as "Photo confirmed" or "No photo yet" (Match Found), never as identity verification','Set up later leaves photo_status = no_photo; Profile offers "Add your photo", and once there is one, "Retake your photo" (the same screen)','The screen shows the badge it earns, so the payoff is visible before they decide','Live capture prevents reusing an old photo. It does not stop an irrelevant photo, and copy must not claim it does'], ['Copy on this screen is new (the docs only specify the behaviour)','The badge says "Photo confirmed", NOT "Photo verified". Locked 2026-09-21 (Choner_31_Changes_Full_Detail.md #2): never label or imply identity verification. Choner only checks the photo was taken live, not who is in it, and claiming otherwise is a safety claim we cannot stand behind when two strangers meet in person']) });

def('challenge', { ph:'O9', group:'Onboarding', label:'Pick a challenge', bar:() => stepBar(5), nav:() => '',
  onEnter:() => { if (S.invitee) go('why', {replace:true}); },
  body:() => { const ids = optsFor(S.goal), rec = recFor(S.goal);
    return `<div class="steplbl" style="margin-top:8px;">Your first challenge</div><div class="p-h1">Pick what you'll start with</div>
    ${ids.map(id => { const t = TPL[id]; return `<button class="choice ${S.pickedChallenge===id?'on':''}" data-act="pick-tpl" data-v="${id}"><div class="ic">${ic(t.icon,1.8)}</div><div><div class="t">${t.t}</div><div class="d">Together or separately</div></div>${id===rec?'<span class="badge">Recommended</span>':''}</button>`; }).join('')}
    <div class="foot">${btn('Continue','next-challenge',{dis:!S.pickedChallenge})}</div>`; },
  note:N('Your first challenge', 'The six MVP activities, ordered by the goal they picked, with one marked Recommended. Workouts ask which exercise.', ['Running, Jogging, Walking, Cycling, Yoga, Workouts. Every one plans weekly sessions, together or separately','Goal mapping: Move more: Running, Jogging, Cycling, Walking. Sleep better: Walking, Yoga, Stretching routine. Reduce stress: Yoga, Walking. Improve energy: Workouts, Running','Workouts: Push-ups, Squats, Lunges, Sit-ups, Pull-ups, Plank, Burpees, Jumping jacks, Stretching routine','Removed: every habit challenge (water, breathing, journaling, no caffeine, wind-down walk, bedtime stretch) and all "7-day challenge" copy','Invitees skip this screen and the next entirely']) });

def('why', { ph:'T1e', group:'Tabs', label:'Challenges: your why', bar:() => '', nav:() => navBar('challenges'),
  body:() => `<div class="steplbl" style="margin-top:8px;">Your first ${TXc().noun} with Gayan</div><div class="p-h1">Before you start, let's get clear on <b>why.</b></div>    <div class="habit"><b>${esc(habitTitle())}</b><small>${S.plan.day} \u00b7 ${S.plan.time}</small></div>${reflect()}
    <div class="foot">${btn('Continue','why-save',{dis:whyCount()===0})}${ghost('Skip for now','why-skip')}</div>`,
  note:N('Your why, asked at the first plan', 'A CHALLENGES screen: it is asked once, the moment Gayan ACCEPTS the first session. Moved out of onboarding, because that is when it means something. The answers themselves are private and live in Profile.',
    ['app/onboarding/why.tsx, features/challenges/reflections.ts (move it out of the onboarding stack)',
     'Four questions, three answers each plus "Something else". At least one to continue, and the whole set is skippable',
     'PRIVATE. Decided 27 September: nobody else sees these answers. They are a commitment device for the person who wrote them, not something shown to the partner. The "Why Gayan is doing this" card was removed from Session Details',
     'Asked only before the first session. Editable afterwards from Profile, where one answer comes back to you'],
    'Decided 2026-09-26: moved here so onboarding is shorter and the question lands at the moment it matters.') });
def('invite', { ph:'O10', group:'Onboarding', label:'Partner choice', bar:() => '', nav:() => '',
  body:() => `<div class="steplbl" style="margin-top:8px;">Your first challenge</div><div class="p-h1">How do you want to do this?</div><div class="p-sub">Choner works better when someone is counting on you.</div>
      <div class="habit"><b>${esc(habitTitle())}</b></div>
      <button class="choice ${S.partnerPick==='invite'?'on':''}" data-act="pp" data-v="invite"><div class="ic">${ic('together',1.8)}</div><div><div class="t">Invite someone you know</div><div class="d">A friend or sibling, anyone on the same path.</div></div></button>
      <button class="choice ${S.partnerPick==='find'?'on':''}" data-act="pp" data-v="find"><div class="ic">${ic('find',1.8)}</div><div><div class="t">Find the right partner</div><div class="d">We'll match you with someone who wants the same thing.</div></div></button>
      <div class="foot">${btn('Continue','pp-go',{dis:!S.partnerPick})}</div>`,
  note:N('Partner choice, the last onboarding screen', 'The emotional peak stays, and it is a handoff: pick a card, tap Continue, and onboarding ends in the Find tab. Onboarding never runs a search or an invite itself.',
    ['Select then Continue, the same as every other onboarding screen. A single tap must not launch a partner search by accident',
     'Find the right partner: lands on the Find tab with the radar waiting. Tapping the radar is the intent gesture, so that moment is kept, and only then come the two questions',
     'Invite someone you know: opens the invite sheet with the message and the 6-character code, inside the Find tab',
     'Either way they land in the Find tab and see it properly, instead of a copy of it hidden inside onboarding',
     'No Solo option. The line under the heading carries the nudge instead'],
    'Decided 2026-09-26: onboarding must not do another tab. The three old "Find:" screens moved back into Find.') });
def('fd2', { ph:'T2b', group:'Tabs', label:'Find: two questions', bar:() => '', nav:() => '',
  body:() => { const f = S.find;
    const M = [['person','together','In person',"Meet up and do it side by side."],['separate','separate','Separately, together',"Same commitment, your own place, your own time."],['either','community','Either works',"Show me both. You'll decide together."]];
    return `${hdr('Find a partner')}<div class="p-h1">A few quick <b>questions</b></div>
    <div class="flabel">How do you want to do this?</div>
    ${M.map(([k,icon,t,d]) => `<button class="choice ${f.mode===k?'on':''}" data-act="fmode" data-v="${k}"><div class="ic">${ic(icon,1.8)}</div><div><div class="t">${t}</div><div class="d">${d}</div></div></button>`).join('')}
    <div class="flabel" style="margin-top:18px;">Gender preference</div><div class="pill-row" style="margin-bottom:${needsArea()?'22px':'0'};"><button class="pill ${f.gender==='none'?'on':''}" data-act="fgender" data-v="none">No preference</button><button class="pill ${f.gender==='same'?'on':''}" data-act="fgender" data-v="same">Same gender only</button></div>
    ${needsArea() ? `<div class="flabel">Your locations</div>
    ${f.areas.length ? `<div class="chips">${f.areas.map(a => `<span class="lchip">${esc(a)}<button data-act="loc-del" data-v="${esc(a)}" aria-label="Remove ${esc(a)}">${ic('x',2.4)}</button></span>`).join('')}</div>` : ''}
    ${f.areas.length < 2 ? locPicker() : ''}
    <div class="hint">${f.areas.length < 2 ? 'Pick up to two from the list. We only use these to find someone close enough to meet.' : 'Two is the maximum. Remove one to change it.'}</div>` : ''}
    <div class="foot">${btn('Find my partner','fd2-next',{dis:!findDone()})}</div>`; },
  note:N('Find: the pre-match questions', 'Everything the matcher needs before it can search. This lives in the Find tab; onboarding only sends people here.', [
    'DECIDED 28 September. "How do you want to do this?" moved here from the first plan, and it is asked FIRST, because it decides whether location is asked at all',
    'In person / Separately, together / Either works',
    'HARD FILTER, not a score. In person never matches Separately-only. Allowed: person+person, person+either, either+either, either+separate, separate+separate. Nobody can now match into a mode conflict and discover it at the first plan',
    'Location is only asked of people who could actually meet (In person or Either). Someone doing it separately never sees the question, and their pool is not cut by geography for no reason',
    'This is what Choner_Matching_Algorithm_v2_Scoring.md 5.6 already assumed: zero shared location tags is a hard block for together and IRRELEVANT for separate. The block had no mode answer to key off before this',
    'Gender preference: No preference / Same gender only',
    'Locations: up to 2, chosen from a DROPDOWN of all 68 locations, grouped Colombo city (27) then Greater Colombo (41). No free typing: the list is the whole vocabulary, and a typed value that is not in it cannot be tagged or matched',
    'The full list is the real one, read from supabase/migrations/202609181900_location_corridors.sql. Labels match the database exactly, so a pick maps straight to locations.value',
    'CHANGED 28 September: was a type-ahead that only showed suggestions once you started typing. Now it is a plain picker with no typing at all',
    'Each pick becomes a closable chip; the dropdown disappears at two and returns if one is removed',
    'Answering goes straight into the searching radar, no confirmation screen in between'],
    'Distance, time and place are still agreed after the match. Only the mode question moved.') });

def('fd3', { ph:'T2c', group:'Tabs', label:'Find: searching', bar:() => '', nav:() => '', flush:false,
  onEnter:() => { if (S.pstate !== 'finding'){ S.searches++; } S.pstate = 'finding'; S.find.intent = true; },
  body:() => `<div class="fadein center" style="padding-top:10px;"><div class="p-h1" style="margin-bottom:0;">Looking for your <b>partner</b></div>${radarSearching()}
    <div class="p-sub">We're matching you with someone doing ${esc(habitTitle())} who wants the same thing. We'll notify you the moment you're matched.</div></div>
    <div class="foot">${btn('Take me home','',{go:'home'})}${ghost('Invite someone you know instead','inv-start')}${proto("Simulate: you're matched",'sim-match')}</div>`,
  note:N('Find: searching', 'The moment both questions are answered they cross-fade straight into the same radar the Find tab uses, already in its searching state. Intent was declared when they tapped the card, so there is no second tap.', ['One shared radar component, opened in its searching state. Do not build a second copy for onboarding','Smooth cross-fade or slide in, not a hard cut','Take me home lands on Home in the Finding state (the Find tab shows the same radar)','Counts as one of the three searches a day'], 'Open: how long matching really takes and what the copy promises ("usually a day or two" in the resolution doc versus the notification-on-match wording here).') });

/* ===== Home ===== */
function qrSvg(){
  const N = 21; let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  let d = ''; const finder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (finder(x, y)) continue;
    if (rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  }
  const f = (x, y) => `<path fill="#001827" fill-rule="evenodd" d="M${x} ${y}h7v7h-7zM${x+1} ${y+1}v5h5v-5z"/><rect x="${x+2}" y="${y+2}" width="3" height="3" fill="#001827"/>`;
  return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" aria-label="Session QR code"><rect width="${N}" height="${N}" fill="#fff"/><path fill="#001827" d="${d}"/>${f(0,0)}${f(N-7,0)}${f(0,N-7)}</svg>`;
}


/* ===== Home (state-driven, per Choner_Home_Tab_Product_Structure_MVP) ===== */
const TXc = () => { const t = TPL[S.chosen]; return { act:t.verb, noun:t.noun, tg:true, go:`Start my ${t.noun}`, sess:n=>`${n} ${t.unit} ${t.noun}` }; };
const curMode = () => S.mode;
const weekTitle = () => habitTitle();
const sessTitle = () => TXc().sess(S.amount);
const keptTxt = n => `${n} commitment${n === 1 ? '' : 's'} kept`;
const fmtTime = t => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; };
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const youG = () => `<div class="youg"><span class="seat on sm">${esc(initials(myName()))}</span><span class="seat on sm p2s">GS</span><b>You + Gayan</b></div>`;
const stline = (label, ok, txt) => `<div class="stline"><span class="stic ${ok?'ok':''}">${ic(ok?'check':'clock',2.4)}</span><span>${label}</span><b>${txt}</b></div>`;
const hrow = (icn, txt) => `<div class="hrow">${ic(icn,1.8)}<span>${txt}</span></div>`;
function resetDay(){ S.tg = 'idle'; S.gPartner = 'idle'; S.youDone = false; S.gDone = false; S.together = false; }
function completeCommitment(){ S.kept++; S.weekDone++; S.cs = 'done'; S.sheet = null; }
function sepCheck(){ if (S.youDone && S.gDone) completeCommitment(); }
function gayanStep(){
  if (S.pstate !== 'partnered'){ S.pstate = 'partnered'; S.cs = 'matched'; S.kept = 0; S.weekDone = 0; return; }
  if (S.planProp && S.planProp.by === 'dd'){ act('plan-accept'); return 'nav'; }
  if (S.cs === 'planned'){ S.gPartner = S.gPartner === 'idle' ? 'ready' : 'idle'; return; }
  if (S.cs === 'today'){
    if (curMode() === 'together'){ S.gPartner = S.gPartner === 'idle' ? 'ready' : 'here'; }
    else { S.gDone = true; sepCheck(); }
  }
}
/* ----- shared heart, on top, grows with SESSIONS WITH THIS PARTNER (1, 5, 10, 25, 50). That is the pair count, not the streak: the streak is personal and lives in the circles. No journey button for MVP. ----- */
const STAGES = [1,5,10,25,50];
const stageOf = k => STAGES.filter(m => k >= m).length;
function heartSvg(you, partner){
  const right = partner ? '<path fill="url(#gR)" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>' : '<path class="h-empty" d="M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z"/>';
  return `<svg class="heart" viewBox="0 0 132 124" aria-hidden="true"><defs><linearGradient id="gL" x1="0" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD5B01"/><stop offset="100%" stop-color="#FD8302"/></linearGradient><linearGradient id="gR" x1="1" y1="1" x2="0.5" y2="0"><stop offset="0%" stop-color="#FD8302"/><stop offset="100%" stop-color="#FFA83D"/></linearGradient></defs>
    <path fill="${you?'url(#gL)':'none'}" stroke="${you?'none':'var(--dim)'}" stroke-width="2.4" d="M66 30 C 56 14, 32 10, 20 24 C 6 39, 10 62, 24 78 C 34 90, 52 104, 66 114 Z"/>${right}</svg>`;
}
function relCard(){
  const partnered = S.pstate === 'partnered', k = partnered ? S.kept : 0;
  const sub = partnered ? (S.cs === 'matched' || !k ? '<div class="rel-l">Your first one together is next.</div>' : `<div class="rel-k">${ic('fire',1.8)}${keptTxt(k)}</div><div class="rel-l">You both showed up ${k} time${k===1?'':'s'} in a row.</div>`)
    : S.pstate === 'finding' ? '<div class="rel-l">Looking for your partner.</div>' : S.pstate === 'waiting' ? '<div class="rel-l">Waiting for your partner to join.</div>' : '';
  return `<div class="relc"><div class="hwrap st${stageOf(k)}${partnered && S.cs==='today'?' beat':''}"><div class="glow"></div><div class="rings"><i></i><i></i></div>${heartSvg(true, partnered)}${partnered?'':'<div class="qmark">?</div>'}</div>
    <div class="rel-h">${partnered?'You + Gayan':'You + ?'}</div>${sub}${partnered?`<div class="stg">${STAGES.map(m => `<i class="${k>=m?'on':''}"></i>`).join('')}</div>`:''}</div>`;
}
function planPropCard(){
  const p = S.planProp, ml = p.mode === 'together' ? 'Together' : 'Separately, together';
  const line = `<b>${ml} · ${p.day} · ${p.time}</b>${p.mode==='together'?` at ${esc(p.place)}`:''}`;
  if (p.by === 'gy') return `<div class="hero"><div class="h-eb">Gayan suggested a change</div>${youG()}<div class="h-title" style="font-size:17px;">${ic(tpl().icon,1.8)}<span>${line}</span></div><div class="h-sub">Accept it, or send one back.</div><div class="btn-2">${btn('Accept','plan-accept')}<button class="btn-o" data-act="plan-counter">Suggest another</button></div></div>`;
  return `<div class="hero"><div class="h-eb">Waiting for Gayan</div>${youG()}<div class="h-title" style="font-size:17px;">${ic(tpl().icon,1.8)}<span>${line}</span></div><div class="h-sub">Nothing is planned until Gayan accepts.</div></div>`;
}
function hero(){
  const partnered = S.pstate === 'partnered', icon = tpl().icon, noun = TXc().noun;
  if (!partnered){
    const wait = S.pstate === 'waiting', seeking = S.pstate === 'finding', resume = S.pstate === 'solo' && S.find.intent && !findDone();
    const line = wait ? (S.sentEmail ? `Your challenge starts the moment ${esc(S.sentEmail)} joins.` : 'Waiting for your partner to join.')
      : seeking ? "We're looking for your partner. We'll notify you the moment you're matched."
      : resume ? 'Finish setting up your search.' : 'Find someone who wants to do it too.';
    const cta = wait ? btn('See your invite','',{go:'find'})
      : seeking ? ''
      : btn('Find a partner','',{go:'find'});
    return `<div class="hero"><div class="h-eb">Let's make it happen</div><div class="h-title">${ic(icon,1.8)}<span>${weekTitle()}</span></div>
      <div class="h-prog">${S.agreed?`0 / ${S.cadence} this week \u00b7 `:''}${esc(amtLine())}</div>
      ${seeking ? `<button class="sdots" data-go="find" aria-label="Searching. Open Find."><i></i><i></i><i></i><span>Searching</span>${ic('chev',2)}</button>` : ''}
      <div class="h-sub">${line}</div>${cta}</div>`;
  }
  const mode = curMode(), P2 = S.plan;
  if (S.planProp) return planPropCard();
  if (S.cs === 'matched') return `<div class="hero"><div class="h-eb">You found your match</div>${youG()}<div class="h-title">${ic(icon,1.8)}<span>${weekTitle()}</span></div><div class="h-sub">Now let's plan your first ${noun}.</div>${btn(`Plan your first ${noun}`,'',{go:'plan'})}</div>`;
  if (S.cs === 'planned') return `<div class="hero"><div class="h-eb">Your next commitment</div><div class="h-title">${ic(icon,1.8)}<span>${sessTitle()}</span></div><div class="h-when">${P2.day} \u00b7 ${P2.time}</div>${mode==='together'?hrow('pin',esc(P2.place)):hrow('separate','Separately, together')}${youG()}
    ${stline('Gayan',S.gPartner!=='idle',S.gPartner!=='idle'?'Ready':'Not checked in')}${stline('You',false,'Not checked in')}${btn('View session','',{go:'commit'})}</div>`;
  if (S.cs === 'today'){
    if (mode === 'together'){
      const g = S.gPartner === 'here' ? 'Here' : S.gPartner === 'ready' ? 'Ready' : 'Not checked in';
      if (S.together) return `<div class="hero"><div class="h-eb">You're together.</div><div class="h-title">${ic('fire',1.8)}<span>${sessTitle()} starts now.</span></div>${youG()}${btn('Complete session','finish-tg')}</div>`;
      if (S.tg === 'here') return `<div class="hero"><div class="h-eb">You're here.</div><div class="h-sub" style="margin:0;">${S.gPartner==='here'?'Gayan is here too.':'Waiting for Gayan.'}</div>${youG()}${S.gPartner==='here'?btn('Confirm with QR','open-qr',{icon:'qr'}):'<button class="waitbtn" disabled>Waiting for Gayan...</button>'}</div>`;
      if (S.tg === 'onway') return `<div class="hero"><div class="h-eb">You're on your way.</div><div class="h-title">${ic(icon,1.8)}<span>${sessTitle()}</span></div><div class="h-when">${P2.time}</div>${hrow('pin',esc(P2.place))}${stline('Gayan',S.gPartner!=='idle',g)}${btn("I'm here",'tg-here')}</div>`;
      return `<div class="hero"><div class="h-eb">Today's the day.</div>${youG()}<div class="h-title">${ic(icon,1.8)}<span>${sessTitle()}</span></div><div class="h-when">${P2.time}</div>${hrow('pin',esc(P2.place))}${stline('Gayan',S.gPartner!=='idle',g)}${btn("I'm on my way",'tg-onway')}</div>`;
    }
    const sub = S.youDone && !S.gDone ? 'You showed up. Waiting for Gayan.' : S.gDone && !S.youDone ? 'Gayan has shown up. Your turn.' : 'Do it whenever suits you today. Counts until midnight.';
    return `<div class="hero"><div class="h-eb">Today's commitment</div><div class="h-title">${ic(icon,1.8)}<span>${sessTitle()}</span></div><div class="h-when">${P2.day}</div>${youG()}
      ${stline('You',S.youDone,S.youDone?'Done':'Not yet')}${stline('Gayan',S.gDone,S.gDone?'Done':'Not yet')}<div class="h-sub">${sub}</div>
      ${S.youDone ? '<button class="waitbtn" disabled>Waiting for Gayan...</button>' : btn(TXc().go,'start-sep')}</div>`;
  }
  if (S.cs === 'done') return `<div class="hero done"><div class="h-eb">You both showed up.</div><div class="h-title">${ic('fire',1.8)}<span>${sessTitle()} completed</span></div>${youG()}<div class="h-kept">${ic('fire',1.8)}${keptTxt(S.kept)}</div>${S.weekDone>=S.cadence?`<div class="h-sub" style="margin:0;">You kept this week's commitment.</div>`:`<div class="h-sub" style="margin:0;">${S.weekDone} / ${S.cadence} this week</div>`}${btn('Plan the next one','',{go:'plan'})}</div>`;
  return `<div class="hero"><div class="h-eb">You're all set.</div><div class="h-sub" style="margin:0;">Next commitment</div><div class="h-title">${ic(icon,1.8)}<span>${sessTitle()}</span></div><div class="h-when">${P2.day} \u00b7 ${P2.time}</div>${youG()}${ghost('View session','',undefined,'commit')}</div>`;
}
/* ----- Choner Pulse (one card) + Just Happened (square, live, not tappable) ----- */
const anon = (i, sz) => `<span class="anon" style="width:${sz||22}px;height:${sz||22}px;background:linear-gradient(135deg,${['#FD8302','#1E3A4C','#2E9E6B','#8E5FD9','#D9534F','#3B8FD1'][i % 6]},#001827);">${ic('user',2)}</span>`;
const PACT = { run:['Running',16,'run'], walk:['Walking',12,'walk'], workout:['Workouts',8,'dumb'], yoga:['Yoga',6,'leaf'] };
function pulseCard(){
  return `<div class="pulse2"><div class="pl-h"><span class="live"></span>Choner Pulse</div><div class="pl-n"><b>42</b> people are showing up today</div>
    <div class="tiles">${Object.keys(PACT).map((k,i) => { const a = PACT[k]; return `<button class="tile" data-go="whoelse" aria-label="${a[0]}, ${a[1]} people. Open Find."><span class="ti"><i class="tp"></i>${ic(a[2],1.8)}</span><b>${a[1]}</b><span class="tl">${a[0]}</span><span class="tav">${anon(i,16)}${anon(i+1,16)}${anon(i+2,16)}</span></button>`; }).join('')}</div>
    <div class="dsum"><span>+8 commitments</span><span>+2 new pairs</span><span>+5 completed</span></div></div>`;
}
const MOMENTS = [{ v:'pair', t:'A pair just completed their first run.' },{ v:'count', n:8, t:'people made new commitments today.' },{ v:'pairs', n:6, t:'pairs are showing up today.' },{ v:'done', n:5, t:'commitments were completed today.' }];
function momentInner(){
  const m = MOMENTS[(S.mom || 0) % MOMENTS.length];
  const hm = `<svg class="hm" viewBox="0 0 24 22" aria-hidden="true"><path d="M12 21C6 17 1.5 13.4 1.5 8.5 1.5 5.5 3.7 3.5 6.3 3.5 8.7 3.5 10.7 5 12 7 13.3 5 15.3 3.5 17.7 3.5 20.3 3.5 22.5 5.5 22.5 8.5 22.5 13.4 18 17 12 21z" fill="#FD5B01"/></svg>`;
  const vis = m.v === 'pair' ? `<div class="mv pairg">${anon(0,64)}${hm}${anon(1,64)}</div>` : m.v === 'count' ? `<div class="mv col"><b class="mn">${m.n}</b><span class="tav">${anon(2,26)}${anon(3,26)}${anon(4,26)}</span></div>`
    : m.v === 'pairs' ? `<div class="mv pairs">${[0,1,2].map(i => `<span class="pairg s">${anon(i,30)}${hm}${anon(i+3,30)}</span>`).join('')}</div>` : `<div class="mv col"><span class="okc">${ic('check',2.6)}</span><b class="mn">${m.n}</b></div>`;
  return `<div class="fadein jvis">${vis}</div><div class="fadein mt">${m.v==='pairs'?m.n+' ':''}${m.t}</div><div class="mdots">${MOMENTS.map((_,i) => `<i class="${i===(S.mom||0)%MOMENTS.length?'on':''}"></i>`).join('')}</div>`;
}
const justHappened = () => `<div class="jsq" role="status"><div class="jtop"><span class="live"></span>Just Happened</div><div id="mbox" class="jcont">${momentInner()}</div></div>`;
let momT = null;
function startMoments(){ clearInterval(momT); momT = setInterval(() => { if (S.cur !== 'home' || S.dlg || S.sheet) return; S.mom = (S.mom || 0) + 1; const b = document.getElementById('mbox'); if (b) b.innerHTML = momentInner(); }, 4200); }
def('home', { ph:'H1', group:'Home', label:'Home', bar:() => appBar(), nav:() => navBar('home'),
  body:() => {
    const hr = new Date().getHours(); const g = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 21 ? 'Good evening' : 'Good night';
    const head = `<div class="greet1">${g}, <b>${esc(firstName(myName()))}</b></div>`;
    if (S.explore) return `${head}<div class="hero empty"><div class="h-eb">Start something together</div><div class="h-sub" style="font-size:14px;color:var(--pink);">Pick what you want to do with your partner.</div>${btn("Let's do this",'',{go:'challenges'})}</div>${pulseCard()}${justHappened()}`;
    const sim = S.pstate === 'finding' ? proto("Simulate: you're matched",'sim-match') : S.pstate === 'waiting' ? proto('Simulate: your friend joins with the code','sim-join') : '';
    return `${head}${relCard()}${hero()}${sim}${pulseCard()}${justHappened()}`; },
  note:N('Home: a living view of your commitment', 'Heart on top, then your commitment, then Choner Pulse and Just Happened. Updated to the 26 September decisions.', [
    'Order: greeting, the shared heart ("You + ?" before a partner, "You + Gayan" after, growing at 1, 5, 10, 25, 50 kept), Your first / next commitment, Choner Pulse, Just Happened',
    'Commitments are weekly sessions ("Run 2\u00d7 a week", x / 2 this week). The streak is commitments both partners kept, never days',
    'After both show up: the kept count and "Plan the next one" straight away (one session planned at a time)',
    'The HOME group in the rail now holds ONE screen, Home itself. Everything it opens belongs to another tab and is filed there: Plan a session, Session details, Confirm with QR and Your why are Challenges screens (they always drew the Challenges tab as active); the challenge picker is Challenges; the invite screen is Find. Filing them under Home is what let the overlaps creep in',
    'HOME NEVER DOES ANOTHER TAB\'S WORK. Home may open a sheet ABOUT the commitment it is already showing (Plan a session, View session). It may never open one that STARTS or ENDS another tab\'s lifecycle: no partner search, no invite, no challenge picker. Those are a tab switch, and it lands on that tab\'s own top screen, never mid-flow',
    'No challenge: one button, "Let\'s do this", the same words the Challenges tab uses, so the handoff reads as one step. The picker lives in Challenges, which owns creating, ending and the history',
    'No partner: exactly one button, "Find a partner", which switches to the Find tab. Find\'s own screen carries all three doors (the radar, "Invite someone you know", "Have an invite code?"), so the choice is made where it belongs and cannot be started from two places',
    'Searching: no button at all, just the pulsing "Searching" row that opens Find. Stopping the search and switching to an invite both live in Find',
    'Choner Pulse is one card with tappable activity tiles (they open Find). Just Happened is a square dark card that changes by itself and is not tappable',
    'The dashed buttons are prototype controls, not app UI. They exist so the searching and waiting states are not dead ends here',
    'Removed from Home: Coming Up, See your journey, the reason line, the share prompt, the daily task list. Also removed 26 September: "Invite someone you know" (opened a Find screen from Home), "Invite someone you know instead" while searching, and the "Continue" that jumped into the middle of Find\'s questions',
    'Use the controls above the phone to see each state'
  ], [
    'Pulse and Just Happened numbers are examples: real counts only, hidden below a minimum',
    'The full day-of flow, misses, repair, move, cancel and ending live in the Challenges tab prototype'
  ]) });

def('plan', { ph:'T1b', group:'Tabs', label:'Challenges: plan a session', bar:() => '', nav:() => navBar('challenges'),
  onEnter:() => { const c = S.counterFrom;
    S.pd = c ? { day:c.day, time:c.timeRaw, place:c.place, amt:c.amt, cad:c.cad } : { day:S.plan.day, time:S.plan.timeRaw, place:S.plan.place, amt:S.amount, cad:S.cadence };
    if (c) S.mode = pairCanMeet() ? c.mode : 'separate'; },
  body:() => { const t = TXc(); const mode = curMode(); const first = S.cs === 'matched'; const cf = S.counterFrom;
    return `${hdr(first ? `Plan your first ${t.noun}` : `Plan the next ${t.noun}`)}${cf?`<div class="notice">${ic('chat',1.8)}<span>Gayan suggested <b>${cf.mode==='together'?'Together':'Separately, together'} · ${cf.day} · ${cf.time}</b>. Change what you need and send it back.</span></div>`:''}<div class="habit"><b>${weekTitle()}</b><small>${esc(amtLine())} \u00b7 with Gayan</small></div>
${first ? `<div class="sect">How much for you each time?</div><div class="stepper"><button data-act="pd-amt" data-v="-1" aria-label="Less">\u2212</button><div class="v">${S.pd.amt}${tpl().unit?`<small>${tpl().unit}</small>`:''}</div><button data-act="pd-amt" data-v="1" aria-label="More">+</button></div><div class="hint">Yours only. ${partnerName()} sets their own when they accept - you do not have to match each other to show up for each other.</div>
    <div class="sect">How often?</div><div class="segt wrap">${[1,2,3,4,5,6,7].map(c => `<button class="${S.pd.cad===c?'on':''}" data-act="pd-cad" data-v="${c}">${c===7?'Daily':c+'\u00d7'}</button>`).join('')}</div>
    <div class="sect">How will you do it?</div>` : `<div class="flabel">How will you do it?</div>`}${pairCanMeet()
      ? `<button class="choice ${mode==='together'?'on':''}" data-act="set-mode" data-v="together"><div class="ic">${ic('together',1.8)}</div><div><div class="t">Together</div><div class="d">Meet up, confirm with a QR code.</div></div></button><button class="choice ${mode==='separate'?'on':''}" data-act="set-mode" data-v="separate"><div class="ic">${ic('separate',1.8)}</div><div><div class="t">Separately, together</div><div class="d">Same commitment, your own place.</div></div></button>`
      : `<div class="choice on" style="cursor:default;"><div class="ic">${ic('separate',1.8)}</div><div><div class="t">Separately, together</div><div class="d">Same commitment, your own place. You both chose to do this on your own, so there is no meeting place to agree.</div></div></div>`}
    ${(first ? S.pd.cad : S.cadence) > 1 ? `<div class="sect">Session ${Math.min((first?0:S.weekDone)+1,(first?S.pd.cad:S.cadence))} of ${first?S.pd.cad:S.cadence} this week</div>` : ''}
    <div class="flabel" style="margin-top:8px;">Day</div><div class="sel-wrap" style="margin-bottom:14px;"><select id="pl-day" aria-label="Day">${DAYS.map(d => `<option ${d===S.pd.day?'selected':''}>${d}</option>`).join('')}</select></div>
    <div class="flabel">Time</div><input class="txt" type="time" id="pl-time" value="${S.pd.time}" aria-label="Time" style="margin-bottom:14px;">
    ${mode==='together' && pairCanMeet() ? `<div class="flabel">Place</div><input class="txt" id="pl-place" value="${esc(S.pd.place)}" placeholder="Where will you meet?" aria-label="Place">` : ''}
    <div class="foot">${btn('Send to Gayan','plan-confirm',{primary:true})}<div class="hint center">Gayan sees this and accepts, or suggests another. Nothing is planned until you both say yes.${(first?S.pd.cad:S.cadence) > 1 ? ' One at a time: the next is planned as soon as this one is done.' : ''}</div></div>`; },
  note:N('Plan a session', 'A CHALLENGES screen. Home may open it, because it is about the commitment Home is already showing, but Challenges owns the session lifecycle. One session at a time.', ['DECIDED 28 September: the plan is a PROPOSAL, not a fact. "Send to Gayan" creates it; nothing is planned until Gayan accepts. Mode rides in the proposal with day, time and place, so there is no separate mode-conflict state: only one person is ever setting the value, and the other accepts or suggests another',
     'If the responder counters with Separately, that is what happens. Together needs both; Separately can always be delivered by one person',
     'Mode is asked on EVERY plan, not agreed once, so a rainy or travel week can be done separately without touching the match',
     'Use "Gayan: suggests another" above the phone to see the counter come back',
     'The why is now asked after Gayan ACCEPTS the first session, which is the moment the pair actually agree',
     'DECIDED 28 September: "How will you do it?" is no longer first asked here. The pair already answered it in Find, so this screen only offers a real choice when BOTH of them said they could meet. When either side chose Separately, the mode is shown as a plain statement and no place is asked, because there is nothing to agree',
     'Per-session flexibility is kept for pairs who CAN meet: a rainy week can be done separately without changing the match',
     'One session is planned at a time, never the whole week. When the cadence is 2 or 3, the screen says "Session 1 of 2 this week" so it is clear why only one day is asked for, and the next slot opens the moment this one is done. The Challenges tab shows the unplanned slots as "Not planned yet"',
     'FIRST plan sets how much and how often. THE CADENCE IS SHARED - it defines the week, the repair debt and how long a streak takes. THE AMOUNT IS NOT (1 October): you set yours, they set theirs on accept, and the card reads "You 5 km · Gayan 3 km"',
    'WHY: losing a match because one wants 5 km and the other 3 km is a waste. What the product is actually about is showing up for each other, and a circle still fills only when BOTH finish THEIR number','Later plans only need mode, day, time and place','Every activity can be together or separately; place only for together','Week 1 runs from the match day to Sunday with a scaled target (see the Challenges tab prototype)','In the app this goes through the shared suggest and accept negotiation','After the first plan is confirmed, the why is asked once'], 'Decided 2026-09-26: the onboarding Starting point screen was removed and its two questions moved here.') });

def('commit', { ph:'T1c', group:'Tabs', label:'Challenges: session details', bar:() => '', nav:() => navBar('challenges'),
  body:() => { const P2 = S.plan, mode = curMode();
    return `${hdr(sessTitle())}<div class="hero"><div class="h-eb">${mode==='together'?'Together':'Separately, together'}</div><div class="h-title">${ic(tpl().icon,1.8)}<span>${sessTitle()}</span></div><div class="h-when">${P2.day} \u00b7 ${P2.time}</div>${mode==='together'?hrow('pin',esc(P2.place)):''}${youG()}${stline('You',false,'Not yet')}${stline('Gayan',S.gPartner!=='idle',S.gPartner!=='idle'?'Ready':'Not yet')}</div>
    <div class="banner">Move, cancel, nudge, running late, report and End this challenge live on this screen in the <a href="${CH_URL}" target="_blank" rel="noopener">Challenges tab prototype</a>.</div>${ghost('Back to Home','',undefined,'home')}`; },
  note:N('Session details', 'A CHALLENGES screen, opened from Home or from the Challenges tab. The only details screen. Simplified here; the full version is in the Challenges tab prototype.', ['Day, time, place, mode, You and Gayan status','Move and cancel need both to agree; neither breaks the streak'], 'Decided 27 September: the why is PRIVATE. The "Why Gayan is doing this" card that sat here has been removed. Nobody sees anybody else\'s why; it comes back only to the person who wrote it, from Profile.') });

def('qr', { ph:'T1d', group:'Tabs', label:'Challenges: confirm with QR', bar:() => '', nav:() => navBar('challenges'),
  body:() => `${hdr("Confirm you're together")}<div class="p-sub">Show this to Gayan, or scan theirs. Live camera only.</div>
    <div class="cam"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i><div class="scan"></div><div class="cap">Point at Gayan's code</div></div>
    <div class="qrbox">${qrSvg()}<small>Your code, valid for this session only</small></div>${proto("Simulate: the scan succeeds",'qr-scanned')}`,
  note:N('QR check-in', 'A CHALLENGES screen. Home opens it when both are here.', ['A successful scan returns to Home: "You\'re together. Start now."']) });

// Reached by tapping the commitment card before a search starts. The card said
// "You can change this until you start searching for a match" and had a
// chevron, and nothing happened when you tapped it.
def('editact', { ph:'T1b', group:'Tabs', label:'Challenges: change the activity', bar:() => '', nav:() => navBar('challenges'),
  onEnter:() => { S.nw = { act:S.chosen, exs:S.exs.slice() }; },
  body:() => { const n = S.nw;
    return `${hdr('Change your activity')}<div class="p-sub">Only until you start searching. After that it is what your partner signed up for.</div><div class="flabel">Activity</div><div class="agrid">${Object.keys(TPL).map(k => `<button class="gcard ${n.act===k?'on':''}" data-act="nw-act" data-v="${k}">${ic(TPL[k].icon,1.8)}<div class="t">${TPL[k].t}</div></button>`).join('')}</div>
    ${n.act==='work'?`<div class="flabel" style="margin-top:16px;">Which exercises? <span class="fnote">up to ${MAX_EX}</span></div><div class="pill-row">${Object.keys(EX).map(k => { const on = n.exs.includes(k); const full = n.exs.length >= MAX_EX && !on; return `<button class="pill ${on?'on':''}" data-act="nw-ex" data-v="${k}" ${full?'disabled':''}>${EX[k][0]}</button>`; }).join('')}</div><div class="hint">These show on your card and in Already on the move. They do not affect who you are matched with - that is the activity and how long.</div>`:''}
    <div class="foot">${btn('Save','act-save',{dis:n.act==='work' && !n.exs.length})}${ghost('Cancel','',null,'find')}</div>`; },
  note:N('Change your activity', 'The one editable field before a search, and the screen the commitment card has been promising.', [
    'DECIDED 29 September: ONLY THE ACTIVITY is editable, and only the activity is on the card. How much and how often are agreed after a match, at the first plan',
    'FIXED 30 September: the card carried the line and the chevron and was not a button. It is now',
    'Locked the moment a search starts, on BOTH tabs. The line becomes "Locked while you\'re looking for a match"',
    'No partner exists yet, so there is nothing to renegotiate']) });

def('browse', { ph:'T1a', group:'Tabs', label:'Challenges: create a commitment', bar:() => '', nav:() => navBar('challenges'),
  onEnter:() => { S.nw = { act:'run', exs:['push','squat'] }; },
  body:() => { const n = S.nw;
    return `${hdr('Start something together')}<div class="p-sub">Pick what you want to do. How much and how often you'll agree with your partner.</div><div class="flabel">Activity</div><div class="agrid">${Object.keys(TPL).map(k => `<button class="gcard ${n.act===k?'on':''}" data-act="nw-act" data-v="${k}">${ic(TPL[k].icon,1.8)}<div class="t">${TPL[k].t}</div></button>`).join('')}</div>
    ${n.act==='work'?`<div class="flabel" style="margin-top:16px;">Which exercises? <span class="fnote">up to ${MAX_EX}</span></div><div class="pill-row">${Object.keys(EX).map(k => { const on = n.exs.includes(k); const full = n.exs.length >= MAX_EX && !on; return `<button class="pill ${on?'on':''}" data-act="nw-ex" data-v="${k}" ${full?'disabled':''}>${EX[k][0]}</button>`; }).join('')}</div><div class="hint">These show on your card and in Already on the move. They do not affect who you are matched with - that is the activity and how long.</div>`:''}
    <div class="foot">${btn("Let's make it happen",'nw-create',{dis:n.act==='work' && !n.exs.length})}<div class="hint center">You can change this until you start searching for a match.</div></div>`; },
  note:N('Create a commitment', 'A Challenges screen. Replaces Browse challenges. One active challenge per user, so it only appears when there is none, which now means after ending or finishing one.', [
    'Opened from the Challenges tab only. Home and Find hand over to Challenges first: neither may start or end a challenge',
    'The six MVP activities. Workouts pick UP TO FOUR exercises (1 October), and they are DESCRIPTIVE: they show on the card and in Already on the move, and they never reach matching',
    'WHY: nine exercises fragment a small pool nine ways. Two people who both want to work out on Tuesday mornings should not fail to match because one picked squats. Matching reads the activity and the duration',
    'Workouts are measured in MINUTES now, like Yoga. Four exercises on one commitment have no single rep count between them',
    'ACTIVITY ONLY (30 September). How much and how often are NOT asked here - they are agreed with the partner at the first plan. Asking here asked the same question twice, and it broke the promise that deleted the onboarding target screen',
    'On create it lands on Home, which then asks for a partner. Creating a commitment is a setup action and setup actions finish on Home, the same way onboarding does']) });

def('ginvite', { ph:'T2d', group:'Tabs', label:'Find: invite someone', bar:() => '', nav:() => navBar('find'),
  onEnter:() => { if (S.pstate !== 'waiting') { S.invPhase = 'share'; if (!S.invCodeVal) newCode(); } else S.invPhase = 'pending'; },
  body:() => { const b = inviteBlock(true); return `${hdr('Invite someone you know')}${b.mid}<div class="foot">${b.foot}</div>`; },
  note:N('Invite a friend', 'A Find screen. Reached from "Invite someone you know" inside the Find tab, or from the onboarding partner choice. Home cannot open it. Same share-a-link screen as onboarding: a default message built from the challenge, editable, then WhatsApp, Messages or Copy link. Email is the optional second way.', ['app/group/invite.tsx','Message format: "{Name} is challenging you to {activity}. Are you up for it?" Activity only. No distance and no cadence, because an invite always goes out BEFORE a partner exists and nothing is agreed yet','Sending flips Home into "Waiting for your partner to join" (or names the email when one was used)']) });

def('editwhy', { ph:'T4b', group:'Tabs', label:'Profile: edit your why', bar:() => '', nav:() => '',
  body:() => `${hdr("Why you're doing this",true)}<div class="p-sub">One of these comes back to you each day, so the reason is there on the hard days.</div>${reflect()}<div class="foot">${btn('Save','why-edit-save')}</div>`,
  note:N('Edit your why', 'A PROFILE screen. Reached from Profile, "Why you\'re doing this", which shows the current answer as its subtitle or "Not answered yet". Same four questions as the first-session ask.', ['app/modals/edit-why.tsx','This is the only place a why can be read back, because the answers are private to the person who wrote them']) });

/* ===== Tabs ===== */
def('challenges', { ph:'T1', group:'Tabs', label:'Challenges tab', bar:() => appBar(), nav:() => navBar('challenges'),
  body:() => { const partnered = S.pstate === 'partnered';
    if (S.explore) return `<div class="p-h1" style="margin-bottom:2px;">Challenges</div>${S.agreed && S.pstate === 'partnered' ? `<div class="p-sub">What you've committed to.</div>` : ''}<div class="hero"><div class="h-eb">Start something together</div><div class="h-title">Pick what you want to do with your partner.</div>${btn("Let's do this",'',{go:'browse'})}</div>`;
    // Every handoff to Find is a standard button, not a text link: it is the
    // clear next step, and a link reads as an afterthought beside a full-width
    // primary. The label names what the person gets. "Partner: not found yet"
    // is gone - the button already says it.
    const partner = partnered ? youG()
      : S.pstate === 'finding' ? `<div class="hrow">${ic('find',1.8)}<span>Partner: searching\u2026</span></div>${btn('See your search','',{go:'find'})}`
      : S.pstate === 'waiting' ? `<div class="hrow">${ic('clock',1.8)}<span>Partner: invited, waiting to join</span></div>${btn('See your invite','',{go:'find'})}`
      : S.pstate === 'match' ? `<div class="hrow">${ic('clock',1.8)}<span>A match is waiting on your answer.</span></div>${btn('See your match','',{go:'find'})}`
      : btn('Find a match','',{go:'find'});
    const action = !partnered ? '' : S.planProp ? (S.planProp.by === 'gy' ? `<div class="btn-2">${btn('Accept','plan-accept')}<button class="btn-o" data-act="plan-counter">Suggest another</button></div>` : `<div class="hrow">${ic('clock',1.8)}<span>Waiting for Gayan to accept your plan</span></div>`) : S.cs === 'matched' ? btn(`Plan your first ${TXc().noun}`,'',{go:'plan'}) : S.cs === 'done' ? btn('Plan the next one','',{go:'plan'}) : btn(S.cs==='today'?"Open today's session":'View session','',{go:'commit'});
    const wk = partnered && S.agreed && S.cs !== 'matched' ? `<div class="wcard"><div class="rc-h">This week</div>${Array.from({length:S.cadence},(_, i) => { const done = i < S.weekDone, nxt = i === S.weekDone && S.cs !== 'done'; return `<div class="wnode"><span class="wdot ${done?'ok':nxt&&S.cs==='today'?'now':''}">${done?ic('check',3):''}</span><div><b>${esc(TXc().act)} ${i+1}</b><small>${done?'Done':nxt?`${S.plan.day} \u00b7 ${S.plan.time}`:'Not planned yet'}</small></div></div>`; }).join('')}<div class="wcopy">${S.weekDone>=S.cadence?"You kept this week's commitment.":S.cadence-S.weekDone===1?"1 more to keep this week's commitment.":`${S.cadence-S.weekDone} commitments still ahead.`}</div></div>` : '';
    return `<div class="p-h1" style="margin-bottom:2px;">Challenges</div>${S.agreed && S.pstate === 'partnered' ? `<div class="p-sub">What you've committed to.</div>` : ''}
    <div class="hero"><div class="h-eb">${partnered && S.agreed ? 'Your commitment' : "Let's make it happen"}</div><div class="h-title">${ic(tpl().icon,1.8)}<span>${esc(weekTitle())}</span></div><div class="h-prog">${S.agreed && partnered?`${S.weekDone} / ${S.cadence} this week \u00b7 `:''}${esc(amtLine())}</div>${partner}${action}</div>
    ${wk}${partnered?`<div class="rel"><div class="rel-k">${ic('fire',1.8)}${keptTxt(S.cs==='matched'?0:S.kept)}</div><div class="rel-l">Commitments you and Gayan both kept.</div></div>`:''}
    <div class="sect">History</div><div class="hrow2"><span>Walk 3\u00d7 a week</span><small>Ended \u00b7 August 2026</small></div>
    <div class="banner" style="margin-top:14px;">Every Challenges state (misses, repair, move, cancel, end) is in the <a href="${CH_URL}" target="_blank" rel="noopener">Challenges tab prototype</a>.</div>`; },
  note:N('Challenges tab', 'Summary of the new Challenges tab: the commitment, the session streak, history. No partner search or invites here.', [
    'CHALLENGES OWNS THE CHALLENGE LIFECYCLE: creating, ending, cancelling and the history. The picker is reached from here and nowhere else',
    'app/(tabs)/challenges.tsx (to be rebuilt)','One active challenge per user; history rows are not tappable','Full states: Challenges tab prototype'], null) });

def('find', { ph:'T2', group:'Tabs', label:'Find tab', bar:() => appBar(), nav:() => navBar('find'),
  body:() => { const partnered = S.pstate === 'partnered', finding = S.pstate === 'finding', waiting = S.pstate === 'waiting';
    const resume = S.pstate === 'solo' && S.find.intent && !findDone();
    let mid, sub = 'Someone else is looking for you too.';
    // A MATCH IS WAITING. This screen did not exist: Home said "See your match"
    // and handed over to a Find tab with nothing on it. Three states, because
    // one person can answer before the other.
    if (S.pstate === 'match'){
      sub = S.matchExpired ? 'That one got away.' : S.iAccepted ? 'Waiting on their answer.' : 'Someone is waiting on your answer.';
      const clock = `<div class="mclock">${ic('clock',1.8)}<span>${matchLeft()}</span></div>`;
      if (S.matchExpired) mid = `<div class="procard center"><div class="icobig bad">${ic('clock',1.8)}</div><b>This match expired.</b><div class="hint" style="margin-bottom:12px;">Neither of you answered within ${MATCH_WINDOW_H} hours, so you are both back in the pool.</div>${btn('Keep looking','begin-find')}</div>`;
      else if (S.iAccepted) mid = `<div class="procard center">${anon(1,96)}<div style="margin-top:10px;"><b>Waiting for Gayan</b></div><div class="hint">You said yes. Nothing is matched until they do.</div>${clock}${ghost('Actually, not quite right','decline-match')}</div>`;
      else mid = `<div class="center" style="margin:4px 0 12px;"><div style="display:flex;justify-content:center;margin-bottom:12px;">${anon(1,96)}</div><div class="p-h1" style="margin-bottom:6px;">You found <b>a Match.</b></div><div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--green);font-weight:500;">${ic('check',2.4).replace('<svg','<svg style="width:14px;height:14px"')} Gayan, photo confirmed</div></div>
        <ul class="reasons"><li><span class="ck">${ic('check',2.6)}</span>You both want to ${esc(TXc().noun)}.</li><li><span class="ck">${ic('check',2.6)}</span>You're both in the Nugegoda area.</li><li><span class="ck">${ic('check',2.6)}</span>You're both looking for someone to keep you accountable.</li></ul>
        ${clock}<div style="margin:8px 0 6px;">${btn("Let's do this",'accept-match')}${ghost('Not quite right','decline-match')}</div>`;
    }
    // MATCHED. This is the state someone opens Find to see for weeks, so it
    // carries weight rather than being a thin row: both faces, the tick that
    // says it is settled, what you are paired ON, and the two ways out.
    else if (partnered) {
      sub = 'Your match is here.';
      const menu = S.menu ? `<div class="ov-menu" style="top:8px;right:8px;"><button class="ov-item" data-act="report-open">${ic('flag',1.8)}Report ${esc(partnerName())}</button><button class="ov-item danger" data-act="block-open">${ic('x',2)}Block ${esc(partnerName())}</button></div>` : '';
      mid = `<div class="mcard">${menu}<button class="ov-btn mtop" data-act="menu" aria-label="More">${ic('more',1.8)}</button>
        <div class="mfaces">${anon(0,72)}<span class="mtick">${ic('check',3)}</span>${anon(1,72)}</div>
        <div class="mnames">You and ${esc(partnerName())}</div>
        <div class="mpair">${ic(tpl().icon,1.8)}<span>${esc(habitTitle())}</span></div>
        <div class="mmeta">Matched ${esc(S.matchedAgo)}</div>
        ${ghost('End this match','endmatch-open')}</div>`;
    }
    else if (waiting) { sub = 'Your invite is out.'; mid = `<div class="hero"><div class="h-eb">Waiting for your friend to join</div><div class="h-sub" style="margin:0;">${S.sentEmail?`Emailed to ${esc(S.sentEmail)}`:`Shared via ${esc(S.sentVia||'link')}`}. Your challenge starts the moment they join.</div>${codeBox()}${btn('Share again','open-share',{icon:'share',cls:'row'})}${ghost('Invite someone else','inv-share-back',undefined,'ginvite')}</div>
      <div class="center" style="display:flex;flex-direction:column;gap:2px;">${ghost('Find a match instead','begin-find')}${ghost('Cancel invite','cancel-invite')}</div>${proto('Simulate: your friend joins with the code','sim-join')}`; }
    else if (finding) mid = `${radarSearching()}<div class="center"><b>Looking for your partner</b><div class="hint">We'll notify you the moment you're matched.</div></div>${ghost('Stop looking','stop-find')}${ghost('Invite someone you know instead','inv-start')}${proto("Simulate: you're matched",'sim-match')}`;
    else if (resume) mid = `<div class="procard center"><b>Finish setting up your search</b><div class="hint" style="margin-bottom:12px;">A couple of quick questions and we'll start looking.</div>${btn('Continue','find-resume')}</div>${ghost('Invite someone you know instead','inv-start')}`;
    else mid = `<button class="radar act" data-act="begin-find" aria-label="Find a match"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="rc">Find a<br>Match</span></button><div class="tap">Tap to find a match</div>
      <div class="orl"><span>or</span></div><button class="btn-o row" data-act="inv-start">${ic('together',1.8)} Invite someone you know</button>
      <div class="center" style="margin-top:6px;"><button class="link" data-go="invitecode" style="font-size:12.5px;font-weight:500;">Have an invite code?</button></div>`;
    // The commitment sits on Find too, activity only, and is locked the moment
    // a search starts - the same card and the same rule as on Challenges.
    const lock = S.pstate !== 'solo';
    const comm = S.challenge && !partnered && S.pstate !== 'match' ? `<${lock?'div class="ccard2"':'button class="ccard2" data-act="edit-act"'}><span class="bigic">${ic(tpl().icon,1.8)}</span><div class="dtx"><b>${esc(tpl().t)}</b><small>${lock ? "Locked while you're looking for a match" : 'You can change this until you start searching for a match'}</small></div>${lock?'':ic('chev',2).replace('<svg','<svg class="chev2"')}</${lock?'div':'button'}>` : '';
    // The directory is its own screen again. What stays on landing is one
    // button - and no count, because we do not have a real number and a
    // fabricated one is the kind of thing nobody remembers is fabricated.
    const dirLink = `<button class="dlink" data-go="whoelse">${ic('community',1.8)}<span>Already on the move</span>${ic('chev',2).replace('<svg','<svg class="chev2"')}</button>`;
    return `<div class="p-h1" style="margin-bottom:4px;">Find</div><div class="p-sub">${sub}</div>${comm}${mid}${dirLink}`; },
  note:N('Find tab', 'Two ways to get a partner, one at a time, plus the match itself. Every state lives on this one screen.', [
    'FIND OWNS EVERY PARTNER PATH. Starting a search, sending an invite, entering a code, stopping, switching, cancelling AND ENDING A MATCH all happen here and nowhere else. Home and onboarding only hand over to this screen',
    'A MATCH IS WAITING (new 30 September): this state did not exist. Home said "See your match" and handed over to a Find tab with nothing on it. Three states, because one side can answer before the other: offered, you-accepted-waiting, and expired',
    'THE MATCH CLOCK IS 24 HOURS, and it is ONE clock started when the match is CREATED, not when either side answers. Both people see the same number counting down. Unanswered, it expires and both go back in the pool',
    'ALREADY ON THE MOVE (new 30 September): the directory is INLINE here now, under the circle, rather than a link to a separate screen. Everyone registered shows by default, because a new user has to see the app is alive, and there is NO LOCATION on the cards',
    'The commitment sits here too, ACTIVITY ONLY, and is locked the moment a search starts. How much and how often are agreed with the partner at the first plan',
    'END THIS MATCH is on the paired state, with six reasons. It moved here from Challenges on 30 September: ending a match is a partner path',
    'No partner: the radar, "Invite someone you know", and a small "Have an invite code?" link',
    'Searching: the radar searching, Stop looking, and "Invite someone you know instead"',
    'Invite waiting: the code in large letters with Copy, Share again, Invite someone else, and "Find a match instead" or Cancel invite',
    'One at a time: starting an invite stops the search, and starting a search cancels the invite. Both ask first',
    'The code is 6 characters (e.g. RUN4K7) and EXPIRES IN 48 HOURS. The person receiving it is told so'],
    ['Open: if the friend already has an active challenge, what happens when they enter the code (end theirs, replace it, or block)?','Needs backend: the 24 hour match window and the 48 hour code expiry, the short code column, and a neutral end_match with reasons - today the only ways to end a match are block and report']) });

def('endmatch', { ph:'T2e', group:'Tabs', label:'Find: end this match', bar:() => '', nav:() => navBar('find'),
  body:() => { const off = S.endReason === 'off';
    return `${hdr('End this match')}<div class="p-sub">Your challenge and your streak both continue.</div>
    ${END_REASONS.map(r => `<button class="choice ${S.endReason===r[0]?'on':''}" data-act="end-reason" data-v="${r[0]}"><div><div class="t">${r[1]}</div></div></button>`).join('')}
    <div class="hint">Gayan won't see your reason. He'll just see that the match has ended.</div>
    <div class="foot">${btn(off?'Continue to report':'End match','endmatch-send',{dis:!S.endReason})}${ghost('Keep going','',null,'find')}</div>`; },
  note:N('Ending a match, the neutral way', 'A way out that does not require treating your partner as a safety problem. In the app today the only two ways to end a match are block and report, both safety actions.', [
    'FIND OWNS THIS. Ending a match is a partner path, and Find owns every partner path. It is not on Challenges',
    'Six reasons, kept separate from the report categories: report answers what was wrong with the person, this answers why the pairing did not work',
    '"Something felt off" is a door, not an outcome: it hands off to the report flow, and it sits IN the list because someone scanning for it who cannot find it picks "Prefer not to say" instead',
    '"Prefer not to say" must exist. Forcing a reason out of someone leaving because they felt unsafe is how you stop them leaving',
    'THE REASON IS PRIVATE. The other person is told only that the match ended',
    'The challenge and the streak are both untouched'],
    'Needs backend: there is no neutral end_match today, only block_partner and report_partner. Reasons land on the new partnerships table.') });

def('whoelse', { ph:'T2a', group:'Tabs', label:'Already on the move', bar:() => '', nav:() => navBar('find'),
  body:() => `${hdr('Already on the move')}<div class="p-sub">People on Choner and what they've committed to.</div>${dirCards()}`,
  note:N('Already on the move', 'The directory, back on its own screen. Find landing carries one button to it rather than the list itself.', [
    'MOVED BACK 1 October. It sat inline under the radar from 29 September. Landing is the radar again, with a single "Already on the move" button under it',
    'NO COUNT on that button. We do not have a real number, and a fabricated one is the kind of thing nobody remembers is fabricated',
    'Everyone registered is shown BY DEFAULT: a new user has to see the app is alive',
    'NO LOCATION. A first name and an activity, not a way to find someone in person',
    'Six cards per screen, standing apart rather than joined into a list',
    'Workout rows show their exercises. The directory is the ONLY place exercises appear - they are colour for a human, never an input to matching',
    'The spinner at the bottom never resolves. Thirty rows is everyone we have; it is there so a short list feels alive',
    'No way to message or match from this list'],
    'Needs backend: get_active_directory() is gated behind the show_in_directory opt-in, which defaults to false, and a minimum count of 5. Both go.') });

def('whoelse_old', { ph:'T2f', group:'Tabs', label:'Who else is here (superseded)', bar:() => '', nav:() => '',
  body:() => `${hdr('Who else is here')}<div class="p-sub">People on Choner right now and what they've committed to.</div>${[['Nimali P','Running \u00b7 3 km \u00b7 3x a week','#FD8302'],['Ruwan S','Walking \u00b7 30 min \u00b7 daily','#1E3A4C'],['Asanka K','Yoga \u00b7 20 min \u00b7 2x a week','#2E9E6B'],['Tharushi M','Running \u00b7 5 km \u00b7 2x a week','#8E5FD9'],['Dinuka W','Workout \u00b7 45 min \u00b7 3x a week','#D9534F'],['Ishara B','Walking \u00b7 5 km \u00b7 3x a week','#3B8FD1']].map(p => `<div class="feed-row"><div class="feed-init" style="background:${p[2]};">${initials(p[0])}</div><div><div class="feed-name">${p[0]}</div><div class="feed-meta">${p[1]}</div></div></div>`).join('')}`,
  note:N('Who else is here', 'SUPERSEDED 30 September. This list now sits INLINE on the Find tab as "Already on the move", under the circle, so it is the first thing a new user sees. This screen is kept only so the change is visible against what it replaced.', ['Everyone registered is shown BY DEFAULT: a new user has to see the app is alive','NO LOCATION. A first name and an activity, not a way to find someone in person','One card per person, standing apart rather than joined into a list','Profile picture, name and what they have committed to','No way to message or match from this list'], 'Needs backend: get_active_directory() is gated behind the show_in_directory opt-in, which defaults to false, and a minimum count of 5. Both go.') });

def('community', { ph:'T3', group:'Tabs', label:'Community tab', bar:() => appBar(), nav:() => navBar('community'),
  body:() => `<div class="p-h1" style="margin-bottom:4px;">Community</div><div class="p-sub">Colombo, showing up together.</div>
    ${S.shared === 'yes' ? `<div class="post"><div class="who">${esc(initials(myName()))}</div><div><b>${esc(firstName(myName()))} and Gayan</b><p>${keptTxt(Math.max(S.kept,7))} together on ${esc(TXc().act)}.</p><small>just now</small></div></div>` : ''}
    <div class="post"><div class="who p2">NP</div><div><b>Nimali and Ruwan</b><p>14 sessions together on Yoga.</p><small>2 hours ago</small></div></div>
    <div class="post"><div class="who" style="background:linear-gradient(135deg,#2E9E6B,#1F6B47);">AK</div><div><b>Asanka</b><p>Kept this week's commitment: Walk 3\u00d7 a week.</p><small>Yesterday</small></div></div>`,
  note:N('Community tab', 'Only things people chose to share reach here: the Yes on the share prompt on Home adds you to it.', ['app/(tabs)/community.tsx, components/community/SharePrompt.tsx'], null) });

def('profile', { ph:'T4', group:'Tabs', label:'Profile', bar:() => appBar(), nav:() => navBar('profile'),
  body:() => `<div class="ptabs"><div class="who bigav">${esc(initials(myName()))}</div><b style="font-size:18px;font-weight:600;">${esc(myName())}</b><span class="hint" style="margin:0;">${esc(me().email)}</span>${S.photo==='confirmed'?`<span class="okbadge">${ic('check',3)}Photo confirmed</span>`:`<span class="hint" style="margin:0;">No photo yet</span>`}</div>
    <button class="lrow" data-act="add-photo">${ic('camera',1.8)}<span class="lt">${S.photo==='confirmed'?'Retake your photo':'Add your photo'}<small>Live camera only</small></span>${ic('chev',2).replace('<svg','<svg class="chev"')}</button>
    <button class="lrow" data-go="editprofile">${ic('user',1.8)}<span class="lt">Edit profile<small>Name, goal, struggle, style, age and gender</small></span>${ic('chev',2).replace('<svg','<svg class="chev"')}</button>
    <button class="lrow" data-go="editwhy">${ic('heart',1.8)}<span class="lt">Why you're doing this<small>${whyLine()?esc(whyLine()):'Not answered yet'}</small></span>${ic('chev',2).replace('<svg','<svg class="chev"')}</button>
    <div class="lrow" style="cursor:default;">${ic('bell',1.8)}<span class="lt">Daily reminder<small>Before ${S.deadline}</small></span><button class="tog ${S.notif.reminders?'on':''}" data-act="tog" data-v="reminders" aria-label="Daily reminder"></button></div>
    <div class="lrow" style="cursor:default;">${ic('together',1.8)}<span class="lt">Partner updates</span><button class="tog ${S.notif.partner?'on':''}" data-act="tog" data-v="partner" aria-label="Partner updates"></button></div>
    <button class="lrow" data-go="legal">${ic('doc',1.8)}<span class="lt">Terms, privacy, health</span>${ic('chev',2).replace('<svg','<svg class="chev"')}</button>
    <button class="lrow" data-act="signout" style="color:#C0392B;">${ic('logout',1.8).replace('color:var(--pmuted)','')}<span class="lt" style="color:#C0392B;">Sign out</span></button>`,
  note:N('Profile', 'Reached from the avatar in the top bar. Sign out returns to Welcome, which closes the loop for testing.', ['app/(tabs)/profile.tsx, app/profile/edit.tsx, app/settings/*','Photo row is always there: "Add your photo", or "Retake your photo" once there is one','Edit profile carries every onboarding answer that can change'], 'Simplified: edit profile, deadline and the full settings screens are not drawn here.') });

def('editprofile', { ph:'T4a', group:'Tabs', label:'Edit profile', bar:() => '', nav:() => '',
  body:() => {
    const row = (label, arr, key) => `<div class="flabel" style="margin-top:14px;">${label}</div><div class="pill-row">${arr.map(o => `<button class="pill ${S[key]===o[0]?'on':''}" data-act="pick" data-v="${key}:${o[0]}">${o[1]}</button>`).join('')}</div>`;
    return `${hdr('Edit profile')}
    <div class="fld"><label for="f-ep-name">Your name</label><input class="txt" id="f-ep-name" value="${esc(myName())}" aria-label="Your name"></div>
    <div class="lrow" style="cursor:default;">${ic('camera',1.8)}<span class="lt">Photo<small>${S.photo==='confirmed'?'Photo confirmed':'No photo yet'}</small></span><button class="pill" data-act="add-photo">${S.photo==='confirmed'?'Retake':'Add'}</button></div>
    ${row('Your goal',GOALS,'goal')}${row("What's stopped you before",STRUGGLES,'struggle')}${row('How Choner talks to you',TONES,'tone')}${row('Age',AGES,'age')}${row('Gender',GENDERS,'gender')}
    <div class="foot">${btn('Save changes','ep-save',{primary:true})}</div>`; },
  note:N('Edit profile', 'Every onboarding answer that can change, in one place. This is what makes removing the skips safe.', [
    'Today app/profile/edit.tsx only has name, photo, primary goal and style',
    'TO BUILD: add struggle, age and gender. Without them those three are set once at onboarding and can never be corrected, and matching depends on age and gender',
    'Energy is deliberately left out: it asks how you feel THIS week, so it is re-asked rather than edited',
    'Changing age or gender should re-run matching preferences on the next search'],
    'Saving here writes to the same profile columns onboarding writes: primary_goal, main_struggle, accountability_mode, age_range, gender.') });

const ORDER = ['splash','welcome','signin','signup','verify','verified','linkexpired','forgot','reset','invitecode','inviteaccept','legal','ob-intro','goal','struggle','style','age','energy','reveal','photo','challenge','invite','home','challenges','browse','editact','plan','commit','qr','why','find','fd2','fd3','endmatch','ginvite','whoelse','whoelse_old','community','profile','editprofile','editwhy'];
const GROUPS = []; ORDER.forEach(id => { const g = SC[id].group; let x = GROUPS.find(a => a[0] === g); if (!x) GROUPS.push(x = [g, []]); x[1].push(id); });

/* ---------- render ---------- */
function renderRail(){
  document.getElementById('rail').innerHTML = GROUPS.map(([g, ids]) => `<div><div class="grp-t">${g}</div><div class="rail-list">${ids.map(id => `<button data-jump="${id}" class="${id===S.cur?'on':''}" ${id===S.cur?'aria-current="step"':''}><span class="ph">${SC[id].ph}</span>${SC[id].label}</button>`).join('')}</div></div>`).join('');
}
function renderNotes(){
  const n = SC[S.cur].note;
  document.getElementById('notes').innerHTML = `<div class="note-card"><div class="note-ph">${SC[S.cur].ph}, ${SC[S.cur].label}</div><div class="note-t">${n.t}</div><div class="note-what">${n.what}</div>
    ${n.build ? `<div><div class="note-h" style="margin-bottom:8px;">In the app</div><ul class="note-ul">${n.build.map(b => `<li>${b}</li>`).join('')}</ul></div>` : ''}
    ${(Array.isArray(n.flag) ? n.flag : n.flag ? [n.flag] : []).map(f => `<div class="flag"><b>Note.</b> ${f}</div>`).join('')}${n.dnb ? `<div class="dnb">${n.dnb}</div>` : ''}</div>
    <div class="dnb" style="border:none;padding:0 4px;">Built from the current repo (main, after the Expo SDK 57 upgrade). Screens use the design system: line icons, no emoji, plain punctuation.</div>`;
}
function render(){
  const s = SC[S.cur]; const phone = document.getElementById('phone');
  const keep = phone.querySelector('.content') ? phone.querySelector('.content').scrollTop : 0;
  const bar = s.bar(), nav = s.nav(), tb = bar.indexOf('class="topbar"') >= 0;
  phone.innerHTML = `<div class="statusbar"><span>9:41</span><span>5G</span></div>${bar}<div class="content${s.flush?' flush':''}${tb?' tb':''}${nav?' bn':''}" id="content">${s.body()}</div>${nav}${sheetHTML()}${dlgHTML()}`;
  if (phone.dataset.cur === S.cur) phone.querySelector('.content').scrollTop = keep;
  phone.dataset.cur = S.cur;
  renderRail(); renderNotes();
  const i = ORDER.indexOf(S.cur);
  document.getElementById('prev').disabled = i === 0; document.getElementById('next').disabled = i === ORDER.length - 1;
  document.querySelectorAll('#pseg button').forEach(b => b.classList.toggle('on', b.dataset.p === S.pstate));
  document.querySelectorAll('#csseg button').forEach(b => b.classList.toggle('on', b.dataset.cs === S.cs));
  document.querySelectorAll('#modeseg button').forEach(b => b.classList.toggle('on', b.dataset.m === curMode()));
}
function leave(){ clearTimeout(splashTimer); S.err = {}; S.formErr = null; S.dlg = null; S.sheet = null; }
function go(id, o){
  o = o || {}; leave(); S.menu = false;
  if (o.jump) S.hist = []; else if (o.replace) {} else if (id !== S.cur) S.hist.push(S.cur);
  S.cur = id; if (SC[id].onEnter) SC[id].onEnter();
  if (S.cur === id){ render(); const c = document.getElementById('content'); if (c) c.scrollTop = 0; }
}
function goBack(){
  if (S.cur === 'invite' && (S.invPhase === 'email' || S.invPhase === 'pending' || S.invPhase === 'finding') && false) return;
  leave();
  if (S.hist.length) S.cur = S.hist.pop(); else { const i = ORDER.indexOf(S.cur); if (i > 0) S.cur = ORDER[i - 1]; }
  if (SC[S.cur].onEnter && S.cur !== 'splash') SC[S.cur].onEnter();
  render(); const c = document.getElementById('content'); if (c) c.scrollTop = 0;
}

/* ---------- auth + flow logic ---------- */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTHERR = { creds:"That email and password don't match an account. Check them again, or sign up if you haven't made an account yet.", unconfirmed:'Confirm your email first. We sent you a link when you signed up.', exists:'That email already has an account. Try signing in instead.' };
function afterAuth(){
  if (S.pendingCode){ const pc = S.pendingCode; S.pendingCode = null;
    if (pc.toLowerCase() === 'invalid'){ S.codePhase = 'error'; go('inviteaccept', {replace:true}); S.hist = []; return; }
    S.invitee = true; S.pstate = 'partnered'; S.cs = 'matched'; S.kept = 0; S.chosen = 'run'; S.customTitle = null; S.codePhase = 'success'; go('inviteaccept', {replace:true}); return; }
  if (me().onb){ S.explore = false; go('home', {replace:true}); S.hist = []; } else go('ob-intro', {replace:true});
}
function finishOnboarding(){ me().onb = true; }
function act(a, v){
  switch (a){
    case 'noop': return;
    case 'dlg': { const b = S.dlg.btns[+v]; S.dlg = null; if (b && b[1]) b[1](); else render(); return; }
    case 'replace': go(v, {replace:true}); return;
    case 'pw': S.showPw[v] = !S.showPw[v]; break;
    case 'terms': S.terms = !S.terms; break;
    case 'demo-fill': S.f['si-email'] = DEMO.email; S.f['si-pw'] = DEMO.pw; S.err = {}; S.formErr = null; break;
    case 'signin': {
      S.err = {}; S.formErr = null; const em = (S.f['si-email'] || '').trim(), pw = S.f['si-pw'] || '';
      if (!EMAIL.test(em)) S.err['si-email'] = 'Invalid email';
      if (pw.length < 8) S.err['si-pw'] = 'String must contain at least 8 character(s)';
      if (Object.keys(S.err).length) break;
      const a2 = S.accts.find(x => x.email.toLowerCase() === em.toLowerCase());
      if (!a2 || a2.pw !== pw){ S.formErr = AUTHERR.creds; dlg("Couldn't sign you in", AUTHERR.creds); return; }
      if (!a2.verified){ S.formErr = AUTHERR.unconfirmed; dlg("Couldn't sign you in", AUTHERR.unconfirmed); return; }
      S.user = a2; afterAuth(); return; }
    case 'signup': {
      S.err = {}; const nm = (S.f['su-name'] || '').trim(), em = (S.f['su-email'] || '').trim(), pw = S.f['su-pw'] || '', pw2 = S.f['su-pw2'] || '';
      if (nm.length < 2) S.err['su-name'] = 'Tell us your name';
      if (!EMAIL.test(em)) S.err['su-email'] = 'Invalid email';
      if (pw.length < 8) S.err['su-pw'] = 'At least 8 characters';
      if (pw2.length < 8) S.err['su-pw2'] = 'String must contain at least 8 character(s)'; else if (pw !== pw2) S.err['su-pw2'] = 'Passwords do not match';
      if (!S.terms) S.err.terms = 'You must accept the terms';
      if (Object.keys(S.err).length) break;
      if (S.accts.some(x => x.email.toLowerCase() === em.toLowerCase())){ dlg('Sign up failed', AUTHERR.exists); return; }
      S.accts.push({ email:em, pw, name:nm, verified:false, onb:false }); S.verifyEmail = em; go('verify', {replace:true}); return; }
    case 'resend': dlg('Sent', 'A new verification email is on its way.'); return;
    case 'verify-link': { const a2 = S.accts.find(x => x.email === S.verifyEmail) || S.accts[S.accts.length-1]; a2.verified = true; S.user = a2; go('verified', {replace:true}); S.hist = []; return; }
    case 'verified-continue': if (S.pendingCode){ afterAuth(); return; } me().onb = false; go('ob-intro', {replace:true}); S.hist = []; return;
    case 'link-expired': S.expiredKind = v; S.f['exp-email'] = v === 'reset' ? (S.forgotEmail || S.f['fp-email'] || '') : (S.verifyEmail || ''); go('linkexpired'); return;
    case 'resend-fresh': { S.err = {}; const em = (S.f['exp-email'] || '').trim(); if (!EMAIL.test(em)){ S.err['exp-email'] = 'Invalid email'; break; } if (S.expiredKind === 'reset') S.forgotEmail = em; else S.verifyEmail = em; dlg('Sent', `A fresh link is on its way to ${em}.`); return; }
    case 'forgot': { S.err = {}; const em = (S.f['fp-email'] || '').trim(); if (!EMAIL.test(em)){ S.err['fp-email'] = 'Invalid email'; break; } S.forgotEmail = em;
      dlg('Check your email', 'We sent you a link to reset your password.', [['OK', () => goBack()]]); return; }
    case 'reset-link': go('reset'); return;
    case 'reset': { S.err = {}; const pw = S.f['rp-pw'] || '', pw2 = S.f['rp-pw2'] || '';
      if (pw.length < 8) S.err['rp-pw'] = 'String must contain at least 8 character(s)';
      if (pw2.length < 8) S.err['rp-pw2'] = 'String must contain at least 8 character(s)'; else if (pw !== pw2) S.err['rp-pw2'] = 'Passwords do not match';
      if (Object.keys(S.err).length) break;
      const a2 = S.accts.find(x => x.email.toLowerCase() === (S.forgotEmail || '').toLowerCase()) || S.accts[0]; a2.pw = pw; a2.verified = true; S.user = a2;
      dlg('Password updated', 'You are signed in with your new password.', [['OK', () => afterAuth()]]); return; }
    case 'code-fill': S.f.code = v; break;
    case 'joincode': { const c = (S.f.code || '').trim(); if (!c) break;
      if (!S.user){ S.pendingCode = c; S.codePhase = 'needs-auth'; go('inviteaccept'); return; }
      if (c.toLowerCase() === 'invalid'){ S.codePhase = 'error'; go('inviteaccept'); return; }
      S.invitee = true; S.pstate = 'partnered'; S.cs = 'matched'; S.kept = 0; S.chosen = 'run'; S.customTitle = null; S.codePhase = 'success'; go('inviteaccept'); return; }
    case 'invite-continue': if (me().onb){ go('why', {replace:true}); } else { go('ob-intro', {replace:true}); } S.hist = []; return;
    case 'legal': S.legalTab = v; break;
    case 'pick': { const [k, val] = v.split(':'); S[k] = S[k] === val && k !== 'tone' ? null : val; break; }
    case 'next-goal': go('struggle'); return;
    case 'next-struggle': go('style'); return;
    case 'next-style': go('age'); return;
    case 'next-age': go('energy'); return;
    case 'photo-take': S.photo = 'confirmed'; break;
    case 'photo-retake': S.photo = null; break;
    case 'photo-later': S.photo = 'later'; if (S.photoFrom === 'profile'){ S.photoFrom = null; goBack(); return; } go(S.invitee ? 'home' : 'challenge', {replace:true}); S.hist = []; return;
    case 'photo-next': if (S.photoFrom === 'profile'){ S.photoFrom = null; goBack(); return; } go(S.invitee ? 'home' : 'challenge', {replace:true}); S.hist = []; return;
    case 'ep-save': dlg('Saved', 'Your profile is updated.', [['OK', () => goBack()]]); return;
    case 'add-photo': S.photoFrom = 'profile'; if (S.photo === 'later') S.photo = null; go('photo'); return;
    case 'next-energy': finishOnboarding(); go('reveal'); return;
    // No exercise question here any more: it moved to challenge creation, where
    // up to four are picked. The goal still seeds a sensible default.
    case 'pick-tpl': S.pickedChallenge = v; if (v === 'work') S.exs = GOAL_EX[S.goal] || S.exs; break;
    case 'next-challenge': if (S.pickedChallenge){ S.chosen = S.pickedChallenge; S.customTitle = null; S.amount = tpl().def; go('invite'); return; } break;
    case 'amt': { const t = tpl(); S.amount = Math.max(t.step, +(S.amount + (+v) * t.step).toFixed(2)); break; }
    case 'cad': S.cadence = +v; break;
    case 'why': { const [k, i] = v.split(':'); const cur = S.why[k]; const want = i === 'custom' ? 'custom' : +i; S.why[k] = (cur && cur.c === want) ? {} : { c:want, t:(cur && cur.t) || '' }; break; }
    case 'why-save': case 'why-skip': S.explore = false; go('home', {replace:true}); S.hist = []; return;
    case 'why-edit-save': dlg('Saved', 'Your reason is updated.', [['OK', () => goBack()]]); return;
    case 'pp': S.partnerPick = v; break;
    case 'pp-go': if (S.partnerPick === 'invite'){ act('inv-start'); return; } S.find.intent = false; go('find', {jump:true}); return;
    case 'inv-start': confirmSwitch('invite', () => { S.invPhase = 'share'; S.sentEmail = null; if (!S.invCodeVal) newCode(); if (S.cur === 'ginvite') render(); else go('ginvite'); }); return;
    case 'inv-email': S.invPhase = 'email'; S.f['inv-email'] = ''; S.err = {}; break;
    case 'inv-back': S.invPhase = 'choose'; break;
    case 'inv-share-back': S.invPhase = 'share'; S.sentEmail = null; break;
    case 'open-share': S.sheet = 'share'; break;
    case 'sheet-close': S.sheet = null; break;
    case 'share-via': S.sheet = null; S.sentVia = v; S.sentEmail = null; S.invPhase = 'pending'; S.pstate = 'waiting'; S.find.intent = false; if (v === 'Copy'){ const t = shareText(); try { if (navigator.clipboard) navigator.clipboard.writeText(t); } catch (e) {} dlg('Copied', t); return; } break;
    case 'inv-send': { S.err = {}; const em = (S.f['inv-email'] || '').trim(); if (!EMAIL.test(em)){ S.err['inv-email'] = 'Enter a valid email'; break; } S.sentEmail = em; S.invPhase = 'pending'; S.pstate = 'waiting'; S.find.intent = false; break; }
    case 'inv-resend': S.sheet = 'share'; break;
    case 'begin-find': confirmSwitch('find', () => beginFind()); return;
    case 'copy-code': dlg('Code copied', `${invCode()} is on your clipboard.`); return;
    case 'cancel-invite': dlg('Cancel your invite?', `The link and code ${invCode()} stop working.`, [['Keep it', null], ['Cancel invite', () => { S.pstate = 'solo'; S.invPhase = 'choose'; S.sentEmail = null; S.invCodeVal = null; render(); }]]); return;
    case 'sim-join': S.pstate = 'partnered'; S.cs = 'matched'; S.kept = 0; S.weekDone = 0; S.invCodeVal = null; dlg('Gayan joined', 'Your invite was used. You and Gayan are paired.'); return;
    case 'find-resume': go(fdNext()); return;
    case 'loc-add': if (S.find.areas.length < 2 && !S.find.areas.includes(v)) S.find.areas.push(v); break;
    case 'loc-del': S.find.areas = S.find.areas.filter(a => a !== v); break;
    case 'fmode': S.find.mode = v; if (v === 'separate'){ S.find.areas = []; S.mode = 'separate'; } else if (S.mode === 'separate') S.mode = 'together'; break;
    case 'fgender': S.find.gender = v; break;
    case 'fd2-next': go('fd3'); return;
    case 'inv-home': if (S.cur === 'ginvite'){ goBack(); return; } S.explore = false; go('home', {replace:true}); S.hist = []; return;
    case 'share': S.shared = v; if (v === 'yes') dlg('Shared', 'Your milestone is now on the Community tab for Colombo.'); else render(); return;
    case 'tg-onway': S.tg = 'onway'; break;
    case 'tg-here': S.tg = 'here'; break;
    case 'open-qr': go('qr'); return;
    case 'qr-scanned': S.together = true; goBack(); return;
    case 'finish-tg': completeCommitment(); break;
    case 'start-sep': S.sheet = 'finish-sep'; break;
    case 'sep-done': S.sheet = null; S.youDone = true; sepCheck(); break;
    case 'set-mode': S.mode = v; break;
    case 'pd-amt': { const st = tpl().step; S.pd.amt = Math.max(st, +(S.pd.amt + (+v) * st).toFixed(2)); break; }
    case 'pd-cad': S.pd.cad = +v; break;
    case 'plan-confirm': { const d = S.pd;
      S.planProp = { by:'dd', first:S.cs === 'matched', mode:curMode(), day:d.day, timeRaw:d.time, time:fmtTime(d.time),
                     place:(d.place || '').trim() || 'Your meeting place', amt:d.amt, cad:d.cad };
      S.counterFrom = null; go('home', {replace:true}); S.hist = []; return; }
    case 'plan-accept': { const p = S.planProp; S.planProp = null; S.counterFrom = null;
      S.mode = p.mode; S.plan.day = p.day; S.plan.timeRaw = p.timeRaw; S.plan.time = p.time; S.plan.place = p.place;
      if (p.first){
        S.amount = p.amt; S.cadence = p.cad; S.agreed = true;
        // Prototype: Gayan answers with a different number so the split is
        // visible. In the app this is whatever they actually choose.
        S.partnerAmount = Math.max(tpl().step, +(p.amt - tpl().step * 2).toFixed(2));
      }
      if (S.cs === 'done' && S.weekDone >= S.cadence) S.weekDone = 0;
      S.cs = 'planned'; resetDay();
      if (p.first){ go('why', {replace:true}); S.hist = []; return; }
      go('home', {replace:true}); S.hist = [];
      dlg("You're in", `You've got something to show up for together. ${p.mode==='together'?'Together':'Separately, together'} · ${p.day} · ${p.time}.`); return; }
    case 'plan-counter': { const p = S.planProp; S.counterFrom = p; S.planProp = null; go('plan'); return; }
    case 'nw-act': S.nw.act = v; S.nw.amt = TPL[v].def; break;
    case 'nw-ex': { const i = S.nw.exs.indexOf(v);
      if (i >= 0) S.nw.exs.splice(i, 1);
      else if (S.nw.exs.length < MAX_EX) S.nw.exs.push(v);
      break; }
    case 'nw-create': S.chosen = S.nw.act; S.exs = S.nw.exs.slice(); S.explore = false; S.pstate = 'solo'; S.weekDone = 0; go('home', {replace:true}); S.hist = []; return;
    case 'edit-act': go('editact'); return;
    case 'act-save': { const changed = S.nw.act !== S.chosen || S.nw.exs.join() !== S.exs.join(); S.chosen = S.nw.act; S.exs = S.nw.exs.slice();
      go('find', {jump:true});
      if (changed) dlg('Changed', `Your commitment is ${TPL[S.chosen].t} now. Change it again any time before you search.`);
      return; }
    case 'sim-match': S.pstate = 'partnered'; S.cs = 'matched'; S.kept = 0; S.weekDone = 0; S.find.intent = false; if (!pairCanMeet()) S.mode = 'separate'; go('home', {replace:true}); S.hist = []; return;
    case 'accept-match': S.iAccepted = true; return;
    case 'decline-match': S.iAccepted = false; S.pstate = 'solo'; S.find.intent = false;
      go('find', {jump:true}); dlg('Back in the pool', "We'll keep looking. Nobody is told you passed."); return;
    // Ending a match lives HERE, not on Challenges: Find owns every partner
    // path, and this is one. The reason is private either way.
    case 'menu': S.menu = !S.menu; break;
    case 'endmatch-open': S.menu = false; S.endReason = null; go('endmatch'); return;
    case 'report-open': S.menu = false; S.sheet = 'report'; S.repCat = null; break;
    case 'rep-cat': S.repCat = v; break;
    case 'rep-send': S.sheet = null; S.pstate = 'solo'; S.cs = 'matched'; S.find.intent = false; S.partnerAmount = S.amount;
      go('find', {jump:true});
      dlg('Report sent', 'The match has ended. Your challenge continues and your streak is untouched. We look at every report.');
      return;
    case 'block-open': S.menu = false; S.sheet = 'block'; break;
    case 'block-send': S.sheet = null; S.pstate = 'solo'; S.cs = 'matched'; S.find.intent = false; S.partnerAmount = S.amount;
      go('find', {jump:true});
      dlg('Blocked', 'The match has ended and you will not be shown to each other again.');
      return;
    case 'end-reason': S.endReason = v; break;
    case 'endmatch-send': {
      // "Something felt off" is a door into the report flow. Those screens are
      // not in this prototype, so the match ends and the handoff is stated
      // rather than left as a dead end.
      const off = S.endReason === 'off';
      S.sheet = null; S.pstate = 'solo'; S.cs = 'matched'; S.find.intent = false;
      // Gayan's number goes with Gayan. Yours and the cadence are the
      // commitment, and the commitment continues.
      S.partnerAmount = S.amount;
      go('find', {jump:true});
      dlg('This match has ended.', off
        ? 'Your challenge continues and your streak is untouched. We will ask what happened next - the report flow is a separate set of screens.'
        : 'Your challenge continues and your streak is untouched. You can look for a new partner anytime.');
      return; }
    case 'stop-find': S.pstate = 'solo'; S.find.intent = false; break;
    case 'tog': S.notif[v] = !S.notif[v]; break;
    case 'signout': dlg('Sign out?', 'You can sign back in any time.', [['Cancel', null], ['Sign out', () => { S.user = null; S.f = {}; go('welcome', {jump:true}); }]]); return;
  }
  render();
}
function beginFind(){
  if (S.searches >= 3 && S.pstate !== 'finding'){ dlg("That's today's searches", 'You get three partner searches a day. Try again tomorrow, or invite someone you know.'); return; }
  S.find.intent = true; go(fdNext());
}
/* ---------- events ---------- */
const phoneEl = document.getElementById('phone');
phoneEl.addEventListener('input', e => {
  const id = e.target.id; if (!id) return;
  if (id.startsWith('f-')) S.f[id.slice(2)] = e.target.value;
  else if (id.startsWith('w-')){ const k = id.slice(2); S.why[k] = Object.assign({ c:'custom' }, S.why[k], { t:e.target.value }); }
  else if (id === 'ta-msg') S.invMsg = e.target.value;
  else if (id === 'pl-day') S.pd.day = e.target.value;
  else if (id === 'pl-time') S.pd.time = e.target.value || '07:00';
  else if (id === 'pl-place') S.pd.place = e.target.value;

  if (id === 'f-code'){ const b = document.querySelector('[data-act="joincode"]'); if (b) b.disabled = !e.target.value.trim(); }
});
phoneEl.addEventListener('change', e => { if (e.target.id === 'loc-sel' && e.target.value){ act('loc-add', e.target.value); } });
phoneEl.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT'){ const p = phoneEl.querySelector('[data-primary]'); if (p && !p.disabled) p.click(); } });
phoneEl.addEventListener('click', e => {
  const back = e.target.closest('[data-back]'); if (back){ goBack(); return; }
  const t = e.target.closest('[data-go],[data-act]'); if (!t || t.disabled) return;
  if (t.dataset.act){ act(t.dataset.act, t.dataset.v); return; }
  go(t.dataset.go);
});
document.getElementById('rail').addEventListener('click', e => { const b = e.target.closest('[data-jump]'); if (b) go(b.dataset.jump, {jump:true}); });
document.getElementById('pseg').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b){ S.pstate = b.dataset.p; if (S.pstate === 'partnered') { if (!S.cs) S.cs = 'matched'; } render(); } });
document.getElementById('csseg').addEventListener('click', e => { const b = e.target.closest('[data-cs]'); if (b){ S.pstate = 'partnered'; S.cs = b.dataset.cs; if (S.cs === 'matched') { S.kept = 0; S.weekDone = 0; } else if (!S.kept) S.kept = 6; resetDay(); render(); } });
document.getElementById('modeseg').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b){ S.mode = b.dataset.m; if (S.cs === 'today') resetDay(); render(); } });
document.getElementById('sim-g').onclick = () => { if (gayanStep() !== 'nav') render(); };
document.getElementById('sim-counter').onclick = () => {
  const p = S.planProp;
  if (!p || p.by !== 'dd'){ dlg('Nothing to answer', 'Plan a session first, then Gayan has something to suggest another for.'); render(); return; }
  S.planProp = Object.assign({}, p, { by:'gy',
    mode: (pairCanMeet() && p.mode === 'together') ? 'separate' : p.mode,
    day: p.day === 'Sunday' ? 'Saturday' : 'Sunday', time:'6:30 AM', timeRaw:'06:30' });
  go('home', {replace:true}); S.hist = []; };
document.getElementById('sim-km').onclick = () => { S.kept = Math.max(0, S.kept - 1); render(); };
document.getElementById('sim-kp').onclick = () => { S.kept++; render(); };
document.getElementById('sim-reset').onclick = () => { clearTimeout(splashTimer); const keep = S.accts; S = fresh(); S.accts = keep.filter(a => a.email === DEMO.email).map(() => Object.assign({}, DEMO)); go('splash', {jump:true}); };
document.getElementById('prev').onclick = () => { const i = ORDER.indexOf(S.cur); if (i > 0) go(ORDER[i - 1], {jump:true}); };
document.getElementById('next').onclick = () => { const i = ORDER.indexOf(S.cur); if (i < ORDER.length - 1) go(ORDER[i + 1], {jump:true}); };
document.addEventListener('keydown', e => { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });
go('splash', {jump:true});
startMoments();
