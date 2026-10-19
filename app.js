(function () {
  'use strict';

  // ---- Configuración (editable) ----
  var ACTIVIDADES = ['Durmiendo', 'Sentada', 'WC', 'Transporte'];
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
    actividad: ACTIVIDADES[1],
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
      act.textContent = r.actividad;
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
  function fillSelect(id, options) {
    var s = $(id);
    options.forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      s.appendChild(opt);
    });
  }

  function filtered() {
    var days = parseInt($('g-rango').value, 10);
    var act = $('g-actividad').value;
    var fue = $('g-fuente').value;
    var since = days ? Date.now() - days * 86400000 : 0;
    return sorted().filter(function (r) {
      return new Date(r.timestamp).getTime() >= since &&
        (!act || r.actividad === act) &&
        (!fue || r.fuente === fue);
    });
  }

  function svgEl(name, attrs, text) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  function renderChart() {
    var host = $('chart');
    var stats = $('stats');
    host.innerHTML = '';
    stats.innerHTML = '';
    var data = filtered();

    if (data.length === 0) {
      var p = document.createElement('div');
      p.className = 'empty';
      p.textContent = 'No hay datos en este periodo.';
      host.appendChild(p);
      return;
    }

    // Ancho real del contenedor, para que las etiquetas no se escalen.
    var W = Math.max(280, host.clientWidth - 16), H = Math.round(W * 0.85);
    var L = 38, R = 38, T = 16, B = 36;
    var pw = W - L - R, ph = H - T - B;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img' });

    var times = data.map(function (r) { return new Date(r.timestamp).getTime(); });
    var tMin = Math.min.apply(null, times), tMax = Math.max.apply(null, times);
    if (tMin === tMax) { tMin -= 3600000; tMax += 3600000; }

    var sMin = Math.min(90, Math.min.apply(null, data.map(function (r) { return r.spo2; })) - 2);
    var sMax = 100;
    var pMin = Math.min.apply(null, data.map(function (r) { return r.pulso; }));
    var pMax = Math.max.apply(null, data.map(function (r) { return r.pulso; }));
    pMin = Math.floor((pMin - 5) / 5) * 5;
    pMax = Math.ceil((pMax + 5) / 5) * 5;

    function x(t) { return L + (t - tMin) / (tMax - tMin) * pw; }
    function ys(v) { return T + (sMax - v) / (sMax - sMin) * ph; }
    function yp(v) { return T + (pMax - v) / (pMax - pMin) * ph; }

    var style = getComputedStyle(document.documentElement);
    var cSpo2 = style.getPropertyValue('--spo2').trim() || '#0b7a3b';
    var cPulso = style.getPropertyValue('--pulso').trim() || '#c0392b';
    var cGrid = style.getPropertyValue('--border').trim() || '#ccc';
    var cText = style.getPropertyValue('--muted').trim() || '#666';

    // rejilla y ejes
    var i, steps = 5;
    for (i = 0; i <= steps; i++) {
      var gy = T + ph * i / steps;
      svg.appendChild(svgEl('line', { x1: L, x2: W - R, y1: gy, y2: gy, stroke: cGrid, 'stroke-width': 1 }));
      var sv = Math.round(sMax - (sMax - sMin) * i / steps);
      var pv = Math.round(pMax - (pMax - pMin) * i / steps);
      svg.appendChild(svgEl('text', { x: L - 6, y: gy + 4, 'text-anchor': 'end', fill: cSpo2, 'font-size': 13 }, sv));
      svg.appendChild(svgEl('text', { x: W - R + 6, y: gy + 4, 'text-anchor': 'start', fill: cPulso, 'font-size': 13 }, pv));
    }

    // etiquetas de tiempo
    var span = tMax - tMin;
    for (i = 0; i <= 3; i++) {
      var tt = tMin + span * i / 3;
      var d = new Date(tt);
      var label = span > 2 * 86400000
        ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1)
        : pad(d.getHours()) + ':' + pad(d.getMinutes());
      svg.appendChild(svgEl('text', {
        x: x(tt), y: H - 14,
        'text-anchor': i === 0 ? 'start' : (i === 3 ? 'end' : 'middle'),
        fill: cText, 'font-size': 13
      }, label));
    }

    function line(vals, fy, color) {
      var pts = data.map(function (r, idx) {
        return x(times[idx]).toFixed(1) + ',' + fy(vals(r)).toFixed(1);
      });
      if (pts.length > 1) {
        svg.appendChild(svgEl('polyline', {
          points: pts.join(' '), fill: 'none', stroke: color,
          'stroke-width': 3, 'stroke-linejoin': 'round'
        }));
      }
      data.forEach(function (r, idx) {
        var c = svgEl('circle', { cx: x(times[idx]), cy: fy(vals(r)), r: 5, fill: color });
        var t = svgEl('title', {}, fmtDate(r.timestamp) + ' ' + fmtTime(r.timestamp) + ' · ' + vals(r));
        c.appendChild(t);
        svg.appendChild(c);
      });
    }

    line(function (r) { return r.spo2; }, ys, cSpo2);
    line(function (r) { return r.pulso; }, yp, cPulso);
    host.appendChild(svg);

    // estadísticas
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
    window.addEventListener('resize', function () {
      if ($('tab-grafica').classList.contains('active')) renderChart();
    });

    $('btn-guardar').addEventListener('click', submitForm);
    $('btn-cancelar').addEventListener('click', function () { resetForm(); showMsg('', false); });
    $('btn-csv').addEventListener('click', downloadCsv);
    $('btn-share').addEventListener('click', shareCsv);

    resetForm();

    $('version').textContent = 'Mi Oxígeno v' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?');
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

    navigator.serviceWorker.register('sw.js').then(function (reg) {
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
