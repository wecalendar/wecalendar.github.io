(function(){
  var WC = window.WECAL || {};
  var ready = false, TOKEN = null, EMAIL = "", SLOTS = [], SLOTLEN = 30, WS = 9, WE = 18, BUF = 0, MINNOTICE = 0, SELDAY = null, LAST = null, BUSY = [], OFFV = {}, VIEWDAYS = [], WEEKMON = null, NAME = "";
  var TZ = (function(){ try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e){ return "UTC"; } })();
  var TZLIST = [["America/Los_Angeles","Los Angeles · PT"],["America/Denver","Denver · MT"],["America/Chicago","Chicago · CT"],["America/New_York","New York · ET"],["America/Sao_Paulo","São Paulo"],["Europe/London","London"],["Europe/Lisbon","Lisbon"],["Europe/Paris","Paris · CET"],["Europe/Berlin","Berlin"],["Europe/Madrid","Madrid"],["Africa/Johannesburg","Johannesburg"],["Asia/Dubai","Dubai"],["Asia/Kolkata","India"],["Asia/Singapore","Singapore"],["Asia/Tokyo","Tokyo"],["Australia/Sydney","Sydney"],["Pacific/Auckland","Auckland"],["UTC","UTC"]];
  var now0 = new Date(), MC = { y: now0.getFullYear(), m: now0.getMonth() };

  var STYLE = ''
    + "@font-face{font-family:'Greycliff CF';src:url(GreycliffCF-Light.ttf) format('truetype');font-weight:300;font-display:swap}"
    + "@font-face{font-family:'Greycliff CF';src:url(GreycliffCF-Medium.ttf) format('truetype');font-weight:400 500;font-display:swap}"
    + "@font-face{font-family:'Greycliff CF';src:url(GreycliffCF-Bold.ttf) format('truetype');font-weight:600 700;font-display:swap}"
    + ":root{--accent:#5E43C8;--accent-d:#402C93;--ink:#2C1C6C;--muted:#656578;--line:#E2DBFF;--green:#12B76A;--green-d:#039855}"
    + "#app{font-family:'Greycliff CF','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}#app *{box-sizing:border-box}"
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
    + '.tzwrap{position:relative}'
    + '.tzres{position:absolute;left:0;right:0;top:100%;margin-top:4px;z-index:30;background:#fff;max-height:240px;overflow:auto;box-shadow:0 10px 24px rgba(44,28,108,.18)}'
    + '.tzres>div{display:flex;justify-content:space-between;align-items:center;gap:10px}'
    + '.tzres .off{color:var(--muted);font-size:11px;font-weight:600;white-space:nowrap}'
    + '.gday{font-weight:600;margin:12px 0 6px;font-size:12px;color:var(--ink)}'
    + '.grow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:9px;margin-bottom:5px;font-size:11.5px;line-height:1.25}'
    + '.grow.busy{background:#FBEAF0;color:#72243E}'
    + '.grow.busy .dot{width:7px;height:7px;border-radius:50%;background:#D4537E;flex:none}'
    + '.grow.free{background:#E7F7EF;border:1px dashed #7FD3B0;color:#0F6E56;cursor:pointer}'
    + '.grow.free.on{background:#D9F3E7;border-color:#12B76A}'
    + '.grow.free input{width:15px;height:15px;accent-color:#12B76A;flex:none;margin:0}'
    + '.grow .tmcol{white-space:nowrap;font-variant-numeric:tabular-nums}'
    + '.grow .ttl{font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.grow.off{background:#F1EFE8;color:#5F5E5A}'
    + '.weeknav{display:flex;align-items:center;justify-content:space-between;background:#F0ECFF;border-radius:9px;padding:6px 8px;margin:10px 0 4px}'
    + '.weeknav button{border:none;background:none;color:var(--accent);font-size:18px;font-weight:600;cursor:pointer;padding:2px 12px;font-family:inherit;line-height:1;border-radius:7px}'
    + '.weeknav button:hover{background:#E4DCFF}'
    + '.weeknav #wkLabel{font-size:12.5px;font-weight:600;color:var(--accent-d)}'
    + '.tpl{margin:0 0 6px}'
    + '.tplbtn{width:100%;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;background:var(--accent);color:#fff;display:flex;align-items:center;gap:8px}'
    + '.tplbtn:hover{background:var(--accent-d)}'
    + '.tplbtn .chev{margin-left:auto;font-size:12px;transition:transform .15s}'
    + '.tpl.open .tplbtn{border-radius:10px 10px 0 0;background:var(--accent-d)}'
    + '.tpl.open .tplbtn .chev{transform:rotate(180deg)}'
    + '.tplmenu{border:1px solid var(--line);border-top:none;border-radius:0 0 10px 10px;overflow:hidden}'
    + '.tplopt{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-bottom:1px solid #F0ECFF;cursor:pointer;background:#fff}'
    + '.tplopt:last-child{border-bottom:none}.tplopt:hover{background:#F0ECFF}'
    + '.tplopt .ic{font-size:16px;line-height:1.3;flex:none}'
    + '.tplopt .tt{font-size:13px;font-weight:600;color:var(--ink)}'
    + '.tplopt .td{font-size:11px;color:var(--muted);margin-top:1px}'
    + '.tplhint{font-size:11px;color:var(--muted);text-align:center;margin-top:8px;line-height:1.4}'
    + '.hide{display:none}'
    /* beauty pass 2026-07-19 — matches web app polish */
    + '.btn,.seg button,.mc-day,.tplbtn,.weeknav button,.tplopt{transition:background .15s ease,color .15s ease,border-color .15s ease,box-shadow .15s ease,transform .12s ease}'
    + '.btn{box-shadow:0 2px 8px rgba(94,67,200,.22)}.btn:hover{box-shadow:0 4px 12px rgba(94,67,200,.3)}.btn:active{transform:scale(.98)}'
    + '.btn.sec{box-shadow:none}.btn.sec:hover{background:#F6F3FE;border-color:#C9BCFF}'
    + '.btn.green{box-shadow:0 2px 8px rgba(18,183,106,.25)}.btn.green:hover{box-shadow:0 4px 12px rgba(18,183,106,.32)}'
    + '.grow{transition:transform .12s ease,box-shadow .12s ease}'
    + '.grow.free:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(18,183,106,.18)}'
    + '.grow.busy{background:linear-gradient(135deg,#FBEAF0,#F8DCE7)}'
    + '.mcal{box-shadow:0 1px 3px rgba(44,28,108,.05)}'
    + '.mc-day.sel{box-shadow:0 2px 8px rgba(94,67,200,.3)}'
    + 'textarea,input[type=text],select{transition:border-color .15s ease,box-shadow .15s ease}'
    + 'textarea:focus,input[type=text]:focus,select:focus{border-color:#C9BCFF;box-shadow:0 0 0 3px rgba(94,67,200,.10)}'
    + '.tzres{border:1px solid var(--line);border-radius:12px}'
    + '.slots::-webkit-scrollbar{width:8px}.slots::-webkit-scrollbar-thumb{background:rgba(94,67,200,.18);border-radius:99px}'
    /* event colors by type: purple = meeting with others, red = solo block */
    + '.grow.busy.mtg{background:linear-gradient(135deg,#EEEDFE,#E2DBFF);color:#3C3489}'
    + '.grow.busy.mtg .dot{background:#5E43C8}'
    + '.grow.busy.solo{background:linear-gradient(135deg,#FCEBEB,#F8D6D6);color:#A32D2D}'
    + '.grow.busy.solo .dot{background:#E24B4A}';

  var HTML = ''
    + '<div class="brand"><span class="a1">we</span><span class="a2">calendar</span></div>'
    + '<div class="sub">Pick your free times here — it drops a booking link into your email and your recipient books instantly.</div>'
    + '<div id="signedout"><button class="btn" id="signin">Sign in to WeCalendar</button><div class="msg" id="soMsg"></div></div>'
    + '<div id="picker" class="hide">'
    +   '<div class="tpl hide" id="tpl">'
    +     '<button class="tplbtn" id="tplBtn" type="button">&#128231; CSM email templates<span class="chev">&#9662;</span></button>'
    +     '<div class="tplmenu hide" id="tplMenu">'
    +       '<div class="tplopt" data-tpl="0"><span class="ic">&#128075;</span><div><div class="tt">First onboarding email</div><div class="td">Welcome &amp; book the kickoff calls</div></div></div>'
    +       '<div class="tplopt" data-tpl="1"><span class="ic">&#9989;</span><div><div class="tt">After onboarding call</div><div class="td">Recap, tasks &amp; next step</div></div></div>'
    +       '<div class="tplopt" data-tpl="2"><span class="ic">&#128640;</span><div><div class="tt">Listing is live</div><div class="td">Go-live confirmation</div></div></div>'
    +       '<div class="tplopt" data-tpl="3"><span class="ic">&#129309;</span><div><div class="tt">Intro to your Account Manager</div><div class="td">Handoff from onboarding to your AM</div></div></div>'
    +     '</div>'
    +     '<div class="tplhint hide" id="tplHint">Pick one — it fills the subject &amp; body. Edit the highlighted blanks before sending.</div>'
    +   '</div>'
    +   '<div class="or hide" id="tplOr" style="margin:8px 0 2px">or share your free times</div>'
    +   '<label>Slot length</label>'
    +   '<div class="seg" id="seg"><button data-l="15">15m</button><button data-l="30" class="on">30m</button><button data-l="60">60m</button></div>'
    +   '<label>Show times in</label>'
    +   '<div class="tzwrap"><input type="text" id="tzIn" autocomplete="off" placeholder="Type a city or zone — London, CET, EST…"><div id="tzRes" class="mres tzres hide"></div></div>'
    +   '<label>Meet with (optional)</label>'
    +   '<input type="text" id="mateIn" autocomplete="off" placeholder="Search a teammate by name">'
    +   '<div id="mateRes"></div>'
    +   '<div class="chips" id="mateChips"></div>'
    +   '<label>Pick a day</label>'
    +   '<div class="mcal" id="mcal"></div>'
    +   '<button class="btn sec" id="pickDay">✨ Select slots for day</button>'
    +   '<button class="btn sec" id="pickWeek">✨ Select slots for week</button>'
    +   '<div id="weekNav" class="weeknav hide"><button id="wkPrev" type="button">&#8249;</button><span id="wkLabel"></span><button id="wkNext" type="button">&#8250;</button></div>'
    +   '<div class="slots" id="slots"></div>'
    +   '<div id="actions" style="display:none"><button class="btn green" id="insertLink" style="margin-top:0">📋 Copy slots</button><button class="btn sec" id="clearBtn">Clear selection</button></div>'
    +   '<div class="msg" id="msg"></div>'
    + '</div>';

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
  function tzOff(ms){ try { var dtf = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); var p = {}; dtf.formatToParts(new Date(ms)).forEach(function(x){ p[x.type] = x.value; }); return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms) / 60000; } catch(e){ return -new Date(ms).getTimezoneOffset(); } }
  function zInstant(y, mo, day, hour){ var guess = Date.UTC(y, mo, day, hour, 0, 0); var ms = guess - tzOff(guess) * 60000; return guess - tzOff(ms) * 60000; }
  function snippet(url, slots){ var sel = slots || selected(), byDay = {}, order = []; sel.forEach(function(x){ var k = dayKey(x.start); if (!byDay[k]){ byDay[k] = []; order.push(k); } byDay[k].push(x); }); var h = "<div>Would any of these times work for you? Click one to book instantly <i>(times in " + tzLong() + ")</i>:<br><br>"; order.forEach(function(k){ h += "<b>" + fmtDayLong(byDay[k][0].start) + "</b><br>"; byDay[k].forEach(function(x){ h += '&nbsp;&nbsp;&#8226;&nbsp;<a href="' + url + '">' + fmtTime(x.start) + " &ndash; " + fmtTime(x.end) + "</a><br>"; }); h += "<br>"; }); return h + "</div>"; }

  Office.onReady(function(info){ ready = !!(info && info.host === Office.HostType.Outlook); try { applyCSMGate(); } catch(e){} });

  $("seg").addEventListener("click", function(e){ var b = e.target.closest("button"); if (!b) return; SLOTLEN = +b.dataset.l; [].forEach.call($("seg").querySelectorAll("button"), function(x){ x.classList.toggle("on", x === b); }); if (LAST && SLOTS.length){ pick(LAST.scope, LAST.date); } });
  var TZNAME = {}; TZLIST.forEach(function(z){ TZNAME[z[0]] = z[1]; });
  var TZKW = {
    "America/Los_Angeles":"los angeles la pst pdt pt pacific california san francisco seattle vancouver",
    "America/Denver":"denver mst mdt mt mountain colorado phoenix arizona",
    "America/Chicago":"chicago cst cdt ct central texas dallas houston mexico city",
    "America/New_York":"new york nyc est edt et eastern boston washington dc miami toronto atlanta",
    "America/Sao_Paulo":"sao paulo brazil brt brasilia rio de janeiro",
    "Europe/London":"london gmt bst utc uk england edinburgh britain",
    "Europe/Lisbon":"lisbon portugal wet west porto",
    "Europe/Paris":"paris cet cest central european france",
    "Europe/Berlin":"berlin cet cest germany frankfurt munich hamburg",
    "Europe/Madrid":"madrid spain cet cest barcelona",
    "Africa/Johannesburg":"johannesburg south africa sast cat cape town",
    "Asia/Dubai":"dubai uae gst gulf abu dhabi",
    "Asia/Kolkata":"india ist kolkata mumbai delhi bangalore chennai hyderabad",
    "Asia/Singapore":"singapore sgt",
    "Asia/Tokyo":"tokyo japan jst osaka",
    "Australia/Sydney":"sydney australia aest aedt nsw",
    "Pacific/Auckland":"auckland new zealand nzst nzdt wellington",
    "UTC":"utc gmt zulu universal coordinated"
  };
  var TZSEARCH = (function(){ var out = [], seen = {}; TZLIST.forEach(function(z){ seen[z[0]] = 1; out.push({ v: z[0], label: z[1], kw: (z[1] + " " + (TZKW[z[0]] || "") + " " + z[0].replace(/[\/_]/g, " ")).toLowerCase() }); }); var all = []; try { all = Intl.supportedValuesOf("timeZone") || []; } catch(e){ all = []; } all.forEach(function(v){ if (seen[v]) return; seen[v] = 1; var city = v.split("/").pop().replace(/_/g, " "); out.push({ v: v, label: city, kw: v.replace(/[\/_]/g, " ").toLowerCase() }); }); return out; })();
  function zoneOff(zone, ms){ try { var dtf = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); var p = {}; dtf.formatToParts(new Date(ms)).forEach(function(x){ p[x.type] = x.value; }); return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms) / 60000; } catch(e){ return 0; } }
  function offLabel(zone){ var o = Math.round(zoneOff(zone, Date.now())); var s = o < 0 ? "-" : "+"; o = Math.abs(o); var h = Math.floor(o / 60), m = o % 60; return "GMT" + s + h + (m ? (":" + (m < 10 ? "0" : "") + m) : ""); }
  function tzLabelFor(v){ return TZNAME[v] || v.split("/").pop().replace(/_/g, " "); }
  (function(){
    var inp = $("tzIn"), box = $("tzRes"); if (!inp) return;
    function choose(v){ TZ = v; inp.value = tzLabelFor(v) + " · " + offLabel(v); box.classList.add("hide"); box.innerHTML = ""; if (LAST && SLOTS.length){ pick(LAST.scope, LAST.date); } else { renderSlots(); } }
    function render(term){ term = (term || "").trim().toLowerCase(); var res = [], i, j; if (!term){ res = TZSEARCH.slice(0, 8); } else { var scored = []; for (i = 0; i < TZSEARCH.length; i++){ var toks = TZSEARCH[i].kw.split(" "), sc = 0; for (j = 0; j < toks.length; j++){ if (toks[j] === term){ if (sc < 3) sc = 3; } else if (toks[j].indexOf(term) === 0){ if (sc < 2) sc = 2; } } if (!sc && TZSEARCH[i].kw.indexOf(term) !== -1) sc = 1; if (term.length <= 3 && sc < 2) sc = 0; if (sc) scored.push({ z: TZSEARCH[i], sc: sc, i: i }); } scored.sort(function(a, b){ return b.sc - a.sc || a.i - b.i; }); for (i = 0; i < scored.length && res.length < 12; i++) res.push(scored[i].z); } box.innerHTML = ""; if (!res.length){ box.classList.add("hide"); return; } res.forEach(function(z){ var row = document.createElement("div"); var nm = document.createElement("span"); nm.textContent = z.label; var of = document.createElement("span"); of.className = "off"; of.textContent = offLabel(z.v); if (z.v === TZ) row.style.background = "#F0ECFF"; row.appendChild(nm); row.appendChild(of); row.onmousedown = function(e){ e.preventDefault(); choose(z.v); }; box.appendChild(row); }); box.classList.remove("hide"); }
    inp.addEventListener("focus", function(){ inp.select(); render(""); });
    inp.addEventListener("input", function(){ render(inp.value); });
    inp.addEventListener("blur", function(){ setTimeout(function(){ box.classList.add("hide"); }, 160); });
    inp.value = tzLabelFor(TZ) + " · " + offLabel(TZ);
  })();

  var MATES = [];
  function renderMates(){ var c = $("mateChips"); c.innerHTML = ""; MATES.forEach(function(m, i){ var s = document.createElement("span"); s.className = "chip"; var t = document.createElement("span"); t.textContent = m.name; var x = document.createElement("span"); x.className = "cx"; x.innerHTML = "&times;"; x.onclick = function(){ MATES.splice(i, 1); renderMates(); }; s.appendChild(t); s.appendChild(x); c.appendChild(s); }); }
  function addMate(name, email){ if (!email || MATES.some(function(m){ return m.email === email; })) return; MATES.push({ name: name || email, email: email }); renderMates(); }
  var mateT = null;
  function searchMates(term, box){ if (!TOKEN) return; var url = "https://graph.microsoft.com/v1.0/users?$search=%22displayName:" + encodeURIComponent(term) + "%22&$select=displayName,mail,userPrincipalName&$top=6"; fetch(url, { headers: { Authorization: "Bearer " + TOKEN, ConsistencyLevel: "eventual" } }).then(function(r){ return r.json(); }).then(function(j){ var list = (j.value || []).filter(function(u){ var em = ((u.mail || u.userPrincipalName) || "").toLowerCase(); return /^[a-z-]+\.[a-z-]+@(wetransact|awssome)\.io$/.test(em); }); box.innerHTML = ""; if (!list.length) return; var wrap = document.createElement("div"); wrap.className = "mres"; list.forEach(function(u){ var em = u.mail || u.userPrincipalName; var row = document.createElement("div"); var nm = document.createElement("div"); nm.textContent = u.displayName || em; var e2 = document.createElement("div"); e2.className = "em"; e2.textContent = em; row.appendChild(nm); row.appendChild(e2); row.onclick = function(){ addMate(u.displayName || em, em); $("mateIn").value = ""; box.innerHTML = ""; }; wrap.appendChild(row); }); box.appendChild(wrap); }).catch(function(){ box.innerHTML = ""; }); }
  $("mateIn").addEventListener("input", function(){ var term = $("mateIn").value.trim(), box = $("mateRes"); clearTimeout(mateT); if (term.length < 2){ box.innerHTML = ""; return; } mateT = setTimeout(function(){ searchMates(term, box); }, 300); });

  $("signin").onclick = function(){
    var m = $("soMsg"); m.className = "msg"; m.textContent = "Opening sign in…";
    Office.context.ui.displayDialogAsync("https://wecalendar.github.io/?dlg=auth&t=" + Date.now(), { height: 60, width: 40, promptBeforeOpen: false }, function(res){
      if (res.status !== Office.AsyncResultStatus.Succeeded){ m.className = "msg err"; m.textContent = "Couldn't open sign in: " + ((res.error && res.error.message) || ""); return; }
      var dlg = res.value;
      dlg.addEventHandler(Office.EventType.DialogMessageReceived, function(arg){
        var d; try { d = JSON.parse(arg.message); } catch(e){ d = {}; }
        try { dlg.close(); } catch(e){}
        if (d.token){ TOKEN = d.token; EMAIL = d.email || ""; saveAuth(); loadSettings(); loadProfile(); $("signedout").classList.add("hide"); $("picker").classList.remove("hide"); drawMiniCal(); try { applyCSMGate(); } catch(e){} }
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
    var y, mo, da, wd;
    if (date){ y = date.getFullYear(); mo = date.getMonth(); da = date.getDate(); wd = (date.getDay() + 6) % 7; }
    else { var p = {}; new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; }); y = +p.year; mo = +p.month - 1; da = +p.day; wd = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[p.weekday]; }
    var base = Date.UTC(y, mo, da, 12) - wd * 86400000;
    var out = []; for (var i = 0; i < 5; i++){ var d = new Date(base + i * 86400000); out.push(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); } return out;
  }
  function focusDate(){ if (SELDAY){ var p = SELDAY.split("-"); return new Date(+p[0], +p[1], +p[2]); } var q = {}; new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).forEach(function(x){ q[x.type] = x.value; }); return new Date(+q.year, +q.month - 1, +q.day); }
  function weekLabel(a, b){ var mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; var ma = mo[a.getMonth()], mb = mo[b.getMonth()]; return "Week of " + ma + " " + a.getDate() + " – " + (ma === mb ? b.getDate() : (mb + " " + b.getDate())); }

  function loadSettings(){ if (!TOKEN) return; fetch(WC.FN_BASE + "/host-settings", { method: "POST", headers: { "Content-Type": "application/json", apikey: WC.SUPABASE_ANON_KEY, Authorization: "Bearer " + TOKEN } }).then(function(r){ return r.json(); }).then(function(s){ if (s && typeof s.workStart === "number"){ WS = s.workStart; WE = s.workEnd; BUF = s.buffer || 0; MINNOTICE = s.minNotice || 0; if (LAST && SLOTS.length) pick(LAST.scope, LAST.date); } }).catch(function(){}); }
  function niceName(email){ var lp = String(email || "").split("@")[0]; if (!lp) return ""; return lp.replace(/[._\-]+/g, " ").replace(/\d+/g, "").replace(/\s+/g, " ").trim().replace(/\b\w/g, function(c){ return c.toUpperCase(); }); }
  function loadProfile(){ if (!TOKEN) return; fetch("https://graph.microsoft.com/v1.0/me?$select=displayName", { headers: { Authorization: "Bearer " + TOKEN } }).then(function(r){ return r.json(); }).then(function(j){ if (j && j.displayName) NAME = j.displayName; }).catch(function(){}); }
  function graphAll(url, acc){ return fetch(url, { headers: { Authorization: "Bearer " + TOKEN, Prefer: 'outlook.timezone="UTC"' } }).then(function(r){ if (r.status === 401) throw { expired: true }; return r.json(); }).then(function(j){ acc = acc.concat(j.value || []); var nx = j["@odata.nextLink"]; if (nx && acc.length < 2000) return graphAll(nx, acc); return acc; }); }
  function pick(scope, date){
    var msg = $("msg"); msg.className = "msg"; msg.textContent = "Reading your calendar…"; SLOTS = []; BUSY = []; OFFV = {}; VIEWDAYS = []; renderSlots();
    LAST = { scope: scope, date: date };
    var days = daysFor(scope, date);
    WEEKMON = (scope === "week") ? days[0] : null;
    if (scope === "week"){ $("wkLabel").textContent = weekLabel(days[0], days[days.length - 1]); $("weekNav").classList.remove("hide"); }
    else { $("weekNav").classList.add("hide"); }
    var PAD = 48 * 3600000;
    var ws = new Date(new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate()).getTime() - PAD);
    var last = days[days.length - 1], we = new Date(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime() + PAD);
    var url = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({ startDateTime: ws.toISOString(), endDateTime: we.toISOString(), "$select": "start,end,showAs,isAllDay,responseStatus,subject,attendees,organizer", "$top": "200" });
    graphAll(url, []).then(function(items){
        var busy = [], offDays = {}, seenB = {};
        items.forEach(function(ev){
          if (!ev.start || !ev.start.dateTime || !ev.end || !ev.end.dateTime || ev.showAs === "free" || ev.showAs === "workingElsewhere") return;
          if (ev.responseStatus && ev.responseStatus.response === "declined") return;
          var s = new Date(ev.start.dateTime + "Z"), e = new Date(ev.end.dateTime + "Z");
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
          if (ev.isAllDay){ for (var t = s.getTime(); t < e.getTime(); t += 86400000){ var od = new Date(t); offDays[od.getUTCFullYear() + "-" + od.getUTCMonth() + "-" + od.getUTCDate()] = true; } }
          else { var bk = s.getTime() + "_" + e.getTime() + "_" + (ev.subject || ""); if (!seenB[bk]){ seenB[bk] = 1; var myEm = (EMAIL || "").toLowerCase(); var orgEm = (ev.organizer && ev.organizer.emailAddress && ev.organizer.emailAddress.address || "").toLowerCase(); var hasOthers = (ev.attendees || []).some(function(a){ var ae = (a.emailAddress && a.emailAddress.address || "").toLowerCase(); return ae && ae !== myEm; }) || (orgEm && orgEm !== myEm); busy.push({ start: s, end: e, subject: ev.subject || "", mtg: hasOthers }); } }
        });
        var nowMs = Date.now(), nw = nowMs + MINNOTICE * 3600000, minLen = SLOTLEN * 60000, bufMs = BUF * 60000;
        days.forEach(function(d){
          var ws2 = zInstant(d.getFullYear(), d.getMonth(), d.getDate(), WS);
          var we2 = zInstant(d.getFullYear(), d.getMonth(), d.getDate(), WE);
          if (scope === "week" && we2 <= nowMs) return;
          var mid = new Date(Math.floor((ws2 + we2) / 2)), key = dayKey(mid);
          VIEWDAYS.push({ key: key, label: fmtDay(mid) });
          if (offDays[d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()]){ OFFV[key] = true; return; }
          busy.forEach(function(b){ if (b.end.getTime() > Math.max(ws2, nowMs) && b.start.getTime() < we2) BUSY.push({ start: b.start, end: b.end, subject: b.subject, mtg: b.mtg, key: key }); });
          var segs = busy.filter(function(b){ return b.end.getTime() > ws2 && b.start.getTime() < we2; }).map(function(b){ return [b.start.getTime() - bufMs, b.end.getTime() + bufMs]; }).sort(function(a, b){ return a[0] - b[0]; });
          var cur = Math.max(ws2, nw);
          segs.forEach(function(sg){ if (sg[0] > cur && Math.min(sg[0], we2) - cur >= minLen) SLOTS.push({ start: new Date(cur), end: new Date(Math.min(sg[0], we2)), sel: true, key: key }); if (sg[1] > cur) cur = sg[1]; });
          if (we2 - cur >= minLen) SLOTS.push({ start: new Date(cur), end: new Date(we2), sel: true, key: key });
        });
        renderSlots();
        if (SLOTS.length){ msg.className = "msg"; msg.textContent = SLOTS.length + " free block" + (SLOTS.length > 1 ? "s" : "") + " — tick the ones to offer, then Copy slots."; }
        else { msg.className = "msg err"; msg.textContent = "No open time in your working hours " + (scope === "day" ? "that day" : "this week") + "."; }
      })
      .catch(function(err){
        if (err && err.expired){ msg.className = "msg err"; msg.textContent = "Session expired — sign in again."; TOKEN = null; clearAuth(); $("picker").classList.add("hide"); $("signedout").classList.remove("hide"); }
        else { msg.className = "msg err"; msg.textContent = "Couldn't read calendar: " + ((err && err.message) || "try again"); }
      });
  }
  $("pickDay").onclick = function(){ var d = focusDate(); if (!SELDAY){ SELDAY = keyOf(d); drawMiniCal(); } pick("day", d); };
  $("pickWeek").onclick = function(){ pick("week", focusDate()); };
  $("wkPrev").onclick = function(){ stepWeek(-7); };
  $("wkNext").onclick = function(){ stepWeek(7); };
  function stepWeek(delta){ var base = WEEKMON ? WEEKMON : focusDate(); var nm = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta); SELDAY = keyOf(nm); MC.y = nm.getFullYear(); MC.m = nm.getMonth(); drawMiniCal(); pick("week", nm); }
  $("clearBtn").onclick = function(){ SLOTS.forEach(function(s){ s.sel = false; }); renderSlots(); var m = $("msg"); m.className = "msg"; m.textContent = "Cleared selection — tick free blocks to offer."; };

  function esc(s){ return (s || "").replace(/[<>&]/g, function(c){ return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }); }
  function durLabel(ms){ var m = Math.round(ms / 60000), h = Math.floor(m / 60); m = m % 60; return (h ? h + "h" : "") + (h && m ? " " : "") + (m ? m + "m" : (h ? "" : "0m")); }
  var _warmTs = 0;
  function warmLink(){ if (!WC.FN_BASE || Date.now() - _warmTs < 120000) return; _warmTs = Date.now(); try { fetch(WC.FN_BASE + "/publish-link", { method: "OPTIONS" }); } catch(e){} }
  function renderSlots(){
    $("actions").style.display = SLOTS.length ? "block" : "none";
    if (SLOTS.length) warmLink();
    if (!VIEWDAYS.length){ $("slots").innerHTML = ""; return; }
    var freeByKey = {}, busyByKey = {};
    SLOTS.forEach(function(x, i){ (freeByKey[x.key] = freeByKey[x.key] || []).push(i); });
    BUSY.forEach(function(b){ (busyByKey[b.key] = busyByKey[b.key] || []).push(b); });
    var h = "";
    VIEWDAYS.forEach(function(vd){
      h += '<div class="gday">' + vd.label + '</div>';
      if (OFFV[vd.key]){ h += '<div class="grow off"><span class="tmcol">All day</span><span class="ttl">Out of office</span></div>'; return; }
      var rows = [];
      (busyByKey[vd.key] || []).forEach(function(b){ rows.push({ t: b.start.getTime(), busy: b }); });
      (freeByKey[vd.key] || []).forEach(function(i){ rows.push({ t: SLOTS[i].start.getTime(), free: i }); });
      rows.sort(function(a, b){ return a.t - b.t; });
      if (!rows.length){ h += '<div class="grow off"><span class="ttl">No open time in your working hours</span></div>'; return; }
      rows.forEach(function(r){
        if (r.busy){ h += '<div class="grow busy' + (r.busy.mtg ? ' mtg' : ' solo') + '"><span class="dot"></span><span class="tmcol">' + fmtTime(r.busy.start) + ' &ndash; ' + fmtTime(r.busy.end) + '</span><span class="ttl">' + esc(r.busy.subject || "Busy") + '</span></div>'; }
        else { var x = SLOTS[r.free]; h += '<label class="grow free' + (x.sel ? " on" : "") + '"><input type="checkbox" data-i="' + r.free + '"' + (x.sel ? " checked" : "") + '><span class="tmcol">' + fmtTime(x.start) + ' &ndash; ' + fmtTime(x.end) + '</span><span class="ttl">Free · ' + durLabel(x.end - x.start) + '</span></label>'; }
      });
    });
    $("slots").innerHTML = h;
    [].forEach.call($("slots").querySelectorAll("input[type=checkbox]"), function(cb){ cb.onchange = function(){ var x = SLOTS[+cb.dataset.i]; x.sel = cb.checked; var row = cb.closest(".grow"); if (row) row.classList.toggle("on", cb.checked); }; });
  }

  function createLink(slots){
    var tz = TZ;
    return fetch(WC.FN_BASE + "/publish-link", { method: "POST", headers: { "Content-Type": "application/json", apikey: WC.SUPABASE_ANON_KEY, Authorization: "Bearer " + TOKEN }, body: JSON.stringify({ title: "Meeting with " + (NAME || niceName(EMAIL) || "me"), tz: tz, slots: slots.map(function(x){ return { start: x.start.toISOString(), end: x.end.toISOString() }; }), attendees: MATES.map(function(m){ return m.email; }), videoLink: "", settings: { workStart: WS, workEnd: WE, buffer: BUF, minNotice: MINNOTICE, dayCap: 0 } }) })
      .then(function(r){ return r.json().then(function(j){ return { status: r.status, j: j }; }); })
      .then(function(o){ if (o.status === 412 || (o.j && o.j.error === "not_connected")) throw { notConnected: true }; if (!o.j || !o.j.url) throw new Error((o.j && o.j.detail) || "Couldn't create link"); return o.j.url; });
  }
  function linkErr(msg){ return function(e){ if (e && e.notConnected){ msg.className = "msg err"; msg.textContent = "Open WeCalendar in your browser and sign in once to connect for booking, then retry."; } else { msg.className = "msg err"; msg.textContent = "Error: " + ((e && e.message) || "try again"); } }; }
  function selected(){ return SLOTS.filter(function(s){ return s.sel; }); }
  function splitWindows(wins){ var out = [], len = SLOTLEN * 60000; wins.slice().sort(function(a, b){ return a.start - b.start; }).forEach(function(w){ var ws = w.start.getTime(), we = w.end.getTime(), any = false; for (var t = ws; t + len <= we; t += len){ out.push({ start: new Date(t), end: new Date(t + len) }); any = true; } if (!any) out.push({ start: new Date(ws), end: new Date(we) }); }); return out; }

  $("insertLink").onclick = function(){ var msg = $("msg"), sel = selected(); if (!sel.length){ msg.className = "msg err"; msg.textContent = "Tick at least one block first."; return; } msg.className = "msg"; msg.textContent = "Creating link…"; createLink(splitWindows(sel)).then(function(url){ insertHtml(snippet(url, sel), msg, "✓ Times added to your email."); }).catch(linkErr(msg)); };

  function insertHtml(html, msg, okText){
    if (!ready || !Office.context.mailbox || !Office.context.mailbox.item || !Office.context.mailbox.item.body){ msg.className = "msg err"; msg.textContent = "Open this while composing an email."; return; }
    Office.context.mailbox.item.body.setSelectedDataAsync(html, { coercionType: Office.CoercionType.Html }, function(r){ if (r.status === Office.AsyncResultStatus.Succeeded){ msg.className = "msg ok"; msg.textContent = okText; } else { msg.className = "msg err"; msg.textContent = "Couldn't insert: " + ((r.error && r.error.message) || "try again"); } });
  }

  var CSMTPL = [
    {
      subject: "Welcome to WeTransact — let's kick off your onboarding",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Nice to meet you! We're thrilled to have you onboard. My name is {Your name} — I'll be your CSM and help you through onboarding.</p>"
        + "<p>For an overview of what to expect during onboarding, see below.</p>"
        + "<p>Onboarding checklist 👉: <a href='https://bestpractices.wetransact.io/onboarding'>bestpractices.wetransact.io/onboarding</a></p>"
        + "<p><b>Onboarding (Partner Center related) — meeting (30 min)</b></p>"
        + "<ul><li>Granting WeTransact access to your Partner Center (click <a href='https://docs.wetransact.io/step-6-grant-wetransact-access-to-partner-center'>here</a> for a how-to guide)</li><li>Completing your Tax and Payout profile (see the onboarding checklist for the finance doc)</li></ul>"
        + "<p><b>Onboarding (WeTransact Portal related) — meeting (30 min)</b></p>"
        + "<ul><li>Navigation of the WeTransact Publisher Portal</li><li>Build listing and publish (see the Marketing doc in onboarding checklist for the required info)</li></ul>"
        + "<p><b>Post onboarding</b></p>"
        + "<p>Go-to-Market strategy meetings (once your listing has gone live).</p>"
        + "<p>Moving forward, I suggest we book two 30-minute meetings this week to get these tasks completed. It'll be important to have the information ready, as mentioned in the forms, before each meeting so we can respect the one-week onboarding timeline we promise.</p>"
        + "<p>Do you think you'll have the details on the finance form ready for this week's meeting? Let me know what works best — you can book a call {booking link} or just send me your availability.</p>"
    },
    {
      subject: "Your onboarding recap & next steps",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Thank you for your time today — we're thrilled to have you on board. As a follow-up, I wanted to outline the remaining tasks and share a few updates.</p>"
        + "<p style='color:#039855;font-weight:700;text-decoration:underline;margin:0 0 4px'>Completed tasks:</p>"
        + "<ul style='margin:0 0 10px'><li>Granting WeTransact access to your Partner Center</li><li>Access to the WeTransact Portal: {insert portal link}</li><li>Verifying the Legal info tab</li><li>Completing the Tax and Payout profile</li></ul>"
        + "<p style='color:#C2261B;font-weight:700;text-decoration:underline;margin:0 0 4px'>Remaining tasks:</p>"
        + "<ul style='margin:0 0 10px'><li>Build listing and publish</li><li>Navigation of the WeTransact Publisher Portal</li></ul>"
        + "<p style='color:#1A66C9;font-weight:700;text-decoration:underline;margin:0 0 4px'>Next Step:</p>"
        + "<p style='margin:0 0 10px'>I'll wait for your confirmation on the marketing collateral. Once you have this ready, we can schedule a call for next week.</p>"
        + "<p>If you have any questions, please reach out to me directly.</p>"
    },
    {
      subject: "Your {Product} listing is live 🎉",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Congratulations! Your {Product} listing is now live and transactable!</p>"
        + "<p>Just a heads-up: we'll make a test purchase and then cancel the order. This is part of our standard post-go-live validation to confirm everything is working smoothly. You don't need to do anything on your end — we'll cancel the order and remove it from the Orders tab.</p>"
        + "<p>If you have any questions, please reach out to me directly.</p>"
    },
    {
      subject: "Introduction to your WeTransact Account Manager",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>I hope you've had a smooth onboarding experience so far. Now that you're all set up, I'd like to introduce you to your WeTransact Account Manager, {AM name}.</p>"
        + "<p>{AM name} will be your main point of contact moving forward. Their role is to help you get the most out of WeTransact — whether that's aligning on your goals, sharing best practices, supporting your GTM initiatives, or connecting you with relevant resources and partners.</p>"
        + "<p>{AM name}, meet {First name}.</p>"
        + "<p>Looking forward to seeing the great things we'll achieve together.</p>"
    }
  ];
  function tplHL(s){ return String(s).replace(/\{([^}]+)\}/g, function(_, t){ return '<span style="background-color:#FFEC99;color:#1a1a1a;">[' + t + ']</span>'; }); }
  function tplPlain(s){ return String(s).replace(/\{([^}]+)\}/g, function(_, t){ return "[" + t + "]"; }); }
  function setSubject(text){ try { var it = Office.context.mailbox && Office.context.mailbox.item; if (it && it.subject && it.subject.setAsync){ it.subject.setAsync(text); } } catch(e){} }
  var CSM_ALLOW = (function(){ var m = {}, list = ["ruby.sran@wetransact.io", "divyashree.g@wetransact.io", "em.labrador@wetransact.io", "javier.albala@wetransact.io", "leya.zheng@wetransact.io", "paula.jimenez@wetransact.io", "thaddeus.uzornne@wetransact.io", "thomas.roche@wetransact.io"]; list.forEach(function(e){ m[e] = 1; }); return m; })();
  function currentUserEmail(){ var e = ""; try { e = (Office.context && Office.context.mailbox && Office.context.mailbox.userProfile && Office.context.mailbox.userProfile.emailAddress) || ""; } catch(_){} if (!e) e = EMAIL || ""; return String(e).trim().toLowerCase(); }
  function isCSM(){ var e = currentUserEmail(); return /@wetransact\.io$/.test(e) && !!CSM_ALLOW[e]; }
  function applyCSMGate(){ var t = $("tpl"), o = $("tplOr"), show = isCSM(); if (t) t.classList.toggle("hide", !show); if (o) o.classList.toggle("hide", !show); }
  (function(){
    var wrap = $("tpl"), btn = $("tplBtn"), menu = $("tplMenu"), hint = $("tplHint"); if (!btn) return;
    function setOpen(o){ wrap.classList.toggle("open", o); menu.classList.toggle("hide", !o); hint.classList.toggle("hide", !o); }
    btn.onclick = function(){ setOpen(menu.classList.contains("hide")); };
    [].forEach.call(menu.querySelectorAll(".tplopt"), function(el){ el.onclick = function(){ var t = CSMTPL[+el.dataset.tpl]; if (!t) return; var msg = $("msg"); setSubject(tplPlain(t.subject)); insertHtml(tplHL(t.body), msg, "✓ Template added — fill in the highlighted blanks before sending."); setOpen(false); }; });
  })();

  (function restoreAuth(){ var a = loadAuth(); if (a){ TOKEN = a.token; EMAIL = a.email || ""; loadSettings(); loadProfile(); $("signedout").classList.add("hide"); $("picker").classList.remove("hide"); drawMiniCal(); } try { applyCSMGate(); } catch(e){} })();
})();
