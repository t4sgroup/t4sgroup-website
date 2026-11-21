// Il metodo T4S: una linea di luce passa sopra le quattro fasi (Define, Design, Develop, Deliver) e le accende una
// dopo l'altra mentre si scorre, nei due versi: la stessa luce dei percorsi del redesign. Sul computer la linea è un
// festone che tocca ogni scheda al centro del bordo alto; sul telefono, dove le schede stanno una sotto l'altra, è
// verticale, a sinistra. Su Safari il tratteggio che cambia lascia pezzi accesi: la parte accesa è quindi una linea a
// sé, ridisegnata fino alla testa. Col dito la luce segue lo scorrimento esatto. Sul computer il sito scorre una
// sezione alla volta (scroll-snap): lì la luce parte quando la sezione è arrivata e percorre le fasi in due secondi
// circa; uscendo si ritira, tornando riparte.
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var DITO = matchMedia('(hover: none)').matches, NS = 'http://www.w3.org/2000/svg', st = null, giro = 0, ora = null, prima = 0;
  function aScatti() { return /mandatory/.test(getComputedStyle(document.documentElement).scrollSnapType || ''); }

  function stile() {
    if (document.getElementById('ml-stile')) return;
    var s = document.createElement('style'); s.id = 'ml-stile';
    s.textContent =
      '.ic-process-row.ml-on{position:relative;z-index:0}' +
      '.ic-process-row>.ml-svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:2;transform:none;justify-self:auto}' +   // il sito ruota le frecce della fila: la linea no
      '.ml-on .ic-card{transition:border-color .5s ease,background .5s ease,box-shadow .6s ease}' +
      '.ml-on .ic-card .ic-card-content{transition:opacity .5s ease}' +
      '.ml-on .ic-card:not(.ml-acceso) .ic-card-content{opacity:.45}' +
      '.ml-on .ic-card.ml-acceso{border-color:rgba(226,100,27,.55);background:linear-gradient(180deg,rgba(226,100,27,.09),rgba(110,52,14,.04) 60%,rgba(0,0,0,0));box-shadow:0 18px 60px -24px rgba(226,100,27,.45)}' +
      '.ml-nodo{fill:#141110;stroke:rgba(255,255,255,.28);stroke-width:1.5;transition:fill .4s,stroke .4s}' +
      '.ml-nodo.ml-acceso{fill:#e2641b;stroke:rgba(255,205,155,.9)}' +
      '.ml-onda{fill:none;stroke:#e2641b;stroke-width:2;opacity:0;transform-box:fill-box;transform-origin:center}' +
      '.ml-onda.ml-via{animation:ml-onda 1s ease-out forwards}' +
      '@keyframes ml-onda{from{transform:scale(1);opacity:.9}to{transform:scale(4.5);opacity:0}}';
    document.head.appendChild(s);
  }
  function el(nome, attr, padre) { var e = document.createElementNS(NS, nome); for (var k in attr) e.setAttribute(k, attr[k]); if (padre) padre.appendChild(e); return e; }
  function posizione(e, row) { var x = 0, y = 0; while (e && e !== row) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return e === row ? [x, y] : null; }

  // costruisce linea, nodi e luce dentro la fila delle quattro schede
  function costruisci(row) {
    var carte = [].slice.call(row.querySelectorAll('.ic-card')); if (carte.length < 2) return null;
    stile(); row.classList.add('ml-on');
    var vecchio = row.querySelector(':scope > .ml-svg'); if (vecchio) vecchio.remove();
    var box = carte.map(function (c) { var p = posizione(c, row); return p && { x: p[0], y: p[1], w: c.offsetWidth, h: c.offsetHeight }; });
    if (box.some(function (b) { return !b; })) return null;
    var vert = box[1].y > box[0].y + box[0].h / 2, punti = [], nodi;
    if (vert) {
      var lx = -12, y0 = box[0].y + 10, y1 = box[box.length - 1].y + box[box.length - 1].h - 20;
      nodi = box.map(function (b) { return [lx, b.y + 30]; });
      for (var y = y0; y <= y1; y += 6) punti.push([lx, y]);
    } else {
      var A = 22, top = Math.min.apply(null, box.map(function (b) { return b.y; })), W = row.offsetWidth, anc = [[0, top - A]];
      nodi = box.map(function (b) { return [b.x + b.w / 2, top]; });
      nodi.forEach(function (n, i) { anc.push(n); anc.push(i < nodi.length - 1 ? [(n[0] + nodi[i + 1][0]) / 2, top - A] : [W, top - A]); });
      for (var x = 0; x <= W; x += 4) {
        var k = 0; while (k < anc.length - 2 && anc[k + 1][0] < x) k++;
        var a = anc[k], b = anc[k + 1], t = Math.max(0, Math.min(1, (x - a[0]) / (b[0] - a[0])));
        punti.push([x, a[1] + (b[1] - a[1]) * (1 - Math.cos(Math.PI * t)) / 2]);
      }
    }
    var svg = el('svg', { class: 'ml-svg', width: row.offsetWidth, height: row.offsetHeight, 'aria-hidden': 'true' });
    var defs = el('defs', {}, svg), g = el('radialGradient', { id: 'ml-sfuma' }, defs);
    el('stop', { offset: '0', 'stop-color': '#f69a4c', 'stop-opacity': '.95' }, g); el('stop', { offset: '.3', 'stop-color': '#e2641b', 'stop-opacity': '.5' }, g); el('stop', { offset: '1', 'stop-color': '#e2641b', 'stop-opacity': '0' }, g);
    if (!DITO) { var f = el('filter', { id: 'ml-bagliore', filterUnits: 'userSpaceOnUse', x: -200, y: -200, width: row.offsetWidth + 400, height: row.offsetHeight + 400 }, defs); el('feGaussianBlur', { stdDeviation: 5 }, f); }
    var d = 'M' + punti.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    el('path', { d: d, fill: 'none', stroke: 'rgba(255,255,255,.14)', 'stroke-width': 1.5 }, svg);
    var alone = el('path', DITO ? { fill: 'none', stroke: '#e2641b', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .22 } : { fill: 'none', stroke: '#e2641b', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: .5, filter: 'url(#ml-bagliore)' }, svg);
    var luce = el('path', { fill: 'none', stroke: '#e2641b', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, svg);
    var cerchi = nodi.map(function (n) { var o = el('circle', { class: 'ml-onda', cx: n[0], cy: n[1], r: 7 }, svg); var c = el('circle', { class: 'ml-nodo', cx: n[0], cy: n[1], r: 7 }, svg); return [c, o]; });
    var aloneT = el('circle', { r: 16, fill: 'url(#ml-sfuma)' }, svg), testa = el('circle', { r: 4.5, fill: '#fff3e0' }, svg);
    row.appendChild(svg);
    return { row: row, svg: svg, vert: vert, punti: punti, nodi: nodi, carte: carte, cerchi: cerchi, alone: alone, luce: luce, testa: testa, aloneT: aloneT, accesi: nodi.map(function () { return false; }), larg: innerWidth };
  }

  // dove deve stare la testa della luce, nella coordinata che avanza (x sul computer, y sul telefono)
  function meta() {
    var r = st.row.getBoundingClientRect(), H = innerHeight, p = st.punti, a = st.vert ? p[0][1] : p[0][0], b = st.vert ? p[p.length - 1][1] : p[p.length - 1][0];
    if (st.vert) return Math.max(a, Math.min(b, H * .45 - r.top));
    if (aScatti()) return (r.top < H * .8 && r.bottom > H * .25) ? b : a;   // sezione arrivata: tutta la corsa, altrimenti niente
    return a + (b - a) * Math.max(0, Math.min(1, (H * .85 - r.top) / (H * .48)));
  }
  function disegna(v) {
    var p = st.punti, i = st.vert ? 1 : 0, sel = [], ultimo = p[0];
    for (var k = 0; k < p.length && p[k][i] <= v; k++) { sel.push(p[k]); ultimo = p[k]; }
    var n = p[Math.min(p.length - 1, sel.length)], fine = ultimo;
    if (n && n[i] > ultimo[i]) { var t = (v - ultimo[i]) / (n[i] - ultimo[i]); fine = [ultimo[0] + (n[0] - ultimo[0]) * t, ultimo[1] + (n[1] - ultimo[1]) * t]; }
    var dA = sel.length ? 'M' + sel.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' L') + ' L' + fine[0].toFixed(1) + ' ' + fine[1].toFixed(1) : '';
    st.luce.setAttribute('d', dA); st.alone.setAttribute('d', dA);
    var vista = v > (st.vert ? p[0][1] : p[0][0]) + 2;
    [st.testa, st.aloneT].forEach(function (c) { c.setAttribute('cx', fine[0].toFixed(1)); c.setAttribute('cy', fine[1].toFixed(1)); c.style.display = vista ? '' : 'none'; });
    st.nodi.forEach(function (nd, j) {
      var acceso = nd[i] <= v + .5;
      if (acceso !== st.accesi[j]) {
        st.accesi[j] = acceso; st.cerchi[j][0].classList.toggle('ml-acceso', acceso); st.carte[j].classList.toggle('ml-acceso', acceso);
        var o = st.cerchi[j][1]; o.classList.remove('ml-via'); if (acceso) { void o.getBoundingClientRect(); o.classList.add('ml-via'); }
      }
    });
  }
  function passo(t) {
    giro = 0; if (!pronto()) { prima = 0; return; }
    var m = meta(), dt = prima ? Math.min(64, t - prima) : 16, p = st.punti, corsa = Math.abs(p[p.length - 1][0] - p[0][0]); prima = t;
    if (ora == null) ora = aScatti() && !st.vert ? p[0][0] : m;
    if (aScatti() && !st.vert) ora = m > ora ? Math.min(m, ora + corsa * dt / 2100) : Math.max(m, ora - corsa * dt / 600);   // va in 2,1 s, si ritira in 0,6 s
    else ora += (m - ora) * (DITO ? 1 : .22);
    disegna(ora);
    if (Math.abs(m - ora) > .5) giro = requestAnimationFrame(passo); else { if (ora !== m) { ora = m; disegna(ora); } prima = 0; }
  }
  function pronto() {
    var row = document.querySelector('#from-vision .ic-process-row');
    if (!row) return false;
    if (!st || st.row !== row || !st.svg.isConnected) { st = costruisci(row); ora = null; }
    return !!st;
  }
  function chiedi() { if (!giro) giro = requestAnimationFrame(passo); }
  function rifai() { if (st) { st.row.classList.remove('ml-on'); st = null; } chiedi(); }

  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', function () { if (st && st.larg !== innerWidth) rifai(); });
  addEventListener('load', rifai);
  // la pagina viene ridisegnata dopo il caricamento: per i primi secondi si ricontrolla che la luce ci sia ancora
  var n = 0, t = setInterval(function () { chiedi(); if (++n >= 24) clearInterval(t); }, 500);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rifai);
  chiedi();
})();
