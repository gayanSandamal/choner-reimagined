import base64,re
old=open('find-flow.bak.html',encoding='utf-8').read().split('\n')
head=old[2:320]                # '<style>' .. last css line before </style>
css_old='\n'.join(head)
add=open('app_a.html',encoding='utf-8').read()
icblock='\n'.join(old[357:395])  # after <script> line (1-indexed 357) through esc
assert icblock.strip().startswith('/* ---------- icons'), icblock[:60]
assert 'const esc' in icblock
js=open('app_b.js',encoding='utf-8').read()
logo='data:image/png;base64,'+base64.b64encode(open('E:/choner-reimagined/assets/choner-logo.png','rb').read()).decode()
find_url='https://claude.ai/artifact/YLKUahXoetAvC6JK2Kzw7M'
js='const LOGO="'+logo+'";'+chr(10)+js
js=js.replace('__FIND_URL__',find_url).replace('__LOGO__','${LOGO}')
shell='''
<div class="wrap">
  <header class="head">
    <div class="eyebrow">Choner app &middot; splash to Home</div>
    <h1>The whole app, <b>from splash to Home</b></h1>
    <p class="lede">Every screen a new user meets before their first day, built from the current code. Tap through the phone, or jump to any screen on the left. Sign up, sign in, forgot password, invite codes, all five onboarding steps, the partner choice and Home all respond. Updated to the 26 September decisions: six activities, weekly commitments, streak in commitments kept, no solo mode. Use the Partner, Commitment and Mode controls to see every Home state.</p>
  </header>
  <div class="grid">
    <nav class="rail" id="rail" aria-label="Screens"></nav>
    <main class="stage">
      <div class="controls">
        <div class="step"><button id="prev">Back</button><button id="next">Next</button></div>
        <span class="seg-l">Partner</span>
        <div class="seg" id="pseg" role="group" aria-label="Partner state">
          <button data-p="solo" class="on">No partner</button><button data-p="finding">Finding</button><button data-p="waiting">Invited</button><button data-p="partnered">Paired</button>
        </div>
      </div>
      <div class="controls" style="margin-top:-4px;"><span class="seg-l">Commitment</span>
        <div class="seg" id="csseg" role="group" aria-label="Commitment state"><button data-cs="matched">Matched</button><button data-cs="planned">Planned</button><button data-cs="today">The day</button><button data-cs="done">Done</button><button data-cs="idle">All set</button></div>
        <span class="seg-l">Mode</span><div class="seg" id="modeseg" role="group" aria-label="Mode"><button data-m="together">Together</button><button data-m="separate">Separately</button></div></div>
      <div class="sim"><button class="mini" id="sim-g">Gayan: next step</button><button class="mini" id="sim-counter">Gayan: suggests another</button><button class="mini" id="sim-km">Kept &minus;</button><button class="mini" id="sim-kp">Kept +</button><button class="mini" id="sim-reset">Restart from splash</button></div>
      <div class="phone" id="phone"></div>
    </main>
    <aside class="notes" id="notes" aria-live="polite"></aside>
  </div>
</div>
<script>
'''
extra=open('hs_css.css',encoding='utf-8').read()+open('hs_css2.css',encoding='utf-8').read()+open('ch_css.css',encoding='utf-8').read()
out='<title>Choner App Flow</title>\n'+'\n'.join(old[1:2])+'\n'+css_old+'\n'+add+'\n'+extra+'\n  .content.flush{padding:0;}\n</style>\n'+shell+icblock+'\n'+js+'\n</script>\n'
out=''.join(c if ord(c)<128 else chr(92)+'u%04x'%ord(c) for c in out)
open('choner-app-flow.html','w',encoding='utf-8').write(out)
print(len(out), out.count('__'))
