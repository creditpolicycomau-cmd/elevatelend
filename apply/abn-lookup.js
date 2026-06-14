(function() {
  'use strict';
  var GUID = '40b65ac5-b8ad-4a1f-8ea1-5bc6d0783672';
  var attached = false;

  // Inject CSS
  var style = document.createElement('style');
  style.textContent = [
    '.abn-dropdown{position:absolute;z-index:9999;background:#fff;border:2px solid #d4a853;border-radius:12px;max-height:280px;overflow-y:auto;display:none;box-shadow:0 8px 24px rgba(0,0,0,.12);margin-top:4px;left:0;right:0}',
    '.abn-dropdown.show{display:block}',
    '.abn-item{padding:12px 16px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:background .15s}',
    '.abn-item:last-child{border-bottom:none}',
    '.abn-item:hover{background:#faf5e8}',
    '.abn-item-name{font-weight:600;color:#0a1628;font-size:15px}',
    '.abn-item-meta{font-size:13px;color:#6b7280;margin-top:3px}',
    '.abn-item-abn{font-family:ui-monospace,monospace;color:#b8822a;font-weight:500}',
    '.abn-status{display:inline-block;font-size:11px;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:600}',
    '.abn-status-active{background:#d1fae5;color:#065f46}',
    '.abn-status-cancelled{background:#fee2e2;color:#991b1b}',
    '.abn-spinner{display:none;position:absolute;right:14px;top:50%;transform:translateY(-50%);width:20px;height:20px;border:2.5px solid #e5e7eb;border-top-color:#d4a853;border-radius:50%;animation:abnSpin .6s linear infinite}',
    '.abn-spinner.show{display:block}',
    '@keyframes abnSpin{to{transform:translateY(-50%) rotate(360deg)}}',
    '.abn-confirmed{display:none;padding:12px 16px;background:linear-gradient(135deg,rgba(212,168,83,.08),rgba(201,149,46,.05));border:1.5px solid #e0be7a;border-radius:10px;margin-top:10px;align-items:center;gap:12px}',
    '.abn-confirmed.show{display:flex}',
    '.abn-confirmed-icon{flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center}',
    '.abn-confirmed-info{flex:1;min-width:0}',
    '.abn-confirmed-name{font-weight:600;color:#0a1628;font-size:15px}',
    '.abn-confirmed-meta{font-size:13px;color:#6b7280;margin-top:2px}',
    '.abn-confirmed-clear{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:20px;padding:4px 8px;border-radius:6px;line-height:1}',
    '.abn-confirmed-clear:hover{color:#ef4444;background:rgba(239,68,68,.08)}'
  ].join('\n');
  document.head.appendChild(style);

  function formatAbn(a) {
    var d = String(a).replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 5) return d.slice(0,2)+' '+d.slice(2);
    if (d.length <= 8) return d.slice(0,2)+' '+d.slice(2,5)+' '+d.slice(5);
    return d.slice(0,2)+' '+d.slice(2,5)+' '+d.slice(5,8)+' '+d.slice(8);
  }

  function esc(s) { var e = document.createElement('span'); e.textContent = s; return e.innerHTML; }

  function setVal(el, v) {
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function jsonp(url) {
    return new Promise(function(resolve, reject) {
      var cb = '_abnCb_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
      var s = document.createElement('script');
      var t = setTimeout(function() { cleanup(); reject(new Error('timeout')); }, 8000);
      function cleanup() { clearTimeout(t); delete window[cb]; if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function(d) { cleanup(); resolve(d); };
      s.src = url + '&callback=' + cb;
      s.onerror = function() { cleanup(); reject(new Error('error')); };
      document.head.appendChild(s);
    });
  }

  function doSearch(q, dropdown, spinner, input) {
    spinner.classList.add('show');
    var isAbn = /^\d{10,11}$/.test(q.replace(/\s/g, ''));
    var url;
    if (isAbn) {
      url = 'https://abr.business.gov.au/json/AbnDetails.aspx?abn=' + q.replace(/\s/g, '') + '&guid=' + GUID;
    } else {
      url = 'https://abr.business.gov.au/json/MatchingNames.aspx?name=' + encodeURIComponent(q) + '&maxResults=8&guid=' + GUID;
    }
    jsonp(url).then(function(data) {
      dropdown.innerHTML = '';
      var items = [];
      if (isAbn && data && data.Abn) {
        items.push({name: data.EntityName || '', abn: data.Abn, state: data.AddressState || '', pc: data.AddressPostcode || '', type: data.EntityTypeName || '', status: data.AbnStatus || ''});
      } else if (data && data.Names) {
        data.Names.forEach(function(r) {
          items.push({name: r.Name || r.BusinessName || '', abn: r.Abn || '', state: r.State || '', pc: r.Postcode || '', type: r.Type || '', status: r.AbnStatus || ''});
        });
      }
      if (items.length === 0) {
        dropdown.innerHTML = '<div class="abn-item" style="cursor:default;color:#9ca3af;text-align:center">No matching businesses found</div>';
      } else {
        items.forEach(function(it) {
          var div = document.createElement('div');
          div.className = 'abn-item';
          var statusHtml = '';
          if (it.status) {
            var cls = it.status.toLowerCase() === 'active' ? 'abn-status-active' : 'abn-status-cancelled';
            statusHtml = ' <span class="abn-status ' + cls + '">' + esc(it.status) + '</span>';
          }
          var meta = [];
          if (it.abn) meta.push('<span class="abn-item-abn">ABN ' + esc(formatAbn(it.abn)) + '</span>');
          if (it.state) meta.push(esc(it.state));
          if (it.pc) meta.push(esc(it.pc));
          if (it.type) meta.push(esc(it.type));
          div.innerHTML = '<div class="abn-item-name">' + esc(it.name) + statusHtml + '</div><div class="abn-item-meta">' + meta.join(' &bull; ') + '</div>';
          div.addEventListener('click', function() { selectResult(it, input, dropdown); });
          dropdown.appendChild(div);
        });
      }
      dropdown.classList.add('show');
    }).catch(function() {
      dropdown.innerHTML = '<div class="abn-item" style="cursor:default;color:#9ca3af;text-align:center">Lookup failed - please try again</div>';
      dropdown.classList.add('show');
    }).finally(function() { spinner.classList.remove('show'); });
  }

  function selectResult(it, input, dropdown) {
    // Fill business name
    var bizName = document.getElementById('business_name');
    if (bizName && it.name) setVal(bizName, it.name);
    // Fill ABN
    var abnField = document.getElementById('abn');
    if (abnField && it.abn) setVal(abnField, formatAbn(it.abn));
    // Show confirmed
    var conf = document.getElementById('abn-confirmed');
    var confName = document.getElementById('abn-confirmed-name');
    var confMeta = document.getElementById('abn-confirmed-meta');
    if (conf && confName && confMeta) {
      confName.textContent = it.name;
      var parts = [];
      if (it.abn) parts.push('ABN ' + formatAbn(it.abn));
      if (it.type) parts.push(it.type);
      if (it.state) parts.push(it.state);
      if (it.pc) parts.push(it.pc);
      confMeta.textContent = parts.join(' â¢ ');
      conf.classList.add('show');
    }
    dropdown.classList.remove('show');
    input.value = '';
    input.placeholder = 'Business found â search again to change';
  }

  function attachLookup() {
    if (attached) return;
    var step2 = document.getElementById('step-2');
    if (!step2) return;
    var bizField = document.getElementById('business_name');
    if (!bizField) return;
    attached = true;

    // Build lookup UI
    var group = document.createElement('div');
    group.className = 'form-group';
    group.id = 'abn-lookup-group';
    group.innerHTML = [
      '<label class="form-label" for="abn_lookup">',
      '  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:4px;color:#d4a853"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
      '  ABN / Business Name Lookup',
      '</label>',
      '<div style="position:relative">',
      '  <input type="text" id="abn_lookup" class="form-input" placeholder="Search by business name or ABN..." autocomplete="off">',
      '  <div class="abn-spinner" id="abn-spinner"></div>',
      '  <div class="abn-dropdown" id="abn-dropdown"></div>',
      '</div>',
      '<span class="form-hint">Search the Australian Business Register â we\'ll auto-fill your details</span>',
      '<div class="abn-confirmed" id="abn-confirmed">',
      '  <div class="abn-confirmed-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>',
      '  <div class="abn-confirmed-info">',
      '    <div class="abn-confirmed-name" id="abn-confirmed-name"></div>',
      '    <div class="abn-confirmed-meta" id="abn-confirmed-meta"></div>',
      '  </div>',
      '  <button type="button" class="abn-confirmed-clear" id="abn-confirmed-clear" title="Clear">&times;</button>',
      '</div>'
    ].join('\n');

    // Insert before business name field's group
    var bizGroup = bizField.closest('.form-group');
    if (bizGroup && bizGroup.parentNode) {
      bizGroup.parentNode.insertBefore(group, bizGroup);
    }

    // Wire up events
    var input = document.getElementById('abn_lookup');
    var dropdown = document.getElementById('abn-dropdown');
    var spinner = document.getElementById('abn-spinner');
    var clearBtn = document.getElementById('abn-confirmed-clear');
    var timer;

    if (input) {
      input.addEventListener('input', function() {
        clearTimeout(timer);
        var v = this.value.trim();
        if (v.length < 3) { dropdown.classList.remove('show'); spinner.classList.remove('show'); return; }
        timer = setTimeout(function() { doSearch(v, dropdown, spinner, input); }, 300);
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') dropdown.classList.remove('show');
        if (e.key === 'ArrowDown') { var first = dropdown.querySelector('.abn-item'); if (first) { e.preventDefault(); first.focus(); } }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        var conf = document.getElementById('abn-confirmed');
        if (conf) conf.classList.remove('show');
        if (input) { input.value = ''; input.placeholder = 'Search by business name or ABN...'; input.focus(); }
      });
    }
    document.addEventListener('click', function(e) {
      if (group && !group.contains(e.target)) dropdown.classList.remove('show');
    });

    console.log('[ElevateLend] ABN Lookup attached to Step 2');
  }

  // Use MutationObserver to detect when Step 2 form elements appear
  var observer = new MutationObserver(function() {
    if (!attached) attachLookup();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Also try immediately and after delays
  attachLookup();
  setTimeout(attachLookup, 500);
  setTimeout(attachLookup, 1500);
  setTimeout(attachLookup, 3000);

  console.log('[ElevateLend] ABN Lookup module loaded');
})();
