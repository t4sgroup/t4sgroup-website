// Il metodo T4S: le quattro fasi (Define, Design, Develop, Deliver) si accendono una dopo l'altra, nei due versi.
// Sul computer il sito scorre una sezione alla volta (scroll-snap): le fasi si accendono quando la sezione è arrivata,
// in due secondi circa, e si spengono uscendo. Sul telefono, dove le schede stanno una sotto l'altra, si accendono
// mentre si scorre, quando arrivano poco sotto la metà dello schermo.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var DITO = matchMedia('(hover: none)').matches, st = null, giro = 0, ora = null, prima = 0;
  function aScatti() { return /mandatory/.test(getComputedStyle(document.documentElement).scrollSnapType || ''); }

  function stile() {
    if (document.getElementById('ml-stile')) return;
    var s = document.createElement('style'); s.id = 'ml-stile';
    s.textContent =
      '.ml-on .ic-card{transition:border-color .5s ease,background .5s ease,box-shadow .6s ease}' +
      '.ml-on .ic-card .ic-card-content{transition:opacity .5s ease}' +
      '.ml-on .ic-card:not(.ml-acceso) .ic-card-content{opacity:.45}' +
      '.ml-on .ic-card.ml-acceso{border-color:rgba(226,100,27,.55);background:linear-gradient(180deg,rgba(226,100,27,.09),rgba(110,52,14,.04) 60%,rgba(0,0,0,0));box-shadow:0 18px 60px -24px rgba(226,100,27,.45)}';
    document.head.appendChild(s);
  }
  function posizione(e, row) { var x = 0, y = 0; while (e && e !== row) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return e === row ? [x, y] : null; }

  // dove sta ogni scheda lungo la direzione in cui si accendono (x sul computer, y sul telefono)
  function costruisci(row) {
    var carte = [].slice.call(row.querySelectorAll('.ic-card')); if (carte.length < 2) return null;
    stile(); row.classList.add('ml-on'); row.style.position = 'relative';
    var box = carte.map(function (c) { var p = posizione(c, row); return p && { x: p[0], y: p[1], w: c.offsetWidth, h: c.offsetHeight }; });
    if (box.some(function (b) { return !b; })) return null;
    var vert = box[1].y > box[0].y + box[0].h / 2, ult = box[box.length - 1];
    return { row: row, vert: vert, carte: carte, accese: carte.map(function () { return false; }), larg: innerWidth,
      punti: box.map(function (b) { return vert ? b.y + 30 : b.x + b.w / 2; }),
      a: vert ? box[0].y + 10 : 0, b: vert ? ult.y + ult.h - 20 : row.offsetWidth };
  }
  function meta() {
    var r = st.row.getBoundingClientRect(), H = innerHeight;
    if (st.vert) return Math.max(st.a, Math.min(st.b, H * .45 - r.top));
    if (aScatti()) return (r.top < H * .8 && r.bottom > H * .25) ? st.b : st.a;   // sezione arrivata: tutte, altrimenti nessuna
    return st.a + (st.b - st.a) * Math.max(0, Math.min(1, (H * .85 - r.top) / (H * .48)));
  }
  function disegna(v) {
    st.punti.forEach(function (q, j) {
      var acc = q <= v + .5;
      if (acc !== st.accese[j]) { st.accese[j] = acc; st.carte[j].classList.toggle('ml-acceso', acc); }
    });
  }
  function passo(t) {
    giro = 0; if (!pronto()) { prima = 0; return; }
    var m = meta(), dt = prima ? Math.min(64, t - prima) : 16, corsa = st.b - st.a; prima = t;
    if (ora == null) ora = aScatti() && !st.vert ? st.a : m;
    if (aScatti() && !st.vert) ora = m > ora ? Math.min(m, ora + corsa * dt / 2100) : Math.max(m, ora - corsa * dt / 600);   // si accendono in 2,1 s, si spengono in 0,6 s
    else ora += (m - ora) * (DITO ? 1 : .22);
    disegna(ora);
    if (Math.abs(m - ora) > .5) giro = requestAnimationFrame(passo); else { if (ora !== m) { ora = m; disegna(ora); } prima = 0; }
  }
  function pronto() {
    var row = document.querySelector('#from-vision .ic-process-row');
    if (!row) return false;
    if (!st || st.row !== row || !row.isConnected) { st = costruisci(row); ora = null; }
    return !!st;
  }
  function chiedi() { if (!giro) giro = requestAnimationFrame(passo); }
  function rifai() { st = null; chiedi(); }

  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', function () { if (st && st.larg !== innerWidth) rifai(); });
  addEventListener('load', rifai);
  // la pagina viene ridisegnata dopo il caricamento: per i primi secondi si ricontrolla che le schede siano quelle giuste
  var n = 0, t = setInterval(function () { chiedi(); if (++n >= 24) clearInterval(t); }, 500);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rifai);
  chiedi();
})();
