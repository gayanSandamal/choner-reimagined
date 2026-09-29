old=open('find-flow.bak.html',encoding='utf-8').read().split('\n')
app=open('app_b.js',encoding='utf-8').read().split('\n')
css_old='\n'.join(old[2:320])
add=open('app_a.html',encoding='utf-8').read()
css=open('hs_css.css',encoding='utf-8').read()+open('hs_css2.css',encoding='utf-8').read()+open('ch_css.css',encoding='utf-8').read()
icblock='\n'.join(old[357:395])
_a=chr(10).join(app); _i=_a.index('Object.assign(IC, {'); extras=_a[_i:_a.index('});',_i)+3]
assert extras.strip().startswith('Object.assign(IC')
js=open('ch_main.js',encoding='utf-8').read()
shell='''
<div class="wrap">
  <header class="head">
    <div class="eyebrow">Choner app &middot; Challenges tab</div>
    <h1>Challenges, <b>the home of commitments</b></h1>
    <p class="lede">Weekly shared commitments, built on the decisions of 26 September: rolling Monday to Sunday weeks, one session planned at a time, a streak counted in commitments both partners kept, recorded misses with one repair, and no partner search or feeds on this tab. Pick a scenario, then tap through. Every button works.</p>
  </header>
  <div class="grid">
    <nav class="rail" id="rail" aria-label="Challenges states"></nav>
    <main class="stage">
      <div class="controls"><span class="seg-l">Pair can meet</span><div class="seg" id="sMeet" role="group" aria-label="Can this pair meet in person"><button data-v="yes" class="on">Yes</button><button data-v="no">No</button></div></div>
      <div class="sim"><button class="mini" id="sim-g">Gayan: next step</button><button class="mini" id="sim-counter">Gayan: suggests another</button><button class="mini" id="sim-day">Skip to the session day</button><button class="mini" id="sim-end">The day ends (miss check)</button><button class="mini" id="sim-reset">Reset</button></div>
      <div class="phone" id="phone"></div>
    </main>
    <aside class="notes" id="notes" aria-live="polite"></aside>
  </div>
</div>
<script>
'''
out='<title>Choner Challenges Tab</title>\n'+old[1]+'\n'+css_old+'\n'+add+'\n'+css+'\n</style>\n'+shell+icblock+'\n'+extras+'\n'+js+'\n</script>\n'
out=''.join(c if ord(c)<128 else chr(92)+'u%04x'%ord(c) for c in out)
open('choner-challenges-tab.html','w',encoding='utf-8').write(out)
print(len(out))
