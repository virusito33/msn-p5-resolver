(function () {
  "use strict";
  var DATA = window.QUIZ_DATA || [];
  var MAX = DATA.length;
  var $ = function (id) { return document.getElementById(id); };
  var input = $("num"), msg = $("msg"), quizEl = $("quiz");
  var current = null;

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Resaltado minimo de codigo Sage/Python (sobre texto ya escapado)
  var KW = "def|for|in|return|print|if|else|range|import|lambda|not|and|or";
  var FN = "var|vector|matrix|diff|abs|round|n|MDF|solve_right|append|sort|join";
  var TOKEN = new RegExp("(#.*$)|('[^'\\n]*')|\\b(" + KW + ")\\b|\\b(" + FN + ")(?=\\()|(\\b\\d+(?:\\.\\d+)?\\b)", "gm");
  function highlight(code) {
    return esc(code).replace(TOKEN, function (m, c, s, k, f, n) {
      if (c) return '<span class="tok-c">' + c + "</span>";
      if (s) return '<span class="tok-s">' + s + "</span>";
      if (k) return '<span class="tok-k">' + k + "</span>";
      if (f) return '<span class="tok-f">' + f + "</span>";
      return '<span class="tok-n">' + n + "</span>";
    });
  }

  function setMsg(text, isErr) {
    msg.textContent = text || "";
    msg.className = "msg" + (isErr ? " err" : "");
  }

  function parseNum(raw) {
    var s = String(raw).trim();
    if (s === "") return { err: "Introduce un número de cuestionario entre 1 y " + MAX + "." };
    if (!/^\d+$/.test(s)) return { err: "«" + s + "» no es un número entero válido. Usa solo dígitos (1 – " + MAX + ")." };
    var n = parseInt(s, 10);
    if (n < 1 || n > MAX) return { err: "El cuestionario " + n + " no existe. Los números válidos van del 1 al " + MAX + "." };
    return { n: n };
  }

  function partHtml(p) {
    var isImg = p.options.some(function (o) { return o.img; });
    var opts = p.options.map(function (o) {
      var body = o.img
        ? '<img src="img/' + o.img + '" alt="Gráfica de la opción ' + o.k + '" loading="lazy" width="250" height="250">'
        : '<span class="otext">' + o.html + "</span>";
      var cls = (p.alt && p.alt.length) ? (p.alt.indexOf(o.k) >= 0 ? " alt" : "") : (o.k === p.answer ? " correct" : "");
      return '<li class="opt' + cls + '"><span class="k">' + o.k + "</span>" + body + "</li>";
    }).join("");
    var correct = p.options.filter(function (o) { return o.k === p.answer; })[0];
    var ansTxt = (correct && !correct.img && /^Ninguna/.test(correct.html)) ? "Ninguna de las otras respuestas" : "";
    var badge = {
      verified: '<span class="badge ok" title="La opción cumple la EDO y las condiciones (sustitución) y coincide con la solución deducida">✓ Verificada</span>',
      ninguna: '<span class="badge ok" title="Ninguna de las otras opciones cumple la EDO o las condiciones (comprobado sustituyendo cada una)">✓ Verificada por descarte</span>',
      tie: '<span class="badge ind" title="Dirichlet y Mixtas dan la misma aproximación; en Sage se desempata con Dirichlet antes que Mixtas">Empate Dirichlet = Mixtas</span>',
      ambig: '<span class="badge ind" title="Puede ser la opción con Mixtas antes que Dirichlet o «Ninguna»">Ambigua</span>'
    }[p.status] || "";
    var ansLine = (p.alt && p.alt.length)
      ? "Respuesta correcta: opción " + p.alt.join(" u opción ") + " (no se puede saber con certeza) "
      : "Respuesta correcta: opción " + p.answer + (ansTxt ? " (" + ansTxt + ")" : "") + " ";
    return '<div class="part">' +
      '<h4><span class="n">Apartado ' + p.n + ".</span> " + p.prompt + "</h4>" +
      '<ul class="opts' + (isImg ? " img" : "") + '">' + opts + "</ul>" +
      '<p class="answer">' + ansLine + badge + "</p>" +
      ((p.n === 9 && ({13:1,68:1,107:1,144:1,35:1,48:1,55:1,58:1,63:1,133:1})[current]) ? '<p class="aviso">⚠ Consulta este apartado con el profesor (ver aviso arriba).</p>' : "") +
      "<details><summary>Ver explicación</summary><div class=\"dbody\">" + p.expl + "</div></details>" +
      "<details><summary>Ver código SageMath</summary><div class=\"dbody\"><div class=\"codewrap\">" +
      '<button type="button" class="copy">Copiar</button><pre class="code"><code>' + highlight(currentHead + p.code) + "</code></pre></div></div></details>" +
      "</div>";
  }

  var currentHead = "";
  function render(n) {
    var q = DATA[n - 1];
    currentHead = q.head;
    current = n;
    var html = '<div class="qhead"><h2>Cuestionario ' + q.num + '</h2><span class="code">código ' + q.code + "</span></div>";
    var AVISO = {13:1, 68:1, 107:1, 144:1, 35:2, 48:2, 55:2, 58:2, 63:2, 133:2};
    if (AVISO[q.num]) {
      var p9 = q.parts[8];
      var detalle = AVISO[q.num] === 1
        ? "La web marca la <b>opción " + p9.answer + "</b> (Neumann, Robin, Dirichlet, Mixtas), pero también aparece como opción el orden con Mixtas antes que Dirichlet."
        : "La respuesta es la <b>opción " + p9.alt[0] + "</b> (Neumann, Robin, Mixtas, Dirichlet) o la <b>opción 4</b> («Ninguna de las otras respuestas»).";
      html += '<div class="aviso" role="alert"><b>⚠ Pregunta al profesor el apartado 9.</b> ' +
        "Con h = 0.2, Dirichlet y Mixtas dan exactamente la misma aproximación, así que el orden entre ellas depende de cómo se desempate. " +
        detalle + " Pregunta cuál considera correcta antes de responder ese apartado. El resto de apartados son fiables.</div>";
    }
    html += '<article class="exercise"><h3>EJERCICIO 1</h3>' +
      '<div class="statement">' + q.statement + "</div>" + q.parts.map(partHtml).join("") + "</article>";
    quizEl.innerHTML = html;
    if (window.renderMathInElement) {
      window.renderMathInElement(quizEl, {
        delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
        throwOnError: false
      });
    }
    input.value = String(n);
    setMsg("");
    try { localStorage.setItem("p5msn-last", String(n)); } catch (e) { /* sin almacenamiento */ }
  }

  function go(raw, updateHash) {
    var r = parseNum(raw);
    if (r.err) { setMsg(r.err, true); return false; }
    render(r.n);
    if (updateHash !== false) {
      try { history.replaceState(null, "", "#" + r.n); } catch (e) { location.hash = r.n; }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function step(d) {
    var base = current || parseInt(input.value, 10) || (d > 0 ? 0 : MAX + 1);
    var n = Math.min(MAX, Math.max(1, base + d));
    go(n);
  }

  $("nav").addEventListener("submit", function (ev) { ev.preventDefault(); go(input.value); });
  $("prev").addEventListener("click", function () { step(-1); });
  $("next").addEventListener("click", function () { step(1); });
  input.addEventListener("input", function () { if (msg.className.indexOf("err") >= 0) setMsg(""); });

  document.addEventListener("keydown", function (ev) {
    if (ev.target === input || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === "ArrowLeft") step(-1);
    if (ev.key === "ArrowRight") step(1);
  });

  quizEl.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".copy");
    if (!b) return;
    var text = b.parentNode.querySelector("code").textContent;
    var done = function () { b.textContent = "¡Copiado!"; setTimeout(function () { b.textContent = "Copiar"; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { b.textContent = "No se pudo copiar"; });
    } else {
      b.textContent = "No disponible";
    }
  });

  window.addEventListener("hashchange", function () {
    var h = location.hash.replace("#", "");
    if (h && String(current) !== h) go(h, false);
  });

  // Estado inicial: hash > ultimo visitado > mensaje de bienvenida
  var start = location.hash.replace("#", "");
  var last = null;
  try { last = localStorage.getItem("p5msn-last"); } catch (e) { /* ignorar */ }
  if (start) {
    if (!go(start, false)) quizEl.innerHTML = '<p class="empty">Introduce un número de cuestionario válido para empezar.</p>';
  } else if (last && parseNum(last).n) {
    go(last);
  } else {
    quizEl.innerHTML = '<p class="empty">Introduce un número de cuestionario (1 – ' + MAX + ") para ver sus apartados, respuestas, explicaciones y código SageMath.</p>";
  }
})();
