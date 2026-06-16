(function(){
  var WC = window.WECAL || {};
  var ready = false, TOKEN = null, EMAIL = "", SLOTS = [], SLOTLEN = 30, WS = 9, WE = 18, SELDAY = null;
  var TZ = (function(){ try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e){ return "UTC"; } })();
  var TZLIST = [["America/Los_Angeles","Los Angeles · PT"],["America/Denver","Denver · MT"],["America/Chicago","Chicago · CT"],["America/New_York","New York · ET"],["America/Sao_Paulo","São Paulo"],["Europe/London","London"],["Europe/Lisbon","Lisbon"],["Europe/Paris","Paris · CET"],["Europe/Berlin","Berlin"],["Europe/Madrid","Madrid"],["Africa/Johannesburg","Johannesburg"],["Asia/Dubai","Dubai"],["Asia/Kolkata","India"],["Asia/Singapore","Singapore"],["Asia/Tokyo","Tokyo"],["Australia/Sydney","Sydney"],["Pacific/Auckland","Auckland"],["UTC","UTC"]];
  var now0 = new Date(), MC = { y: now0.getFullYear(), m: now0.getMonth() };

  var STYLE = ''
    + ':root{--accent:#7C6FF7;--accent-d:#6B5FE0;--ink:#2C1C6C;--muted:#6b7280;--line:#E2DBFF;--green:#00C875;--green-d:#00b368}'
    + '#app *{box-sizing:border-box}'
    + '.brand{font-size:15px;font-weight:700;margin-bottom:2px}.brand .a1{color:var(--accent)}.brand .a2{color:var(--ink)}'
    + '.sub{font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.45}'
    + '.btn{width:100%;margin-top:10px;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;background:var(--accent);color:#fff}'
    + '.btn:hover{background:var(--accent-d)}.btn:disabled{opacity:.5;cursor:default}'
    + '.btn.green{background:var(--green)}.btn.green:hover{background:var(--green-d)}'
    + '.btn.sec{background:#fff;color:var(--accent);border:1px solid var(--line)}'
    + '.row{display:flex;gap:8px}'
    + '.seg{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;margin:6px 0 2px}'
    + '.seg button{flex:1;border:none;background:#fff;padding:8px;font-family:inherit;font-size:13px;color:var(--ink);cursor:pointer}'
    + '.seg button.on{background:var(--accent);color:#fff;font-weight:600}'
    + 'label{display:block;font-size:12px;color:var(--muted);margin:12px 0 5px;font-weight:500}'
    + 'textarea,input[type=text],select{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;color:var(--ink);background:#fff;outline:none}textarea{resize:vertical}'
    + '.mcal{border:1px solid var(--line);border-radius:12px;padding:8px;margin:6px 0 4px}'
    + '.mc-head{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:600;margin-bottom:6px;padding:0 2px}'
    + '.mc-nav{border:none;background:none;font-size:16px;cursor:pointer;color:var(--accent);padding:0 6px}'
    + '.mc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px}'
    + '.mc-dow{font-size:9.5px;color:var(--muted);text-align:center;padding:2px 0}'
    + '.mc-day{font-size:11.5px;border:none;background:none;padding:5px 0;border-radius:7px;cursor:pointer;color:var(--ink);font-family:inherit}'
    + '.mc-day:hover{background:#F0ECFF}.mc-day.out{color:#c9c4de}.mc-day.today{font-weight:700;color:var(--accent)}.mc-day.sel{background:var(--accent);color:#fff}'
    + '.slots{margin-top:10px;max-height:200px;overflow:auto}'
    + '.slots .day{font-weight:600;margin:8px 0 3px;font-size:12px}'
    + '.slots .srow{display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12.5px;cursor:pointer}'
    + '.slots .srow input{width:15px;height:15px;accent-color:var(--accent)}'
    + '.or{text-align:center;font-size:11px;color:var(--muted);margin:18px 0 4px;position:relative}'
    + '.or:before,.or:after{content:"";position:absolute;top:50%;width:36%;height:1px;background:var(--line)}.or:before{left:0}.or:after{right:0}'
    + '.msg{font-size:12px;margin-top:10px;min-height:16px}.ok{color:var(--green-d);font-weight:600}.err{color:#b91c1c}'
    + '.mres{border:1px solid var(--line);border-radius:10px;margin-top:6px;overflow:hidden}'
    + '.mres>div{padding:7px 10px;font-size:12.5px;cursor:pointer;border-bottom:1px solid #F0ECFF}'
    + '.mres>div:last-child{border-bottom:none}.mres>div:hover{background:#F0ECFF}'
    + '.mres .em{color:var(--muted);font-size:11px}'
    + '.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}'
    + '.chip{display:inline-flex;align-items:center;gap:6px;background:#F0ECFF;color:var(--accent-d);border-radius:20px;padding:4px 10px;font-size:12px;font-weight:600}'
    + '.chip .cx{cursor:pointer;font-weight:700;opacity:.7}.chip .cx:hover{opacity:1;color:#b91c1c}'
    + '.hide{display:none}';

  var HTML = ''
    + '<div class="brand"><span class="a1">we</span><span class="a2">calendar</span></div>'
    + '<div class="sub">Pick your free times here — it drops a booking link into your email and your recipient books instantly.</div>'
    + '<div id="signedout"><button class="btn" id="signin">Sign in to WeCalendar</button><div class="msg" id="soMsg"></div></div>'
    + '<div id="picker" class="hide">'
    +   '<label>Slot length</label>'
    +   '<div class="seg" id="seg"><button data-l="15">15m</button><button data-l="30" class="on">30m</button><button data-l="60">60m</button></div>'
    +   '<label>Show times in</label>'
    +   '<select id="tzSel"></select>'
    +   '<label>Meet with (optional)</label>'
    +   '<input type="text" id="mateIn" autocomplete="off" placeholder="Search a teammate by name">'
    +   '<div id="mateRes"></div>'
    +   '<div class="chips" id="mateChips"></div>'
    +   '<label>Pick a day</label>'
    +   '<div class="mcal" id="mcal"></div>'
    +   '<button class="btn sec" id="pickDay">✨ Select slots for day</button>'
    +   '<button class="btn sec" id="pickWeek">✨ Select slots for week</button>'
    +   '<div class="slots" id="slots"></div>'
    +   '<div id="actions" style="display:none"><button class="btn green" id="insertLink" style="margin-top:0">📋 Copy slots</button><button class="btn sec" id="clearBtn">Clear selection</button></div>'
    +   '<div class="msg" id="msg"></div>'
    + '</div>'
    + '<div class="or">or paste a link</div>'
    + '<textarea id="lnk" rows="2" placeholder="https://wecalendar.github.io/b.html?l=..."></textarea>'
    + '<button class="btn sec" id="insertPaste">Insert pasted link</button>'
    + '<div class="msg" id="pMsg"></div>';

  var st = document.createElement("style"); st.textContent = STYLE; document.head.appendChild(st);
  document.getElementById("app").innerHTML = HTML;
  var $ = function(id){ return document.getElementById(id); };
  var AUTHKEY = "wecal_addin_auth";
  function tokExp(t){ try { var b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); b += "===".slice((b.length + 3) % 4); var p = JSON.parse(atob(b)); return p.exp ? p.exp * 1000 : Date.now() + 40 * 60000; } catch(e){ return Date.now() + 40 * 60000; } }
  function saveAuth(){ try { localStorage.setItem(AUTHKEY, JSON.stringify({ token: TOKEN, email: EMAIL, exp: tokExp(TOKEN) })); } catch(e){} }
  function clearAuth(){ try { localStorage.removeItem(AUTHKEY); } catch(e){} }
  function loadAuth(){ try { var a = JSON.parse(localStorage.getItem(AUTHKEY) || "null"); if (a && a.token && a.exp > Date.now() + 60000) return a; } catch(e){} return null; }
  function keyOf(d){ return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  function fmtTime(d){ return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: TZ }); }
  function fmtDay(d){ return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short", timeZone: TZ }); }
  function fmtDayLong(d){ return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", timeZone: TZ }); }
  function dayKey(d){ try { return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); } catch(e){ return d.toDateString(); } }
  function tzLong(){ var d = new Date(); function part(style){ try { return new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: style }).formatToParts(d).find(function(p){ return p.type === "timeZoneName"; }).value; } catch(e){ return ""; } } var lng = part("long"), shrt = part("short"); if (shrt && /^[A-Za-z]+$/.test(shrt) && shrt !== lng) return lng + " — " + shrt; return lng || TZ; }
  function snippet(url, slots){ var sel = slots || selected(), byDay = {}, order = []; sel.forEach(function(x){ var k = dayKey(x.start); if (!byDay[k]){ byDay[k] = []; order.push(k); } byDay[k].push(x); }); var h = "<div>Would any of these times work for you? Click one to book instantly <i>(times in " + tzLong() + ")</i>:<br><br>"; order.forEach(function(k){ h += "<b>" + fmtDayLong(byDay[k][0].start) + "</b><br>"; byDay[k].forEach(function(x){ h += '&nbsp;&nbsp;&#8226;&nbsp;<a href="' + url + '">' + fmtTime(x.start) + " &ndash; " + fmtTime(x.end) + "</a><br>"; }); h += "<br>"; }); return h + "</div>"; }

  Office.onReady(function(info){ ready = !!(info && info.host === Office.HostType.Outlook); });

  $("seg").addEventListener("click", function(e){ var b = e.target.closest("button"); if (!b) return; SLOTLEN = +b.dataset.l; [].forEach.call($("seg").querySelectorAll("button"), function(x){ x.classList.toggle("on", x === b); }); });
  (function(){ var sel = $("tzSel"); if (!sel) return; var opts = '<option value="' + TZ + '">My timezone</option>'; TZLIST.forEach(function(z){ if (z[0] !== TZ) opts += '<option value="' + z[0] + '">' + z[1] + '</option>'; }); sel.innerHTML = opts; sel.value = TZ; sel.onchange = function(){ TZ = sel.value; renderSlots(); }; })();

  var MATES = [];
  function renderMates(){ var c = $("mateChips"); c.innerHTML = ""; MATES.forEach(function(m, i){ var s = document.createElement("span"); s.className = "chip"; var t = document.createElement("span"); t.textContent = m.name; var x = document.createElement("span"); x.className = "cx"; x.innerHTML = "&times;"; x.onclick = function(){ MATES.splice(i, 1); renderMates(); }; s.appendChild(t); s.appendChild(x); c.appendChild(s); }); }
  function addMate(name, email){ if (!email || MATES.some(function(m){ return m.email === email; })) return; MATES.push({ name: name || email, email: email }); renderMates(); }
  var mateT = null;
  function searchMates(term, box){ if (!TOKEN) return; var url = "https://graph.microsoft.com/v1.0/users?$search=%22displayName:" + encodeURIComponent(term) + "%22&$select=displayName,mail,userPrincipalName&$top=6"; fetch(url, { headers: { Authorization: "Bearer " + TOKEN, ConsistencyLevel: "eventual" } }).then(function(r){ return r.json(); }).then(function(j){ var list = (j.value || []).filter(function(u){ return u.mail || u.userPrincipalName; }); box.innerHTML = ""; if (!list.length) return; var wrap = document.createElement("div"); wrap.className = "mres"; list.forEach(function(u){ var em = u.mail || u.userPrincipalName; var row = document.createElement("div"); var nm = document.createElement("div"); nm.textContent = u.displayName || em; var e2 = document.createElement("div"); e2.className = "em"; e2.textContent = em; row.appendChild(nm); row.appendChild(e2); row.onclick = function(){ addMate(u.displayName || em, em); $("mateIn").value = ""; box.innerHTML = ""; }; wrap.appendChild(row); }); box.appendChild(wrap); }).catch(function(){ box.innerHTML = ""; }); }
  $("mateIn").addEventListener("input", function(){ var term = $("mateIn").value.trim(), box = $("mateRes"); clearTimeout(mateT); if (term.length < 2){ box.innerHTML = ""; return; } mateT = setTimeout(function(){ searchMates(term, box); }, 300); });

  $("signin").onclick = function(){
    var m = $("soMsg"); m.className = "msg"; m.textContent = "Opening sign in…";
    Office.context.ui.displayDialogAsync("https://wecalendar.github.io/?dlg=auth", { height: 60, width: 40, promptBeforeOpen: false }, function(res){
      if (res.status !== Office.AsyncResultStatus.Succeeded){ m.className = "msg err"; m.textContent = "Couldn't open sign in: " + ((res.error && res.error.message) || ""); return; }
      var dlg = res.value;
      dlg.addEventHandler(Office.EventType.DialogMessageReceived, function(arg){
        var d; try { d = JSON.parse(arg.message); } catch(e){ d = {}; }
        try { dlg.close(); } catch(e){}
        if (d.token){ TOKEN = d.token; EMAIL = d.email || ""; saveAuth(); $("signedout").classList.add("hide"); $("picker").classList.remove("hide"); drawMiniCal(); }
        else { m.className = "msg err"; m.textContent = "Sign in didn't complete" + (d.error ? (": " + d.error) : "") + ". Try again."; }
      });
      dlg.addEventHandler(Office.EventType.DialogEventReceived, function(){});
    });
  };

  function miniCalHtml(){
    var first = new Date(MC.y, MC.m, 1), gridStart = new Date(MC.y, MC.m, 1 - first.getDay()), todayK = keyOf(new Date());
    var h = '<div class="mc-head"><span>' + first.toLocaleDateString([], { month: "long", year: "numeric" }) + '</span><span><button class="mc-nav" id="mcPrev">&#8249;</button><button class="mc-nav" id="mcNext">&#8250;</button></span></div><div class="mc-grid">';
    "SMTWTFS".split("").forEach(function(x){ h += '<span class="mc-dow">' + x + '</span>'; });
    for (var i = 0; i < 42; i++){ var d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i); var cls = "mc-day"; if (d.getMonth() !== MC.m) cls += " out"; if (keyOf(d) === todayK) cls += " today"; if (SELDAY && keyOf(d) === SELDAY) cls += " sel"; h += '<button class="' + cls + '" data-t="' + d.getTime() + '">' + d.getDate() + '</button>'; }
    return h + '</div>';
  }
  function drawMiniCal(){
    $("mcal").innerHTML = miniCalHtml();
    $("mcPrev").onclick = function(){ MC.m--; if (MC.m < 0){ MC.m = 11; MC.y--; } drawMiniCal(); };
    $("mcNext").onclick = function(){ MC.m++; if (MC.m > 11){ MC.m = 0; MC.y++; } drawMiniCal(); };
    [].forEach.call($("mcal").querySelectorAll(".mc-day"), function(b){ b.onclick = function(){ var d = new Date(+b.dataset.t); SELDAY = keyOf(d); drawMiniCal(); pick("day", d); }; });
  }

  function daysFor(scope, date){
    if (scope === "day") return [new Date(date.getFullYear(), date.getMonth(), date.getDate())];
    var n = new Date(), mon = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 6) % 7));
    var out = []; for (var i = 0; i < 5; i++){ var d = new Date(mon); d.setDate(mon.getDate() + i); out.push(d); } return out;
  }

  function pick(scope, date){
    var msg = $("msg"); msg.className = "msg"; msg.textContent = "Reading your calendar…"; SLOTS = []; renderSlots();
    var days = daysFor(scope, date);
    var ws = new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate(), 0, 0, 0);
    var last = days[days.length - 1], we = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1, 0, 0, 0);
    var url = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({ startDateTime: ws.toISOString(), endDateTime: we.toISOString(), "$select": "start,end,showAs,isAllDay", "$top": "200" });
    fetch(url, { headers: { Authorization: "Bearer " + TOKEN, Prefer: 'outlook.timezone="UTC"' } })
      .then(function(r){ if (r.status === 401) throw { expired: true }; return r.json(); })
      .then(function(j){
        var busy = (j.value || []).filter(function(ev){ return !ev.isAllDay && ev.showAs !== "free"; }).map(function(ev){ return { start: new Date(ev.start.dateTime + "Z"), end: new Date(ev.end.dateTime + "Z") }; });
        var nw = Date.now(), minLen = SLOTLEN * 60000;
        days.forEach(function(d){
          var ws2 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), WS).getTime();
          var we2 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), WE).getTime();
          var segs = busy.filter(function(b){ return b.end.getTime() > ws2 && b.start.getTime() < we2; }).map(function(b){ return [b.start.getTime(), b.end.getTime()]; }).sort(function(a, b){ return a[0] - b[0]; });
          var cur = Math.max(ws2, nw);
          segs.forEach(function(sg){ if (sg[0] > cur && Math.min(sg[0], we2) - cur >= minLen) SLOTS.push({ start: new Date(cur), end: new Date(Math.min(sg[0], we2)), sel: true }); if (sg[1] > cur) cur = sg[1]; });
          if (we2 - cur >= minLen) SLOTS.push({ start: new Date(cur), end: new Date(we2), sel: true });
        });
        renderSlots();
        msg.textContent = SLOTS.length ? (SLOTS.length + " free block" + (SLOTS.length > 1 ? "s" : "") + " — untick any. Copy splits them into client slots.") : "";
        if (!SLOTS.length){ msg.className = "msg err"; msg.textContent = "No open time in 9am–6pm " + (scope === "day" ? "that day" : "this week") + "."; }
      })
      .catch(function(err){
        if (err && err.expired){ msg.className = "msg err"; msg.textContent = "Session expired — sign in again."; TOKEN = null; clearAuth(); $("picker").classList.add("hide"); $("signedout").classList.remove("hide"); }
        else { msg.className = "msg err"; msg.textContent = "Couldn't read calendar: " + ((err && err.message) || "try again"); }
      });
  }
  $("pickDay").onclick = function(){ var d; if (SELDAY){ var p = SELDAY.split("-"); d = new Date(+p[0], +p[1], +p[2]); } else { d = new Date(); SELDAY = keyOf(d); drawMiniCal(); } pick("day", d); };
  $("pickWeek").onclick = function(){ SELDAY = null; drawMiniCal(); pick("week"); };
  $("clearBtn").onclick = function(){ SLOTS = []; renderSlots(); var m = $("msg"); m.className = "msg"; m.textContent = "Cleared."; };

  function renderSlots(){
    $("actions").style.display = SLOTS.length ? "block" : "none";
    if (!SLOTS.length){ $("slots").innerHTML = ""; return; }
    var byDay = {}, order = [];
    SLOTS.forEach(function(x, i){ var k = dayKey(x.start); if (!byDay[k]){ byDay[k] = []; order.push(k); } byDay[k].push(i); });
    var h = "";
    order.forEach(function(k){ h += '<div class="day">' + fmtDay(SLOTS[byDay[k][0]].start) + '</div>'; byDay[k].forEach(function(i){ var x = SLOTS[i]; h += '<label class="srow"><input type="checkbox" data-i="' + i + '"' + (x.sel ? " checked" : "") + '> ' + fmtTime(x.start) + ' &ndash; ' + fmtTime(x.end) + '</label>'; }); });
    $("slots").innerHTML = h;
    [].forEach.call($("slots").querySelectorAll("input[type=checkbox]"), function(cb){ cb.onchange = function(){ SLOTS[+cb.dataset.i].sel = cb.checked; }; });
  }

  function createLink(slots){
    var tz = TZ;
    return fetch(WC.FN_BASE + "/publish-link", { method: "POST", headers: { "Content-Type": "application/json", apikey: WC.SUPABASE_ANON_KEY, Authorization: "Bearer " + TOKEN }, body: JSON.stringify({ title: "Meeting with " + (EMAIL || "me"), tz: tz, slots: slots.map(function(x){ return { start: x.start.toISOString(), end: x.end.toISOString() }; }), attendees: MATES.map(function(m){ return m.email; }), videoLink: "", settings: { workStart: WS, workEnd: WE, buffer: 0, minNotice: 0, dayCap: 0 } }) })
      .then(function(r){ return r.json().then(function(j){ return { status: r.status, j: j }; }); })
      .then(function(o){ if (o.status === 412 || (o.j && o.j.error === "not_connected")) throw { notConnected: true }; if (!o.j || !o.j.url) throw new Error((o.j && o.j.detail) || "Couldn't create link"); return o.j.url; });
  }
  function linkErr(msg){ return function(e){ if (e && e.notConnected){ msg.className = "msg err"; msg.textContent = "Open WeCalendar in your browser and sign in once to connect for booking, then retry."; } else { msg.className = "msg err"; msg.textContent = "Error: " + ((e && e.message) || "try again"); } }; }
  function selected(){ return SLOTS.filter(function(s){ return s.sel; }); }
  function splitWindows(wins){ var out = [], len = SLOTLEN * 60000; wins.slice().sort(function(a, b){ return a.start - b.start; }).forEach(function(w){ var ws = w.start.getTime(), we = w.end.getTime(), any = false; for (var t = ws; t + len <= we; t += len){ out.push({ start: new Date(t), end: new Date(t + len) }); any = true; } if (!any) out.push({ start: new Date(ws), end: new Date(we) }); }); return out; }

  $("insertLink").onclick = function(){ var msg = $("msg"), sel = selected(); if (!sel.length){ msg.className = "msg err"; msg.textContent = "Tick at least one block first."; return; } msg.className = "msg"; msg.textContent = "Creating link…"; createLink(splitWindows(sel)).then(function(url){ insertHtml(snippet(url, sel), msg, "✓ Times added to your email."); }).catch(linkErr(msg)); };

  $("insertPaste").onclick = function(){ var url = $("lnk").value.trim(), msg = $("pMsg"); if (!/^https?:\/\/.+/.test(url)){ msg.className = "msg err"; msg.textContent = "Paste a valid link first."; return; } insertHtml('<a href="' + url + '">Book a time with me</a>', msg, "✓ Link added to your email."); };

  function insertHtml(html, msg, okText){
    if (!ready || !Office.context.mailbox || !Office.context.mailbox.item || !Office.context.mailbox.item.body){ msg.className = "msg err"; msg.textContent = "Open this while composing an email."; return; }
    Office.context.mailbox.item.body.setSelectedDataAsync(html, { coercionType: Office.CoercionType.Html }, function(r){ if (r.status === Office.AsyncResultStatus.Succeeded){ msg.className = "msg ok"; msg.textContent = okText; } else { msg.className = "msg err"; msg.textContent = "Couldn't insert: " + ((r.error && r.error.message) || "try again"); } });
  }

  (function restoreAuth(){ var a = loadAuth(); if (a){ TOKEN = a.token; EMAIL = a.email || ""; $("signedout").classList.add("hide"); $("picker").classList.remove("hide"); drawMiniCal(); } })();
})();
