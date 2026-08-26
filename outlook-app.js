(function(){
  var WC = window.WECAL || {};
  var ready = false, TOKEN = null, EMAIL = "", SLOTS = [], SLOTLEN = 30, WS = 9, WE = 18, BUF = 0, MINNOTICE = 0, SELDAY = null, LAST = null, BUSY = [], OFFV = {}, VIEWDAYS = [], WEEKMON = null, NAME = "", DAYCAP = 0, FOCUSHOWN = {};
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
    + '.tplmenu{max-height:330px;overflow-y:auto}'
    + '.tplgrp{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7A6FB8;padding:9px 12px 5px;background:#FAF9FF;border-bottom:1px solid #F0ECFF}'
    /* docs link picker (2026-08-25) */
    + '.dkwrap{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:#FBF9FF}'
    + '.dkres{max-height:212px;overflow:auto;margin-top:6px}'
    + '.dkgrp{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7A6FB8;padding:6px 4px 4px}'
    + '.dkrow{display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border-radius:8px;cursor:pointer;font-size:12.5px;color:var(--ink);line-height:1.32}'
    + '.dkrow:hover{background:#F2EEFF}.dkrow.on{background:#F2EEFF;font-weight:600}'
    + '.dkrow input{width:14px;height:14px;accent-color:var(--accent);flex:none;margin:2px 0 0}'
    + '.dkempty{display:flex;gap:10px;align-items:center;font-size:11.5px;color:var(--muted);padding:10px 4px;line-height:1.45}'
    + '.dkempty img{width:54px;height:auto;flex:none}'
    + '.dkhint{font-size:11px;color:var(--muted);margin-top:8px;line-height:1.4}'
    + '.dkwrap .chips:not(:empty){border-top:1px solid var(--line);padding-top:9px;margin-top:10px}'
    + '.dkinstr{display:flex;align-items:center;gap:9px;margin-top:12px;padding-top:11px;border-top:1px solid var(--line);cursor:pointer}'
    + '.dksw{width:34px;height:20px;border-radius:999px;background:#CFC9E8;position:relative;flex:none;transition:background .15s ease}'
    + '.dksw:after{content:"";width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;box-shadow:0 1px 2px rgba(44,28,108,.25);transition:left .15s ease}'
    + '.dksw.on{background:var(--accent)}.dksw.on:after{left:16px}'
    + '.dkinstr .tt{font-size:12.5px;font-weight:600;color:var(--ink)}'
    + '.dkinstr .td{font-size:11px;color:var(--muted);line-height:1.35}'
    + '.dkprev{margin-top:9px;background:#fff;border:1px dashed #C9BCFF;border-radius:9px;padding:9px 11px}'
    + '.dkprev .pk{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#7A6FB8;margin-bottom:4px}'
    + '.dkprev .pt{font-size:11px;color:#343130;line-height:1.5}'
    + '.dkres::-webkit-scrollbar{width:8px}.dkres::-webkit-scrollbar-thumb{background:rgba(94,67,200,.18);border-radius:99px}'
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
    + '.grow.busy.solo .dot{background:#E24B4A}'
    /* focus time: amber, tickable, never auto-selected */
    + '.grow.free.focusrow{background:#FFF6E5;border:1px dashed #F0B65B;color:#8A5300}'
    + '.grow.free.focusrow.on{background:#FCE7C2;border-color:#D97706}'
    + '.grow.free.focusrow input{accent-color:#D97706}'
    + '.grow.free.focusrow:hover{box-shadow:0 3px 10px rgba(217,119,6,.18)}';

  var HTML = ''
    + '<div class="brand"><span class="a1">we</span><span class="a2">calendar</span></div>'
    + '<div class="sub">Pick your free times here — it drops a booking link into your email and your recipient books instantly.</div>'
    + '<div id="signedout"><button class="btn" id="signin">Sign in to WeCalendar</button><div class="msg" id="soMsg"></div></div>'
    + '<div id="picker" class="hide">'
    +   '<div class="tpl hide" id="tpl">'
    +     '<button class="tplbtn" id="tplBtn" type="button">&#128231; CSM email templates<span class="chev">&#9662;</span></button>'
    +     '<div class="tplmenu hide" id="tplMenu">'
    +       '<div class="tplgrp">Pre-onboarding</div>'
    +       '<div class="tplopt" data-tpl="0"><span class="ic">&#128179;</span><div><div class="tt">Purchase your WeTransact plan</div><div class="td">How to buy on Microsoft Marketplace</div></div></div>'
    +       '<div class="tplopt" data-tpl="1"><span class="ic">&#128233;</span><div><div class="tt">Action your private offer</div><div class="td">Offer is live &mdash; action by a date</div></div></div>'
    +       '<div class="tplgrp">Onboarding</div>'
    +       '<div class="tplopt" data-tpl="2"><span class="ic">&#128075;</span><div><div class="tt">Onboarding kickoff</div><div class="td">Welcome &mdash; self-service or assisted</div></div></div>'
    +       '<div class="tplopt" data-tpl="15"><span class="ic">&#128203;</span><div><div class="tt">Call 1 recap</div><div class="td">Completed &amp; remaining after Partner Center setup</div></div></div>'
    +       '<div class="tplopt" data-tpl="3"><span class="ic">&#9989;</span><div><div class="tt">Session recap</div><div class="td">Status, completed &amp; next steps</div></div></div>'
    +       '<div class="tplopt" data-tpl="4"><span class="ic">&#9203;</span><div><div class="tt">Blocked milestone &mdash; nudge</div><div class="td">Unblock the pending item</div></div></div>'
    +       '<div class="tplopt" data-tpl="5"><span class="ic">&#9208;&#65039;</span><div><div class="tt">Onboarding on hold</div><div class="td">Value they can already use while paused</div></div></div>'
    +       '<div class="tplopt" data-tpl="6"><span class="ic">&#9888;&#65039;</span><div><div class="tt">Go-live at risk</div><div class="td">Escalation &mdash; confirm date or replan</div></div></div>'
    +       '<div class="tplgrp">Go-live</div>'
    +       '<div class="tplopt" data-tpl="7"><span class="ic">&#128640;</span><div><div class="tt">Live and transactable</div><div class="td">Go-live actions + payout brief for Finance</div></div></div>'
    +       '<div class="tplopt" data-tpl="8"><span class="ic">&#129309;</span><div><div class="tt">Meet your Account Manager</div><div class="td">Handoff from onboarding to your AM</div></div></div>'
    +       '<div class="tplgrp">Activation</div>'
    +       '<div class="tplopt" data-tpl="9"><span class="ic">&#128200;</span><div><div class="tt">GTM plan &mdash; Co-sell</div><div class="td">Marketplace GTM plan in 4 weeks</div></div></div>'
    +       '<div class="tplopt" data-tpl="10"><span class="ic">&#128257;</span><div><div class="tt">GTM plan &mdash; P2P</div><div class="td">Reseller GTM plan in 4 weeks</div></div></div>'
    +       '<div class="tplopt" data-tpl="11"><span class="ic">&#128197;</span><div><div class="tt">Book your first GTM session</div><div class="td">Turn your listing into a sales channel</div></div></div>'
    +       '<div class="tplopt" data-tpl="12"><span class="ic">&#127891;</span><div><div class="tt">Certification &mdash; Transact Tribe</div><div class="td">Enroll the team before the deadline</div></div></div>'
    +       '<div class="tplopt" data-tpl="13"><span class="ic">&#129520;</span><div><div class="tt">GTM tools demo</div><div class="td">30 min mapped to their goal</div></div></div>'
    +       '<div class="tplopt" data-tpl="14"><span class="ic">&#9200;</span><div><div class="tt">GTM sessions follow-up</div><div class="td">Unused sessions in their plan</div></div></div>'
    +     '</div>'
    +     '<div class="tplhint hide" id="tplHint">Pick one — it fills the subject &amp; body. Edit the highlighted blanks before sending.</div>'
    +     '<button class="btn sec" id="pbBtn" type="button" style="margin-top:8px">&#128216; Attach onboarding playbook</button>'
    +     '<div id="pbForm" class="hide">'
    +       '<label>Client company name</label>'
    +       '<input type="text" id="pbCompany" autocomplete="off" placeholder="e.g. SmartFense">'
    +       '<label>Booking link (optional)</label>'
    +       '<input type="text" id="pbLink" autocomplete="off" placeholder="https://…">'
    +       '<label>Client portal link (optional) — personalises the Global Admin guide</label>'
    +       '<input type="text" id="pbPortal" autocomplete="off" placeholder="https://…">'
    +       '<button class="btn" id="pbGo" type="button" style="margin-top:10px">Personalize &amp; attach PDF</button>'
    +       '<div class="msg" id="pbMsg"></div>'
    +     '</div>'
    +   '</div>'
    +   '<button class="btn sec" id="dkBtn" type="button" style="margin-top:8px" title="Search WeTransact Docs, attach the guide as a branded PDF or drop the link into your email">&#128196; Insert a guide</button>'
    +   '<div id="dkPanel" class="dkwrap hide">'
    +     '<input type="text" id="dkIn" autocomplete="off" placeholder="Search a guide — or paste a docs link">'
    +     '<div id="dkRes" class="dkres"></div>'
    +     '<div class="chips" id="dkChips"></div>'
    +     '<div class="dkinstr" id="dkInstr" title="Adds a short, pre-written summary of each guide to the email">'
    +       '<span class="dksw" id="dkSw"></span>'
    +       '<span><span class="tt">Include instructions</span><br><span class="td">Adds a short summary of each guide to the email</span></span>'
    +     '</div>'
    +     '<div class="dkprev hide" id="dkPrev"></div>'
    +     '<button class="btn" id="dkGo" type="button" style="margin-top:10px">&#128216; Attach as PDF</button>'
    +     '<button class="btn sec" id="dkIns" type="button" style="margin-top:8px">Insert links instead</button>'
    +     '<div class="msg" id="dkMsg"></div>'
    +   '</div>'
    +   '<div class="or hide" id="tplOr" style="margin:8px 0 2px">or share your free times</div>'
    +   '<button class="btn sec" id="mcBtn" type="button" style="margin-top:8px" title="Instantly create and copy a booking link from your free time over the next 2 weeks — no painting needed">&#128279; Copy my calendar link</button>'
    +   '<div class="msg" id="mcMsg"></div>'
    +   '<div class="or" style="margin:12px 0 2px">or pick specific times</div>'
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

  function loadSettings(){ if (!TOKEN) return; fetch(WC.FN_BASE + "/host-settings", { method: "POST", headers: { "Content-Type": "application/json", apikey: WC.SUPABASE_ANON_KEY, Authorization: "Bearer " + TOKEN } }).then(function(r){ return r.json(); }).then(function(s){ if (s && typeof s.workStart === "number"){ WS = s.workStart; WE = s.workEnd; BUF = s.buffer || 0; MINNOTICE = s.minNotice || 0; DAYCAP = s.dayCap || 0; if (LAST && SLOTS.length) pick(LAST.scope, LAST.date); } }).catch(function(){}); }
  function niceName(email){ var lp = String(email || "").split("@")[0]; if (!lp) return ""; return lp.replace(/[._\-]+/g, " ").replace(/\d+/g, "").replace(/\s+/g, " ").trim().replace(/\b\w/g, function(c){ return c.toUpperCase(); }); }
  function loadProfile(){ if (!TOKEN) return; fetch("https://graph.microsoft.com/v1.0/me?$select=displayName", { headers: { Authorization: "Bearer " + TOKEN } }).then(function(r){ return r.json(); }).then(function(j){ if (j && j.displayName) NAME = j.displayName; }).catch(function(){}); }
  function graphAll(url, acc){ return fetch(url, { headers: { Authorization: "Bearer " + TOKEN, Prefer: 'outlook.timezone="UTC"' } }).then(function(r){ if (r.status === 401) throw { expired: true }; return r.json(); }).then(function(j){ acc = acc.concat(j.value || []); var nx = j["@odata.nextLink"]; if (nx && acc.length < 2000) return graphAll(nx, acc); return acc; }); }
  // Focus time stays out of the auto-picked free blocks, but shows up as a tickable
  // amber row: yours to keep by default, yours to hand to a client when it's urgent.
  function isFocusEv(ev){
    if (ev.isAllDay || ev.showAs === "oof") return false;
    var myEm = (EMAIL || "").toLowerCase();
    var others = (ev.attendees || []).some(function(a){ var e = (a.emailAddress && a.emailAddress.address || "").toLowerCase(); return e && e !== myEm; });
    if (others) return false;
    if ((ev.categories || []).join(" ").toLowerCase().indexOf("focus") >= 0) return true;
    var s = (ev.subject || "").trim().toLowerCase();
    return /^focus$|^(focus\s*(time|block|session)|deep\s*work|heads?[\s-]?down|no\s*meetings?)\b/.test(s) || /\bfocus time\b|\bdeep work\b/.test(s);
  }
  function pick(scope, date){
    var msg = $("msg"); msg.className = "msg"; msg.textContent = "Reading your calendar…"; SLOTS = []; BUSY = []; OFFV = {}; VIEWDAYS = []; FOCUSHOWN = {}; renderSlots();
    LAST = { scope: scope, date: date };
    var days = daysFor(scope, date);
    WEEKMON = (scope === "week") ? days[0] : null;
    if (scope === "week"){ $("wkLabel").textContent = weekLabel(days[0], days[days.length - 1]); $("weekNav").classList.remove("hide"); }
    else { $("weekNav").classList.add("hide"); }
    var PAD = 48 * 3600000;
    var ws = new Date(new Date(days[0].getFullYear(), days[0].getMonth(), days[0].getDate()).getTime() - PAD);
    var last = days[days.length - 1], we = new Date(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).getTime() + PAD);
    var url = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({ startDateTime: ws.toISOString(), endDateTime: we.toISOString(), "$select": "start,end,showAs,isAllDay,responseStatus,subject,attendees,organizer,isOrganizer,categories", "$top": "200" });
    graphAll(url, []).then(function(items){
        var busy = [], offDays = {}, seenB = {};
        items.forEach(function(ev){
          if (!ev.start || !ev.start.dateTime || !ev.end || !ev.end.dateTime || ev.showAs === "free" || ev.showAs === "workingElsewhere") return;
          if (ev.responseStatus && ev.responseStatus.response === "declined") return;
          // Someone ELSE's OOO invite on my calendar (teammate sent "I'm OOO" to the team)
          // is informational — it must not block my day or show me as out of office.
          if (ev.showAs === "oof"){ var oorg = (ev.organizer && ev.organizer.emailAddress && ev.organizer.emailAddress.address || "").toLowerCase(); if (ev.isOrganizer === false || (oorg && EMAIL && oorg !== EMAIL.toLowerCase())) return; }
          var s = new Date(ev.start.dateTime + "Z"), e = new Date(ev.end.dateTime + "Z");
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
          if (ev.isAllDay){ for (var t = s.getTime(); t < e.getTime(); t += 86400000){ var od = new Date(t); offDays[od.getUTCFullYear() + "-" + od.getUTCMonth() + "-" + od.getUTCDate()] = true; } }
          else { var bk = s.getTime() + "_" + e.getTime() + "_" + (ev.subject || ""); if (!seenB[bk]){ seenB[bk] = 1; var myEm = (EMAIL || "").toLowerCase(); var orgEm = (ev.organizer && ev.organizer.emailAddress && ev.organizer.emailAddress.address || "").toLowerCase(); var hasOthers = (ev.attendees || []).some(function(a){ var ae = (a.emailAddress && a.emailAddress.address || "").toLowerCase(); return ae && ae !== myEm; }) || (orgEm && orgEm !== myEm); busy.push({ start: s, end: e, subject: ev.subject || "", mtg: hasOthers, focus: isFocusEv(ev) }); } }
        });
        var nowMs = Date.now(), nw = nowMs + MINNOTICE * 3600000, minLen = SLOTLEN * 60000, bufMs = BUF * 60000;
        days.forEach(function(d){
          var ws2 = zInstant(d.getFullYear(), d.getMonth(), d.getDate(), WS);
          var we2 = zInstant(d.getFullYear(), d.getMonth(), d.getDate(), WE);
          if (scope === "week" && we2 <= nowMs) return;
          var mid = new Date(Math.floor((ws2 + we2) / 2)), key = dayKey(mid);
          VIEWDAYS.push({ key: key, label: fmtDay(mid) });
          if (offDays[d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()]){ OFFV[key] = true; return; }
          busy.forEach(function(b){ if (b.end.getTime() > Math.max(ws2, nowMs) && b.start.getTime() < we2) BUSY.push({ start: b.start, end: b.end, subject: b.subject, mtg: b.mtg, focus: b.focus, key: key }); });
          var segs = busy.filter(function(b){ return b.end.getTime() > ws2 && b.start.getTime() < we2; }).map(function(b){ return [b.start.getTime() - bufMs, b.end.getTime() + bufMs]; }).sort(function(a, b){ return a[0] - b[0]; });
          var cur = Math.max(ws2, nw);
          segs.forEach(function(sg){ if (sg[0] > cur && Math.min(sg[0], we2) - cur >= minLen) SLOTS.push({ start: new Date(cur), end: new Date(Math.min(sg[0], we2)), sel: true, key: key }); if (sg[1] > cur) cur = sg[1]; });
          if (we2 - cur >= minLen) SLOTS.push({ start: new Date(cur), end: new Date(we2), sel: true, key: key });
          // focus blocks — offered, never auto-ticked
          busy.forEach(function(b){
            if (!b.focus) return;
            var fs = Math.max(b.start.getTime(), ws2, nw), fe = Math.min(b.end.getTime(), we2);
            if (fe - fs < minLen) return;
            FOCUSHOWN[key + "_" + b.start.getTime()] = 1;
            SLOTS.push({ start: new Date(fs), end: new Date(fe), sel: false, focus: true, subject: b.subject, key: key });
          });
        });
        renderSlots();
        var nFoc = SLOTS.filter(function(s){ return s.focus; }).length, nFree = SLOTS.length - nFoc;
        if (SLOTS.length){ msg.className = "msg"; msg.textContent = nFree + " free block" + (nFree === 1 ? "" : "s") + (nFoc ? " · " + nFoc + " focus block" + (nFoc === 1 ? "" : "s") + " you can tick too" : "") + " — tick the ones to offer, then Copy slots."; }
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
      (busyByKey[vd.key] || []).forEach(function(b){ if (b.focus && FOCUSHOWN[vd.key + "_" + b.start.getTime()]) return; rows.push({ t: b.start.getTime(), busy: b }); });
      (freeByKey[vd.key] || []).forEach(function(i){ rows.push({ t: SLOTS[i].start.getTime(), free: i }); });
      rows.sort(function(a, b){ return a.t - b.t; });
      if (!rows.length){ h += '<div class="grow off"><span class="ttl">No open time in your working hours</span></div>'; return; }
      rows.forEach(function(r){
        if (r.busy){ h += '<div class="grow busy' + (r.busy.mtg ? ' mtg' : ' solo') + '"><span class="dot"></span><span class="tmcol">' + fmtTime(r.busy.start) + ' &ndash; ' + fmtTime(r.busy.end) + '</span><span class="ttl">' + esc(r.busy.subject || "Busy") + '</span></div>'; }
        else { var x = SLOTS[r.free]; h += '<label class="grow free' + (x.focus ? " focusrow" : "") + (x.sel ? " on" : "") + '" title="' + (x.focus ? "Your focus time — tick it only when a client really needs this slot" : "") + '"><input type="checkbox" data-i="' + r.free + '"' + (x.sel ? " checked" : "") + '><span class="tmcol">' + fmtTime(x.start) + ' &ndash; ' + fmtTime(x.end) + '</span><span class="ttl">' + (x.focus ? '\u26A1 Focus time' + (x.subject ? ' · ' + esc(x.subject) : '') + ' — tick to offer' : 'Free · ' + durLabel(x.end - x.start)) + '</span></label>'; }
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
    /* 0 — P1 · Purchase your WeTransact plan (Pre-onboarding) */
    {
      subject: "{Company} | How to purchase your WeTransact plan on Microsoft Marketplace",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Great meeting you and the team. The next step is purchasing your WeTransact plan through Microsoft Marketplace.</p>"
        + "<p><b>What you need to know:</b></p>"
        + "<ul><li><b>Plan:</b> {Plan name}</li><li><b>Who buys:</b> your Microsoft <b>Global Admin</b> — Microsoft requires this role to complete the transaction.</li><li><b>How:</b> first Marketplace purchase? No worries — the attached step-by-step guide covers every click.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Forward this email to your Global Admin, {Admin name}.</li><li>Complete the purchase by {date} so your onboarding starts on schedule.</li></ul>"
        + "<p>Any questions, just reply — or grab a slot: {Booking link}</p>"
        + "<p>&nbsp;</p>"
        + "<p style='color:#8A8A8A;font-size:12px'><i>Optional — private plan variant (delete this note before sending): replace the “Plan” bullet with → <b>Plan:</b> we&rsquo;ve issued your private offer, {Plan name}, and it&rsquo;s ready for purchase. A private offer has a few extra acceptance steps — they&rsquo;re all in the guide.</i></p>"
    },
    /* 1 — P2 · Action your private offer (Pre-onboarding) */
    {
      subject: "Your private offer is live — action required by {date}",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Your private offer is now live and ready to be actioned.</p>"
        + "<p><b>What you need to know:</b></p>"
        + "<ul><li>Microsoft has emailed you a direct link to the offer — here it is again just in case: {Offer link}</li><li>The attached guide walks you through the full flow: accepting the offer, purchasing, and completing the landing page.</li><li>Your <b>Global Admin</b> should complete the transaction, per Microsoft's guidelines.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Accept and purchase the offer by {date}, following the guide step by step.</li></ul>"
        + "<p>If anything is unclear at any step, reply here and I'll jump on a call with you.</p>"
    },
    /* 2 — A1 · Onboarding kickoff (Onboarding) */
    {
      subject: "Welcome to WeTransact — let's get {Company} live in one week",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Welcome to WeTransact! I'm {CSM name}, your Customer Success Manager, and I'll get you live on Microsoft Marketplace.</p>"
        + "<p>Your portal is already live 🎉: {Portal link} — log in with Microsoft SSO by clicking the Microsoft icon.</p>"
        + "<p>For a full overview of what to expect, see the onboarding checklist 👉 <a href='https://bestpractices.wetransact.io/onboarding'>bestpractices.wetransact.io/onboarding</a></p>"
        + "<p>📘 <b>Your onboarding playbook</b> — check the attached playbook for who does what. Each role card carries its own PDF link — just forward the right one-pager to your Global Admin, Finance and Marketing leads.</p>"
        + "<p>⚠️ <b>Important:</b> only the Partner Center <b>Global Admin</b> can perform the onboarding process.</p>"
        + "<p><b>Option A — Self-service, start today</b></p>"
        + "<ol><li>Go to {Portal link} and log in with Microsoft SSO.</li><li>After signing in, select <b>Set up Partner Center</b> and follow the steps.</li></ol>"
        + "<p>The flow walks you through at your own pace — complete as much as you can, and anything left pending we'll finish together on our calls. The more you complete upfront, the faster your listing goes live.</p>"
        + "<p><b>Option B — Assisted, two short meetings with me</b></p>"
        + "<ul><li><b>Partner Center setup (30 min)</b> — with your Global Admin: granting WeTransact access (<a href='https://docs.wetransact.io/step-6-grant-wetransact-access-to-partner-center'>how-to guide</a>) and your Tax &amp; Payout profile (everything Finance needs: <a href='https://wecalendar.github.io/Forward-to-Finance.pdf'>one-pager</a>).</li><li><b>Platform walkthrough (30 min)</b> — with your Product Marketing Manager: portal navigation, build &amp; publish your listing (collateral list: <a href='https://wecalendar.github.io/Forward-to-Marketing.pdf'>one-pager</a>).</li></ul>"
        + "<p><b>Post onboarding:</b> Go-to-Market strategy meetings, once your listing has gone live.</p>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Loop in your Finance controller, Product Marketing Manager and Partner Center Global Admin — the playbook tells each of them exactly what to prepare.</li><li>Choose self-service or assisted, and have the details ready before each meeting so we keep the one-week onboarding timeline we promise.</li></ul>"
        + "<p>Do you think you'll have the finance details ready for this week's meeting? Let me know what works best — book a call here: {Booking link} or just send me your availability.</p>"
    },
    /* 3 — A2 · Session recap (Onboarding) */
    {
      subject: "{Company} | WeTransact: status, {status in a few words}, next session {date}",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Thanks for your time today — here's the summary of our {Session type} session.</p>"
        + "<p style='color:#1A66C9;font-weight:700;text-decoration:underline;margin:0 0 4px'>Current status:</p>"
        + "<p style='margin:0 0 10px'>{One line — e.g. Partner Center is set up and the payout profile is submitted; Microsoft validation takes up to 48 hours}</p>"
        + "<p style='color:#039855;font-weight:700;text-decoration:underline;margin:0 0 4px'>What we completed today:</p>"
        + "<ul style='margin:0 0 10px'><li>{Thing one}</li><li>{Thing two}</li></ul>"
        + "<p style='color:#C2261B;font-weight:700;text-decoration:underline;margin:0 0 4px'>Next steps:</p>"
        + "<ul style='margin:0 0 10px'><li>{Action} — owner {name}, by {date}</li><li>{Action} — owner {name}, by {date}</li><li>{Action} — Microsoft, expected {date}</li></ul>"
        + "<p>Next session: {Date and time}, {topic}. Please have {prerequisite} ready before then.</p>"
        + "<p>Reply to this email if anything above isn't accurate.</p>"
    },
    /* 4 — A3 · Blocked milestone — first nudge (Onboarding) */
    {
      subject: "Blocked: {milestone}",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>{pending item} is the only thing between {Company} and {milestone} — we aligned on the timeline in our last meeting.</p>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Reply with what's blocking {pending item}.</li><li>Share your realistic timeline to resolution, so I can plan the next steps around it.</li></ul>"
        + "<p>&nbsp;</p>"
        + "<p style='color:#8A8A8A;font-size:12px'><i>Optional add-on — keep momentum by swapping sessions (keep the text below and delete this note, or delete both):</i></p>"
        + "<p>Given the delay on {blocked item, e.g. Partner Center setup}, I propose we keep our {next session, e.g. platform demo} on {date} as planned:</p>"
        + "<ul><li>We'll build your product listing in that session, so we're ready to publish the moment {blocked item} is complete.</li><li>Please have your marketing prerequisites on hand for the meeting.</li></ul>"
    },
    /* 5 — A3 · Onboarding on hold — keep the tools (Onboarding) */
    {
      subject: "Onboarding paused — what {Company} can still use today",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Understood that internal priorities come first right now. Even with your listing not live yet, your team can already get value from the platform:</p>"
        + "<ul><li><b>Target Customers</b> and the <b>Partner Directory</b> — data sets to identify strong leads and potential partnerships now.</li><li><b>Microsoft Marketplace Masterclass</b> — available via the Help tab in your portal.</li><li>Key documentation and walkthrough videos: {docs / Loom links}</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>We resume onboarding on {agreed date} — I'll hold that slot.</li></ul>"
        + "<p>Any questions before then, just reach out. Looking forward to reconnecting.</p>"
    },
    /* 6 — A3 · Go-live at risk — escalation (Onboarding) */
    {
      subject: "{target date} go-live is at risk",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Without {pending item} by {date}, we will miss the {target date} live date we aligned on. Our onboarding is designed as a one-week process, and this is the last open item.</p>"
        + "<p><b>To move forward, please either:</b></p>"
        + "<ol><li>Confirm {pending item} lands by {date} and we stay on track, or</li><li>Give me a realistic timeline so I replan around it.</li></ol>"
        + "<p>Once it's in, I'll review the same day and monitor the publication process until you're live.</p>"
    },
    /* 7 — A4 · Live and transactable (Go-live) */
    {
      subject: "🎉 {Company} is live and transactable on Microsoft Marketplace",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Congratulations — {Company} is live and transactable.</p>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Notify your Finance team about Marketplace payout (summary below).</li><li>Announce the milestone externally — best practices here: <a href='https://bestpractices.wetransact.io/'>https://bestpractices.wetransact.io/</a></li></ul>"
        + "<p><b>Test purchase — nothing to do on your end:</b></p>"
        + "<ul><li>We'll run a real test purchase and cancel it right after, to confirm the buying flow works end to end.</li><li>We cancel the order and remove it from your Orders tab.</li></ul>"
        + "<p><b>Marketplace payout, in brief for Finance:</b></p>"
        + "<ul><li><b>Microsoft margin:</b> 3% on new deals, 1.5% on renewals, based on TCV.</li><li><b>Payout:</b> Microsoft invoices your customer and pays you on the 15th of the month after collection. Timing depends on the customer's Microsoft contract:<ul><li>Next-day on MCA (standard)</li><li>Within 45 days on Enterprise Agreement or pay-as-you-go</li><li>Within 75 days through a reseller</li></ul></li><li><b>Taxes:</b> Microsoft manages taxes end to end in most geos, based on your end customer's location.</li></ul>"
        + "<p>Everything Finance will ask is here: <a href='https://docs.wetransact.io/finance-how-marketplace-finance-works'>How Marketplace finance works</a> — for anything else please visit <a href='https://docs.wetransact.io'>WeTransact Docs | Help Center</a>.</p>"
    },
    /* 8 — A5 · Meet your Account Manager (Go-live) */
    {
      subject: "Introducing your WeTransact Account Manager",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Now that onboarding is complete, I'd like to introduce {AM name}, your WeTransact Account Manager and main point of contact moving forward.</p>"
        + "<p><b>What {AM name} helps you with:</b></p>"
        + "<ul><li>Aligning on your Marketplace goals and tracking progress against them.</li><li>Sharing best practices and supporting your GTM initiatives.</li><li>Connecting you with relevant resources and partners.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>{AM name}, meet {First name} — please pick a slot for your intro call: {booking link}</li></ul>"
        + "<p>Looking forward to the great things ahead.</p>"
    },
    /* 9 — B1 · GTM plan in 4 weeks — Co-sell track (Activation) */
    {
      subject: "{Company} Microsoft Marketplace GTM plan in 4 weeks",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Now that your listing is live, let's build your Microsoft Marketplace GTM plan. Two instrumental ways to get this done right:</p>"
        + "<p><b>1. Value proposition to first campaign</b></p>"
        + "<ul><li>Register for our fundamentals training: {registration link}</li><li>Outcome: your Microsoft Marketplace value proposition defined and your first outreach campaign launched within 4 weeks.</li></ul>"
        + "<p><b>2. Marketplace marketing best practices</b></p>"
        + "<ul><li>Curated best practices from Microsoft Marketplace marketers, to streamline adoption across your sales and marketing team.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Register for the training and share the best practices with your team.</li></ul>"
    },
    /* 10 — B2 · GTM plan in 4 weeks — P2P track (Activation) */
    {
      subject: "{Company} Microsoft Reseller GTM plan in 4 weeks",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Now that your listing is live, let's build your Microsoft Reseller GTM plan. Two instrumental ways to get this done right:</p>"
        + "<p><b>1. Value proposition to first campaign</b></p>"
        + "<ul><li>Register for our fundamentals training: {registration link}</li><li>Outcome: your Microsoft Reseller value proposition defined and your first reseller recruitment campaign launched within 4 weeks.</li></ul>"
        + "<p><b>2. Marketplace marketing best practices</b></p>"
        + "<ul><li>Curated marketers' best practices, to streamline Marketplace adoption across your partner and marketing team.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Register for the training and share the best practices with your team.</li></ul>"
    },
    /* 11 — B3 · Book your first GTM session (Activation) */
    {
      subject: "Go-to-market with WeTransact — book your first GTM session",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Next phase: turning your live listing into an efficient sales channel. Cloud marketplaces work differently from the channels you're used to — and we'll guide you through it.</p>"
        + "<p><b>What the session covers:</b></p>"
        + "<ul><li>A deep understanding of the Marketplace channel and how buyers use it.</li><li>You pick a focus area at the end, and we build a tailor-made plan around it with you.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Book your session here: {booking link}</li></ul>"
    },
    /* 12 — B4 · Certification — Transact Tribe (Activation) */
    {
      subject: "WeTransact certification learning path — enroll before {deadline}",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>To build your go-to-market strategy on solid ground, we run a certification course for you and your team.</p>"
        + "<p><b>What you get:</b></p>"
        + "<ul><li>A structured learning path on selling through cloud marketplaces.</li><li>A cohort format — your whole team can enroll and get certified together.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Enroll in the next cohort before {deadline}: {enrollment link}</li></ul>"
    },
    /* 13 — B5 · GTM tools demo (Activation) */
    {
      subject: "30 minutes this week — GTM tools mapped to your {goal} goal",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Your listing is live — time to shift gears to GTM. In our kickoff you mentioned your goal is {goal, e.g. leveraging co-sell with Microsoft}.</p>"
        + "<p><b>What I'll show you (30 min):</b></p>"
        + "<ul><li>The platform's GTM tools — Target Customers, Partner Directory and more.</li><li>Specifically, how to use them to reach your {goal} faster.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Pick a slot this week: {availability or booking link}</li></ul>"
    },
    /* 14 — B6 · GTM sessions follow-up (Activation) */
    {
      subject: "Your GTM sessions are waiting — included in your {plan name} subscription",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Following up on your WeTransact go-to-market sessions — they're part of your {plan name} subscription and haven't been booked yet.</p>"
        + "<p><b>What you get:</b></p>"
        + "<ul><li>1:1 sessions with your GTM Specialist.</li><li>Outcome: identify the low-hanging fruit, then a GTM strategy to truly leverage the Microsoft Marketplace.</li></ul>"
        + "<p><b>Action required:</b></p>"
        + "<ul><li>Book your first session: {booking link}</li></ul>"
    },
    /* 15 — Call 1 recap (Onboarding, shown in menu right after the kickoff) */
    {
      subject: "Your onboarding recap & next steps",
      body: ""
        + "<p>Hi {First name},</p>"
        + "<p>&nbsp;</p>"
        + "<p>Thank you for your time today — we're thrilled to have you on board. As a follow-up, I wanted to outline the remaining tasks and share a few updates.</p>"
        + "<p style='color:#039855;font-weight:700;text-decoration:underline;margin:0 0 4px'>Completed tasks:</p>"
        + "<ul style='margin:0 0 10px'><li>Enrolling in Commercial Marketplace</li><li>Granting WeTransact access to your Partner Center</li><li>Access to the WeTransact Portal: {Portal link}</li><li>Completing the Tax and Payout profile</li></ul>"
        + "<p style='color:#C2261B;font-weight:700;text-decoration:underline;margin:0 0 4px'>Remaining tasks:</p>"
        + "<ul style='margin:0 0 10px'><li>Verifying the Legal info tab</li><li>Build listing and publish</li><li>Navigation of the WeTransact Publisher Portal</li></ul>"
        + "<p style='color:#1A66C9;font-weight:700;text-decoration:underline;margin:0 0 4px'>Next Step:</p>"
        + "<p style='margin:0 0 10px'>I'll keep you posted once it is completed. If you have any questions, please reach out to me directly.</p>"
    }
  ];
  function tplHL(s, vals){ return String(s).replace(/\{([^}]+)\}/g, function(_, t){ var v = vals && vals[t]; if (v) return esc(v); return '<span style="background-color:#FFEC99;color:#1a1a1a;">[' + t + ']</span>'; }); }
  function tplPlain(s, vals){ return String(s).replace(/\{([^}]+)\}/g, function(_, t){ var v = vals && vals[t]; return v ? v : "[" + t + "]"; }); }
  /* ---- Company name from the recipient's email domain (fills {Company} in the subject) ---- */
  var CO_GENERIC = (function(){ var m = {}, l = ["gmail.com","googlemail.com","outlook.com","outlook.co.uk","hotmail.com","hotmail.co.uk","hotmail.fr","hotmail.es","live.com","live.co.uk","msn.com","yahoo.com","yahoo.co.uk","yahoo.fr","yahoo.es","ymail.com","icloud.com","me.com","mac.com","aol.com","proton.me","protonmail.com","pm.me","gmx.com","gmx.de","gmx.net","web.de","mail.com","mail.ru","yandex.com","yandex.ru","zoho.com","qq.com","163.com","126.com","naver.com","hey.com","fastmail.com","btinternet.com","sky.com","orange.fr","free.fr","wanadoo.fr","sfr.fr","laposte.net","telefonica.net","terra.com","uol.com.br","bol.com.br","comcast.net","verizon.net","att.net","sbcglobal.net","rediffmail.com"]; l.forEach(function(d){ m[d] = 1; }); return m; })();
  var CO_HOME = /@(wetransact|awssome)\.io$/i;
  var CO_SLD = { co:1, com:1, net:1, org:1, gov:1, edu:1, ac:1, ltd:1, plc:1, or:1, ne:1, sch:1, gob:1, nom:1, gen:1, biz:1, info:1, mil:1 };
  var CO_NOISE = { www:1, mail:1, email:1, smtp:1, mx:1, corp:1, group:1, exchange:1, emea:1, us:1, uk:1 };
  var CO_FIX = { hubspot: "HubSpot", github: "GitHub", linkedin: "LinkedIn", paypal: "PayPal", youtube: "YouTube", powerbi: "Power BI", wetransact: "WeTransact", awssome: "AWSsome", smartfense: "SmartFense", ebay: "eBay", openai: "OpenAI", anthropic: "Anthropic", vmware: "VMware", redhat: "Red Hat", gitlab: "GitLab", bigid: "BigID", crowdstrike: "CrowdStrike", oneidentity: "One Identity", netapp: "NetApp", salesforce: "Salesforce", servicenow: "ServiceNow", snowflake: "Snowflake", databricks: "Databricks", mongodb: "MongoDB", postgresql: "PostgreSQL", nvidia: "NVIDIA", ibm: "IBM", sap: "SAP", aws: "AWS", kpmg: "KPMG", pwc: "PwC", ey: "EY", bt: "BT" };
  function coName(email){
    var raw = String(email || "").trim(); var ang = /<([^<>]+)>\s*$/.exec(raw); if (ang) raw = ang[1].trim();
    var m = /@([^@\s<>,;"']+)\s*$/.exec(raw); if (!m) return "";
    var host = m[1].toLowerCase().replace(/\.$/, "");
    if (CO_GENERIC[host]) return "";
    var parts = host.split(".").filter(Boolean); if (parts.length < 2) return "";
    var i = parts.length - 2;
    if (i > 0 && CO_SLD[parts[i]]) i--;                              /* foo.co.uk / foo.com.au */
    while (i > 0 && CO_NOISE[parts[i]]) i--;                          /* mail.foo.com handled above, corp.foo.com */
    var label = parts[i];
    if (!label || label.length < 2 || /^\d+$/.test(label)) return "";
    if (CO_FIX[label]) return CO_FIX[label];
    return label.split(/[-_]+/).filter(Boolean).map(function(w){ return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
  }
  var CO_ROLE = /^(info|hello|hi|hey|sales|support|contact|admin|administrator|team|billing|finance|accounts?|accounting|payable|receivable|marketing|noreply|no-reply|donotreply|office|help|helpdesk|legal|it|hr|invoice|invoices|ap|ar|partner|partners|procurement|purchasing|orders?|careers|jobs|press|media|security|privacy|webmaster|postmaster|enquiries|inquiries|general|mail)$/;
  function coCase(w){ return String(w).split("-").map(function(p){ return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p; }).join("-"); }
  var CO_NAMEOK = /^[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'’.-]*$/;
  function coFirst(name, email){
    var n = String(name || "").trim();
    if (/@/.test(n)) n = "";                                                  /* display name is just the address */
    if (n){
      if (n.indexOf(",") > -1){ var p = n.split(","); n = (p[1] || "").trim() || (p[0] || "").trim(); }   /* "Smith, John" */
      n = n.replace(/\([^)]*\)/g, " ").replace(/["'“”]/g, "").replace(/\s+/g, " ").trim();
      n = n.replace(/^(mr|mrs|ms|miss|dr|prof|sir|eng)\.?\s+/i, "");
      var f = (n.split(" ")[0] || "").replace(/[.,;:]+$/, "");
      if (f && f.length > 1 && CO_NAMEOK.test(f) && !CO_ROLE.test(f.toLowerCase())) return (f === f.toUpperCase() ? coCase(f) : f);   /* keep their casing, tidy ALL-CAPS */
    }
    var m = /^\s*([^@\s<>]+)@/.exec(String(email || "").replace(/^.*<|>.*$/g, "").trim() || String(email || "").trim());
    if (!m) return "";
    var lp = m[1].toLowerCase().replace(/\+.*$/, "");
    if (CO_ROLE.test(lp)) return "";
    var first = lp.split(/[._]+/)[0];                                          /* keep hyphenated first names intact */
    if (!first || first.length < 2 || /\d/.test(first) || CO_ROLE.test(first)) return "";
    return coCase(first);
  }
  function coRec(list){ for (var i = 0; i < (list || []).length; i++){ var r = list[i], em = (r && (r.emailAddress || r.address)) || ""; if (!em || CO_HOME.test(em)) continue; return r; } return null; }
  function coCtx(rec){ if (!rec) return { company: "", first: "" }; var em = rec.emailAddress || rec.address || ""; return { company: coName(em), first: coFirst(rec.displayName || rec.name || "", em) }; }
  function recipCtx(cb){
    var done = false, t = null;
    function fin(v){ if (done) return; done = true; if (t) clearTimeout(t); cb(v || { company: "", first: "" }); }
    t = setTimeout(function(){ fin(null); }, 2500);
    try {
      var it = Office.context.mailbox && Office.context.mailbox.item;
      if (!it || !it.to) return fin(null);
      if (!it.to.getAsync) return fin(coCtx(coRec(it.to) || coRec(it.cc)));   /* read mode */
      it.to.getAsync(function(r){
        var rec = coRec(r && r.value);
        if (rec || !(it.cc && it.cc.getAsync)) return fin(coCtx(rec));
        it.cc.getAsync(function(r2){ fin(coCtx(coRec(r2 && r2.value))); });
      });
    } catch(e){ fin(null); }
  }
  function setSubject(text){ try { var it = Office.context.mailbox && Office.context.mailbox.item; if (it && it.subject && it.subject.setAsync){ it.subject.setAsync(text); } } catch(e){} }
  var CSM_ALLOW = (function(){ var m = {}, list = ["ruby.sran@wetransact.io", "divyashree.g@wetransact.io", "em.labrador@wetransact.io", "javier.albala@wetransact.io", "leya.zheng@wetransact.io", "paula.jimenez@wetransact.io", "thaddeus.uzornne@wetransact.io", "thomas.roche@wetransact.io", "mariana.figueiredo@wetransact.io", "alexandre.pascal@wetransact.io", "nikki.maan@wetransact.io"]; list.forEach(function(e){ m[e] = 1; }); return m; })();
  function currentUserEmail(){ var e = ""; try { e = (Office.context && Office.context.mailbox && Office.context.mailbox.userProfile && Office.context.mailbox.userProfile.emailAddress) || ""; } catch(_){} if (!e) e = EMAIL || ""; return String(e).trim().toLowerCase(); }
  function isCSM(){ var e = currentUserEmail(); return /@wetransact\.io$/.test(e) && !!CSM_ALLOW[e]; }
  /* signed-in CSM's own first name — fills {CSM name} */
  function csmFirstName(){
    var em = currentUserEmail(), dn = "";
    try { dn = (Office.context && Office.context.mailbox && Office.context.mailbox.userProfile && Office.context.mailbox.userProfile.displayName) || ""; } catch(_){}
    if (!dn) dn = NAME || "";                                   /* Graph /me displayName, loaded by loadProfile() */
    var f = coFirst(dn, em);
    return f || "";
  }
  function applyCSMGate(){ var t = $("tpl"), o = $("tplOr"), show = isCSM(); if (t) t.classList.toggle("hide", !show); if (o) o.classList.toggle("hide", !show); }
  (function(){
    var wrap = $("tpl"), btn = $("tplBtn"), menu = $("tplMenu"), hint = $("tplHint"); if (!btn) return;
    function setOpen(o){ wrap.classList.toggle("open", o); menu.classList.toggle("hide", !o); hint.classList.toggle("hide", !o); }
    btn.onclick = function(){ setOpen(menu.classList.contains("hide")); };
    [].forEach.call(menu.querySelectorAll(".tplopt"), function(el){ el.onclick = function(){
      var t = CSMTPL[+el.dataset.tpl]; if (!t) return; var msg = $("msg"); setOpen(false);
      recipCtx(function(ctx){
        var vals = {}; if (ctx.company) vals["Company"] = ctx.company; if (ctx.first) vals["First name"] = ctx.first;
        var me = csmFirstName(); if (me) vals["CSM name"] = me;
        setSubject(tplPlain(t.subject, vals));
        try { var pc = $("pbCompany"); if (pc && !pc.value && ctx.company) pc.value = ctx.company; } catch(_){}
        var who = [ctx.first, ctx.company].filter(Boolean).join(" · ");
        insertHtml(tplHL(t.body, vals), msg, who
          ? "✓ Template added — filled in for " + who + " (check the spelling). Complete the highlighted blanks before sending."
          : "✓ Template added — fill in the highlighted blanks before sending.");
      });
    }; });
  })();

  /* ---- Personalized onboarding playbook attach (CSM-gated via #tpl) ---- */
  var PB_TPL_URL = "https://wecalendar.github.io/playbook-template.pdf";
  var PB_FONT_BOLD = "https://wecalendar.github.io/GreycliffCF-Bold.ttf";
  var PB_FONT_MED = "https://wecalendar.github.io/GreycliffCF-Medium.ttf";
  var PB_FALLBACK_URL = "https://wecalendar.github.io/WeTransact-Onboarding-Playbook.pdf";
  var PB_GA_PDF = "https://wecalendar.github.io/Forward-to-Global-Admin.pdf";
  var PB_GA_PAGE = "https://wecalendar.github.io/ga.html";
  var PB_SELF_PDF = "https://wecalendar.github.io/WeTransact-Onboarding-Playbook.pdf";
  var PB_SELF_PAGE = "https://wecalendar.github.io/pb.html";
  /* Ruby 2026-08-26: one attachment as always, but when a portal link is given
     the playbook's "Download & forward … Global Admin" link points at ga.html,
     which hands the Alliance Manager a GA one-pager with THEIR portal link
     stamped into the self-service step (a static PDF can't be per-client). */
  function pbSetLink(doc, PL, from, to){
    var changed = [];
    try {
      doc.getPages().forEach(function(p){
        var annots = p.node.Annots ? p.node.Annots() : null; if (!annots) return;
        for (var i = 0; i < annots.size(); i++){
          try {
            var a = annots.lookup(i, PL.PDFDict);
            var act = a && a.lookup(PL.PDFName.of("A"), PL.PDFDict); if (!act) continue;
            var u = act.lookup(PL.PDFName.of("URI"));
            var txt = u && u.decodeText ? u.decodeText() : "";
            if (txt === from){ act.set(PL.PDFName.of("URI"), PL.PDFString.of(to)); changed.push(a); }
          } catch(e){}
        }
      });
    } catch(e){}
    return changed;
  }
  var _pbLibs = null, _pbAssets = null;
  function pbScript(src){ return new Promise(function(res, rej){ var sc = document.createElement("script"); sc.src = src; sc.onload = res; sc.onerror = function(){ rej(new Error("couldn't load PDF library")); }; document.head.appendChild(sc); }); }
  function pbLoadLibs(){ if (!_pbLibs){ _pbLibs = Promise.resolve().then(function(){ if (!window.PDFLib) return pbScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"); }).then(function(){ if (!window.fontkit) return pbScript("https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js"); }); } return _pbLibs; }
  function pbFetch(url){ return fetch(url).then(function(r){ if (!r.ok) throw new Error("download failed (" + r.status + ")"); return r.arrayBuffer(); }); }
  function pbLoadAssets(){ if (!_pbAssets){ _pbAssets = Promise.all([pbFetch(PB_TPL_URL), pbFetch(PB_FONT_BOLD), pbFetch(PB_FONT_MED)]); } return _pbAssets; }
  function pbBuild(company, link, portal){
    return pbLoadLibs().then(pbLoadAssets).then(function(assets){
      var PL = window.PDFLib;
      return PL.PDFDocument.load(assets[0]).then(function(doc){
        doc.registerFontkit(window.fontkit);
        return Promise.all([doc.embedFont(assets[1], { subset: true }), doc.embedFont(assets[2], { subset: true })]).then(function(fonts){
          var bold = fonts[0], med = fonts[1], p1 = doc.getPage(0);
          var purple = PL.rgb(0.369, 0.263, 0.784), muted = PL.rgb(0.396, 0.396, 0.471);
          /* cover: Prepared for {company} */
          var t = "Prepared for " + company, size = 13;
          while (bold.widthOfTextAtSize(t, size) > 380 && size > 8) size -= 0.5;
          p1.drawText(t, { x: 40, y: 692, size: size, font: bold, color: purple });
          /* footer: CSM + booking link */
          var me = NAME || niceName(EMAIL) || "";
          var foot = me ? (" · Your CSM: " + me) : "";
          if (link) foot += " · Book time: " + link;
          if (foot){ var fsz = 8; while (med.widthOfTextAtSize(foot, fsz) > 392 && fsz > 5.5) fsz -= 0.25; p1.drawText(foot, { x: 87, y: 23.5, size: fsz, font: med, color: muted }); }
          /* "Share this playbook" must hand out the SAME personalised copy —
             Ruby 2026-08-26: clicking it gave the generic {Company} version. It
             now points at pb.html, which rebuilds this exact PDF in the
             recipient's browser (and its own share link recurses). */
          var shareUrl = PB_SELF_PAGE + "?c=" + encodeURIComponent(company)
            + (portal ? "&p=" + encodeURIComponent(portal) : "")
            + (link ? "&b=" + encodeURIComponent(link) : "")
            + (me ? "&n=" + encodeURIComponent(me) : "");
          var share = pbSetLink(doc, PL, PB_SELF_PDF, shareUrl);
          if (share.length){
            p1.drawRectangle({ x: 157.5, y: 467.5, width: 303, height: 14, color: PL.rgb(1, 1, 1) });
            var ptxt = "your personalised copy \u00bb", psz = 10, pw = bold.widthOfTextAtSize(ptxt, psz);
            p1.drawText(ptxt, { x: 160, y: 471.4, size: psz, font: bold, color: purple });
            p1.drawRectangle({ x: 160, y: 469.6, width: pw, height: 0.7, color: purple });
            try { share[0].set(PL.PDFName.of("Rect"), doc.context.obj([160, 469.4, 160 + pw, 481])); } catch(e){}
          }
          if (portal) pbSetLink(doc, PL, PB_GA_PDF, PB_GA_PAGE + "?p=" + encodeURIComponent(portal) + "&c=" + encodeURIComponent(company));
          return doc.saveAsBase64();
        });
      });
    });
  }
  function pbToken(c){ return String(c || "").replace(/[^A-Za-z0-9 _-]/g, "").trim().replace(/\s+/g, "-"); }
  function pbAttach64(it, b64, name){
    return new Promise(function(res, rej){
      it.addFileAttachmentFromBase64Async(b64, name, function(r){
        if (r.status === Office.AsyncResultStatus.Succeeded) res();
        else rej(new Error((r.error && r.error.message) || "couldn't attach"));
      });
    });
  }
  function pbAttachUrl(it, url, name){
    return new Promise(function(res, rej){
      it.addFileAttachmentAsync(url, name, function(r){
        if (r.status === Office.AsyncResultStatus.Succeeded) res();
        else rej(new Error((r.error && r.error.message) || "couldn't attach"));
      });
    });
  }
  (function(){
    var btn = $("pbBtn"), form = $("pbForm"); if (!btn) return;
    btn.onclick = function(){ form.classList.toggle("hide"); if (!form.classList.contains("hide")){ try { $("pbCompany").focus(); } catch(e){} pbLoadLibs(); pbLoadAssets(); } };
    $("pbGo").onclick = function(){
      var msg = $("pbMsg"), company = $("pbCompany").value.trim(), link = $("pbLink").value.trim();
      var portal = ($("pbPortal") ? $("pbPortal").value.trim() : "");
      if (portal && !/^https?:\/\/\S+$/i.test(portal)){ msg.className = "msg err"; msg.textContent = "The portal link needs to be a full https:// URL."; return; }
      var it = Office.context.mailbox && Office.context.mailbox.item;
      if (!company){ msg.className = "msg err"; msg.textContent = "Type the client company name first."; return; }
      if (!ready || !it || !it.addFileAttachmentAsync){ msg.className = "msg err"; msg.textContent = "Open this while composing an email."; return; }
      var tok = pbToken(company);
      msg.className = "msg"; msg.textContent = "Personalizing playbook…";
      if (typeof it.addFileAttachmentFromBase64Async !== "function"){
        pbAttachUrl(it, PB_FALLBACK_URL, "WeTransact-Onboarding-Playbook.pdf")
          .then(function(){ msg.className = "msg ok"; msg.textContent = "✓ Standard playbook attached — this Outlook version can't personalize."; })
          .catch(function(e){ msg.className = "msg err"; msg.textContent = "Couldn't attach: " + ((e && e.message) || "try again"); });
        return;
      }
      pbBuild(company, link, portal)
        .then(function(b64){ return pbAttach64(it, b64, "WeTransact-Onboarding-Playbook" + (tok ? "-" + tok : "") + ".pdf"); })
        .then(function(){ msg.className = "msg ok"; msg.textContent = "✓ Playbook for " + company + " attached." + (portal ? " Global Admin guide link personalised." : ""); })
        .catch(function(e){
          pbAttachUrl(it, PB_FALLBACK_URL, "WeTransact-Onboarding-Playbook.pdf")
            .then(function(){ msg.className = "msg ok"; msg.textContent = "✓ Standard playbook attached (personalization failed: " + ((e && e.message) || "error") + ")."; })
            .catch(function(){ msg.className = "msg err"; msg.textContent = "Couldn't attach: " + ((e && e.message) || "try again"); });
        });
    };
  })();

  /* ---- Docs link picker (2026-08-25) — search WeTransact Docs, insert the links.
         Index = docs-index.json, rebuilt nightly from the Archbee sitemap by
         .github/workflows/docs-index.yml, so new articles appear on their own.
         A pasted docs URL always works, even before it's in the index. ---- */
  var DOCS_ORIGIN = "https://docs.wetransact.io";
  var DOCS_INDEX_URL = "https://wecalendar.github.io/docs-index.json";
  var DOCS_OCTAVIA = "https://wecalendar.github.io/octavia-question-mark.png";
  var DOCS_PINNED = [
    "step-6-grant-wetransact-access-to-partner-center",
    "step-5-complete-your-payout-and-tax-profile-48-hour-microsoft-validation",
    "finance-how-marketplace-finance-works",
    "how-do-i-determine-who-has-global-admin-and-owner-status-in-partner-center",
    "how-to-find-your-subscription-id",
    "listing-content-guidelines-what-microsoft-does-and-does-not-allow",
    "how-to-accept-a-private-offer-customer-walkthrough",
    "how-to-pay-your-marketplace-invoices",
    "how-to-find-your-marketplace-invoice",
    "how-to-create-a-private-offer"
  ];
  var DOCS = null, _dkLoad = null, DKPICK = [];

  function dkUrl(slug){ return slug ? DOCS_ORIGIN + "/" + slug : DOCS_ORIGIN; }

  /* Archbee slugs are the title kebab-cased, so this reads well enough as a
     fallback for a link pasted before the nightly index picked it up. */
  function dkTitleFromSlug(slug){
    var A = { id:"ID", ids:"IDs", api:"API", vat:"VAT", tin:"TIN", ein:"EIN", csp:"CSP", csps:"CSPs",
      gtm:"GTM", macc:"MACC", sso:"SSO", mca:"MCA", mpn:"MPN", acr:"ACR", ip:"IP", saas:"SaaS",
      png:"PNG", pdf:"PDF", url:"URL", faq:"FAQ", faqs:"FAQs", crm:"CRM", us:"US", ai:"AI", i:"I", csm:"CSM",
      microsoft:"Microsoft", azure:"Azure", entra:"Entra", salesforce:"Salesforce", hubspot:"HubSpot",
      linkedin:"LinkedIn", wetransact:"WeTransact", partner:"Partner", center:"Center", centre:"Centre",
      marketplace:"Marketplace", global:"Global", admin:"Admin" };
    var w = String(slug || "").replace(/(\d)([a-z])/gi, "$1-$2").replace(/([a-z])(\d)/gi, "$1-$2")
      .split("-").filter(Boolean).map(function(x){ var l = x.toLowerCase(); return A[l] || l; });
    if (!w.length) return "WeTransact Docs | Help Center";
    var out = []; w.forEach(function(x, i){ out.push(x); if (/^\d+$/.test(x) && i >= 1 && i <= 2 && i < w.length - 1) out.push("—"); });
    var t = out.join(" ").replace(/ — (\S)/g, function(m, c){ return " — " + c.toUpperCase(); }).replace(/\bco sell\b/gi, "co-sell").replace(/\bcosell\b/gi, "co-sell");
    t = t.charAt(0).toUpperCase() + t.slice(1);
    if (/^(how|what|why|who|where|when|which|can|do|does|is|are|should|could|will|have)$/.test(w[0].toLowerCase()) && !/[?.!]$/.test(t)) t += "?";
    return t;
  }

  function dkBySlug(slug){
    var s = String(slug || "").replace(/^\/+|\/+$/g, "");
    var hit = (DOCS || []).filter(function(d){ return d.slug === s; })[0];
    return hit || { slug: s, title: dkTitleFromSlug(s) };
  }

  function dkLoad(){
    if (DOCS) return Promise.resolve(DOCS);
    if (_dkLoad) return _dkLoad;
    _dkLoad = fetch(DOCS_INDEX_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(j){ DOCS = ((j && j.docs) || []).filter(function(d){ return d && d.slug; }); return DOCS; })
      .catch(function(){ DOCS = []; return DOCS; });
    return _dkLoad;
  }

  function dkSearch(q){
    var ql = q.toLowerCase(), terms = ql.split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    (DOCS || []).forEach(function(d){
      var hay = (d.title + " " + d.slug.replace(/-/g, " ")).toLowerCase();
      for (var i = 0; i < terms.length; i++){ if (hay.indexOf(terms[i]) < 0) return; }
      var tl = d.title.toLowerCase(), sc = 3;
      if (tl.indexOf(ql) === 0) sc = 0;
      else if (tl.indexOf(" " + terms[0]) > -1 || tl.indexOf(terms[0]) === 0) sc = 1;
      else if (tl.indexOf(ql) > -1) sc = 2;
      out.push({ d: d, sc: sc });
    });
    out.sort(function(a, b){ return (a.sc - b.sc) || a.d.title.localeCompare(b.d.title); });
    return out.slice(0, 40).map(function(x){ return x.d; });
  }

  function dkPicked(slug){ return DKPICK.some(function(d){ return d.slug === slug; }); }
  function dkAdd(doc){ if (!dkPicked(doc.slug)) DKPICK.push(doc); dkChips(); dkRender(); try { dkPrev(); } catch(e){} }
  function dkDrop(slug){ DKPICK = DKPICK.filter(function(d){ return d.slug !== slug; }); dkChips(); dkRender(); try { dkPrev(); } catch(e){} }

  function dkChips(){
    var c = $("dkChips"); if (!c) return; c.innerHTML = "";
    DKPICK.forEach(function(d){
      var s = document.createElement("span"); s.className = "chip";
      var t = document.createElement("span"); t.textContent = d.title.length > 34 ? d.title.slice(0, 33) + "…" : d.title;
      t.title = d.title;
      var x = document.createElement("span"); x.className = "cx"; x.innerHTML = "&times;";
      x.onclick = function(){ dkDrop(d.slug); };
      s.appendChild(t); s.appendChild(x); c.appendChild(s);
    });
  }

  function dkRender(){
    var box = $("dkRes"), inp = $("dkIn"); if (!box || !inp) return;
    var q = (inp.value || "").trim();
    box.innerHTML = "";
    var list, head = "";
    if (q){ list = dkSearch(q); }
    else { list = DOCS_PINNED.map(dkBySlug); head = "Frequently sent"; }
    if (!list.length){
      var e = document.createElement("div"); e.className = "dkempty";
      var oct = document.createElement("img"); oct.src = DOCS_OCTAVIA; oct.alt = "";
      var tx = document.createElement("div");
      tx.textContent = (DOCS && DOCS.length)
        ? "No guide matches that. Try fewer words — or paste the article link and it'll be added."
        : "Couldn't load the guide list. Paste a docs.wetransact.io link and it'll still work.";
      e.appendChild(oct); e.appendChild(tx); box.appendChild(e); return;
    }
    if (head){ var h = document.createElement("div"); h.className = "dkgrp"; h.textContent = head; box.appendChild(h); }
    list.forEach(function(d){
      var row = document.createElement("div"); row.className = "dkrow" + (dkPicked(d.slug) ? " on" : "");
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = dkPicked(d.slug); cb.tabIndex = -1;
      var tx = document.createElement("div"); tx.textContent = d.title;
      row.appendChild(cb); row.appendChild(tx);
      row.onclick = function(){ if (dkPicked(d.slug)) dkDrop(d.slug); else dkAdd(d); };
      box.appendChild(row);
    });
  }

  /* ---- Include instructions (2026-08-25): a pre-written blurb per guide,
     generated by the nightly job and stored in the manifest — inserted with
     the attachment or the link. Toggle remembered per user. ---- */
  var DK_INSTR = (function(){ try { return localStorage.getItem("wecal_dk_instr") !== "0"; } catch(e){ return true; } })();
  function dkSetInstr(on){
    DK_INSTR = !!on;
    try { localStorage.setItem("wecal_dk_instr", on ? "1" : "0"); } catch(e){}
    var sw = $("dkSw"); if (sw) sw.className = "dksw" + (on ? " on" : "");
    dkPrev();
  }
  function dkPrev(){
    var box = $("dkPrev"); if (!box) return;
    if (!DK_INSTR || !DKPICK.length){ box.classList.add("hide"); return; }
    box.classList.remove("hide");
    var have = (DKMAN && DKMAN.docs) || {};
    var d = DKPICK[0], m = have[d.slug] || {};
    var blurb = m.blurb || "A short summary of each guide will be added with its link.";
    var pb = dkBlurbParts(blurb);
    box.innerHTML = '<div class="pk">Will add to your email</div>'
      + '<div class="pt"><b>' + esc(m.title || d.title) + '</b><br>' + esc(pb.lead)
      + (pb.steps.length
          ? '<ul style="margin:3px 0 0;padding-left:16px">'
            + pb.steps.map(function(x){ return '<li style="margin:0 0 1px">' + esc(x) + '</li>'; }).join("")
            + '</ul>'
          : '')
      + (DKPICK.length > 1 ? '<div style="color:#7A6FB8;margin-top:3px">(+' + (DKPICK.length - 1) + ' more)</div>' : '') + '</div>';
    if (!DKMAN) dkManifest().then(function(){ dkPrev(); });
  }
  /* A blurb reads "The attached guide covers: A \u2192 B \u2192 C." — the arrow run is hard
     to scan in an email, so split it into bullets. Anything without arrows
     (e.g. "…walks you through it step by step.") stays a single line.
     Ruby, 2026-08-26: "can you make the instruction like bullet points". */
  function dkBlurbParts(blurb){
    var t = String(blurb || "").trim();
    var m = t.match(/^(.*?:)\s*([\s\S]+)$/);
    if (!m) return { lead: t, steps: [] };
    var steps = m[2].split(/\s*(?:\u2192|->|\u00bb)\s*/)
      .map(function(x){ return x.replace(/\s+/g, " ").trim().replace(/[.;,]+$/, ""); })
      .filter(Boolean);
    if (steps.length < 2) return { lead: t, steps: [] };
    return { lead: m[1].trim(), steps: steps };
  }

  function dkInstrHtml(list, have){
    return list.map(function(d){
      var m = (have && have[d.slug]) || {};
      var url = dkUrl(d.slug), shown = url.replace(/^https:\/\//, "");
      var pb = m.blurb ? dkBlurbParts(m.blurb) : null;
      return '<div><p style="margin:0 0 2px"><b>' + esc(m.title || d.title) + '</b></p>'
        + (pb ? '<p style="margin:0">' + esc(pb.lead) + '</p>' : '')
        + (pb && pb.steps.length
            ? '<ul style="margin:2px 0 0;padding-left:22px">'
              + pb.steps.map(function(x){ return '<li style="margin:0 0 2px">' + esc(x) + '</li>'; }).join("")
              + '</ul>'
            : '')
        + '<p style="margin:' + (pb && pb.steps.length ? '6px' : '0') + ' 0 12px">Full guide: <a href="' + url + '">' + esc(shown) + '</a></p></div>';
    }).join("");
  }
  function dkInsertSilent(html){
    return new Promise(function(res){
      try {
        Office.context.mailbox.item.body.setSelectedDataAsync(html, { coercionType: Office.CoercionType.Html }, function(){ res(); });
      } catch(e){ res(); }
    });
  }

  function dkInsertHtml(){
    if (DKPICK.length === 1) return '<div><a href="' + dkUrl(DKPICK[0].slug) + '">' + esc(DKPICK[0].title) + '</a></div>';
    return '<ul>' + DKPICK.map(function(d){ return '<li><a href="' + dkUrl(d.slug) + '">' + esc(d.title) + '</a></li>'; }).join("") + '</ul>';
  }

  (function(){
    var btn = $("dkBtn"), panel = $("dkPanel"), inp = $("dkIn"), go = $("dkGo"); if (!btn) return;
    btn.onclick = function(){
      var open = panel.classList.contains("hide");
      panel.classList.toggle("hide", !open);
      if (open){
        dkLoad().then(function(){ dkRender(); try { inp.focus(); } catch(e){} }); dkRender();
        dkSetInstr(DK_INSTR); dkManifest().then(function(){ dkPrev(); });
      }
    };
    var instr = $("dkInstr");
    if (instr) instr.onclick = function(){ dkSetInstr(!DK_INSTR); };
    inp.addEventListener("input", function(){
      var v = inp.value || "", m = v.match(/docs\.wetransact\.io\/?([A-Za-z0-9\-_%]*)/);
      if (m){ inp.value = ""; dkAdd(dkBySlug(decodeURIComponent(m[1] || ""))); return; }
      dkRender();
    });
    inp.addEventListener("keydown", function(e){
      if (e.key !== "Enter") return;
      e.preventDefault();
      var q = (inp.value || "").trim(); if (!q) return;
      var hits = dkSearch(q); if (hits.length){ inp.value = ""; dkAdd(hits[0]); }
    });
    go.onclick = function(){ dkAttachPdfs(); };
    var ins = $("dkIns");
    if (ins) ins.onclick = function(){
      var msg = $("dkMsg");
      if (!DKPICK.length){ msg.className = "msg err"; msg.textContent = "Tick at least one guide first."; return; }
      var n = DKPICK.length, picks = DKPICK.slice();
      if (DK_INSTR){
        dkManifest().then(function(man){
          insertHtml(dkInstrHtml(picks, (man && man.docs) || {}), msg,
            "✓ " + n + (n === 1 ? " guide added with instructions." : " guides added with instructions."));
          DKPICK = []; dkChips(); dkRender(); dkPrev();
        });
        return;
      }
      insertHtml(dkInsertHtml(), msg, "✓ " + n + (n === 1 ? " guide link added." : " guide links added."));
      DKPICK = []; dkChips(); dkRender(); dkPrev();
    };
  })();

  /* ---- Attach a docs article as a branded PDF ------------------------------
     The PDFs are rendered nightly from docs.wetransact.io by
     .github/workflows/docs-index.yml (build-docs-pdfs.mjs) and hosted next to
     the playbook. manifest.json carries the stamp coordinates, so "Prepared for
     {Company}" and the CSM footer always land in the right place even if the
     PDF template changes. Same pdf-lib pipeline as the onboarding playbook. */
  var DOCS_PDF_BASE = "https://wecalendar.github.io/docs-pdf/";
  var DOCS_MANIFEST_URL = DOCS_PDF_BASE + "manifest.json";
  var DKMAN = null, _dkMan = null, _dkFonts = null;

  function dkManifest(){
    if (DKMAN) return Promise.resolve(DKMAN);
    if (_dkMan) return _dkMan;
    _dkMan = fetch(DOCS_MANIFEST_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(j){ DKMAN = j || {}; return DKMAN; })
      .catch(function(){ DKMAN = { docs: {}, stamp: null }; return DKMAN; });
    return _dkMan;
  }
  function dkFonts(){ if (!_dkFonts) _dkFonts = Promise.all([pbFetch(PB_FONT_BOLD), pbFetch(PB_FONT_MED)]); return _dkFonts; }
  /* Outlook is fussy about attachment names — keep it plain ASCII, the way the
     playbook attachment does, or the attach can fail and fall back to a link. */
  function dkFileName(title){
    var t = String(title || "WeTransact Docs")
      .replace(/[\u2012-\u2015\u2212]/g, "-")     /* – — ‒ ― − */
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, "")
      .replace(/[\u2026]/g, "")
      .replace(/&/g, "and")
      .replace(/[^A-Za-z0-9 ._-]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[ .-]+|[ .-]+$/g, "")
      .trim();
    if (!t) t = "WeTransact Docs";
    if (t.length > 70) t = t.slice(0, 70).replace(/[ .-]+$/, "");
    return t + " - WeTransact.pdf";
  }

  /* explicit isInline:false — an inline attachment with nothing referencing it
     in the body is the classic "it vanished when I sent it" case */
  function dkAttach64(it, b64, name){
    return new Promise(function(res, rej){
      it.addFileAttachmentFromBase64Async(b64, name, { isInline: false }, function(r){
        if (r.status === Office.AsyncResultStatus.Succeeded) res();
        else rej(new Error((r.error && r.error.message) || "couldn't attach"));
      });
    });
  }

  /* confirm the attachment is really on the item, rather than trusting the callback */
  function dkVerify(it){
    return new Promise(function(res){
      if (!it.getAttachmentsAsync) return res(null);
      try {
        it.getAttachmentsAsync(function(r){
          if (r.status !== Office.AsyncResultStatus.Succeeded || !r.value) return res(null);
          res(r.value.filter(function(a){ return /\.pdf$/i.test(a.name || ""); }).length);
        });
      } catch(e){ res(null); }
    });
  }

  /* stamp page 1 with the client name + the CSM's name, then hand back base64 */
  function dkStamp(buf, company, st){
    return pbLoadLibs().then(dkFonts).then(function(f){
      var PL = window.PDFLib;
      return PL.PDFDocument.load(buf).then(function(doc){
        doc.registerFontkit(window.fontkit);
        return Promise.all([doc.embedFont(f[0], { subset: true }), doc.embedFont(f[1], { subset: true })]).then(function(fonts){
          var bold = fonts[0], med = fonts[1], p1 = doc.getPage(0);
          var purple = PL.rgb(0.369, 0.263, 0.784), muted = PL.rgb(0.396, 0.396, 0.471);
          var pf = st && st.preparedFor;
          if (company && pf){
            var t = "Prepared for " + company, size = pf.size || 12.5;
            while (bold.widthOfTextAtSize(t, size) > (pf.maxWidth || 380) && size > 8) size -= 0.5;
            p1.drawText(t, { x: pf.x, y: pf.y, size: size, font: bold, color: purple });
          }
          var me = NAME || niceName(EMAIL) || "", ft = st && st.footer;
          if (me && ft){
            var foot = "Your CSM: " + me, fs = ft.size || 8;
            while (med.widthOfTextAtSize(foot, fs) > (ft.maxWidth || 392) && fs > 5.5) fs -= 0.25;
            p1.drawText(foot, { x: ft.x, y: ft.y, size: fs, font: med, color: muted });
          }
          return doc.saveAsBase64();
        });
      });
    });
  }

  function dkAttachOne(it, doc, company, st, canStamp, manTitle){
    var url = DOCS_PDF_BASE + encodeURIComponent(doc.slug) + ".pdf";
    var name = dkFileName(manTitle || doc.title);
    /* Only very old Outlook takes the URL route. We don't fall back to it on
       error any more: Outlook fetches that URL at send time and drops the
       attachment without warning if the fetch fails, which looks like a
       successful attach that silently vanishes. Better to surface the error. */
    if (!canStamp) return pbAttachUrl(it, url, name);
    return pbFetch(url)
      .then(function(buf){ return dkStamp(buf, company, st); })
      .then(function(b64){ return dkAttach64(it, b64, name); });
  }

  function dkAttachPdfs(){
    var msg = $("dkMsg");
    if (!DKPICK.length){ msg.className = "msg err"; msg.textContent = "Tick at least one guide first."; return; }
    var it = Office.context.mailbox && Office.context.mailbox.item;
    if (!ready || !it || !it.addFileAttachmentAsync){ msg.className = "msg err"; msg.textContent = "Open this while composing an email."; return; }
    var canStamp = typeof it.addFileAttachmentFromBase64Async === "function";
    var picks = DKPICK.slice(), n = picks.length;
    msg.className = "msg"; msg.textContent = n === 1 ? "Building the PDF…" : "Building " + n + " PDFs…";
    if (canStamp) pbLoadLibs();

    Promise.all([dkManifest(), new Promise(function(res){ try { recipCtx(function(ctx){ res(ctx || {}); }); } catch(e){ res({}); } })])
      .then(function(r){
        var man = r[0] || {}, ctx = r[1] || {}, have = man.docs || {}, st = man.stamp;
        var company = ctx.company || "";
        var ready2 = picks.filter(function(d){ return have[d.slug] || !Object.keys(have).length; });
        var missing = picks.filter(function(d){ return ready2.indexOf(d) < 0; });
        if (!ready2.length){
          msg.className = "msg err";
          msg.textContent = "Not rendered yet — tonight's refresh will pick " + (n === 1 ? "it" : "them") + " up. Use “Insert links instead” for now.";
          return;
        }
        var pre = DK_INSTR ? dkInsertSilent(dkInstrHtml(ready2, have)) : Promise.resolve();
        return pre.then(function(){
          return ready2.reduce(function(chain, d){
            return chain.then(function(){ return dkAttachOne(it, d, company, st, canStamp, have[d.slug] && have[d.slug].title); });
          }, Promise.resolve());
        }).then(function(){ return dkVerify(it); }).then(function(onItem){
          var k = ready2.length;
          msg.className = "msg ok";
          msg.textContent = "✓ " + k + (k === 1 ? " PDF attached" : " PDFs attached")
            + (DK_INSTR ? " with instructions" : "")
            + (company ? " — prepared for " + company : "")
            + (onItem != null ? " (" + onItem + " on this email)" : "")
            + (missing.length ? ". " + missing.length + " not rendered yet (links instead)." : ".");
          if (missing.length){ DKPICK = missing; dkChips(); dkRender(); dkPrev(); }
          else { DKPICK = []; dkChips(); dkRender(); dkPrev(); }
        });
      })
      .catch(function(e){ msg.className = "msg err"; msg.textContent = "Couldn't attach: " + ((e && e.message) || "try again"); });
  }

  /* ---- One-click "Copy my calendar link" — mirrors the web app's quickCalendarLink ---- */
  function mcCopy(text){
    return Promise.resolve().then(function(){
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      throw new Error("no clipboard api");
    }).catch(function(){
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy blocked");
      } catch(e){ throw e; }
    });
  }
  function mcPublish(slots){
    return fetch(WC.FN_BASE + "/publish-link", { method: "POST", headers: { "Content-Type": "application/json", apikey: WC.SUPABASE_ANON_KEY, Authorization: "Bearer " + TOKEN }, body: JSON.stringify({ title: "Meeting with " + (NAME || niceName(EMAIL) || "me"), tz: TZ, slots: slots.map(function(x){ return { start: x.start.toISOString(), end: x.end.toISOString() }; }), attendees: [], videoLink: "", settings: { workStart: WS, workEnd: WE, buffer: BUF, minNotice: MINNOTICE, dayCap: DAYCAP } }) })
      .then(function(r){ return r.json().then(function(j){ return { status: r.status, j: j }; }); })
      .then(function(o){ if (o.status === 412 || (o.j && o.j.error === "not_connected")) throw { notConnected: true }; if (!o.j || !o.j.url) throw new Error((o.j && o.j.detail) || "couldn't create link"); return o.j.url; });
  }
  function mcBuildSlots(){
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(start.getTime() + 14 * 86400000);
    var PAD = 48 * 3600000;
    var url = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({ startDateTime: new Date(start.getTime() - PAD).toISOString(), endDateTime: new Date(end.getTime() + PAD).toISOString(), "$select": "start,end,showAs,isAllDay,responseStatus,subject,organizer,isOrganizer", "$top": "200" });
    return graphAll(url, []).then(function(items){
      var busy = [], offDays = {};
      items.forEach(function(ev){
        if (!ev.start || !ev.start.dateTime || !ev.end || !ev.end.dateTime || ev.showAs === "free" || ev.showAs === "workingElsewhere") return;
        if (ev.responseStatus && ev.responseStatus.response === "declined") return;
        if (ev.showAs === "oof"){ var oorg = (ev.organizer && ev.organizer.emailAddress && ev.organizer.emailAddress.address || "").toLowerCase(); if (ev.isOrganizer === false || (oorg && EMAIL && oorg !== EMAIL.toLowerCase())) return; }
        var s2 = new Date(ev.start.dateTime + "Z"), e2 = new Date(ev.end.dateTime + "Z");
        if (isNaN(s2.getTime()) || isNaN(e2.getTime())) return;
        if (ev.isAllDay){ for (var t = s2.getTime(); t < e2.getTime(); t += 86400000){ var od = new Date(t); offDays[od.getUTCFullYear() + "-" + od.getUTCMonth() + "-" + od.getUTCDate()] = true; } }
        else busy.push([s2.getTime() - BUF * 60000, e2.getTime() + BUF * 60000]);
      });
      busy.sort(function(a, b){ return a[0] - b[0]; });
      var minLen = SLOTLEN * 60000, nowMs = Date.now(), nw = nowMs + MINNOTICE * 3600000, out = [];
      for (var i = 0; i < 14; i++){
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        if (offDays[d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()]) continue;
        var ws2 = zInstant(d.getFullYear(), d.getMonth(), d.getDate(), WS), we2 = zInstant(d.getFullYear(), d.getMonth(), d.getDate(), WE);
        if (we2 <= nowMs) continue;
        var cur = Math.max(ws2, nw), wins = [];
        busy.forEach(function(b){ if (b[1] > ws2 && b[0] < we2){ if (b[0] > cur && Math.min(b[0], we2) - cur >= minLen) wins.push([cur, Math.min(b[0], we2)]); if (b[1] > cur) cur = b[1]; } });
        if (we2 - cur >= minLen) wins.push([cur, we2]);
        var perDay = 0;
        for (var w = 0; w < wins.length; w++){
          for (var t2 = wins[w][0]; t2 + minLen <= wins[w][1]; t2 += minLen){
            if (DAYCAP && perDay >= DAYCAP) break;
            out.push({ start: new Date(t2), end: new Date(t2 + minLen) });
            perDay++;
          }
        }
      }
      return out.slice(0, 400);
    });
  }
  (function(){
    var btn = $("mcBtn"); if (!btn) return;
    btn.onmouseenter = function(){ warmLink(); };
    btn.onclick = function(){
      var msg = $("mcMsg");
      if (!TOKEN){ msg.className = "msg err"; msg.textContent = "Sign in first."; return; }
      btn.disabled = true; msg.className = "msg"; msg.textContent = "Building your link from the next 2 weeks…";
      mcBuildSlots().then(function(slots){
        if (!slots.length) throw new Error("No free time found in the next 2 weeks — check your working hours");
        msg.textContent = "Creating link (" + slots.length + " slots)…";
        return mcPublish(slots).then(function(url){
          return mcCopy(url).then(function(){ return { url: url, copied: true, n: slots.length }; })
                            .catch(function(){ return { url: url, copied: false, n: slots.length }; });
        });
      }).then(function(res){
        msg.className = "msg ok";
        msg.innerHTML = (res.copied ? "&#10003; Calendar link copied" : "&#10003; Link ready — copy it below")
          + " (next 2 weeks, " + res.n + " slots) &middot; <a href='#' id='mcIns'>insert in email</a>"
          + "<div style='margin-top:4px;font-weight:400;word-break:break-all'><a href='" + res.url + "' target='_blank' rel='noopener'>" + res.url + "</a></div>";
        var ins = $("mcIns");
        if (ins) ins.onclick = function(e){
          e.preventDefault();
          insertHtml("<div>Book a time with me here: <a href=\"" + res.url + "\">" + res.url + "</a></div>", msg, "\u2713 Link added to your email.");
        };
      }).catch(function(e){
        msg.className = "msg err";
        if (e && e.notConnected) msg.textContent = "Open WeCalendar in your browser and sign in once to connect for booking, then retry.";
        else if (e && e.expired){ msg.textContent = "Session expired — sign in again."; TOKEN = null; clearAuth(); $("picker").classList.add("hide"); $("signedout").classList.remove("hide"); }
        else msg.textContent = (e && e.message) || "Couldn't create your calendar link.";
      }).then(function(){ btn.disabled = false; });
    };
  })();

  (function restoreAuth(){ var a = loadAuth(); if (a){ TOKEN = a.token; EMAIL = a.email || ""; loadSettings(); loadProfile(); $("signedout").classList.add("hide"); $("picker").classList.remove("hide"); drawMiniCal(); } try { applyCSMGate(); } catch(e){} })();
})();
