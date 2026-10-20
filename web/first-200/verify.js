// Does the web app still agree with the database?
//
// The page hard-codes the activity keys, the 69 location slugs, the five time
// slots, the nine exercises and the quiz enums. If any of them drifts from the
// app, a registration still saves but no longer joins to anything - and that
// failure is silent, which is why it is worth a script.
//
//   node web/first-200/verify.js
//
// Run it after touching the page, the Edge Function, or any migration that
// changes locations, templates or the onboarding vocabulary.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(ROOT, 'web/first-200/index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const data = js.slice(0, js.indexOf('/* ---------- state ---------- */'));

const sandbox = {};
new Function('g', data + '\nObject.assign(g,{GOALS,STRUGGLES,AGES,GENDERS,MODES,ACTIVITIES,EXERCISES,TIMES,COLOMBO_CITY,GREATER_COLOMBO,SL_DISTRICTS,MAX_EXERCISES});')(sandbox);

let fails = 0;
const ok = (label, cond, detail) => {
  if (cond) { console.log('  PASS  ' + label); }
  else { console.log('  FAIL  ' + label + (detail ? '  -> ' + detail : '')); fails++; }
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- locations, straight out of the migration that seeds them -------------
const locSql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/202609181900_location_corridors.sql'), 'utf8');
const dbLocs = [...locSql.matchAll(/\('([a-z_]+)', '([^']+)', '(colombo_city|greater_colombo)', \d+\)/g)];
const dbCity = dbLocs.filter(m => m[3] === 'colombo_city').map(m => m[1]).sort();
const dbGreater = dbLocs.filter(m => m[3] === 'greater_colombo').map(m => m[1]).sort();
// Added by our own later migrations, not the original seed. Every new
// location has to be listed here too, or this check reports it as "extra" on
// the page when the page is in fact correct.
dbGreater.push('mattegoda');          // 202610051200_add_mattegoda.sql
dbGreater.push('battaramulla');       // 202610201200_add_battaramulla.sql
dbGreater.sort();

const pageCity = sandbox.COLOMBO_CITY.map(x => x[0]).sort();
const pageGreater = sandbox.GREATER_COLOMBO.map(x => x[0]).sort();

console.log('\nLOCATIONS');
ok('Colombo City slugs match (' + dbCity.length + ')', same(dbCity, pageCity),
   'missing: ' + dbCity.filter(s => !pageCity.includes(s)) + ' | extra: ' + pageCity.filter(s => !dbCity.includes(s)));
ok('Greater Colombo slugs match (' + dbGreater.length + ')', same(dbGreater, pageGreater),
   'missing: ' + dbGreater.filter(s => !pageGreater.includes(s)) + ' | extra: ' + pageGreater.filter(s => !dbGreater.includes(s)));
ok('kottawa present', pageGreater.includes('kottawa'));
ok('mattegoda present', pageGreater.includes('mattegoda'));
ok('battaramulla present', pageGreater.includes('battaramulla'));
ok('labels match the app exactly', sandbox.COLOMBO_CITY.every(([v, l]) => {
  const row = dbLocs.find(m => m[1] === v); return row && row[2] === l;
}));

// ---- activities ----------------------------------------------------------
console.log('\nACTIVITIES');
const six = fs.readFileSync(path.join(ROOT, 'supabase/migrations/202610020900_six_activities.sql'), 'utf8');
const activeSlugs = six.match(/set is_active = \(slug in \(([\s\S]*?)\)\)/)[1]
  .match(/'activity-([a-z_]+)'/g).map(s => s.replace(/'activity-|'/g, '')).sort();
// slug -> activity_key: workouts stores home_workouts
const slugToKey = { running:'running', jogging:'jogging', walking:'walking',
                    cycling:'cycling', yoga:'yoga', workouts:'home_workouts' };
const expectKeys = activeSlugs.map(s => slugToKey[s]).sort();
const pageKeys = sandbox.ACTIVITIES.map(a => a[0]).sort();
ok('six active activity_keys match', same(expectKeys, pageKeys), expectKeys + ' vs ' + pageKeys);
ok('badminton excluded', !pageKeys.includes('badminton'));
ok('jogging included', pageKeys.includes('jogging'));
ok('workouts stores home_workouts', pageKeys.includes('home_workouts'));

// ---- exercises -----------------------------------------------------------
console.log('\nEXERCISES');
const exTs = fs.readFileSync(path.join(ROOT, 'features/challenges/exercises.ts'), 'utf8');
const dbEx = [...exTs.matchAll(/^\s*'([^']+)',?$/gm)].map(m => m[1]);
ok('nine exercises, same strings and order', same(dbEx, sandbox.EXERCISES), dbEx + ' vs ' + sandbox.EXERCISES);
ok('MAX_EXERCISES is 4', sandbox.MAX_EXERCISES === 4);

// ---- time of day ---------------------------------------------------------
console.log('\nTIME OF DAY');
const match = fs.readFileSync(path.join(ROOT, 'features/challenges/matching.ts'), 'utf8');
const slots = match.match(/const SLOT_ORDER = \[([^\]]+)\]/)[1].match(/'([a-z_]+)'/g).map(s => s.replace(/'/g, ''));
ok('five slots, same order as SLOT_ORDER', same(slots, sandbox.TIMES.map(t => t[0])), slots.join(','));

// ---- quiz enums ----------------------------------------------------------
console.log('\nQUIZ ENUMS');
const consts = fs.readFileSync(path.join(ROOT, 'features/onboarding/constants.ts'), 'utf8');
const typeVals = (name) => consts.match(new RegExp('export type ' + name + " = ([^;]+);"))[1]
  .match(/'([^']+)'/g).map(s => s.replace(/'/g, '')).sort();
