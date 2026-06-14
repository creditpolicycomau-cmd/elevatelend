/**
 * ABN Lookup Integration for ElevateLend Apply Form
 * Self-contained: injects CSS, HTML, and event handlers
 * Uses the ABR JSONP API for business name and ABN search
 */
(function () {
  'use strict';

  var GUID = '40b65ac5-b8ad-4a1f-8ea1-5bc6d0783672';
  var ABN_DETAILS_URL = 'https://abr.business.gov.au/json/AbnDetails.aspx';
  var NAME_SEARCH_URL = 'https://abr.business.gov.au/json/MatchingNames.aspx';
  var DEBOUNCE_MS = 300;

  /* ── CSS injection ─────────────────────────────────────── */
  var css = [
    '.abn-lookup-wrapper{position:relative}',
    '.abn-lookup-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:#9ca3af}',
    '#abn_lookup{padding-left:42px}',
    '.abn-lookup-spinner{display:none;position:absolute;right:14px;top:50%;transform:translateY(-50%);width:20px;height:20px;border:2.5px solid #e5e7eb;border-top-color:#d4a853;border-radius:50%;animation:abnSpin .6s linear infinite}',
    '.abn-lookup-spinner.is-visible{display:block}',
    '@keyframes abnSpin{to{transform:translateY(-50%) rotate(360deg)}}',
    '.abn-lookup-results{position:absolute;top:100%;left:0;right:0;background:#fff;border:2px solid #d4a853;border-radius:12px;margin-top:4px;max-height:300px;overflow-y:auto;z-index:1000;display:none;box-shadow:0 8px 24px rgba(0,0,0,.12)}',
    '.abn-lookup-results.is-visible{display:block}',
    '.abn-lookup-result{padding:12px 16px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:background .15s}',
    '.abn-lookup-result:last-child{border-bottom:none}',
    '.abn-lookup-result:hover,.abn-lookup-result:focus{background:#faf5e8}',
    '.abn-lookup-result--empty{cursor:default;color:#9ca3af;text-align:center;padding:16px}',
    '.abn-lookup-result__name{font-weight:600;color:#0a1628;font-size:15px}',
    '.abn-lookup-result__details{font-size:13px;color:#6b7280;margin-top:3px}',
    '.abn-lookup-result__abn{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#b8822a;font-weight:500}',
    '.abn-lookup-result__status{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:600}',
    '.abn-lookup-result__status--active{background:#d1fae5;color:#065f46}',
    '.abn-lookup-result__status--cancelled{background:#fee2e2;color:#991b1b}',
    '.abn-confirmed{display:none;padding:12px 16px;background:linear-gradient(135deg,rgba(212,168,83,.08),rgba(201,149,46,.05));border:1.5px solid #e0be7a;border-radius:10px;margin-top:10px}',
    '.abn-confirmed.is-visible{display:flex;align-items:center;gap:12px}',
    '.abn-confirmed__icon{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center}',
    '.abn-confirmed__icon svg{width:18px;height:18px;color:#065f46}',
    '.abn-confirmed__info{flex:1;min-width:0}',
    '.abn-confirmed__name{font-weight:600;color:#0a1628;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.abn-confirmed__meta{font-size:13px;color:#6b7280;margin-top:2px}',
    '.abn-confirmed__clear{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:20px;padding:4px 8px;border-radius:6px;transition:all .15s;line-height:1}',
    '.abn-confirmed__clear:hover{color:#ef4444;background:rgba(239,68,68,.08)}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ── HTML injection ────────────────────────────────────── */
  var step2 = document.getElementById('step-2');
  if (!step2) return;

  var businessNameGroup = null;
  var groups = step2.querySelectorAll('.form-group');
  for (var i = 0; i < groups.length; i++) {
    if (groups[i].querySelector('#business_name')) {
      businessNameGroup = groups[i];
      break;
    }
  }
  if (!businessNameGroup) return;

  /* Build lookup HTML */
  var lookupGroup = document.createElement('div');
  lookupGroup.className = 'form-group';
  lookupGroup.id = 'abn-lookup-group';
  lookupGroup.innerHTML = [
    '<label class="form-label" for="abn_lookup">',
    '  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:4px;color:#d4a853"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    '  ABN / Business Name Lookup',
    '</label>',
    '<div class="abn-lookup-wrapper">',
    '  <div class="abn-lookup-icon">',
    '    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    '  </div>',
    '  <input type="text" id="abn_lookup" class="form-input" placeholder="Search by business name or ABN..." autocomplete="off">',
    '  <div class="abn-lookup-spinner" id="abn-spinner"></div>',
    '  <div class="abn-lookup-results" id="abn-results"></div>',
    '</div>',
    "<span class=\"form-hint\">Search the Australian Business Register — we'll auto-fill your details</span>",
    '<div class="abn-confirmed" id="abn-confirmed">',
    '  <div class="abn-confirmed__icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>',
    '  <div class="abn-confirmed__info">',
    '    <div class="abn-confirmed__name" id="abn-confirmed-name"></div>',
    '    <div class="abn-confirmed__meta" id="abn-confirmed-meta"></div>',
    '  </div>',
    '  <button type="button" class="abn-confirmed__clear" id="abn-confirmed-clear" title="Clear and search again">&times;</button>',
    '</div>'
  ].join('\n');

  /* Insert before business_name group */
  businessNameGroup.parentNode.insertBefore(lookupGroup, businessNameGroup);

  /* ── Element references ────────────────────────────────── */
  var lookupInput = document.getElementById('abn_lookup');
  var resultsDiv  = document.getElementById('abn-results');
  var spinner     = document.getElementById('abn-spinner');
  var confirmed   = document.getElementById('abn-confirmed');
  var confName    = document.getElementById('abn-confirmed-name');
  var confMeta    = document.getElementById('abn-confirmed-meta');
  var confClear   = document.getElementById('abn-confirmed-clear');
  var bizName     = document.getElementById('business_name');
  var abnField    = document.getElementById('abn');

  var debounceTimer = null;

  /* ── JSONP helper ──────────────────────────────────────── */
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var cbName = '_abnCb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      var script = document.createElement('script');
      var timer  = setTimeout(function () {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, 8000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        cleanup();
        resolve(data);
      };

      script.src = url + '&callback=' + cbName;
      script.onerror = function () {
        cleanup();
        reject(new Error('JSONP network error'));
      };
      document.head.appendChild(script);
    });
  }

  /* ── Utilities ─────────────────────────────────────────── */
  function formatAbn(abn) {
    var d = String(abn).replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 5) return d.slice(0, 2) + ' ' + d.slice(2);
    if (d.length <= 8) return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
    return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 8) + ' ' + d.slice(8);
  }

  function isAbnQuery(str) {
    var digits = str.replace(/\s/g, '');
    return /^\d{10,11}$/.test(digits);
  }

  function escHtml(s) {
    var el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }

  function triggerInput(field) {
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function markValid(field) {
    var g = field.closest('.form-group');
    if (!g) return;
    g.classList.remove('is-error');
    g.classList.add('is-valid');
    var msg = g.querySelector('.field-message');
    if (msg) msg.textContent = '';
  }

  /* ── API calls ─────────────────────────────────────────── */
  function searchByName(name) {
    var url = NAME_SEARCH_URL
      + '?name=' + encodeURIComponent(name)
      + '&maxResults=10'
      + '&guid=' + GUID;
    return jsonp(url);
  }

  function lookupByAbn(abn) {
    var digits = abn.replace(/\s/g, '');
    var url = ABN_DETAILS_URL
      + '?abn=' + digits
      + '&guid=' + GUID;
    return jsonp(url);
  }

  /* ── Render helpers ────────────────────────────────────── */
  function statusBadge(status) {
    if (!status) return '';
    var cls = (status.toLowerCase() === 'active')
      ? 'abn-lookup-result__status--active'
      : 'abn-lookup-result__status--cancelled';
    return ' <span class="abn-lookup-result__status ' + cls + '">' + escHtml(status) + '</span>';
  }

  function buildResultItem(name, abn, state, postcode, entityType, abnStatus) {
    var div = document.createElement('div');
    div.className = 'abn-lookup-result';
    div.setAttribute('role', 'option');
    div.setAttribute('tabindex', '0');

    var parts = [];
    if (abn) parts.push('<span class="abn-lookup-result__abn">ABN ' + escHtml(formatAbn(abn)) + '</span>');
    if (state) parts.push(escHtml(state));
    if (postcode) parts.push(escHtml(postcode));
    if (entityType) parts.push(escHtml(entityType));

    div.innerHTML =
      '<div class="abn-lookup-result__name">' + escHtml(name) + statusBadge(abnStatus) + '</div>' +
      '<div class="abn-lookup-result__details">' + parts.join(' &bull; ') + '</div>';

    div.addEventListener('click', function () {
      selectResult(name, abn, state, postcode, entityType);
    });
    div.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectResult(name, abn, state, postcode, entityType);
      }
    });
    return div;
  }

  function showEmpty(msg) {
    resultsDiv.innerHTML = '<div class="abn-lookup-result--empty">' + escHtml(msg) + '</div>';
    resultsDiv.classList.add('is-visible');
  }

  function renderNameResults(data) {
    resultsDiv.innerHTML = '';

    var names = data && data.Names;
    if (!names || names.length === 0) {
      showEmpty('No matching businesses found');
      return;
    }

    names.forEach(function (r) {
      var name = r.Name || r.BusinessName || '';
      var abn  = r.Abn || '';
      var st   = r.State || '';
      var pc   = r.Postcode || '';
      var typ  = r.Type || '';
      var stat = r.AbnStatus || '';
      resultsDiv.appendChild(buildResultItem(name, abn, st, pc, typ, stat));
    });
    resultsDiv.classList.add('is-visible');
  }

  function renderAbnResult(data) {
    resultsDiv.innerHTML = '';

    if (!data || !data.Abn) {
      showEmpty('ABN not found — check the number and try again');
      return;
    }

    var name = data.EntityName || '';
    if (!name && data.BusinessName && data.BusinessName.length) {
      name = (typeof data.BusinessName === 'string') ? data.BusinessName : data.BusinessName[0];
    }
    var abn  = data.Abn || '';
    var st   = data.AddressState || '';
    var pc   = data.AddressPostcode || '';
    var typ  = data.EntityTypeName || data.EntityTypeCode || '';
    var stat = data.AbnStatus || '';

    resultsDiv.appendChild(buildResultItem(name, abn, st, pc, typ, stat));
    resultsDiv.classList.add('is-visible');
  }

  /* ── Selection & auto-fill ─────────────────────────────── */
  function selectResult(name, abn, state, postcode, entityType) {
    if (bizName && name) {
      bizName.value = name;
      triggerInput(bizName);
      markValid(bizName);
    }

    if (abnField && abn) {
      abnField.value = formatAbn(abn);
      triggerInput(abnField);
      markValid(abnField);
    }

    var metaParts = [];
    if (abn) metaParts.push('ABN ' + formatAbn(abn));
    if (entityType) metaParts.push(entityType);
    if (state) metaParts.push(state);
    if (postcode) metaParts.push(postcode);

    confName.textContent = name;
    confMeta.textContent = metaParts.join(' \u2022 ');
    confirmed.classList.add('is-visible');

    resultsDiv.classList.remove('is-visible');
    lookupInput.value = '';
    lookupInput.placeholder = 'Business found — search again to change';
  }

  function clearSelection() {
    confirmed.classList.remove('is-visible');
    lookupInput.value = '';
    lookupInput.placeholder = 'Search by business name or ABN...';
    lookupInput.focus();
  }

  /* ── Event handlers ────────────────────────────────────── */
  lookupInput.addEventListener('input', function () {
    var val = this.value.trim();
    clearTimeout(debounceTimer);

    if (val.length < 3) {
      resultsDiv.classList.remove('is-visible');
      spinner.classList.remove('is-visible');
      return;
    }

    spinner.classList.add('is-visible');

    debounceTimer = setTimeout(function () {
      var promise;
      if (isAbnQuery(val)) {
        promise = lookupByAbn(val);
        promise.then(renderAbnResult).catch(function () {
          showEmpty('Lookup failed — please try again');
        }).finally(function () {
          spinner.classList.remove('is-visible');
        });
      } else {
        promise = searchByName(val);
        promise.then(renderNameResults).catch(function () {
          showEmpty('Search failed — please try again');
        }).finally(function () {
          spinner.classList.remove('is-visible');
        });
      }
    }, DEBOUNCE_MS);
  });

  lookupInput.addEventListener('keydown', function (e) {
    if (!resultsDiv.classList.contains('is-visible')) return;
    var items = resultsDiv.querySelectorAll('.abn-lookup-result');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'Escape') {
      resultsDiv.classList.remove('is-visible');
    }
  });

  resultsDiv.addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call(resultsDiv.querySelectorAll('.abn-lookup-result'));
    var idx = items.indexOf(document.activeElement);
    if (idx < 0) return;

    if (e.key === 'ArrowDown' && idx < items.length - 1) {
      e.preventDefault();
      items[idx + 1].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx === 0) lookupInput.focus();
      else items[idx - 1].focus();
    } else if (e.key === 'Escape') {
      resultsDiv.classList.remove('is-visible');
      lookupInput.focus();
    }
  });

  document.addEventListener('click', function (e) {
    if (!lookupGroup.contains(e.target)) {
      resultsDiv.classList.remove('is-visible');
    }
  });

  confClear.addEventListener('click', clearSelection);

  if (abnField) {
    abnField.addEventListener('input', function () {
      var digits = this.value.replace(/\D/g, '');
      if (digits.length === 11 && !confirmed.classList.contains('is-visible')) {
        spinner.classList.add('is-visible');
        lookupByAbn(digits).then(function (data) {
          if (data && data.Abn && data.EntityName) {
            var name = data.EntityName || '';
            var st   = data.AddressState || '';
            var pc   = data.AddressPostcode || '';
            var typ  = data.EntityTypeName || '';
            var stat = data.AbnStatus || '';

            if (bizName && (!bizName.value || bizName.value.trim() === '')) {
              bizName.value = name;
              triggerInput(bizName);
              markValid(bizName);
            }

            var parts = [];
            if (data.Abn) parts.push('ABN ' + formatAbn(data.Abn));
            if (typ) parts.push(typ);
            if (st) parts.push(st);
            if (pc) parts.push(pc);
            if (stat) parts.push(stat);
            confName.textContent = name;
            confMeta.textContent = parts.join(' \u2022 ');
            confirmed.classList.add('is-visible');
          }
        }).catch(function () { /* silent */ }).finally(function () {
          spinner.classList.remove('is-visible');
        });
      }
    });
  }

  console.log('[ElevateLend] ABN Lookup module loaded');
})();
