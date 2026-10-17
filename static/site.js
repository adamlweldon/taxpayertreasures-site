// Ad slots, share buttons and client-side search. No dependencies.
(function () {
  // Ads: request a slot only when it's displayed at this screen size and the reader is about to reach it.
  // Hidden slots (the desktop rail on phones) are removed. Slots further down wait without the adsbygoogle
  // class until they come within ~1.5 screens, so the only unprocessed slot at each push() is the one we
  // mean (push() fills the first unprocessed ins.adsbygoogle in page order). Every slot keeps its fixed-size
  // box either way, so loading late never moves the page.
  var slots = [].slice.call(document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])'));
  var queue = [];
  function request(ins) {
    ins.classList.add('adsbygoogle');
    window.adsbygoogle = window.adsbygoogle || [];
    try { window.adsbygoogle.push({}); } catch (e) {}
  }
  slots.forEach(function (ins) {
    if (ins.offsetWidth === 0) { ins.parentNode.removeChild(ins); return; }
    ins.classList.remove('adsbygoogle');
    queue.push(ins);
  });
  if (queue.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); request(e.target); }
      });
    }, { rootMargin: '150% 0px' });
    queue.forEach(function (ins) { io.observe(ins); });
  } else {
    queue.forEach(request);
  }

  // "Your privacy choices": opens Google's US state opt-out or European consent settings when they're available
  // for this visitor; otherwise the link simply goes to the privacy page.
  document.querySelectorAll('[data-privacy-choices]').forEach(function (el) {
    el.addEventListener('click', function (ev) {
      var fc = window.googlefc;
      if (fc && fc.usstatesoptout && fc.usstatesoptout.openConfirmationDialog) {
        ev.preventDefault();
        fc.usstatesoptout.openConfirmationDialog(function () {});
      } else if (fc && fc.showRevocationMessage) {
        ev.preventDefault();
        fc.showRevocationMessage();
      } else if (el.tagName === 'BUTTON') {
        // No Google privacy dialog for this visitor (not in a covered US state or Europe, or still loading):
        // send them to Google's own ad settings, where anyone can turn off personalized ads.
        window.open('https://myadcenter.google.com/', '_blank', 'noopener');
      }
    });
  });

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-copy');
      var done = function () { var t = btn.textContent; btn.textContent = 'Link copied'; setTimeout(function () { btn.textContent = t; }, 1800); };
      if (navigator.clipboard) { navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copy this link', url); }); }
      else { window.prompt('Copy this link', url); }
    });
  });
  document.querySelectorAll('[data-native-share]').forEach(function (btn) {
    if (!navigator.share) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      navigator.share({ title: btn.getAttribute('data-title'), url: btn.getAttribute('data-url') }).catch(function () {});
    });
  });

  var form = document.querySelector('[data-search]');
  if (!form) return;
  var input = form.querySelector('input');
  var results = document.querySelector('[data-search-results]');
  var status = document.querySelector('[data-search-status]');
  var index = null;
  function load() {
    if (index) return Promise.resolve(index);
    return fetch('/index.json').then(function (r) { return r.json(); }).then(function (d) { index = d; return d; });
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run(q) {
    q = q.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; status.textContent = ''; return; }
    load().then(function (rows) {
      var terms = q.split(/\s+/);
      var hits = rows.filter(function (r) {
        var hay = (r.t + ' ' + (r.k || '') + ' ' + (r.c || '')).toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) !== -1; });
      }).slice(0, 60);
      status.textContent = hits.length ? (hits.length === 60 ? 'Showing the first 60 matches' : hits.length + (hits.length === 1 ? ' match' : ' matches')) : 'No matches. Try a brand name or one word from the product.';
      results.innerHTML = hits.map(function (r) {
        return '<li><a href="' + esc(r.u) + '"><span class="result-title">' + esc(r.t) + '</span><span class="result-meta">' +
          esc(r.d) + (r.b ? ', current bid ' + esc(r.b) : '') + '</span></a></li>';
      }).join('');
    });
  }
  var params = new URLSearchParams(location.search);
  if (params.get('q')) { input.value = params.get('q'); run(input.value); }
  var timer;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(input.value); }, 150); });
  form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); history.replaceState(null, '', '?q=' + encodeURIComponent(input.value)); });
})();

// Unclaimed money: the state picker opens that state's official search in a new tab.
(function () {
  document.querySelectorAll('[data-money]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var url = form.querySelector('select').value;
      if (!url) return;
      e.preventDefault();
      window.open(url, '_blank', 'noopener');
      if (window.gtag) window.gtag('event', 'money_search', { state: form.querySelector('select').selectedOptions[0].text });
    });
  });
})();