ok('goals', same(typeVals('GoalValue'), sandbox.GOALS.map(g => g[0]).sort()));
ok('struggles', same(typeVals('StruggleValue'), sandbox.STRUGGLES.map(g => g[0]).sort()));
ok('age bands', same(typeVals('AgeRangeValue'), sandbox.AGES.map(g => g[0]).sort()));
ok('genders', same(typeVals('GenderValue'), sandbox.GENDERS.map(g => g[0]).sort()));
ok('modes are together/separate/either', same(['either','separate','together'], sandbox.MODES.map(m => m[0]).sort()));

// ---- against our own migration's CHECK constraints ------------------------
console.log('\nAGAINST THE NEW TABLE');
const mig = fs.readFileSync(path.join(ROOT, 'supabase/migrations/202610061200_first_200_registrations.sql'), 'utf8');
const checkVals = (col) => {
  // Column names are space-padded in the migration, so match the column, then
  // the `check (col in (...))` that follows it.
  const re = new RegExp(col + "\\s+text\\s+check\\s*\\(\\s*" + col + "\\s+in\\s*\\(([^)]*)\\)");
  const m = mig.match(re);
  if (!m) throw new Error('no check constraint found for ' + col);
  return m[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, '')).sort();
};
ok('activity_key constraint accepts every option', same(checkVals('activity_key'), sandbox.ACTIVITIES.map(a => a[0]).sort()));
ok('mode constraint accepts every option', same(checkVals('mode'), sandbox.MODES.map(m => m[0]).sort()));
ok('age_range constraint accepts every option', same(checkVals('age_range'), sandbox.AGES.map(a => a[0]).sort()));
ok('gender constraint accepts every option', same(checkVals('gender'), sandbox.GENDERS.map(g => g[0]).sort()));
ok('times_valid accepts every slot',
   same(mig.match(/times_of_day <@ array\[([^\]]+)\]/)[1].match(/'([a-z_]+)'/g).map(s => s.replace(/'/g, '')).sort(),
        sandbox.TIMES.map(t => t[0]).sort()));

// ---- against the Edge Function's allowlists ------------------------------
console.log('\nAGAINST THE EDGE FUNCTION');
const fn = fs.readFileSync(path.join(ROOT, 'supabase/functions/register-first-200/index.ts'), 'utf8');
const fnList = (name) => fn.match(new RegExp('const ' + name + ' = \\[([^\\]]+)\\]'))[1]
  .match(/'([^']+)'/g).map(s => s.replace(/'/g, '')).sort();
ok('ACTIVITIES', same(fnList('ACTIVITIES'), sandbox.ACTIVITIES.map(a => a[0]).sort()));
ok('TIMES', same(fnList('TIMES'), sandbox.TIMES.map(t => t[0]).sort()));
ok('MODES', same(fnList('MODES'), sandbox.MODES.map(m => m[0]).sort()));
// GOALS is the one list where the function is deliberately WIDER than the
// page. 'sleep_better' was retired on 15 October but the Edge Function still
// accepts it, because a cached copy of join.choner.io can still post it. So
// assert containment plus exactly that one known extra, rather than equality:
// a permanently red check is worse than no check, and this one would hide the
// next real drift.
(() => {
  const fnGoals = fnList('GOALS');
  const pageGoals = sandbox.GOALS.map(g => g[0]).sort();
  const missing = pageGoals.filter(g => !fnGoals.includes(g));
  const extra = fnGoals.filter(g => !pageGoals.includes(g));
  ok('GOALS (function accepts every page goal)', missing.length === 0,
     'missing: ' + missing);
  ok('GOALS (only the retired goal is extra)', same(extra, ['sleep_better']),
     'unexpected extra: ' + extra);
})();
ok('STRUGGLES', same(fnList('STRUGGLES'), sandbox.STRUGGLES.map(g => g[0]).sort()));
ok('AGES', same(fnList('AGES'), sandbox.AGES.map(a => a[0]).sort()));
ok('GENDERS', same(fnList('GENDERS'), sandbox.GENDERS.map(g => g[0]).sort()));

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL CHECKS PASSED'));
process.exit(fails ? 1 : 0);
