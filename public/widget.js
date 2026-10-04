(function () {
  var script = document.currentScript || document.querySelector("script[data-bot-id]");
  if (!script) return;
  var botId = script.getAttribute("data-bot-id");
  if (!botId || window.__helixLoaded) return;
  window.__helixLoaded = true;
  var origin = new URL(script.src).origin;
  var api = origin + "/api/public/chat";
  var AVATARS = {
    spark: "✦", bot: "🤖", smile: "😊", headset: "🎧",
    friendly: "🙂", happy: "😄", cheerful: "😁", wink: "😉",
    cool: "😎", clever: "🤓", thoughtful: "🤔", professional: "🧑‍💼",
    support: "🧑‍💻", expert: "🧑‍🏫", guide: "🧑‍🚀", helper: "🙋"
  };

  fetch(api + "?botId=" + encodeURIComponent(botId))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) { if (cfg) mount(cfg); })
    .catch(function () {});

  function mount(cfg) {
    var host = document.createElement("div");
    host.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483000;";
    document.body.appendChild(host);
    var root = host.attachShadow({ mode: "open" });
    var c = cfg.primaryColor || "#4f46e5";
    root.innerHTML =
      "<style>" +
      "*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
      ".btn{width:58px;height:58px;border-radius:50%;border:0;background:" + c + ";color:#fff;font-size:24px;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.25)}" +
      ".win{position:absolute;bottom:72px;right:0;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;color:#111}" +
      ".win.open{display:flex}" +
      ".hd{background:" + c + ";color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;font-weight:600}" +
      ".av{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center}" +
      ".x{margin-left:auto;background:none;border:0;color:#fff;font-size:20px;cursor:pointer}" +
      ".msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f7f7f9}" +
      ".m{max-width:85%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
      ".b{background:#fff;border:1px solid #e5e5ea;align-self:flex-start}" +
      ".u{background:" + c + ";color:#fff;align-self:flex-end}" +
      ".ft{display:flex;gap:6px;padding:10px;border-top:1px solid #eee}" +
      ".ft input{flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 11px;font-size:14px;outline:none}" +
      ".ft button,.lead button{background:" + c + ";color:#fff;border:0;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px}" +
      ".lead{display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid #e5e5ea;border-radius:12px;padding:10px}" +
      ".lead input{border:1px solid #ddd;border-radius:8px;padding:7px 9px;font-size:13px}.lead button{padding:8px}" +
      ".link{background:none;border:0;color:" + c + ";font-size:12px;cursor:pointer;align-self:flex-start;padding:0}" +
      ".brand{text-align:center;font-size:11px;color:#888;padding:0 0 8px}.brand a{color:#888}" +
      "</style>" +
      '<div class="win"><div class="hd"><div class="av"></div><span class="nm"></span><button class="x" aria-label="Close">×</button></div>' +
      '<div class="msgs"></div><form class="ft"><input placeholder="Type your question…" maxlength="2000"/><button type="submit">Send</button></form>' +
      (cfg.showBranding ? '<div class="brand">Powered by <a href="' + origin + '" target="_blank" rel="noopener">Helix</a></div>' : "") +
      '</div><button class="btn" aria-label="Open chat">💬</button>';

    var win = root.querySelector(".win");
    var msgs = root.querySelector(".msgs");
    var form = root.querySelector("form");
    var input = form.querySelector("input");
    root.querySelector(".av").textContent = AVATARS[cfg.avatar] || "✦";
    root.querySelector(".nm").textContent = cfg.name;
    root.querySelector(".btn").onclick = function () { win.classList.toggle("open"); input.focus(); };
    root.querySelector(".x").onclick = function () { win.classList.remove("open"); };

    var history = [];
    var conversationId = null;
    var busy = false;
    var leadShown = false;

    var LINK = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|wa\.me\/[^\s<>"']+/gi;
    function render(el, text) {
      el.textContent = "";
      var last = 0, m;
      LINK.lastIndex = 0;
      while ((m = LINK.exec(text))) {
        if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
        var raw = m[0];
        var trail = (raw.match(/[.,!?;:)}\]]+$/) || [""])[0];
        var label = raw.slice(0, raw.length - trail.length);
        var href = /^https?:/i.test(label) ? label : "https://" + label;
        var a = document.createElement("a");
        a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.textContent = label;
        a.style.cssText = "color:inherit;text-decoration:underline;word-break:break-all;font-weight:600";
        el.appendChild(a);
        if (trail) el.appendChild(document.createTextNode(trail));
        last = m.index + raw.length;
      }
      if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
    }
    function add(cls, text) {
      var el = document.createElement("div");
      el.className = "m " + cls;
      render(el, text);
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    add("b", cfg.greeting);

    function showLead(question) {
      if (!cfg.leadCapture || leadShown) return;
      leadShown = true;
      var btn = document.createElement("button");
      btn.className = "link";
      btn.textContent = "Leave your contact details →";
      msgs.appendChild(btn);
      btn.onclick = function () {
        btn.remove();
        var f = document.createElement("form");
        f.className = "lead";
        f.innerHTML = '<input name="name" placeholder="Name"/><input name="email" type="email" required placeholder="Email"/><input name="phone" placeholder="Phone (optional)"/><button type="submit">Send details</button>';
        msgs.appendChild(f);
        msgs.scrollTop = msgs.scrollHeight;
        f.onsubmit = function (e) {
          e.preventDefault();
          var fd = new FormData(f);
          fetch(api, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "lead", botId: botId, conversationId: conversationId, name: fd.get("name") || undefined, email: fd.get("email"), phone: fd.get("phone") || undefined, question: question }),
          }).then(function (r) {
            f.remove();
            add("b", r.ok ? "Thanks! Our team will get back to you soon." : "Sorry, we couldn't save your details.");
          });
        };
      };
    }

    form.onsubmit = function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text || busy) return;
      input.value = "";
      busy = true;
      add("u", text);
      history.push({ role: "user", content: text });
      var bubble = add("b", "…");
      fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: botId, conversationId: conversationId, messages: history.slice(-20) }),
      })
        .then(function (res) {
          conversationId = res.headers.get("X-Helix-Conversation") || conversationId;
          if (!res.ok || !res.body) {
            return res.json().then(function (j) { throw new Error(j.error || "Error"); });
          }
          var reader = res.body.getReader();
          var dec = new TextDecoder();
          var answer = "";
          function pump() {
            return reader.read().then(function (r) {
              if (r.done) return answer;
              answer += dec.decode(r.value, { stream: true });
              bubble.textContent = answer;
              msgs.scrollTop = msgs.scrollHeight;
              return pump();
            });
          }
          return pump();
        })
        .then(function (answer) {
          history.push({ role: "assistant", content: answer });
          if (/contact|email|reach out|get back to you/i.test(answer)) showLead(text);
        })
        .catch(function (err) { bubble.textContent = err.message || "Something went wrong."; })
        .then(function () { busy = false; });
    };
  }
})();
