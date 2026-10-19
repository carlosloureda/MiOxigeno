(function () {
  'use strict';

  // ---- Configuración (editable) ----
  var ACTIVIDADES = ['Durmiendo', 'Tumbada', 'Sentada', 'WC', 'Transporte'];
  var FUENTES = ['Concentrador', 'Portátil', 'Bombona', 'Arturito'];
  var STORAGE_KEY = 'oxi.v1';
  var LIMITS = {
    spo2: { min: 50, max: 100 },
    pulso: { min: 30, max: 220 },
    flujo: { min: 0, max: 15 }
  };

  // ---- Estado ----
  var records = load();
  var editingId = null;
  var form = {
    actividad: 'Sentada',
    fuente: FUENTES[0],
    spo2: 94,
    pulso: 80,
    flujo: 2
  };

  // ---- Utilidades ----
  function $(id) { return document.getElementById(id); }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (e) {
      showMsg('No se pudo guardar en el móvil. Exporta tus datos.', false);
      return false;
    }
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Lo mismo, como texto HTML (para las tarjetas de lectura de la gráfica).
  function actDotHtml(nombre) {
    return '<i class="dot" style="background:' + (ACT_COL[nombre] || '#888780') + '"></i>';
  }

  // Punto del color de la actividad (el mismo en botones, lista y leyenda de la gráfica).
  function actDot(nombre) {
    var d = document.createElement('i');
    d.className = 'dot';
    d.style.background = ACT_COL[nombre] || '#888780';
    return d;
  }

  function toLocalInput(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  function fmtTime(iso) {
    var d = new Date(iso);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtNum(n) {
    return String(n).replace('.', ',');
  }

  function clamp(v, lim) {
    return Math.min(lim.max, Math.max(lim.min, v));
  }

  function sorted() {
    return records.slice().sort(function (a, b) {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }

  var msgTimer = null;
  function showMsg(text, ok) {
    var el = $('msg');
    el.textContent = text;
    el.className = 'msg' + (ok ? ' ok' : '');
    clearTimeout(msgTimer);
    if (text) msgTimer = setTimeout(function () { el.textContent = ''; el.className = 'msg'; }, 3500);
  }

  // ---- Pestañas ----
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (s) {
      s.classList.toggle('active', s.id === 'tab-' + name);
    });
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    if (name === 'grafica') renderChart();
    if (name === 'datos') renderList();
    window.scrollTo(0, 0);
  }

  // ---- Formulario ----
  function buildChoices(containerId, options, key) {
    var c = $(containerId);
    c.innerHTML = '';
    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt;
      if (key === 'actividad') b.insertBefore(actDot(opt), b.firstChild);
      b.addEventListener('click', function () {
        form[key] = opt;
        paintChoices();
      });
      c.appendChild(b);
    });
  }

  function paintChoices() {
    [['f-actividad', 'actividad'], ['f-fuente', 'fuente']].forEach(function (p) {
      $(p[0]).querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.textContent === form[p[1]]));
      });
    });
  }

  function paintValues() {
    $('v-spo2').textContent = fmtNum(form.spo2);
    $('v-pulso').textContent = fmtNum(form.pulso);
    $('v-flujo').textContent = fmtNum(form.flujo);
  }

  function resetForm() {
    editingId = null;
    var last = sorted().pop();
    if (last) {
      form.actividad = last.actividad;
      form.fuente = last.fuente;
      form.spo2 = last.spo2;
      form.pulso = last.pulso;
      form.flujo = last.flujo;
    }
    $('f-fecha').value = toLocalInput(new Date());
    $('f-nota').value = '';
    $('form-title').textContent = 'Nueva medición';
    $('btn-guardar').textContent = 'Guardar';
    $('btn-cancelar').hidden = true;
    paintChoices();
    paintValues();
  }

  function startEdit(id) {
    var r = records.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    editingId = id;
    form.actividad = r.actividad;
    form.fuente = r.fuente;
    form.spo2 = r.spo2;
    form.pulso = r.pulso;
    form.flujo = r.flujo;
    $('f-fecha').value = toLocalInput(new Date(r.timestamp));
    $('f-nota').value = r.nota || '';
    $('form-title').textContent = 'Editar medición';
    $('btn-guardar').textContent = 'Guardar cambios';
    $('btn-cancelar').hidden = false;
    paintChoices();
    paintValues();
    showTab('anotar');
  }

  function submitForm() {
    var fecha = $('f-fecha').value;
    var d = fecha ? new Date(fecha) : new Date();
    if (isNaN(d.getTime())) d = new Date();

    var rec = {
      id: editingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      timestamp: d.toISOString(),
      spo2: form.spo2,
      pulso: form.pulso,
      actividad: form.actividad,
      flujo: form.flujo,
      fuente: form.fuente,
      nota: $('f-nota').value.trim()
    };

    if (editingId) {
      records = records.map(function (r) { return r.id === editingId ? rec : r; });
    } else {
      records.push(rec);
    }

    if (save()) {
      var wasEditing = !!editingId;
      resetForm();
      showMsg(wasEditing ? 'Cambios guardados' : 'Guardado ✔', true);
    }
  }

  // ---- Lista ----
  function renderList() {
    var ul = $('lista');
    ul.innerHTML = '';
    var data = sorted().reverse();
    $('vacio').hidden = data.length > 0;

    data.forEach(function (r) {
      var li = document.createElement('li');

      var top = document.createElement('div');
      top.className = 'top';
      var when = document.createElement('span');
      when.textContent = fmtDate(r.timestamp) + ' · ' + fmtTime(r.timestamp);
      var act = document.createElement('span');
      act.className = 'act';
      act.textContent = r.actividad;
      act.insertBefore(actDot(r.actividad), act.firstChild);
      top.appendChild(when);
      top.appendChild(act);

      var vals = document.createElement('div');
      vals.className = 'vals';
      vals.textContent = 'SpO2 ' + r.spo2 + '%  ·  ' + r.pulso + ' lpm';

      var meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = fmtNum(r.flujo) + ' L/min · ' + r.fuente + (r.nota ? ' · ' + r.nota : '');

      var actions = document.createElement('div');
      actions.className = 'row-actions';
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Editar';
      edit.addEventListener('click', function () { startEdit(r.id); });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'del';
      del.textContent = 'Borrar';
      del.addEventListener('click', function () {
        if (confirm('¿Borrar esta medición?')) {
          records = records.filter(function (x) { return x.id !== r.id; });
          save();
          renderList();
        }
      });
      actions.appendChild(edit);
      actions.appendChild(del);

      li.appendChild(top);
      li.appendChild(vals);
      li.appendChild(meta);
      li.appendChild(actions);
      ul.appendChild(li);
    });
  }

  // ---- Gráfica (SVG propio, sin dependencias) ----
  // Dos vistas: básica (una gráfica de SpO2 y la última medición) y avanzada (SpO2, pulso y flujo
  // apiladas, con filtros y cursor compartido).
  var ACT_COL = { Durmiendo: '#7F77DD', Tumbada: '#1D9E75', Sentada: '#888780', WC: '#D85A30', Transporte: '#BA7517' };
  var METRICAS = {
    spo2: { nombre: 'SpO2', unidad: '%' },
    pulso: { nombre: 'Pulso', unidad: 'lpm' },
    flujo: { nombre: 'Flujo', unidad: 'L/min' }
  };
  var MODO_KEY = 'oxi.modo';
  var modo = loadModo();

  function loadModo() {
    try { return localStorage.getItem(MODO_KEY) === 'avanzada' ? 'avanzada' : 'basica'; } catch (e) { return 'basica'; }
  }

  function setModo(m) {
    modo = m;
    try { localStorage.setItem(MODO_KEY, m); } catch (e) {}
    renderChart();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fillSelect(id, options) {
    var s = $(id);
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      s.appendChild(opt);
    });
  }

  function pick(days, act, fue) {
    var since = days ? Date.now() - days * 86400000 : 0;
    return sorted().filter(function (r) {
      return new Date(r.timestamp).getTime() >= since &&
        (!act || r.actividad === act) &&
        (!fue || r.fuente === fue);
    });
  }

  function filtered() {
    return pick(parseInt($('g-rango').value, 10), $('g-actividad').value, $('g-fuente').value);
  }

  function fmtVal(v, m) {
    return m === 'flujo' ? fmtNum(Math.round(v * 10) / 10) : String(Math.round(v));
  }

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  // Agrupa por día: mínimo, máximo y media (para periodos largos, donde un punto por medición se amontona).
  function dailyAgg(data, m) {
    var map = {}, order = [];
    data.forEach(function (r) {
      var d = new Date(r.timestamp);
      var key = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      if (!map[key]) {
        map[key] = { t: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12), vals: [] };
        order.push(key);
      }
      map[key].vals.push(r[m]);
    });
    return order.map(function (k) {
      var v = map[k].vals;
      return {
        t: map[k].t,
        min: Math.min.apply(null, v),
        max: Math.max.apply(null, v),
        avg: v.reduce(function (a, b) { return a + b; }, 0) / v.length
      };
    });
  }

  // Devuelve el SVG (como texto) y lo necesario para el cursor: posiciones X y elementos dibujados.
  function buildChart(data, m, days, W, H, showX, byAct) {
    var L = 34, R = 8, T = 8, B = showX ? 22 : 8;
    var pw = W - L - R, ph = H - T - B;
    var t1 = Date.now();
    var t0 = days ? t1 - days * 86400000 : Math.min.apply(null, data.map(function (r) { return new Date(r.timestamp).getTime(); }));
    if (t1 - t0 < 3600000) t0 = t1 - 3600000;
    var span = t1 - t0;
    var daily = span > 10 * 86400000;
    var items = daily ? dailyAgg(data, m) : data;
    var vals = daily
      ? items.reduce(function (a, d) { return a.concat([d.min, d.max]); }, [])
      : items.map(function (r) { return r[m]; });

    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (m === 'spo2') { hi = Math.min(100, hi + 1); lo = lo - 1; }
    else if (m === 'flujo') { hi = hi + 1; lo = Math.max(0, lo - 1); }
    else { hi = hi + 4; lo = lo - 4; }
    lo = Math.floor(lo);
    hi = Math.ceil(hi);
    if (hi <= lo) hi = lo + 1;
    if ((hi - lo) % 2) { if (m === 'spo2' && hi >= 100) lo--; else hi++; }

    function X(t) { return L + (t - t0) / span * pw; }
    function Y(v) { return T + (hi - v) / (hi - lo) * ph; }

    var cGrid = cssVar('--border', '#ccc'), cText = cssVar('--muted', '#666'), cAcc = cssVar('--accent', '#0b5c8a');
    var s = '', i;

    for (i = 0; i <= 2; i++) {
      var gv = lo + (hi - lo) * i / 2, gy = Y(gv);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + cGrid + '" stroke-width="1"/>';
      s += '<text x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="13" fill="' + cText + '">' + fmtVal(gv, m) + '</text>';
    }

    if (showX) {
      for (i = 0; i <= 3; i++) {
        var tt = t0 + span * i / 3, d = new Date(tt);
        var label = span <= 2 * 86400000
          ? pad(d.getHours()) + ':' + pad(d.getMinutes())
          : pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
        s += '<text x="' + X(tt) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : (i === 3 ? 'end' : 'middle')) +
          '" font-size="13" fill="' + cText + '">' + label + '</text>';
      }
    }

    var xs = [];
    if (daily) {
      items.forEach(function (d) {
        var x = Math.min(X(t1), Math.max(L, X(d.t.getTime())));
        xs.push(x);
        s += '<line x1="' + x + '" x2="' + x + '" y1="' + Y(d.min) + '" y2="' + Y(d.max) + '" stroke="' + cAcc + '" stroke-width="6" stroke-linecap="round" opacity="0.35"/>';
        s += '<circle cx="' + x + '" cy="' + Y(d.avg) + '" r="3" fill="' + cAcc + '"/>';
      });
    } else {
      s += '<path d="' + items.map(function (r, j) {
        return (j ? 'L' : 'M') + X(new Date(r.timestamp).getTime()) + ' ' + Y(r[m]);
      }).join(' ') + '" fill="none" stroke="' + cText + '" stroke-width="1.5" opacity="0.6"/>';
      var rad = span <= 2 * 86400000 ? 5 : 4;
      items.forEach(function (r) {
        var x = X(new Date(r.timestamp).getTime());
        xs.push(x);
        s += '<circle cx="' + x + '" cy="' + Y(r[m]) + '" r="' + rad + '" fill="' + (byAct ? (ACT_COL[r.actividad] || '#888780') : cAcc) + '"/>';
      });
    }

    s += '<line class="cur" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="' + cssVar('--text', '#14212b') + '" stroke-width="1.5" opacity="0"/>';
    return {
      html: '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Gráfica de ' + METRICAS[m].nombre + '">' + s + '</svg>',
      xs: xs, items: items, daily: daily, W: W
    };
  }

  // Cursor compartido: al tocar o arrastrar sobre una gráfica se mueve en todas.
  function attachScrub(charts, onMove, onLeave) {
    var svgs = charts.map(function (c) { return c.box.querySelector('svg'); });
    function hide() {
      svgs.forEach(function (sv) { sv.querySelector('.cur').setAttribute('opacity', '0'); });
      onLeave();
    }
    charts.forEach(function (c, j) {
      var sv = svgs[j];
      function move(e) {
        var r = sv.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width * c.ch.W, bi = 0, bd = Infinity;
        c.ch.xs.forEach(function (px, q) {
          var dd = Math.abs(px - x);
          if (dd < bd) { bd = dd; bi = q; }
        });
        svgs.forEach(function (s2, q) {
          var cur = s2.querySelector('.cur'), px = charts[q].ch.xs[bi];
          cur.setAttribute('x1', px);
          cur.setAttribute('x2', px);
          cur.setAttribute('opacity', '0.7');
        });
        onMove(bi);
      }
      sv.addEventListener('pointermove', move);
      sv.addEventListener('pointerdown', move);
      sv.addEventListener('pointerleave', hide);
      sv.addEventListener('pointercancel', hide);
    });
  }

  function lecturaHtml(r, titulo) {
    return '<div class="t">' + titulo + ' · ' + fmtDate(r.timestamp) + ' ' + fmtTime(r.timestamp) + ' · ' + actDotHtml(r.actividad) + esc(r.actividad) +
      '</div><div class="v">' + r.spo2 + ' <small>% · ' + r.pulso + ' lpm</small></div>';
  }

  function diarioHtml(d, m) {
    return '<div class="t">' + d.t.getDate() + '/' + (d.t.getMonth() + 1) + ' · media del día</div><div class="v">' +
      fmtVal(d.avg, m) + ' <small>' + METRICAS[m].unidad + ' · de ' + fmtVal(d.min, m) + ' a ' + fmtVal(d.max, m) + '</small></div>';
  }

  function renderStats(data) {
    var stats = $('stats');
    stats.innerHTML = '';
    if (!data.length) return;
    var spo = data.map(function (r) { return r.spo2; });
    var avg = spo.reduce(function (a, b) { return a + b; }, 0) / spo.length;
    [
      [Math.min.apply(null, spo) + '%', 'SpO2 mínima'],
      [avg.toFixed(1).replace('.', ',') + '%', 'SpO2 media'],
      [String(data.length), 'Mediciones']
    ].forEach(function (s) {
      var div = document.createElement('div');
      var b = document.createElement('b');
      b.textContent = s[0];
      var sm = document.createElement('small');
      sm.textContent = s[1];
      div.appendChild(b);
      div.appendChild(sm);
      stats.appendChild(div);
    });
  }

  // Vista básica: lo mismo que ya había (SpO2 y pulso, con los mismos filtros y estadísticas), más limpio.
  function renderBasica() {
    var data = filtered(), days = parseInt($('g-rango').value, 10);
    var card = $('b-lectura'), keys = ['spo2', 'pulso'];
    keys.forEach(function (k) { $('chart-b-' + k).innerHTML = ''; });
    $('stats').innerHTML = '';

    if (!data.length) {
      card.innerHTML = '<div class="empty">' + (records.length ? 'No hay datos con estos filtros.' : 'Todavía no hay mediciones.') + '</div>';
      return;
    }

    var last = data[data.length - 1];
    function ultima() { card.innerHTML = lecturaHtml(last, 'Última medición'); }
    ultima();

    var charts = keys.map(function (k) {
      var box = $('chart-b-' + k), W = Math.max(280, box.clientWidth - 16);
      var ch = buildChart(data, k, days, W, k === 'pulso' ? 160 : 180, k === 'pulso', false);
      box.innerHTML = ch.html;
      return { box: box, ch: ch, k: k };
    });
    var daily = charts[0].ch.daily;
    attachScrub(charts, function (bi) {
      card.innerHTML = daily ? diarioHtml(charts[0].ch.items[bi], 'spo2') : lecturaHtml(charts[0].ch.items[bi], 'Medición');
    }, ultima);
    renderStats(data);
  }

  function renderAvanzada() {
    var data = filtered(), days = parseInt($('g-rango').value, 10);
    var ro = $('a-lectura'), keys = ['spo2', 'pulso', 'flujo'];
    keys.forEach(function (k) { $('chart-a-' + k).innerHTML = ''; });
    $('a-leyenda').innerHTML = '';

    if (!data.length) {
      ro.innerHTML = '<div class="empty">No hay datos con estos filtros.</div>';
      return;
    }

    var charts = keys.map(function (k) {
      var box = $('chart-a-' + k), W = Math.max(280, box.clientWidth - 16);
      var ch = buildChart(data, k, days, W, k === 'flujo' ? 140 : 116, k === 'flujo', true);
      box.innerHTML = ch.html;
      return { box: box, ch: ch, k: k };
    });
    var daily = charts[0].ch.daily;

    function trio(titulo, celdas) {
      return '<div class="t">' + titulo + '</div><div class="c">' + celdas.map(function (c) {
        return '<div>' + c.n + '<b>' + c.v + '</b>' + c.sub + '</div>';
      }).join('') + '</div>';
    }
    function resumen() {
      ro.innerHTML = trio('Media del periodo · ' + data.length + ' mediciones', charts.map(function (c) {
        var v = data.map(function (r) { return r[c.k]; });
        var a = v.reduce(function (x, y) { return x + y; }, 0) / v.length;
        return { n: METRICAS[c.k].nombre, v: fmtVal(a, c.k), sub: fmtVal(Math.min.apply(null, v), c.k) + ' a ' + fmtVal(Math.max.apply(null, v), c.k) };
      }));
    }
    resumen();

    $('a-leyenda').innerHTML = daily
      ? '<span><i style="background:var(--accent);opacity:.5"></i>Barra: rango del día · punto: media</span>'
      : ACTIVIDADES.map(function (a) {
        return '<span><i style="background:' + (ACT_COL[a] || '#888780') + '"></i>' + esc(a) + '</span>';
      }).join('');

    attachScrub(charts, function (bi) {
      if (daily) {
        var d0 = charts[0].ch.items[bi];
        ro.innerHTML = trio(d0.t.getDate() + '/' + (d0.t.getMonth() + 1) + ' · media del día', charts.map(function (c) {
          var d = c.ch.items[bi];
          return { n: METRICAS[c.k].nombre, v: fmtVal(d.avg, c.k), sub: fmtVal(d.min, c.k) + ' a ' + fmtVal(d.max, c.k) };
        }));
      } else {
        var r = charts[0].ch.items[bi];
        ro.innerHTML = trio(fmtDate(r.timestamp) + ' ' + fmtTime(r.timestamp) + ' · ' + actDotHtml(r.actividad) + esc(r.actividad) + ' · ' + esc(r.fuente), charts.map(function (c) {
          return { n: METRICAS[c.k].nombre, v: fmtVal(r[c.k], c.k), sub: METRICAS[c.k].unidad };
        }));
      }
    }, resumen);
  }

  function renderChart() {
    $('modo-basica').setAttribute('aria-pressed', String(modo === 'basica'));
    $('modo-avanzada').setAttribute('aria-pressed', String(modo === 'avanzada'));
    $('g-basica').hidden = modo !== 'basica';
    $('g-avanzada').hidden = modo !== 'avanzada';
    if (modo === 'basica') renderBasica(); else renderAvanzada();
  }

  // ---- Exportar / compartir ----
  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function buildCsv() {
    var rows = [['fecha', 'hora', 'spo2', 'pulso', 'actividad', 'flujo_l_min', 'fuente', 'nota']];
    sorted().forEach(function (r) {
      rows.push([fmtDate(r.timestamp), fmtTime(r.timestamp), r.spo2, r.pulso,
        r.actividad, fmtNum(r.flujo), r.fuente, r.nota || '']);
    });
    return '﻿' + rows.map(function (row) {
      return row.map(csvEscape).join(';');
    }).join('\r\n');
  }

  function csvFile() {
    var d = new Date();
    var name = 'oxigeno-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.csv';
    return new File([buildCsv()], name, { type: 'text/csv' });
  }

  function downloadCsv() {
    if (records.length === 0) { alert('No hay datos que exportar.'); return; }
    var f = csvFile();
    var url = URL.createObjectURL(f);
    var a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function shareCsv() {
    if (records.length === 0) { alert('No hay datos que compartir.'); return; }
    var f = csvFile();
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      navigator.share({ files: [f], title: 'Mediciones de oxígeno' }).catch(function (e) {
        if (e && e.name !== 'AbortError') downloadCsv();
      });
    } else {
      downloadCsv();
    }
  }

  // ---- Arranque ----
  function init() {
    buildChoices('f-actividad', ACTIVIDADES, 'actividad');
    buildChoices('f-fuente', FUENTES, 'fuente');
    fillSelect('g-actividad', ACTIVIDADES);
    fillSelect('g-fuente', FUENTES);

    document.querySelectorAll('.stepper').forEach(function (st) {
      var field = st.dataset.field;
      var step = parseFloat(st.dataset.step);
      st.querySelector('.minus').addEventListener('click', function () {
        form[field] = clamp(Math.round((form[field] - step) * 10) / 10, LIMITS[field]);
        paintValues();
      });
      st.querySelector('.plus').addEventListener('click', function () {
        form[field] = clamp(Math.round((form[field] + step) * 10) / 10, LIMITS[field]);
        paintValues();
      });
    });

    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () { showTab(b.dataset.tab); });
    });

    ['g-rango', 'g-actividad', 'g-fuente'].forEach(function (id) {
      $(id).addEventListener('change', renderChart);
    });
    $('modo-basica').addEventListener('click', function () { setModo('basica'); });
    $('modo-avanzada').addEventListener('click', function () { setModo('avanzada'); });
    window.addEventListener('resize', function () {
      if ($('tab-grafica').classList.contains('active')) renderChart();
    });

    $('btn-guardar').addEventListener('click', submitForm);
    $('btn-cancelar').addEventListener('click', function () { resetForm(); showMsg('', false); });
    $('btn-csv').addEventListener('click', downloadCsv);
    $('btn-share').addEventListener('click', shareCsv);

    resetForm();

    $('version').textContent = 'v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?');
    registerServiceWorker();
  }

  // ---- Actualizaciones ----
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

    var updateRequested = false;

    // Recargar solo si ha sido ella quien ha pulsado Actualizar (nunca por sorpresa).
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (updateRequested) { updateRequested = false; location.reload(); }
    });

    function offerUpdate(worker) {
      $('update-banner').hidden = false;
      $('btn-update').onclick = function () {
        updateRequested = true;
        worker.postMessage('SKIP_WAITING');
      };
    }

    // updateViaCache:'none' => al buscar actualizaciones, tampoco se fía de la caché HTTP
    // para version.js (importado por sw.js); si no, podría no detectar la versión nueva.
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw);
        });
      });
      // Comprobar de vez en cuando por si la app se queda abierta mucho tiempo.
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
    }).catch(function () {});
  }

  init();
})();
