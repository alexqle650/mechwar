// Stand-in for PeerJS: connects pages of the same origin through a BroadcastChannel.
(() => {
  const bc = new BroadcastChannel('fakepeer'); const peers = {};
  class Em { constructor(){ this.h = {}; } on(e,f){ (this.h[e] = this.h[e] || []).push(f); return this; } emit(e,...a){ for (const f of this.h[e]||[]) f(...a); } }
  class Conn extends Em { constructor(peer, remote, cid){ super(); this.peer = peer; this.remote = remote; this.cid = cid; this.open = false; }
    send(d){ if (!this.open) return; bc.postMessage({kind:'data', to:this.remote, from:this.peer.id, cid:this.cid, d: JSON.parse(JSON.stringify(d))}); }
    close(){ if (!this.open) return; this.open = false; bc.postMessage({kind:'close', to:this.remote, from:this.peer.id, cid:this.cid}); setTimeout(() => this.emit('close')); } }
  class Peer extends Em {
    constructor(id){ super(); if (typeof id !== 'string') id = 'rnd-' + Math.random().toString(36).slice(2); this.id = id; this.conns = {}; this.destroyed = false; peers[id] = this;
      setTimeout(() => this.emit('open', id), 50); }
    connect(remote){ const cid = Math.random().toString(36).slice(2), c = new Conn(this, remote, cid); this.conns[cid] = c;
      bc.postMessage({kind:'conn', to:remote, from:this.id, cid});
      c.timer = setTimeout(() => { if (!c.open) this.emit('error', {type:'peer-unavailable'}); }, 3000); return c; }
    destroy(){ this.destroyed = true; for (const c of Object.values(this.conns)) c.close(); delete peers[this.id]; }
    reconnect(){} }
  bc.onmessage = ev => { const m = ev.data, p = peers[m.to]; if (!p || p.destroyed) return;
    if (m.kind === 'conn'){ const c = new Conn(p, m.from, m.cid); p.conns[m.cid] = c; p.emit('connection', c); setTimeout(() => { c.open = true; c.emit('open'); bc.postMessage({kind:'ack', to:m.from, from:p.id, cid:m.cid}); }, 30); }
    else { const c = p.conns[m.cid]; if (!c) return;
      if (m.kind === 'ack'){ clearTimeout(c.timer); c.open = true; c.emit('open'); }
      else if (m.kind === 'data') c.emit('data', m.d);
      else if (m.kind === 'close' && c.open){ c.open = false; c.emit('close'); } } };
  window.Peer = Peer;
})();
