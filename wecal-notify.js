/* WeCalendar in-app notifications (2026-10-31)
   A bell next to the avatar with a list of notifications, like an account inbox.

   Two sources:
   1. Built-in checks that run in the browser. Today: "Reconnect your calendar" when the
      booking connection is older than RECONNECT_AFTER_DAYS, or its age is unknown.
   2. Announcements from notifications.json in this repo. Add an item there and every
      signed-in user sees it next time WeCalendar loads (and every 10 minutes while open).

   notifications.json item shape:
     { "id": "unique-id", "date": "2026-10-31", "title": "…", "body": "…",
       "tile": "lightbulb",                       // optional: brand/tile-<name>.png
       "action": { "label": "Open guide", "url": "https://…" },   // optional
       "audience": "all" | ["name@wetransact.io", "@awssome.io"], // optional, default all
       "until": "2026-12-31" }                    // optional: hide after this date

   Read/dismissed state is kept per user in this browser (localStorage). */
(function(){
  var RECONNECT_AFTER_DAYS = 60;
  var FEED_URL = "notifications.json";
  var POLL_MS = 10 * 60 * 1000;
  var items = [], started = false;

  function me(){ try { return (ME && ME.email || "").toLowerCase(); } catch(e){ return ""; } }
  function key(){ return "wecalNotify:" + (me() || "anon"); }
  function loadState(){ try { return JSON.parse(localStorage.getItem(key()) || "{}"); } catch(e){ return {}; } }
  function saveState(st){ try { localStorage.setItem(key(), JSON.stringify(st)); } catch(e){} }
  function st(){ var s = loadState(); s.read = s.read || []; s.dismissed = s.dismissed || []; return s; }
  function esc(t){ return String(t == null ? "" : t).replace(/[&<>"']/g, function(c){ return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]; }); }
  function safeUrl(u){ return /^(https?:\/\/|\/|[a-z0-9._-]+\.html)/i.test(String(u || "")) ? String(u) : ""; }
  function daysSince(ts){ return (Date.now() - ts) / 86400000; }
  function fmtDate(d){ try { return new Date(d).toLocaleDateString(undefined, { day:"numeric", month:"short" }); } catch(e){ return ""; } }

  // ---- built-in checks ----
  function localItems(){
    var out = [];
    var on = false; try { on = !!WECAL_ON; } catch(e){}
    if (on){
      var at = +(localStorage.getItem("bookingConnectedAt") || 0);
      if (!at || daysSince(at) > RECONNECT_AFTER_DAYS){
        out.push({
          id: "reconnect-" + (at || "unknown"), local: true, urgent: true, tile: "calendar",
          date: new Date().toISOString(),
          title: "Reconnect your calendar",
          body: at ? "Your booking connection is over " + RECONNECT_AFTER_DAYS + " days old. Microsoft expires these, and clients then can't book you. It takes a few seconds."
                   : "Refresh WeCalendar's access to your Outlook calendar so clients can keep booking you. It takes a few seconds.",
          action: { label: "Reconnect calendar", run: "reconnect" }
        });
      }
    }
    return out;
  }

  function forMe(it){
    var a = it.audience; if (!a || a === "all") return true;
    var m = me(); if (!m) return false;
    return [].concat(a).some(function(x){ x = String(x).toLowerCase(); return x.charAt(0) === "@" ? m.slice(-x.length) === x : m === x; });
  }
  function current(it){ return !it.until || new Date(it.until + "T23:59:59") >= new Date(); }

  function fetchFeed(){
    return fetch(FEED_URL + "?t=" + Date.now(), { cache: "no-store" })
      .then(function(r){ return r.ok ? r.json() : { items: [] }; })
      .then(function(j){ return (j.items || []).filter(function(it){ return it && it.id && it.title && forMe(it) && current(it); }); })
      .catch(function(){ return []; });
  }

  function refresh(){
    return fetchFeed().then(function(remote){
      var s = st();
      items = localItems().concat(storedItems(), remote).filter(function(it){ return s.dismissed.indexOf(it.id) < 0; })
        .sort(function(a, b){ return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || new Date(b.date) - new Date(a.date); });
      paint();
    });
  }

  function unreadCount(){ var s = st(); return items.filter(function(it){ return it.urgent || s.read.indexOf(it.id) < 0; }).length; }

  function paint(){
    var n = unreadCount(), dot = document.getElementById("ntDot"), btn = document.getElementById("ntBtn");
    if (dot){ dot.textContent = n > 9 ? "9+" : String(n); dot.style.display = n ? "flex" : "none"; }
    if (btn) btn.setAttribute("aria-label", n ? "Notifications, " + n + " new" : "Notifications");
    if (btn) btn.classList.toggle("has-unread", n > 0);
    var base = document.title.replace(/^\(\d+\+?\) /, ""); document.title = (n ? "(" + (n > 9 ? "9+" : n) + ") " : "") + base;
    var list = document.getElementById("ntList"); if (!list) return;
    if (!items.length){
      list.innerHTML = '<div class="nt-empty"><img src="brand/octavia-paraglider.webp" alt="" width="110"><b>You\'re all caught up.</b><span>New notices from WeCalendar show up here.</span></div>';
      return;
    }
    var s = st();
    list.innerHTML = items.map(function(it, i){
      var unread = it.urgent || s.read.indexOf(it.id) < 0;
      var act = "";
      if (it.action && it.action.run) act = '<button class="nt-act" data-i="' + i + '">' + esc(it.action.label) + '</button>';
      else if (it.action && safeUrl(it.action.url)) act = '<a class="nt-act" data-i="' + i + '" href="' + esc(safeUrl(it.action.url)) + '" target="_blank" rel="noopener">' + esc(it.action.label || "Open") + '</a>';
      return '<div class="nt-item' + (unread ? ' unread' : '') + '">' +
        '<img class="nt-tile" src="brand/tile-' + esc(it.tile || "lightbulb") + '.png" alt="">' +
        '<div class="nt-body">' +
          '<div class="nt-top"><span class="nt-title">' + esc(it.title) + '</span>' + (it.urgent ? '<span class="nt-pill">Action needed</span>' : '<span class="nt-date">' + esc(fmtDate(it.date)) + '</span>') + '</div>' +
          (it.body ? '<div class="nt-text">' + esc(it.body) + '</div>' : '') +
          '<div class="nt-row">' + act + (it.urgent ? '' : '<button class="nt-x" data-x="' + i + '">Dismiss</button>') + '</div>' +
        '</div></div>';
    }).join("");
    [].forEach.call(list.querySelectorAll(".nt-act"), function(el){
      el.addEventListener("click", function(e){
        var it = items[+el.getAttribute("data-i")]; if (!it) return;
        markRead(it.id);
        if (it.action && it.action.run === "reconnect"){ e.preventDefault(); try { location.href = consentUrl("microsoft"); } catch(err){} }
      });
    });
    [].forEach.call(list.querySelectorAll(".nt-x"), function(el){
      el.addEventListener("click", function(){ var it = items[+el.getAttribute("data-x")]; if (it) dismiss(it.id); });
    });
  }

  function markRead(id){ var s = st(); if (s.read.indexOf(id) < 0){ s.read.push(id); saveState(s); } }
  function markAllRead(){ var s = st(); items.forEach(function(it){ if (!it.urgent && s.read.indexOf(it.id) < 0) s.read.push(it.id); }); saveState(s); }
  function dismiss(id){ var s = st(); if (s.dismissed.indexOf(id) < 0) s.dismissed.push(id); saveState(s); items = items.filter(function(it){ return it.id !== id; }); paint(); }

  function toggle(open){
    var pop = document.getElementById("ntPop"), btn = document.getElementById("ntBtn"); if (!pop || !btn) return;
    var show = open == null ? pop.style.display !== "block" : open;
    if (show){
      var r = btn.getBoundingClientRect();
      pop.style.display = "block";
      pop.style.top = (r.bottom + 8 + window.scrollY) + "px";
      pop.style.left = Math.max(12, Math.min(r.right - pop.offsetWidth, innerWidth - pop.offsetWidth - 12)) + "px";
      paint();
      setTimeout(function(){ markAllRead(); var dot = document.getElementById("ntDot"); var n = unreadCount(); if (dot){ dot.textContent = String(n); dot.style.display = n ? "flex" : "none"; } }, 1200);
    } else pop.style.display = "none";
    btn.setAttribute("aria-expanded", show ? "true" : "false");
  }


  // ---- notifications WeCalendar raises itself and keeps (e.g. new meetings) ----
  var STORE_DAYS = 14;
  function storeKey(){ return "wecalNotifyStore:" + (me() || "anon"); }
  function storedItems(){
    try {
      var all = JSON.parse(localStorage.getItem(storeKey()) || "[]");
      return all.filter(function(it){ return daysSince(new Date(it.date).getTime()) < STORE_DAYS; });
    } catch(e){ return []; }
  }
  function addStored(list){
    var all = storedItems(), ids = all.map(function(x){ return x.id; });
    list.forEach(function(it){ if (ids.indexOf(it.id) < 0) all.unshift(it); });
    try { localStorage.setItem(storeKey(), JSON.stringify(all.slice(0, 40))); } catch(e){}
  }

  // ---- new-meeting watcher ----
  // Every 2 minutes (and when the tab comes back into view) WeCalendar reads the next 14 days
  // of your Outlook calendar. A meeting it hasn't seen before, created in the last 3 days,
  // raises a notification and the slide-down bar. The first check only remembers what is
  // already there, so nobody gets a flood of alerts on their first visit.
  var WATCH_MS = 2 * 60 * 1000, watching = false, watchBusy = false;
  function seenKey(){ return "wecalSeenMeetings:" + (me() || "anon"); }
  function fmtWhen(start, end){
    try {
      var d = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(start);
      var t = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
      return d + " · " + t.format(start) + "–" + t.format(end);
    } catch(e){ return ""; }
  }
  function silentToken(){
    try { return pca.acquireTokenSilent({ scopes: SCOPES, account: account }).then(function(r){ return r.accessToken; }); }
    catch(e){ return Promise.reject(e); }
  }
  function checkMeetings(){
    if (watchBusy || document.hidden || !me()) return;
    watchBusy = true;
    var now = new Date(), until = new Date(now.getTime() + 14 * 86400000);
    silentToken().then(function(tk){
      var url = "https://graph.microsoft.com/v1.0/me/calendarView?" + new URLSearchParams({
        startDateTime: now.toISOString(), endDateTime: until.toISOString(),
        $select: "id,subject,start,end,createdDateTime,organizer,isOrganizer,isCancelled,showAs,responseStatus,webLink", $orderby: "start/dateTime", $top: "200"
      });
      return fetch(url, { headers: { Authorization: "Bearer " + tk, Prefer: 'outlook.timezone="UTC"' } });
    }).then(function(r){ return r && r.ok ? r.json() : null; }).then(function(j){
      if (!j) return;
      var cx = (j.value || []).filter(function(ev){ return ev.id && ev.isCancelled; });
      var cxKey = "wecalSeenCancels:" + me(), cxSeenRaw = null; try { cxSeenRaw = localStorage.getItem(cxKey); } catch(e){}
      var cxSeen = cxSeenRaw ? JSON.parse(cxSeenRaw) : null;
      if (cxSeen){
        var cxNew = cx.filter(function(ev){ return cxSeen.indexOf(ev.id) < 0; });
        if (cxNew.length){
          cancelled(cxNew.map(function(ev){ return { id: ev.id, subject: (ev.subject || "").replace(/^Canceled:\s*|^Cancelled:\s*/i, ""),
            start: new Date(ev.start.dateTime + "Z"), end: new Date(ev.end.dateTime + "Z"),
            by: ev.organizer && ev.organizer.emailAddress ? (ev.organizer.emailAddress.name || ev.organizer.emailAddress.address) : "" }; }));
          try { if (typeof load === "function") load(); } catch(e){}
        }
      }
      try { localStorage.setItem(cxKey, JSON.stringify((cxSeen || []).concat(cx.map(function(ev){ return ev.id; })).filter(function(id, i, a){ return a.indexOf(id) === i; }).slice(-300))); } catch(e){}
      var evs = (j.value || []).filter(function(ev){
        return ev.id && !ev.isCancelled && ev.showAs !== "free" && !(ev.responseStatus && ev.responseStatus.response === "declined");
      });
      var seenRaw = null; try { seenRaw = localStorage.getItem(seenKey()); } catch(e){}
      var seen = seenRaw ? JSON.parse(seenRaw) : null;
      var ids = evs.map(function(ev){ return ev.id; });
      if (seen){
        var fresh = evs.filter(function(ev){
          return seen.indexOf(ev.id) < 0 && ev.createdDateTime && daysSince(new Date(ev.createdDateTime).getTime()) < 3;
        });
        if (fresh.length){
          var made = fresh.map(function(ev){
            var start = new Date(ev.start.dateTime + "Z"), end = new Date(ev.end.dateTime + "Z");
            var who = !ev.isOrganizer && ev.organizer && ev.organizer.emailAddress ? (ev.organizer.emailAddress.name || ev.organizer.emailAddress.address) : "";
            return { id: "mtg-" + ev.id, date: new Date().toISOString(), tile: "calendar",
              title: "New meeting: " + (ev.subject || "(no title)"),
              body: fmtWhen(start, end) + (who ? " · from " + who : ""),
              action: ev.webLink ? { label: "Open in Outlook", url: ev.webLink } : null,
              _when: fmtWhen(start, end) };
          });
          addStored(made);
          refresh();
          showBar(made);
          try { if (typeof load === "function") load(); } catch(e){}   // redraw the week so the meeting appears
        }
      }
      var keep = (seen || []).concat(ids).filter(function(id, i, a){ return a.indexOf(id) === i; }).slice(-600);
      try { localStorage.setItem(seenKey(), JSON.stringify(keep)); } catch(e){}
    }).catch(function(){}).then(function(){ watchBusy = false; });
  }
  function startMeetingWatch(){
    if (watching) return; watching = true;
    setTimeout(checkMeetings, 4000);
    setInterval(checkMeetings, WATCH_MS);
    document.addEventListener("visibilitychange", function(){ if (!document.hidden) checkMeetings(); });
  }

  // ---- slide-down bar ----
  var barTimer = null;
  function showBar(list, kind){
    var bar = document.getElementById("ntBar"); if (!bar || !list.length) return;
    var cancel = kind === "cancel", first = list[0];
    var title = list.length === 1 ? first.title : list.length + (cancel ? " meetings cancelled" : " new meetings");
    var sub = list.length === 1 ? (first._when || first.body || "") : list.map(function(x){ return x.title.replace(/^(New meeting|Meeting cancelled): /, ""); }).slice(0, 3).join(" · ");
    bar.className = cancel ? "cancel" : "";
    bar.innerHTML = (cancel ? '<img class="nb-oct" src="brand/octavia-paraglider.webp" alt="">' : '<img src="brand/tile-calendar.png" alt="">') +
      '<div class="nb-text"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></div>' +
      '<button type="button" class="nb-view">View</button>' +
      '<button type="button" class="nb-x" aria-label="Close">&times;</button>';
    bar.querySelector(".nb-view").onclick = function(){ hideBar(); toggle(true); };
    bar.querySelector(".nb-x").onclick = hideBar;
    void bar.offsetWidth; bar.classList.add("show");
    clearTimeout(barTimer); barTimer = setTimeout(hideBar, 9000);
  }
  // Called by the app when you cancel a meeting yourself, and by the watcher for cancellations by others.
  function cancelled(evs, quiet){
    var made = evs.map(function(ev){
      var when = ev.start && ev.end ? fmtWhen(new Date(ev.start), new Date(ev.end)) : "";
      return { id: "cxl-" + (ev.id || ev.cancelId || Date.now()), date: new Date().toISOString(), tile: "paper-plane",
        title: "Meeting cancelled: " + (ev.subject || "(no title)"), body: when + (ev.by ? " · by " + ev.by : ""), _when: when + (ev.by ? " · by " + ev.by : "") };
    });
    addStored(made); refresh(); if (!quiet) showBar(made, "cancel");
  }
  function hideBar(){ var bar = document.getElementById("ntBar"); if (bar) bar.classList.remove("show"); }

  function start(){
    if (started) return; started = true;
    var btn = document.getElementById("ntBtn"); if (!btn) return;
    btn.addEventListener("click", function(e){ e.stopPropagation(); toggle(); });
    document.addEventListener("click", function(e){ var pop = document.getElementById("ntPop"); if (pop && pop.style.display === "block" && !pop.contains(e.target)) toggle(false); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") toggle(false); });
    refresh().then(function(){
      // On sign-in, show every unread notification on screen (once per browser session).
      // If the welcome tour is running, wait for it to close first.
      try {
        if (unreadCount() && sessionStorage.getItem("ntShown") !== "1"){
          sessionStorage.setItem("ntShown", "1");
          var tries = 0;
          (function showWhenFree(){
            var tour = document.getElementById("tourOverlay");
            var busy = tour && tour.style.display !== "none";
            if (busy && tries++ < 120){ setTimeout(showWhenFree, 1000); return; }
            toggle(true);
          })();
        }
      } catch(e){}
    });
    setInterval(refresh, POLL_MS);
    startMeetingWatch();
  }

  window.WecalNotify = { start: start, refresh: refresh, open: function(){ toggle(true); }, check: checkMeetings, cancelled: function(ev){ cancelled([ev]); }, _showBar: showBar };
})();
