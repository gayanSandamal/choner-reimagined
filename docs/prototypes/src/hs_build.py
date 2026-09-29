old=open('find-flow.bak.html',encoding='utf-8').read().split('\n')
app=open('app_b.js',encoding='utf-8').read().split('\n')
css_old='\n'.join(old[2:320])
add=open('app_a.html',encoding='utf-8').read()
hs=open('hs_css.css',encoding='utf-8').read()+open('hs_css2.css',encoding='utf-8').read()+open('hs_css3.css',encoding='utf-8').read()
icblock='\n'.join(old[357:395])
_a=chr(10).join(app); _i=_a.index('Object.assign(IC, {'); extras=_a[_i:_a.index('});',_i)+3]
assert extras.strip().startswith('Object.assign(IC') and extras.strip().endswith('});'), extras[-40:]
js=open('hs_main.js',encoding='utf-8').read()
shell='''
<div class="wrap">
  <header class="head">
    <div class="eyebrow">Choner app &middot; Home tab</div>
    <h1>Home, <b>every state</b></h1>
    <p class="lede">A living view of your commitment and the people around it. Pick a scenario on the left, or combine the controls: first login or returning, with or without a challenge, with or without a partner, and every step of the commitment. Every button on the phone works.</p>
  </header>
  <div class="grid">
    <nav class="rail" id="rail" aria-label="Home states"></nav>
    <main class="stage">
      <div class="controls"><span class="seg-l">Login</span><div class="seg" id="sLogin"><button data-v="first">First login</button><button data-v="ret">Returning</button></div>
        <span class="seg-l">Challenge</span><div class="seg" id="sChal"><button data-v="none">None</button><button data-v="active">Active</button><button data-v="done">Complete</button></div></div>
      <div class="controls" style="margin-top:-4px;"><span class="seg-l">Partner</span><div class="seg" id="sPart"><button data-v="none">None</button><button data-v="finding">Finding</button><button data-v="match">Match</button><button data-v="waiting">Invited</button><button data-v="partnered">Paired</button><button data-v="ended">Ended</button></div></div>
      <div class="controls" style="margin-top:-4px;"><span class="seg-l">Commitment</span><div class="seg" id="sCs"><button data-v="matched">Matched</button><button data-v="planned">Planned</button><button data-v="resched">Moved</button><button data-v="today">The day</button><button data-v="missed">Missed</button><button data-v="done">Done</button><button data-v="idle">All set</button></div></div>
      <div class="controls" style="margin-top:-4px;"><span class="seg-l">Mode</span><div class="seg" id="sMode"><button data-v="together">Together</button><button data-v="separate">Separately</button></div><span class="seg-l">Pulse</span><div class="seg" id="sPulse"><button data-v="live">Live</button><button data-v="quiet">Quiet</button></div></div>
      <div class="sim"><button class="mini" id="sim-g">Gayan: next step</button><button class="mini" id="sim-km">Kept &minus;</button><button class="mini" id="sim-kp">Kept +</button><button class="mini" id="sim-reset">Reset</button></div>
      <div class="phone" id="phone"></div>
    </main>
    <aside class="notes" id="notes" aria-live="polite"></aside>
  </div>
</div>
<script>
'''
out='<title>Choner Home States</title>\n'+old[1]+'\n'+css_old+'\n'+add+'\n'+hs+'\n</style>\n'+shell+icblock+'\n'+extras+'\n'+js+'\n</script>\n'
out=''.join(c if ord(c)<128 else chr(92)+'u%04x'%ord(c) for c in out)
open('choner-home-states.html','w',encoding='utf-8').write(out)
print(len(out))
