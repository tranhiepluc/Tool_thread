/* Threads Video – logic giao diện */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.Renderer;
  const STORE_KEY = "threads-video-project-v1";

  const FONTS = ["Be Vietnam Pro", "Inter", "Roboto", "Montserrat", "Lora", "Noto Serif", "Oswald", "Dancing Script"];
  const GRADIENTS = [["#1e1b4b", "#312e81"], ["#0f172a", "#1e3a8a"], ["#4c1d95", "#db2777"], ["#0f766e", "#1e3a8a"], ["#f97316", "#db2777"], ["#111827", "#374151"], ["#065f46", "#a3e635"], ["#7c3aed", "#06b6d4"], ["#fde68a", "#f472b6"], ["#000000", "#434343"]];
  const COLORS = ["#0f1020", "#111111", "#ffffff", "#f5f0e6", "#1e3a8a", "#7c3aed", "#db2777", "#16a34a", "#f59e0b", "#ef4444"];
  const EMOJI = {
    "Cảm xúc": "😀 😂 🤣 😍 🥰 😘 😎 🤩 🥳 😭 😱 😡 🤔 🙄 😴 🤯 🥹 😅 🫶 💀".split(" "),
    "Biểu tượng": "❤️ 🔥 ✨ 💯 ⭐ ⚡ 💥 💫 🎉 🎊 💖 💔 ✅ ❌ ❗ ❓ 💬 👀 🚀 📌".split(" "),
    "Tay": "👍 👎 👏 🙌 🙏 💪 👉 👈 👆 👇 ✌️ 🤝 🫵 👋 🤞 👌".split(" "),
    "Khác": "📢 📣 🎵 🎶 📷 🎬 💡 💰 🎁 🏆 📈 📉 🧠 ☕ 🍀 🌈 🌙 ☀️ 🌸 🐶".split(" "),
  };
  const TIPS = [
    "Video dọc 9:16 có hiệu quả tốt nhất trên Threads, Reels và TikTok.",
    "Giữ chữ ngắn gọn, cỡ chữ lớn để người xem đọc kịp trên điện thoại.",
    "Làm tối nền 30–50% giúp chữ trắng nổi bật hơn nhiều.",
    "Giọng đọc 1.1x thường giữ chân người xem tốt hơn.",
    "Thêm sticker kêu gọi “Theo dõi để xem tiếp 👉” ở cuối video.",
  ];
  const STEPS = [
    ["Tạo nội dung video", "Biến bài viết của bạn thành video dọc cuốn hút chỉ trong vài phút."],
    ["Tùy chỉnh văn bản", "Chọn kiểu thẻ, phông chữ, màu sắc và phụ đề cho video."],
    ["Chọn hình nền", "Video, ảnh hoặc màu nền – kèm hiệu chỉnh và nhạc nền."],
    ["Giọng đọc AI", "Tạo giọng đọc tự nhiên và phụ đề khớp thời gian tự động."],
    ["Sticker & xuất video", "Thêm điểm nhấn sinh động và hoàn thiện video của bạn."],
  ];

  const DEFAULT = () => ({
    step: 0,
    aspect: "9:16",
    duration: 10,
    source: { mode: "link", url: "" },
    content: { text: "", displayName: "", username: "", time: "2 giờ", likes: "1,2K", comments: "86", reposts: "24", verified: true, showImage: false, avatar: null, postImage: null },
    text: { style: "card", theme: "light", font: "Be Vietnam Pro", weight: "500", size: 44, lineHeight: 1.45, width: 88, x: 50, y: 42, radius: 36, opacity: 100, color: "#111111", bgColor: "#ffffff", accent: "#0095f6", align: "left", showHeader: true, showFooter: true, autoFit: true, fadeIn: true, showFor: "all", showSeconds: 4 },
    subs: { enabled: true, style: "outline", font: "Be Vietnam Pro", size: 58, y: 80, color: "#ffffff", bgColor: "#000000", maxChars: 48, uppercase: false },
    bg: { type: "gradient", uploadId: null, url: null, name: null, info: null, imageUrl: null, imageName: null, fit: "cover", start: 0, speed: 1, mirror: false, keepAudio: false, audioVolume: 0.3, kenburns: true, grad1: "#1e1b4b", grad2: "#312e81", gradAngle: 160, color: "#0f1020", blur: 0, dim: 0.25 },
    music: { uploadId: null, url: null, name: null, volume: 0.15, start: 0, duck: true, duckLevel: "medium", fadeIn: true, fadeOut: true },
    speech: { enabled: true, numbers: true, stripEmoji: true, stripLinks: true, hashtags: true, dict: null },
    voice: { enabled: true, id: "vi-VN-NamMinhNeural", speed: 1, pitch: 0, volume: 1, leadIn: 0.3, tail: 0.8, customText: "" },
    tts: null, // { audioId, url, duration, cues, sig }
    stickers: [],
    export: { quality: "normal", fps: 30, fileName: "", watermark: "", watermarkPos: "br", progressBar: false, progressColor: "#5eead4" },
    lastVideo: null,
    posts: [], // [{id,url,status,error,checked,content,tts,video}]
    batch: { mode: "separate", gap: 0.8, secondsPerPost: 5 },
    activeId: null,
  });

  // ---------------------------------------------------------- state
  const deepMerge = (a, b) => {
    for (const k in b) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) deepMerge(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  };
  let S;
  try { S = deepMerge(DEFAULT(), JSON.parse(localStorage.getItem(STORE_KEY) || "{}")); } catch { S = DEFAULT(); }

  const get = (path) => path.split(".").reduce((o, k) => o?.[k], S);
  const set = (path, v) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => o[k], S)[last] = v; };

  let saveTimer;
  function save() {
    const el = $("#saveStatus"); el.classList.add("saving"); el.lastElementChild.textContent = "Đang lưu...";
    clearTimeout(saveTimer);
    syncActivePost();
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); el.lastElementChild.textContent = "Mọi thay đổi đã được lưu"; }
      catch { el.lastElementChild.textContent = "Không lưu được (bộ nhớ đầy)"; }
      el.classList.remove("saving");
    }, 400);
  }
  function changed(path) { save(); markDirty(); afterChange(path); if (pv.combo && !path.startsWith("batch")) exitCombo(); }

  // ---------------------------------------------------------- helpers
  function toast(msg, err = false, ms = 3200) {
    const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
    clearTimeout(t._t); t._t = setTimeout(() => (t.className = "toast"), ms);
  }
  const fmt = (sec) => { sec = Math.max(0, sec || 0); const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; };
  const fmtMs = (sec) => `${fmt(sec)}.${String(Math.floor((sec % 1) * 10))}`;
  const fmtSize = (b) => b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.round(b / 1e3) + " KB";
  async function api(url, opts = {}) {
    const r = await fetch(url, { headers: opts.body && !(opts.body instanceof FormData) ? { "Content-Type": "application/json" } : {}, ...opts, body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body });
    let j; try { j = await r.json(); } catch { throw new Error("Máy chủ không phản hồi"); }
    if (!r.ok || j.ok === false) throw new Error(j.error || "Lỗi máy chủ");
    return j;
  }
  function uploadFile(file, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData(); fd.append("file", file);
      const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/upload");
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => { try { const j = JSON.parse(xhr.responseText); j.ok ? resolve(j) : reject(new Error(j.error)); } catch { reject(new Error("Tải lên thất bại")); } };
      xhr.onerror = () => reject(new Error("Lỗi mạng khi tải lên"));
      xhr.send(fd);
    });
  }
  function btnLoading(btn, on) { btn.classList.toggle("loading", on); btn.disabled = on; }
  const loadImg = (src) => new Promise((res, rej) => { if (!src) return res(null); const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => rej(new Error("Không tải được ảnh")); im.src = src; });

  // ---------------------------------------------------------- assets
  const assets = { video: null, bgImage: null, avatar: null, postImage: null, stickers: {} };
  const bgVideo = document.createElement("video");
  bgVideo.muted = true; bgVideo.loop = true; bgVideo.playsInline = true; bgVideo.crossOrigin = "anonymous"; bgVideo.preload = "auto";
  bgVideo.addEventListener("loadeddata", () => { assets.video = bgVideo; seekPreview(pv.t); });
  async function loadAssets() {
    if (S.bg.url && bgVideo.src !== location.origin + S.bg.url) bgVideo.src = S.bg.url;
    if (!S.bg.url) { bgVideo.removeAttribute("src"); assets.video = null; }
    assets.bgImage = await loadImg(S.bg.imageUrl).catch(() => null);
    assets.avatar = await loadImg(S.content.avatar).catch(() => null);
    assets.postImage = await loadImg(S.content.postImage).catch(() => null);
    for (const st of S.stickers) if (st.kind === "image" && !assets.stickers[st.id]) assets.stickers[st.id] = await loadImg(st.value).catch(() => null);
    $("#avatarPrev").src = S.content.avatar || "";
    markDirty();
  }

  // ---------------------------------------------------------- bindings
  function syncInputs(onlyPath) {
    for (const el of $$("[data-bind]")) {
      const p = el.dataset.bind; if (onlyPath && p !== onlyPath) continue;
      const v = get(p);
      if (el.type === "checkbox") el.checked = !!v;
      else if (document.activeElement !== el) el.value = v ?? "";
    }
    for (const o of $$("[data-out]")) {
      const v = get(o.dataset.out);
      o.textContent = o.hasAttribute("data-pct") ? Math.round(v * 100) + "%" : (Math.round(v * 100) / 100) + (o.dataset.unit || "");
    }
    for (const g of $$("[data-choice]")) { const v = String(get(g.dataset.choice)); for (const b of $$("button[data-v]", g)) b.classList.toggle("on", b.dataset.v === v); }
    for (const el of $$("[data-show]")) { const [p, v] = el.dataset.show.split("="); el.hidden = String(get(p)) !== v; }
    $("#postText") && ($("#textCount").textContent = (S.content.text || "").length + " ký tự");
  }
  function bindAll() {
    for (const el of $$("[data-bind]")) {
      const p = el.dataset.bind;
      const ev = el.tagName === "SELECT" || el.type === "checkbox" || el.type === "color" ? "change" : "input";
      const handler = () => {
        let v = el.type === "checkbox" ? el.checked : el.value;
        if (el.hasAttribute("data-num") || el.type === "range" || el.type === "number") v = Number(v);
        set(p, v);
        // đồng bộ các input khác cùng key
        for (const o of $$(`[data-bind="${p}"]`)) if (o !== el) { if (o.type === "checkbox") o.checked = !!v; else o.value = v; }
        syncInputs("__none__");
        changed(p);
      };
      el.addEventListener(ev, handler);
      if (el.type === "color") el.addEventListener("input", handler);
    }
    for (const g of $$("[data-choice]")) {
      g.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]"); if (!b) return;
        const p = g.dataset.choice; let v = b.dataset.v;
        if (typeof get(p) === "number") v = Number(v);
        set(p, v); syncInputs(); changed(p);
      });
    }
  }
  // màu thẻ theo giao diện Sáng / Tối / Kính mờ
  const THEMES = { light: { color: "#111111", bgColor: "#ffffff", opacity: 100 }, dark: { color: "#f3f5f7", bgColor: "#181818", opacity: 100 }, glass: { color: "#ffffff", bgColor: "#2a2550", opacity: 55 } };
  const THEME_BG = { light: ["#f5f0e6", "#dfe4f7"], dark: ["#1e1b4b", "#312e81"], glass: ["#4c1d95", "#06b6d4"] };
  // cài đặt chữ cho 1 bài (áp dụng giao diện riêng nếu bài có chọn)
  function textFor(post) {
    const th = post && post.theme;
    if (!th || th === S.text.theme || !THEMES[th] || S.text.style === "plain" || S.text.style === "none") return S.text;
    return { ...S.text, theme: th, ...THEMES[th] };
  }
  function applyTheme(theme, { clearPosts = false } = {}) {
    S.text.theme = theme; Object.assign(S.text, THEMES[theme]);
    if (S.text.style === "highlight") { S.text.color = theme === "light" ? "#111111" : "#ffffff"; }
    if (clearPosts) S.posts.forEach((p) => (p.theme = null));
    if (S.text.themeBg && (S.bg.type === "gradient" || S.bg.type === "color")) {
      S.bg.grad1 = THEME_BG[theme][0]; S.bg.grad2 = THEME_BG[theme][1]; S.bg.color = THEME_BG[theme][0];
    }
    syncInputs(); renderPosts(); markDirty(); save();
  }
  function afterChange(p) {
    if (p === "text.theme") applyTheme(S.text.theme);
    if (p === "text.style") {
      if (S.text.style === "plain") { S.text.color = "#ffffff"; S.text.align = "center"; S.text.weight = "700"; }
      if (S.text.style === "highlight") { S.text.color = "#111111"; S.text.bgColor = "#ffffff"; S.text.align = "center"; S.text.weight = "700"; S.text.radius = 14; }
      if (S.text.style === "card") { Object.assign(S.text, THEMES[S.text.theme] || THEMES.light); S.text.align = "left"; S.text.weight = "500"; S.text.radius = 36; }
      syncInputs();
    }
    if (p === "aspect") { layoutPhone(); }
    if (p === "bg.type" && S.bg.type === "video" && S.bg.url) bgVideo.play().catch(() => { });
    if (p.startsWith("content.text") || p.startsWith("voice") || p === "subs.maxChars") updateTtsStale();
    if (p === "voice.id") { renderVoiceList(); renderPosts(); renderPostVoice(); }
    if (p.startsWith("batch")) renderPosts();
    if (p.startsWith("speech")) { updateTtsStale(); scheduleSpoken(); }
    if (p === "content.text") scheduleSpoken();
  }

  // ---------------------------------------------------------- steps
  function goStep(i) {
    S.step = Math.max(0, Math.min(4, i));
    $$(".step").forEach((b, k) => { b.classList.toggle("active", k === S.step); b.classList.toggle("done", k < S.step); });
    $$(".step-page").forEach((p) => (p.hidden = Number(p.dataset.page) !== S.step));
    $("#stepEyebrow").textContent = `BƯỚC 0${S.step + 1} / 05`;
    $("#stepTitle").textContent = STEPS[S.step][0];
    $("#stepDesc").textContent = STEPS[S.step][1];
    const pct = (S.step + 1) * 20; $("#stepPct").textContent = pct + "%"; $("#stepBar").style.width = pct + "%";
    $("#tipText").textContent = TIPS[S.step];
    $("#main").scrollTop = 0; save();
  }
  $("#stepNav").addEventListener("click", (e) => { const b = e.target.closest(".step"); if (b) goStep(Number(b.dataset.step)); });
  $$(".next").forEach((b) => b.addEventListener("click", () => goStep(S.step + 1)));
  $$(".prev").forEach((b) => b.addEventListener("click", () => goStep(S.step - 1)));

  // ---------------------------------------------------------- step 1: nội dung
  $("#srcSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    S.source.mode = b.dataset.v; renderSource(); save();
    if (S.source.mode === "text") $("#postText").focus();
  });
  function renderSource() {
    $$("#srcSeg button").forEach((b) => b.classList.toggle("on", b.dataset.v === S.source.mode));
    $("#srcLink").hidden = S.source.mode !== "link";
  }
  $("#btnFetch").addEventListener("click", fetchPost);
  const growUrl = () => { const t = $("#postUrl"); t.style.height = "auto"; t.style.height = Math.min(160, t.scrollHeight) + "px"; };
  $("#postUrl").addEventListener("input", growUrl);
  $("#postUrl").addEventListener("paste", () => setTimeout(growUrl));
  $("#postUrl").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); fetchPost(); } });
  const URL_RE = /(https?:\/\/)?(www\.)?threads\.(net|com)\/[^\s,;"'<>]+/gi;
  async function fetchPost() {
    const raw = $("#postUrl").value; const msg = $("#fetchMsg");
    const urls = [...new Set((raw.match(URL_RE) || []).map((u) => u.trim()))];
    if (!urls.length) { msg.className = "hint err"; msg.textContent = raw.trim() ? "Không tìm thấy link Threads hợp lệ." : "Vui lòng dán đường dẫn bài viết."; return; }
    btnLoading($("#btnFetch"), true);
    try {
      const added = addPostsFromUrls(urls);
      msg.className = "hint"; msg.textContent = `Đang lấy ${urls.length} bài...`;
      await fetchQueue(added);
      const ok = added.filter((p) => p.status === "ok").length;
      msg.className = ok === added.length ? "hint ok" : "hint err";
      msg.textContent = `✓ Đã lấy ${ok}/${added.length} bài.` + (ok < added.length ? " Bài lỗi: nhấp đúp để nhập tay hoặc bấm ↻ để thử lại." : " Nhấp đúp vào bài trong danh sách để sửa.");
      if (added[0]) activatePost(added[0].id);
      $("#postUrl").value = ""; S.source.url = "";
    } finally { btnLoading($("#btnFetch"), false); }
  }

  async function pickUpload(input, kind, dropzone, onDone) {
    input.onchange = async () => { const f = input.files[0]; input.value = ""; if (f) await doUpload(f, kind, dropzone, onDone); };
    input.click();
  }
  async function doUpload(f, kind, dropzones, onDone) {
    if (kind && !f.type.startsWith(kind + "/")) return toast(`Vui lòng chọn tệp ${kind === "video" ? "video" : kind === "audio" ? "âm thanh" : "ảnh"}`, true);
    if (f.size > 500 * 1024 * 1024) return toast("Tệp vượt quá 500MB", true);
    const zs = dropzones ? [].concat(dropzones) : [];
    zs.forEach((z) => z.classList.add("uploading"));
    try {
      const j = await uploadFile(f, (p) => zs.forEach((z) => ($(".up-progress i", z).style.width = p * 100 + "%")));
      await onDone(j);
      syncInputs(); renderUploads(); save(); markDirty();
    } catch (e) { toast(e.message, true); }
    finally { zs.forEach((z) => { z.classList.remove("uploading"); $(".up-progress i", z).style.width = "0"; }); }
  }
  const setVideo = async (j) => {
    Object.assign(S.bg, { type: "video", uploadId: j.id, url: j.url, name: j.name, info: { duration: j.duration, width: j.width, height: j.height, hasAudio: j.hasAudio, size: j.size } });
    bgVideo.src = j.url; bgVideo.play().catch(() => { });
    toast("Đã tải video nền");
  };
  $$(".btnPickVideo").forEach((b) => b.addEventListener("click", () => pickUpload($("#fileVideo"), "video", $$('[data-drop="bgVideo"]'), setVideo)));
  $("#btnPickBgImage").addEventListener("click", () => pickUpload($("#fileImage"), "image", $$('[data-drop="bgImage"]'), async (j) => {
    Object.assign(S.bg, { type: "image", imageUrl: j.url, imageName: j.name }); assets.bgImage = await loadImg(j.url);
  }));

  $("#btnAvatar").addEventListener("click", () => pickUpload($("#fileAvatar"), "image", null, async (j) => { S.content.avatar = j.url; assets.avatar = await loadImg(j.url); $("#avatarPrev").src = j.url; }));
  $("#btnAvatarClear").addEventListener("click", () => { S.content.avatar = null; assets.avatar = null; $("#avatarPrev").src = ""; save(); markDirty(); });
  $("#btnPostImage").addEventListener("click", () => pickUpload($("#filePostImage"), "image", null, async (j) => { S.content.postImage = j.url; S.content.showImage = true; assets.postImage = await loadImg(j.url); }));

  // kéo thả tệp
  for (const z of $$("[data-drop]")) {
    z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("over"); });
    z.addEventListener("dragleave", () => z.classList.remove("over"));
    z.addEventListener("drop", (e) => {
      e.preventDefault(); z.classList.remove("over");
      const f = e.dataTransfer.files[0]; if (!f) return;
      const k = z.dataset.drop;
      if (k === "bgVideo") doUpload(f, "video", $$('[data-drop="bgVideo"]'), setVideo);
      if (k === "bgImage") doUpload(f, "image", $$('[data-drop="bgImage"]'), async (j) => { Object.assign(S.bg, { type: "image", imageUrl: j.url, imageName: j.name }); assets.bgImage = await loadImg(j.url); });
      if (k === "music") addMusicFile(f);
    });
  }
  function renderUploads() {
    $$(".bgVideoName").forEach((e) => (e.textContent = S.bg.name || "Chưa có video được chọn"));
    $$(".bgVideoInfo").forEach((e) => (e.textContent = S.bg.info ? `${S.bg.info.width}×${S.bg.info.height} · ${fmt(S.bg.info.duration)} · ${fmtSize(S.bg.info.size || 0)}${S.bg.info.hasAudio ? " · có âm thanh" : ""}` : "MP4, MOV hoặc WebM · Tối đa 500MB"));
    $("#bgImageName").textContent = S.bg.imageName || "Chưa có ảnh được chọn";
    $$(".musicName").forEach((e) => (e.textContent = S.music.name ? "🎵 " + S.music.name : "Chưa có nhạc nền"));
    $("#postImageName").textContent = S.content.postImage ? "✓ Đã có ảnh bài viết" : "";
  }

  // swatches
  $("#gradSwatches").innerHTML = GRADIENTS.map(([a, b]) => `<button data-a="${a}" data-b="${b}" style="background:linear-gradient(160deg,${a},${b})"></button>`).join("");
  $("#gradSwatches").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.bg.grad1 = b.dataset.a; S.bg.grad2 = b.dataset.b; syncInputs(); changed("bg"); });
  $("#colorSwatches").innerHTML = COLORS.map((c) => `<button data-c="${c}" style="background:${c}"></button>`).join("");
  $("#colorSwatches").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.bg.color = b.dataset.c; syncInputs(); changed("bg"); });
  $$(".fontSelect").forEach((s) => (s.innerHTML = FONTS.map((f) => `<option style="font-family:'${f}'">${f}</option>`).join("")));

  // ---------------------------------------------------------- voices
  let VOICES = [];
  const previewAudio = new Audio();
  async function loadVoices() {
    try { VOICES = await api("/api/voices"); } catch { VOICES = []; }
    const vi = VOICES.filter((v) => v.lang === "vi"), en = VOICES.filter((v) => v.lang !== "vi");
    const opt = (v) => `<option value="${v.id}">${v.name} — ${v.desc}</option>`;
    $$(".voiceSelect").forEach((s) => (s.innerHTML = `<optgroup label="Tiếng Việt">${vi.map(opt).join("")}</optgroup><optgroup label="English">${en.map(opt).join("")}</optgroup>`));
    $$(".voiceCount").forEach((e) => (e.textContent = `${vi.length} giọng khả dụng`));
    renderVoiceList(); syncInputs(); renderPosts(); renderPostVoice(); renderBulkVoice();
    scheduleSpoken();
  }
  function renderVoiceList() {
    const colors = ["#6d5dfc", "#ec4899", "#0ea5e9", "#f59e0b", "#10b981"];
    $("#voiceList").innerHTML = VOICES.map((v, i) => `
      <div class="voice-item ${v.id === S.voice.id ? "on" : ""}" data-id="${v.id}">
        <span class="v-av" style="background:${colors[i % colors.length]}">${v.name[0]}</span>
        <div><b>${v.name}</b><small>${v.gender} · ${v.desc}</small></div>
        <button class="v-play" data-listen="${v.id}" title="Nghe thử"><svg><use href="#i-play"/></svg></button>
      </div>`).join("");
  }
  $("#voiceList").addEventListener("click", (e) => {
    const l = e.target.closest("[data-listen]");
    if (l) { e.stopPropagation(); listen(l.dataset.listen, l); return; }
    const it = e.target.closest(".voice-item"); if (!it) return;
    S.voice.id = it.dataset.id; syncInputs(); changed("voice.id");
  });
  $$(".btnListen").forEach((b) => b.addEventListener("click", () => listen(b.dataset.post ? curVoice() : S.voice.id, b)));
  async function listen(id, btn) {
    const base = (S.voice.customText || S.content.text || "").trim();
    const sample = base ? base.slice(0, 160) : (id.startsWith("en") ? "Hello! This is a preview of the AI voice for your Threads video." : "Xin chào! Đây là giọng đọc mẫu cho video Threads của bạn.");
    btnLoading(btn, true);
    try {
      const j = await api("/api/tts", { method: "POST", body: { text: sample, voice: id, speed: S.voice.speed, pitch: S.voice.pitch, preview: true, ...speechBody() } });
      if (j.warning) toast(j.warning);
      previewAudio.src = j.url; previewAudio.play();
    } catch (e) { toast(e.message, true); }
    finally { btnLoading(btn, false); }
  }

  const ttsText = () => (S.voice.customText || S.content.text || "").trim();
  // giọng của 1 bài: giọng riêng (nếu chọn) hoặc giọng mặc định
  const voiceOf = (p) => (p && p.voiceId && VOICES.some((v) => v.id === p.voiceId) ? p.voiceId : S.voice.id);
  const curVoice = () => voiceOf(S.posts.find((x) => x.id === S.activeId));
  const voiceName = (id) => VOICES.find((v) => v.id === id)?.name || id;
  const ttsSig = () => JSON.stringify([ttsText(), curVoice(), S.voice.speed, S.voice.pitch, S.subs.maxChars, speechSig()]);
  function updateTtsStale() {
    const stale = S.tts && S.tts.sig !== ttsSig();
    $("#voiceInfo") && S.tts && ($("#voiceInfo").innerHTML = stale ? "⚠️ Nội dung/giọng đã thay đổi – giọng đọc sẽ được tạo lại khi xuất video (hoặc nhấn “Tạo giọng đọc”)." : `✓ ${fmtMs(S.tts.duration)} · ${S.tts.cues.length} câu phụ đề`);
  }
  async function generateVoice(btn) {
    const text = ttsText();
    if (!text) throw new Error("Chưa có nội dung để đọc. Hãy nhập nội dung ở Bước 1.");
    btn && btnLoading(btn, true);
    try {
      const j = await api("/api/tts", { method: "POST", body: { text, voice: curVoice(), speed: S.voice.speed, pitch: S.voice.pitch, maxChars: S.subs.maxChars, ...speechBody() } });
      if (j.warning) toast(j.warning);
      S.tts = { audioId: j.audioId, url: j.url, duration: j.duration, cues: j.cues, sig: ttsSig() };
      voiceAudio.src = j.url; renderTts(); save(); markDirty();
      return S.tts;
    } finally { btn && btnLoading(btn, false); }
  }
  $("#btnGenVoice").addEventListener("click", async (e) => {
    try { await generateVoice(e.currentTarget); toast("Đã tạo giọng đọc & phụ đề"); seekPreview(0); } catch (err) { toast(err.message, true); }
  });
  function renderTts() {
    const has = !!S.tts;
    $("#voiceResult").hidden = !has;
    if (has) { $("#voiceAudio").src = S.tts.url; updateTtsStale(); }
    $("#cueList").innerHTML = has && S.tts.cues.length
      ? S.tts.cues.map((c, i) => `<div class="cue" data-i="${i}"><time data-seek="${c.start}">${fmtMs(c.start)} → ${fmtMs(c.end)}</time><span class="cue-wrap"><input value="${c.text.replace(/"/g, "&quot;")}" data-cue="${i}">${c.spoken && c.spoken !== c.text ? `<small class="spk">🗣 ${esc(c.spoken)}</small>` : ""}</span></div>`).join("")
      : `<p class="hint">Nhấn “Tạo giọng đọc” để tạo phụ đề tự động.</p>`;
  }
  $("#cueList").addEventListener("input", (e) => { const i = e.target.dataset.cue; if (i == null) return; S.tts.cues[i].text = e.target.value; save(); markDirty(); });
  $("#cueList").addEventListener("click", (e) => { const t = e.target.closest("[data-seek]"); if (t) seekPreview(Number(t.dataset.seek) + (S.voice.leadIn || 0) + 0.01); });

  // ---------------------------------------------------------- stickers
  let selSticker = null;
  const tabs = Object.keys(EMOJI); let curTab = tabs[0];
  function renderEmoji() {
    $("#emojiTabs").innerHTML = tabs.map((t) => `<button class="${t === curTab ? "on" : ""}" data-t="${t}">${t}</button>`).join("");
    $("#emojiGrid").innerHTML = EMOJI[curTab].map((e) => `<button data-e="${e}">${e}</button>`).join("");
  }
  $("#emojiTabs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { curTab = b.dataset.t; renderEmoji(); } });
  $("#emojiGrid").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) addSticker({ kind: "emoji", value: b.dataset.e, size: 0.16 }); });
  $("#btnStickerText").addEventListener("click", () => {
    const v = $("#stickerText").value.trim(); if (!v) return toast("Nhập nội dung sticker chữ", true);
    addSticker({ kind: "text", value: v, size: 0.13, x: 0.5, y: 0.7, bg: "#ffffff", color: "#111111" }); $("#stickerText").value = "";
  });
  $("#btnStickerImg").addEventListener("click", () => pickUpload($("#fileSticker"), "image", null, async (j) => {
    const st = addSticker({ kind: "image", value: j.url, size: 0.3 }, true);
    assets.stickers[st.id] = await loadImg(j.url);
  }));
  function addSticker(o, silent) {
    const st = { id: "s" + Math.random().toString(36).slice(2, 9), x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.2 + Math.random() * 0.15, rotation: 0, opacity: 1, start: null, end: null, ...o };
    S.stickers.push(st); selSticker = st.id; renderStickers(); save(); markDirty();
    if (!silent) toast("Đã thêm sticker – kéo trên khung xem trước để di chuyển");
    return st;
  }
  function renderStickers() {
    const L = $("#stickerList");
    if (!S.stickers.length) { L.innerHTML = `<p class="hint">Chưa có sticker nào.</p>`; return; }
    L.innerHTML = S.stickers.map((s) => `
      <div class="st-item ${s.id === selSticker ? "on" : ""}" data-id="${s.id}">
        <div class="st-thumb">${s.kind === "image" ? `<img src="${s.value}">` : s.kind === "emoji" ? s.value : "Aa"}</div>
        <label>Kích thước<input type="range" min="0.04" max="0.8" step="0.01" value="${s.size}" data-k="size"></label>
        <label>Góc xoay<input type="range" min="-180" max="180" value="${s.rotation}" data-k="rotation"></label>
        <label>Độ mờ<input type="range" min="0.1" max="1" step="0.05" value="${s.opacity}" data-k="opacity"></label>
        <label>Thời gian (giây)<span class="times"><input type="number" min="0" step="0.5" placeholder="Từ" value="${s.start ?? ""}" data-k="start"><input type="number" min="0" step="0.5" placeholder="Đến" value="${s.end ?? ""}" data-k="end"></span></label>
        <button class="btn btn-ghost btn-sm" data-del="${s.id}" title="Xoá">🗑</button>
      </div>`).join("");
  }
  $("#stickerList").addEventListener("input", (e) => {
    const it = e.target.closest(".st-item"); const k = e.target.dataset.k; if (!it || !k) return;
    const st = S.stickers.find((s) => s.id === it.dataset.id);
    st[k] = e.target.value === "" ? null : Number(e.target.value); save(); markDirty();
  });
  $("#stickerList").addEventListener("click", (e) => {
    const d = e.target.closest("[data-del]");
    if (d) { S.stickers = S.stickers.filter((s) => s.id !== d.dataset.del); renderStickers(); save(); markDirty(); return; }
    const it = e.target.closest(".st-item"); if (it && selSticker !== it.dataset.id) { selSticker = it.dataset.id; $$(".st-item").forEach((x) => x.classList.toggle("on", x.dataset.id === selSticker)); markDirty(); }
  });
  const stickerVisible = (st, t) => (st.start == null || t >= st.start) && (st.end == null || t <= st.end);

  // ---------------------------------------------------------- preview
  const canvas = $("#pv"); const ctx = canvas.getContext("2d");
  const voiceAudio = new Audio(); const musicAudio = new Audio(); musicAudio.loop = true;
  const pv = { t: 0, playing: false, last: 0, dirty: true, boxes: { card: null, stickers: [] } };
  let cardCache = { key: "", canvas: null, box: null };
  function markDirty() { pv.dirty = true; cardCache.key = ""; }

  function layoutPhone() {
    const [W, H] = R.size(S.aspect);
    const maxW = 250, maxH = 470;
    let w = maxW, h = (w * H) / W; if (h > maxH) { h = maxH; w = (h * W) / H; }
    if (W > H) { w = Math.min(340, $(".preview").clientWidth - 60); h = (w * H) / W; }
    const ph = $("#phone"); ph.style.width = w + "px"; ph.style.height = h + "px";
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    $("#resChip").textContent = `${W}×${H}`;
    markDirty();
  }
  const totalDuration = () => pv.combo ? pv.combo.total : S.voice.enabled && S.tts ? S.tts.duration + (S.voice.leadIn || 0) + (S.voice.tail || 0) : S.duration;
  const comboSeg = (t) => pv.combo && (pv.combo.segs.find((g) => t >= g.start && t < g.end) || pv.combo.segs[pv.combo.segs.length - 1]);
  function currentCue(t) {
    if (pv.combo) {
      const g = comboSeg(t); if (!S.subs.enabled || !g?.tts) return null;
      const tt = t - g.voiceAt; return g.tts.cues.find((c) => tt >= c.start && tt < c.end) || null;
    }
    if (!S.subs.enabled || !S.voice.enabled || !S.tts) return null;
    const tt = t - (S.voice.leadIn || 0);
    return S.tts.cues.find((c) => tt >= c.start && tt < c.end) || null;
  }
  function cardVisible(t) { return S.text.showFor === "all" || t < S.text.showSeconds; }

  function drawFrame() {
    const [W, H] = R.size(S.aspect);
    const k = canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    R.drawBackground(ctx, W, H, S, assets);
    // thẻ (cache ở độ phân giải canvas)
    const seg = comboSeg(pv.t);
    const curContent = seg ? seg.content : S.content, curAssets = seg ? seg.assets : assets;
    const curText = textFor(seg ? seg.post : S.posts.find((x) => x.id === S.activeId));
    const key = JSON.stringify([S.aspect, curText, curContent, canvas.width, !!curAssets.avatar, !!curAssets.postImage, seg ? seg.idx : -1]);
    if (cardCache.key !== key) {
      const c = cardCache.canvas || document.createElement("canvas"); c.width = canvas.width; c.height = canvas.height;
      const cx = c.getContext("2d"); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, c.width, c.height); cx.setTransform(k, 0, 0, k, 0, 0);
      cardCache = { key, canvas: c, box: R.drawCard(cx, W, H, { ...S, text: curText, content: curContent }, curAssets) };
    }
    pv.boxes.card = cardCache.box;
    const lt = seg ? pv.t - seg.start : pv.t; // thời gian tính từ đầu bài hiện tại
    if (!seg && !(S.content.text || "").trim()) {
      const s = R.unit(W, H);
      ctx.save(); ctx.textAlign = "left"; ctx.fillStyle = "#5eead4";
      ctx.font = `700 ${30 * s}px "Be Vietnam Pro"`; ctx.fillText("NỘI DUNG CỦA BẠN", 90 * s, H * 0.42);
      ctx.fillStyle = "#fff"; ctx.font = `600 ${92 * s}px "Be Vietnam Pro"`;
      ctx.fillText("Biến ý tưởng thành", 90 * s, H * 0.42 + 120 * s); ctx.fillText("video ấn tượng", 90 * s, H * 0.42 + 230 * s);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = `400 ${34 * s}px "Be Vietnam Pro"`;
      ctx.fillText("Dán link Threads hoặc nhập nội dung để bắt đầu.", 90 * s, H * 0.42 + 310 * s);
      ctx.restore();
    }
    if (cardVisible(lt)) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (S.text.fadeIn && lt < 0.4) ctx.globalAlpha = Math.max(0, lt / 0.4);
      if (S.text.fadeIn && S.text.showFor === "first" && lt > S.text.showSeconds - 0.4) ctx.globalAlpha = Math.max(0, (S.text.showSeconds - lt) / 0.4);
      if (S.text.fadeIn && seg && seg.idx < pv.combo.segs.length - 1 && pv.t > seg.end - 0.4) ctx.globalAlpha = Math.max(0, (seg.end - pv.t) / 0.4);
      ctx.drawImage(cardCache.canvas, 0, 0); ctx.restore();
    }
    const cue = currentCue(pv.t);
    if (cue) R.drawSubtitle(ctx, W, H, S, cue.text);
    pv.boxes.stickers = [];
    for (const st of S.stickers) {
      if (!stickerVisible(st, pv.t) && !(st.id === selSticker && !pv.playing)) continue;
      pv.boxes.stickers.push({ id: st.id, ...R.drawSticker(ctx, W, H, st, assets, st.id === selSticker && !pv.playing && S.step === 4) });
    }
    R.drawWatermark(ctx, W, H, S);
    const dur = totalDuration();
    R.drawProgress(ctx, W, H, S, dur ? pv.t / dur : 0);
    $("#pvTime").textContent = `${seg ? `Bài ${seg.idx + 1}/${pv.combo.segs.length} · ` : ""}${fmt(pv.t)} / ${fmt(dur)}`;
    $("#pvFill").style.width = (dur ? Math.min(100, (pv.t / dur) * 100) : 0) + "%";
    if (!seg && S.tts && !$("#cueList").hidden) {
      const ci = cue ? S.tts.cues.indexOf(cue) : -1;
      if (pv.lastCue !== ci) { $$(".cue").forEach((el) => el.classList.toggle("active", Number(el.dataset.i) === ci)); pv.lastCue = ci; }
    }
  }
  function loop(now) {
    if (pv.playing && pv.combo) {
      pv.t += (now - pv.last) / 1000;
      const g = comboSeg(pv.t);
      if (g?.tts) {
        const at = pv.t - g.voiceAt;
        if (at >= 0 && at < g.tts.duration) {
          if (pv.comboAudio !== g) { pv.comboAudio = g; voiceAudio.src = g.tts.url; voiceAudio.currentTime = at; voiceAudio.play().catch(() => { }); }
          else if (Math.abs(voiceAudio.currentTime - at) > 0.35 && !voiceAudio.paused) pv.t = g.voiceAt + voiceAudio.currentTime;
        }
      }
      if (pv.t >= pv.combo.total) { pause(); pv.t = 0; exitCombo(); }
    } else if (pv.playing) {
      const useAudio = S.voice.enabled && S.tts && !voiceAudio.paused && voiceAudio.readyState >= 2;
      if (useAudio) pv.t = voiceAudio.currentTime + (S.voice.leadIn || 0);
      else pv.t += (now - pv.last) / 1000;
      if (S.voice.enabled && S.tts && voiceAudio.paused && pv.t >= (S.voice.leadIn || 0) && pv.t < S.tts.duration + (S.voice.leadIn || 0)) {
        voiceAudio.currentTime = pv.t - (S.voice.leadIn || 0); voiceAudio.play().catch(() => { });
      }
      if (pv.t >= totalDuration()) { pause(); pv.t = 0; }
    }
    if (pv.playing && S.music.url && !musicAudio.paused) {
      // mô phỏng "tự giảm nhạc khi có giọng đọc" trên bản xem trước
      const speaking = !voiceAudio.paused && S.voice.enabled;
      const k = S.music.duck && speaking ? ({ light: 0.5, medium: 0.3, strong: 0.14 }[S.music.duckLevel] || 0.3) : 1;
      let fade = 1; const tot = totalDuration();
      if (S.music.fadeIn) fade = Math.min(fade, pv.t / 1.5);
      if (S.music.fadeOut) fade = Math.min(fade, (tot - pv.t) / 2);
      const target = Math.max(0, Math.min(1, S.music.volume * k * Math.max(0, fade)));
      musicAudio.volume = musicAudio.volume + (target - musicAudio.volume) * 0.2;
    }
    pv.last = now;
    const videoActive = S.bg.type === "video" && assets.video;
    if (pv.playing || pv.dirty || videoActive) { drawFrame(); pv.dirty = false; }
    requestAnimationFrame(loop);
  }
  function play() {
    if (pv.t >= totalDuration() - 0.05) pv.t = 0;
    pv.playing = true; $("#phone").classList.add("playing"); $("#pvPlay use").setAttribute("href", "#i-pause");
    pv.comboAudio = null;
    if (pv.combo) voiceAudio.volume = Math.min(1, S.voice.volume);
    else if (S.voice.enabled && S.tts) {
      voiceAudio.src.endsWith(S.tts.url) || (voiceAudio.src = S.tts.url);
      voiceAudio.volume = Math.min(1, S.voice.volume);
      const at = pv.t - (S.voice.leadIn || 0);
      if (at >= 0) { voiceAudio.currentTime = at; voiceAudio.play().catch(() => { }); }
    }
    if (S.music.url) {
      musicPreview.pause();
      musicAudio.volume = Math.min(1, S.music.volume);
      const md = musicAudio.duration || 1e9, ms = Math.min(S.music.start || 0, md - 1);
      musicAudio.currentTime = ms + (pv.t % Math.max(1, md - ms));
      musicAudio.play().catch(() => { });
    }
    if (S.bg.type === "video" && S.bg.url) {
      bgVideo.playbackRate = S.bg.speed || 1;
      bgVideo.muted = !S.bg.keepAudio; bgVideo.volume = Math.min(1, S.bg.audioVolume);
      seekVideo(pv.t); bgVideo.play().catch(() => { });
    }
  }
  function pause() {
    pv.playing = false; $("#phone").classList.remove("playing"); $("#pvPlay use").setAttribute("href", "#i-play");
    voiceAudio.pause(); musicAudio.pause(); bgVideo.muted = true; markDirty();
  }
  function seekVideo(t) {
    if (!bgVideo.duration) return;
    bgVideo.currentTime = ((S.bg.start || 0) + t * (S.bg.speed || 1)) % bgVideo.duration;
  }
  function seekPreview(t) {
    pv.t = Math.max(0, Math.min(totalDuration(), t));
    if (pv.combo) { pv.comboAudio = null; voiceAudio.pause(); }
    else if (S.tts && S.voice.enabled) { const at = pv.t - (S.voice.leadIn || 0); if (at >= 0) voiceAudio.currentTime = at; else voiceAudio.pause(); }
    seekVideo(pv.t); markDirty();
  }
  $("#pvPlay").addEventListener("click", () => (pv.playing ? pause() : play()));
  $("#pvTrack").addEventListener("click", (e) => { const r = e.currentTarget.getBoundingClientRect(); seekPreview(((e.clientX - r.left) / r.width) * totalDuration()); });
  bgVideo.addEventListener("ended", () => seekVideo(pv.t));

  // kéo thả trên canvas (sticker / thẻ)
  let drag = null;
  const toDesign = (e) => { const r = canvas.getBoundingClientRect(); const [W, H] = R.size(S.aspect); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, W, H }; };
  const hit = (b, p) => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".pv-play")) return;
    const p = toDesign(e);
    const st = [...pv.boxes.stickers].reverse().find((b) => hit(b, p));
    if (st) {
      const s = S.stickers.find((x) => x.id === st.id); selSticker = s.id; renderStickers();
      drag = { kind: "sticker", s, ox: p.x - s.x * p.W, oy: p.y - s.y * p.H };
    } else if (hit(pv.boxes.card, p) && cardVisible(pv.t)) {
      const b = pv.boxes.card; drag = { kind: "card", ox: p.x - (b.x + b.w / 2), oy: p.y - (b.y + b.h / 2) };
    } else { selSticker = null; renderStickers(); markDirty(); return; }
    canvas.setPointerCapture(e.pointerId); canvas.classList.add("grabbing");
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = toDesign(e);
    if (!drag) { canvas.classList.toggle("grab", !!(pv.boxes.stickers.some((b) => hit(b, p)) || hit(pv.boxes.card, p))); return; }
    if (drag.kind === "sticker") { drag.s.x = Math.max(0, Math.min(1, (p.x - drag.ox) / p.W)); drag.s.y = Math.max(0, Math.min(1, (p.y - drag.oy) / p.H)); }
    else { S.text.x = Math.round(Math.max(0, Math.min(100, ((p.x - drag.ox) / p.W) * 100))); S.text.y = Math.round(Math.max(0, Math.min(100, ((p.y - drag.oy) / p.H) * 100))); syncInputs("text.y"); syncInputs("__none__"); }
    markDirty();
  });
  canvas.addEventListener("pointerup", () => { if (drag) { drag = null; canvas.classList.remove("grabbing"); save(); } });
  canvas.addEventListener("wheel", (e) => {
    const s = S.stickers.find((x) => x.id === selSticker); if (!s) return;
    e.preventDefault(); s.size = Math.max(0.04, Math.min(0.8, s.size * (e.deltaY < 0 ? 1.06 : 0.94))); renderStickers(); markDirty(); save();
  }, { passive: false });

  // ---------------------------------------------------------- danh sách nhiều bài viết
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  const pid = () => "p" + Math.random().toString(36).slice(2, 10);
  const activePost = () => S.posts.find((p) => p.id === S.activeId) || null;
  function syncActivePost() {
    const p = activePost(); if (!p) return;
    p.content = clone(S.content); p.tts = clone(S.tts);
    if (p.status === "error" && (S.content.text || "").trim()) p.status = "manual";
    schedulePostsRender();
  }
  let postsRenderT;
  const schedulePostsRender = () => { clearTimeout(postsRenderT); postsRenderT = setTimeout(renderPosts, 250); };
  const authorDefaults = () => ({ ...clone(DEFAULT().content), time: S.content.time, likes: S.content.likes, comments: S.content.comments, reposts: S.content.reposts, verified: S.content.verified, text: "", displayName: "", username: "", postImage: null, avatar: null, showImage: false });
  function newPost(extra = {}) { return { id: pid(), url: "", status: "manual", error: null, checked: true, content: authorDefaults(), tts: null, video: null, ...extra }; }
  function ensureDraftSaved() {
    // chưa có danh sách nhưng đang có nội dung → giữ lại làm bài đầu tiên
    if (!S.posts.length && (S.content.text || "").trim()) {
      const p = newPost({ content: clone(S.content), tts: clone(S.tts) }); S.posts.push(p); S.activeId = p.id;
    }
  }
  function addPostsFromUrls(urls) {
    ensureDraftSaved();
    const exist = new Set(S.posts.map((p) => p.url));
    const added = [];
    for (const u of urls) {
      if (exist.has(u)) { const old = S.posts.find((p) => p.url === u); if (old.status === "error") added.push(old); continue; }
      const p = newPost({ url: u, status: "loading" }); S.posts.push(p); added.push(p); exist.add(u);
    }
    renderPosts(); save();
    return added;
  }
  async function fetchOne(p) {
    p.status = "loading"; p.error = null; renderPosts();
    try {
      const j = await api("/api/fetch-post", { method: "POST", body: { url: p.url } });
      Object.assign(p.content, { text: j.text, displayName: j.displayName, username: j.username });
      if (j.image) { p.content.postImage = "/api/proxy-image?url=" + encodeURIComponent(j.image); }
      p.status = "ok"; p.tts = null;
      if (p.id === S.activeId) { S.content = clone(p.content); S.tts = null; syncInputs(); renderTts(); loadAssets(); }
    } catch (e) { p.status = "error"; p.error = e.message; }
    renderPosts(); save();
  }
  async function fetchQueue(list, concurrency = 3) {
    const q = [...list];
    await Promise.all(Array.from({ length: Math.min(concurrency, q.length) }, async () => { while (q.length) await fetchOne(q.shift()); }));
  }
  async function activatePost(id, { focus = false } = {}) {
    const p = S.posts.find((x) => x.id === id); if (!p) return;
    if (pv.combo) exitCombo();
    if (S.activeId !== id) {
      syncActivePost();
      S.activeId = id; S.content = clone(p.content); S.tts = clone(p.tts);
      if (S.tts) voiceAudio.src = S.tts.url; else voiceAudio.removeAttribute("src");
      pause(); pv.t = 0;
      syncInputs(); renderTts(); renderUploads();
      await loadAssets();
    }
    renderPosts(); renderPostVoice(); save();
    if (focus) { goStep(0); S.source.mode = "text"; renderSource(); setTimeout(() => { const t = $("#postText"); t.focus(); t.scrollIntoView({ block: "center", behavior: "smooth" }); }, 50); }
  }
  function removePosts(ids) {
    const set = new Set(ids);
    const wasActive = set.has(S.activeId);
    S.posts = S.posts.filter((p) => !set.has(p.id));
    if (wasActive) {
      S.activeId = null;
      if (S.posts[0]) activatePost(S.posts[0].id);
      else { S.content = authorDefaults(); S.tts = null; syncInputs(); renderTts(); loadAssets(); }
    }
    renderPosts(); save(); markDirty();
  }

  const thumbCache = new Map();
  function postThumb(p) {
    const key = JSON.stringify([p.content.text, p.content.displayName, textFor(p), S.aspect, S.bg.type, S.bg.grad1, S.bg.grad2, S.bg.color]);
    const c = thumbCache.get(p.id); if (c && c.key === key) return c.url;
    const [W, H] = R.size(S.aspect);
    const cw = W > H ? 96 : 54, ch = Math.round((cw * H) / W);
    const cv = document.createElement("canvas"); cv.width = cw * 2; cv.height = ch * 2;
    const x = cv.getContext("2d"); const k = cv.width / W; x.setTransform(k, 0, 0, k, 0, 0);
    const st = { ...S, text: textFor(p), content: p.content, bg: { ...S.bg, type: S.bg.type === "video" || S.bg.type === "image" ? "gradient" : S.bg.type, blur: 0 } };
    R.drawBackground(x, W, H, st, {}, {});
    R.drawCard(x, W, H, st, {});
    const url = cv.toDataURL("image/png"); thumbCache.set(p.id, { key, url }); return url;
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const STATUS = { loading: ["Đang lấy…", "st-load"], ok: ["Đã lấy", "st-ok"], error: ["Lỗi", "st-err"], manual: ["Nhập tay", "st-man"] };
  function renderPosts() {
    const box = $("#postList"); if (!box) return;
    renderThemeBar();
    const n = S.posts.length, checked = S.posts.filter((p) => p.checked).length;
    $("#postsMeta").textContent = `${n} bài · kéo đổi thứ tự · bỏ dấu chọn để không xuất · nhấp đúp để sửa`;
    $("#postsCount").textContent = n;
    const ready = S.posts.filter((p) => p.checked && (p.content.text || "").trim()).length;
    $$(".btnBatchRun").forEach((b) => { if (!b.classList.contains("running")) b.querySelector("span").innerHTML = S.batch.mode === "combined" ? `Gộp <b class="batchCount">${ready}</b> bài → 1 video` : `Xuất <b class="batchCount">${ready}</b> video`; });
    if (S.batch.mode === "combined") {
      const est = S.posts.filter((p) => p.checked && (p.content.text || "").trim()).reduce((a, p) => a + (p.tts?.duration || (p.content.text || "").length / 14 / (S.voice.speed || 1)) + (S.voice.leadIn || 0) + (S.batch.gap || 0), 0);
      $("#batchEst").textContent = ready ? `≈ ${fmt(est)} · đọc lần lượt bài 1 → ${ready}` : "";
    } else $("#batchEst").textContent = ready ? `${ready} file riêng` : "";
    $("#btnBatch").hidden = n < 2; $("#btnBatch2").disabled = !ready;
    $("#btnRemoveChecked").disabled = !checked;
    $("#chkAll").checked = n > 0 && checked === n; $("#chkAll").indeterminate = checked > 0 && checked < n;
    if (!n) { box.innerHTML = `<p class="hint empty">Chưa có bài nào. Dán một hoặc nhiều link Threads ở trên (mỗi dòng 1 link) rồi bấm “Lấy nội dung”, hoặc bấm “+ Bài mới” để nhập tay.</p>`; return; }
    box.innerHTML = S.posts.map((p, i) => {
      const [label, cls] = p.video?.error ? ["Xuất lỗi", "st-err"] : p.video?.url ? ["Đã xuất", "st-done"] : p.rendering ? ["Đang xuất…", "st-load"] : STATUS[p.status] || STATUS.manual;
      const name = p.content.displayName || p.content.username || (p.url ? p.url.replace(/^https?:\/\/(www\.)?/, "") : "Bài viết");
      const snippet = (p.content.text || p.error || "(chưa có nội dung)").replace(/\s+/g, " ").slice(0, 160);
      return `<div class="post-item ${p.id === S.activeId ? "active" : ""} ${p.checked ? "" : "off"}" draggable="true" data-id="${p.id}" title="${esc(p.error || p.url || "")}">
        <span class="drag" title="Kéo để đổi thứ tự">⋮⋮</span>
        <span class="num">${i + 1}</span>
        <label class="chk"><input type="checkbox" data-chk ${p.checked ? "checked" : ""}><i></i></label>
        <img class="post-thumb" src="${postThumb(p)}" alt="">
        <div class="post-main"><span class="badge ${cls}">${label}</span><b>${esc(name)}</b><span class="sep">|</span><span class="snip">${esc(snippet)}</span></div>
        <select class="post-theme ${p.theme ? "custom" : ""}" data-theme title="Giao diện thẻ của bài này">${themeOptions(p.theme)}</select>
        <select class="post-voice ${p.voiceId ? "custom" : ""}" data-voice title="Giọng đọc của bài này">${voiceOptions(p.voiceId)}</select>
        <span class="post-acts">
          ${p.video?.url ? `<a href="${p.video.url}" download="${esc(p.video.file)}" title="Tải video">⬇</a>` : ""}
          ${p.url && p.status !== "loading" ? `<button data-retry title="Lấy lại nội dung">↻</button>` : ""}
          <button data-dup title="Nhân bản">⧉</button>
          <button data-del title="Xoá">✕</button>
        </span></div>`;
    }).join("");
  }
  function voiceOptions(sel, defLabel) {
    const vi = VOICES.filter((v) => v.lang === "vi"), en = VOICES.filter((v) => v.lang !== "vi");
    const o = (v) => `<option value="${v.id}" ${v.id === sel ? "selected" : ""}>🎙 ${v.name} (${v.gender})</option>`;
    return `<option value="" ${!sel ? "selected" : ""}>${defLabel || "🎙 Mặc định · " + esc(voiceName(S.voice.id))}</option><optgroup label="Tiếng Việt">${vi.map(o).join("")}</optgroup><optgroup label="English">${en.map(o).join("")}</optgroup>`;
  }
  function setPostVoice(p, id) {
    p.voiceId = id || null;
    if (p.id === S.activeId) { updateTtsStale(); renderPostVoice(); }
    renderPosts(); save();
  }
  // ô chọn giọng cho bài đang sửa (Bước 1)
  function renderPostVoice() {
    const sel = $("#postVoice"); if (!sel) return;
    const p = S.posts.find((x) => x.id === S.activeId);
    $("#postVoiceRow").hidden = !p;
    if (p) sel.innerHTML = voiceOptions(p.voiceId);
  }
  $("#postVoice").addEventListener("change", (e) => { const p = S.posts.find((x) => x.id === S.activeId); if (p) setPostVoice(p, e.target.value); });
  $("#bulkVoice").addEventListener("change", (e) => {
    const v = e.target.value; e.target.value = "";
    const list = S.posts.filter((p) => p.checked); if (!list.length) return toast("Hãy tích chọn bài trước", true);
    if (v === "__alt") {
      const vi = VOICES.filter((x) => x.lang === "vi" && x.engine === "edge");
      const pair = vi.length >= 2 ? vi.slice(0, 2) : VOICES.slice(0, 2);
      list.forEach((p, i) => (p.voiceId = pair[i % pair.length].id));
      toast(`Đã xen kẽ ${pair.map((x) => x.name).join(" / ")} cho ${list.length} bài`);
    } else if (v === "__default") { list.forEach((p) => (p.voiceId = null)); toast(`${list.length} bài dùng giọng mặc định`); }
    else if (v) { list.forEach((p) => (p.voiceId = v)); toast(`Đã đặt giọng ${voiceName(v)} cho ${list.length} bài`); }
    updateTtsStale(); renderPostVoice(); renderPosts(); save();
  });
  function renderBulkVoice() {
    const sel = $("#bulkVoice"); if (!sel) return;
    sel.innerHTML = `<option value="">🎙 Giọng cho bài đã chọn…</option><option value="__alt">⇄ Xen kẽ giọng Nam / Nữ</option><option value="__default">↺ Về giọng mặc định</option>` + voiceOptions("x", "—").replace(/<option value="" [^>]*>—<\/option>/, "");
  }
  const THEME_LABEL = { light: "☀️ Sáng", dark: "🌙 Tối", glass: "🧊 Kính" };
  function themeOptions(sel) {
    return `<option value="" ${!sel ? "selected" : ""}>🎨 Chung</option>` +
      Object.entries(THEME_LABEL).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v}</option>`).join("");
  }
  function renderThemeBar() {
    $$("#themeBar button[data-theme-all]").forEach((b) => b.classList.toggle("on", b.dataset.themeAll === S.text.theme));
    const n = S.posts.filter((p) => p.theme && p.theme !== S.text.theme).length;
    $("#themeOverrides").textContent = n ? `· ${n} bài đang dùng giao diện riêng` : "";
    $("#themeBgSync").checked = !!S.text.themeBg;
  }
  $("#themeBar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme-all]"); if (!b) return;
    if (S.text.style !== "card" && S.text.style !== "highlight") { S.text.style = "card"; Object.assign(S.text, { align: "left", weight: "500", radius: 36 }); }
    applyTheme(b.dataset.themeAll, { clearPosts: true });
    toast(`Đã đổi tất cả bài sang nền ${THEME_LABEL[b.dataset.themeAll].split(" ")[1].toLowerCase()}`);
  });
  $("#themeBgSync").addEventListener("change", (e) => { S.text.themeBg = e.target.checked; if (e.target.checked) applyTheme(S.text.theme); else save(); });
  const postList = $("#postList");
  postList.addEventListener("change", (e) => {
    if (e.target.matches("[data-theme]")) {
      const p = S.posts.find((x) => x.id === e.target.closest(".post-item").dataset.id);
      p.theme = e.target.value || null; renderPosts(); markDirty(); save(); return;
    }
    if (!e.target.matches("[data-voice]")) return;
    const p = S.posts.find((x) => x.id === e.target.closest(".post-item").dataset.id); setPostVoice(p, e.target.value);
  });
  postList.addEventListener("click", (e) => {
    const it = e.target.closest(".post-item"); if (!it) return;
    const p = S.posts.find((x) => x.id === it.dataset.id);
    if (e.target.closest("[data-chk]")) { p.checked = e.target.checked; renderPosts(); save(); return; }
    if (e.target.closest(".chk") || e.target.closest("a") || e.target.closest("select")) return;
    if (e.target.closest("[data-del]")) return removePosts([p.id]);
    if (e.target.closest("[data-retry]")) return fetchOne(p);
    if (e.target.closest("[data-dup]")) {
      syncActivePost();
      const c = newPost({ content: clone(p.content), url: "", status: "manual", voiceId: p.voiceId || null, theme: p.theme || null });
      S.posts.splice(S.posts.indexOf(p) + 1, 0, c); activatePost(c.id); return;
    }
    activatePost(p.id);
  });
  postList.addEventListener("dblclick", (e) => { const it = e.target.closest(".post-item"); if (it && !e.target.closest("button,a,.chk,select")) activatePost(it.dataset.id, { focus: true }); });
  let dragPost = null;
  postList.addEventListener("dragstart", (e) => { const it = e.target.closest(".post-item"); if (!it) return; dragPost = it.dataset.id; it.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragPost); });
  postList.addEventListener("dragend", () => { dragPost = null; $$(".post-item", postList).forEach((x) => x.classList.remove("dragging", "drop-before", "drop-after")); });
  postList.addEventListener("dragover", (e) => {
    if (!dragPost) return; e.preventDefault();
    const it = e.target.closest(".post-item"); $$(".post-item", postList).forEach((x) => x.classList.remove("drop-before", "drop-after"));
    if (!it || it.dataset.id === dragPost) return;
    const r = it.getBoundingClientRect(); it.classList.add(e.clientY < r.top + r.height / 2 ? "drop-before" : "drop-after");
  });
  postList.addEventListener("drop", (e) => {
    e.preventDefault(); const it = e.target.closest(".post-item"); if (!dragPost || !it || it.dataset.id === dragPost) return;
    const r = it.getBoundingClientRect(); const after = e.clientY >= r.top + r.height / 2;
    const from = S.posts.findIndex((p) => p.id === dragPost); const [m] = S.posts.splice(from, 1);
    let to = S.posts.findIndex((p) => p.id === it.dataset.id) + (after ? 1 : 0);
    S.posts.splice(to, 0, m); dragPost = null; renderPosts(); save();
  });
  $("#chkAll").addEventListener("change", (e) => { S.posts.forEach((p) => (p.checked = e.target.checked)); renderPosts(); save(); });
  $("#btnRemoveChecked").addEventListener("click", () => {
    const ids = S.posts.filter((p) => p.checked).map((p) => p.id); if (!ids.length) return;
    if (confirm(`Bỏ ${ids.length} bài đã chọn khỏi danh sách?`)) removePosts(ids);
  });
  $("#btnNewPost").addEventListener("click", () => { ensureDraftSaved(); syncActivePost(); const p = newPost(); S.posts.push(p); activatePost(p.id, { focus: true }); });
  $("#btnRetryErr").addEventListener("click", () => { const errs = S.posts.filter((p) => p.status === "error" && p.url); if (!errs.length) return toast("Không có bài lỗi"); fetchQueue(errs); });

  // ---------- xuất hàng loạt
  let batchRunning = false, batchCancel = false;
  async function renderBatch() {
    if (batchRunning) { batchCancel = true; $$(".btnBatchRun").forEach((b) => (b.querySelector("span").textContent = "Đang dừng…")); return; }
    syncActivePost();
    const list = S.posts.filter((p) => p.checked && (p.content.text || "").trim());
    if (!list.length) return toast("Chưa chọn bài nào có nội dung", true);
    if (S.batch.mode === "combined") return renderCombined(list);
    batchRunning = true; batchCancel = false;
    const btns = $$(".btnBatchRun"); btns.forEach((b) => b.classList.add("running"));
    const origName = S.export.fileName; const prevActive = S.activeId;
    let ok = 0, fail = 0;
    for (const p of S.posts) if (list.includes(p)) p.video = null;
    for (const [i, p] of list.entries()) {
      if (batchCancel) break;
      btns.forEach((b) => (b.querySelector("span").textContent = `Dừng (${i + 1}/${list.length})`));
      await activatePost(p.id);
      p.rendering = true; renderPosts();
      const idx = S.posts.indexOf(p) + 1;
      S.export.fileName = `${String(idx).padStart(2, "0")}-${(origName || "threads")}${p.content.username ? "-" + p.content.username : ""}`;
      const job = await renderVideo({ batch: true });
      S.export.fileName = origName;
      p.rendering = false;
      if (job && !job.error) { p.video = { file: job.file, url: job.url }; ok++; }
      else { p.video = { error: job?.error || "Không có nội dung" }; fail++; }
      syncActivePost(); renderPosts(); save();
    }
    batchRunning = false;
    btns.forEach((b) => b.classList.remove("running"));
    renderPosts();
    if (prevActive && !batchCancel) activatePost(prevActive);
    toast(batchCancel ? `Đã dừng: ${ok} video xong` : `🎉 Xuất xong ${ok} video${fail ? `, ${fail} lỗi` : ""}`, fail > 0, 6000);
  }
  async function renderCombined(list) {
    if (list.length < 2) toast("Chỉ có 1 bài được chọn – vẫn xuất bình thường");
    batchRunning = true; batchCancel = false;
    const btns = $$(".btnBatchRun"); btns.forEach((b) => { b.classList.add("running"); b.disabled = true; b.querySelector("span").textContent = "Đang gộp…"; });
    list.forEach((p) => (p.rendering = true)); renderPosts();
    const job = await renderVideo({ combined: true, posts: list });
    list.forEach((p) => { p.rendering = false; if (job && !job.error) p.video = { file: job.file, url: job.url }; });
    batchRunning = false;
    btns.forEach((b) => { b.classList.remove("running"); b.disabled = false; });
    renderPosts(); save();
  }
  $$(".btnBatchRun").forEach((b) => b.addEventListener("click", renderBatch));

  // ---------------------------------------------------------- cách đọc / từ viết tắt
  let DEFAULT_DICT_TEXT = "";
  const dictText = () => (S.speech.dict != null ? S.speech.dict : DEFAULT_DICT_TEXT);
  const speechBody = () => ({ speech: { enabled: S.speech.enabled, numbers: S.speech.numbers, stripEmoji: S.speech.stripEmoji, stripLinks: S.speech.stripLinks, hashtags: S.speech.hashtags }, dict: dictText() });
  const hashStr = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h; };
  const speechSig = () => S.speech.enabled ? hashStr(JSON.stringify(speechBody())) : 0;
  const dictEntries = () => dictText().split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#") && /=/.test(l)).length;
  function renderDict() {
    const ta = $("#dictText"); if (!ta) return;
    if (document.activeElement !== ta) ta.value = dictText();
    $("#dictCount").textContent = `${dictEntries()} từ${S.speech.dict == null ? " · mặc định" : " · đã chỉnh"}`;
  }
  api("/api/dict-default").then((j) => { DEFAULT_DICT_TEXT = j.text; renderDict(); updateTtsStale(); scheduleSpoken(); }).catch(() => { });
  let dictT;
  $("#dictText").addEventListener("input", (e) => {
    S.speech.dict = e.target.value; clearTimeout(dictT);
    dictT = setTimeout(() => { renderDict(); updateTtsStale(); save(); scheduleSpoken(); }, 400);
  });
  $("#btnDictReset").addEventListener("click", () => {
    if (S.speech.dict != null && !confirm("Khôi phục từ điển mặc định? Các từ bạn tự thêm sẽ bị xoá.")) return;
    S.speech.dict = null; $("#dictText").value = dictText(); renderDict(); updateTtsStale(); save(); scheduleSpoken(); toast("Đã khôi phục từ điển mặc định");
  });
  function addDictEntry() {
    const f = $("#dictFrom").value.trim(), t = $("#dictTo").value.trim();
    if (!f) return toast("Nhập từ viết tắt", true);
    const lines = dictText().split(/\r?\n/);
    const re = new RegExp(`^\\s*${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*=`, "i");
    const i = lines.findIndex((l) => re.test(l));
    const line = `${f} = ${t}`;
    if (i >= 0) lines[i] = line; else lines.splice(lines[0]?.startsWith("#") ? 0 : 0, 0, "", "# --- từ của tôi", line);
    S.speech.dict = lines.join("\n").replace(/\n{3,}/g, "\n\n");
    $("#dictText").value = S.speech.dict; $("#dictFrom").value = ""; $("#dictTo").value = ""; $("#dictFrom").focus();
    renderDict(); updateTtsStale(); save(); scheduleSpoken();
    toast(i >= 0 ? `Đã cập nhật: ${line}` : `Đã thêm: ${line}`);
  }
  $("#btnDictAdd").addEventListener("click", addDictEntry);
  $("#dictTo").addEventListener("keydown", (e) => e.key === "Enter" && addDictEntry());
  $("#dictFrom").addEventListener("keydown", (e) => e.key === "Enter" && $("#dictTo").focus());
  // tô sáng các chỗ được đọc khác đi
  function diffHtml(orig, spoken) {
    const a = orig.split(/\s+/).filter(Boolean), b = spoken.split(/\s+/).filter(Boolean);
    const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const setA = new Set(a.map(norm));
    return b.map((w) => (setA.has(norm(w)) ? esc(w) : `<mark>${esc(w)}</mark>`)).join(" ");
  }
  let spokenT;
  function scheduleSpoken() { clearTimeout(spokenT); spokenT = setTimeout(updateSpoken, 500); }
  async function updateSpoken() {
    const box = $("#spokenPreview"); const text = ttsText();
    if (!S.speech.enabled || !text || !DEFAULT_DICT_TEXT) { box.hidden = true; return; }
    try {
      const { spoken } = await api("/api/speech-preview", { method: "POST", body: { text: text.slice(0, 3000), ...speechBody() } });
      const changed = spoken.replace(/\s+/g, " ").trim() !== text.replace(/\s+/g, " ").trim();
      box.hidden = !changed;
      if (changed) $("#spokenText").innerHTML = diffHtml(text, spoken);
    } catch { box.hidden = true; }
  }
  $("#btnDictPreview").addEventListener("click", async () => {
    const text = ttsText(); const box = $("#dictPreview");
    if (!text) return toast("Chưa có nội dung bài viết", true);
    const { spoken } = await api("/api/speech-preview", { method: "POST", body: { text, ...speechBody() } });
    box.hidden = false; box.innerHTML = `<span class="sp-lbl">🗣 Giọng sẽ đọc:</span> ${diffHtml(text, spoken)}`;
  });

  // ---------------------------------------------------------- thư viện nhạc nền
  let MUSIC = [];
  const musicPreview = new Audio(); let musicPreviewId = null;
  async function loadMusic() { try { MUSIC = await api("/api/music"); } catch { MUSIC = []; } renderMusic(); }
  function selectMusic(m) {
    if (!m) Object.assign(S.music, { uploadId: null, url: null, name: null });
    else Object.assign(S.music, { uploadId: m.id, url: m.url, name: m.name, duration: m.duration });
    if (S.music.url) musicAudio.src = S.music.url; else { musicAudio.pause(); musicAudio.removeAttribute("src"); }
    renderMusic(); renderUploads(); save(); markDirty();
  }
  function renderMusic() {
    const legacy = S.music.uploadId && !MUSIC.some((m) => m.id === S.music.uploadId) ? [{ id: S.music.uploadId, url: S.music.url, name: (S.music.name || "Nhạc đã chọn") + " (tải trước đây)", duration: S.music.duration || 0, legacy: true }] : [];
    const list = [...legacy, ...MUSIC];
    const L = $("#musicList");
    if (L) L.innerHTML = `<div class="music-item none ${!S.music.uploadId ? "on" : ""}" data-mid=""><span class="radio"></span><span class="m-name">Không dùng nhạc nền</span></div>` +
      list.map((m) => `<div class="music-item ${m.id === S.music.uploadId ? "on" : ""} ${musicPreviewId === m.id && !musicPreview.paused ? "playing" : ""}" data-mid="${esc(m.id)}">
        <span class="radio"></span><span class="m-name" title="${esc(m.name)}">🎵 ${esc(m.name)}</span><small>${m.duration ? fmt(m.duration) : ""}</small>
        <button class="m-play" data-mplay title="Nghe thử"><svg><use href="#${musicPreviewId === m.id && !musicPreview.paused ? "i-pause" : "i-play"}"/></svg></button>
        ${m.legacy ? "" : `<button data-mren title="Đổi tên">✎</button><button data-mdel title="Xoá khỏi thư viện">✕</button>`}</div>`).join("") +
      (MUSIC.length ? "" : `<p class="hint">Thư viện nhạc trống – bấm “Thêm nhạc” để tải bản nhạc đầu tiên. Nhạc được lưu lại để dùng cho các video sau.</p>`);
    $$(".musicSelect").forEach((sel) => {
      sel.innerHTML = `<option value="">🔇 Không dùng nhạc nền</option>` + list.map((m) => `<option value="${esc(m.id)}" ${m.id === S.music.uploadId ? "selected" : ""}>🎵 ${esc(m.name)}${m.duration ? " · " + fmt(m.duration) : ""}</option>`).join("");
      sel.value = S.music.uploadId || "";
    });
  }
  $$(".musicSelect").forEach((sel) => sel.addEventListener("change", () => selectMusic(MUSIC.find((m) => m.id === sel.value) || null)));
  $("#musicList").addEventListener("click", async (e) => {
    const it = e.target.closest(".music-item"); if (!it) return;
    const id = it.dataset.mid; const m = MUSIC.find((x) => x.id === id) || (id === S.music.uploadId ? { id, url: S.music.url, name: S.music.name } : null);
    if (e.target.closest("[data-mplay]")) {
      if (musicPreviewId === id && !musicPreview.paused) musicPreview.pause();
      else { pause(); musicPreview.src = m.url; musicPreview.volume = 0.8; musicPreview.currentTime = id === S.music.uploadId ? S.music.start || 0 : 0; musicPreview.play().catch(() => { }); musicPreviewId = id; }
      setTimeout(renderMusic, 50); return;
    }
    if (e.target.closest("[data-mdel]")) {
      if (!confirm(`Xoá "${m.name}" khỏi thư viện nhạc?`)) return;
      await fetch("/api/music/" + encodeURIComponent(id), { method: "DELETE" });
      if (musicPreviewId === id) musicPreview.pause();
      if (S.music.uploadId === id) selectMusic(null);
      return loadMusic();
    }
    if (e.target.closest("[data-mren]")) {
      const name = prompt("Tên bản nhạc:", m.name); if (!name) return;
      await api("/api/music/" + encodeURIComponent(id), { method: "POST", body: { name } });
      if (S.music.uploadId === id) { S.music.name = name; renderUploads(); save(); }
      return loadMusic();
    }
    selectMusic(id ? m : null);
  });
  musicPreview.addEventListener("ended", renderMusic); musicPreview.addEventListener("pause", renderMusic);
  function uploadMusic(file, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData(); fd.append("file", file);
      const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/music");
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => { try { const j = JSON.parse(xhr.responseText); j.ok ? resolve(j) : reject(new Error(j.error)); } catch { reject(new Error("Tải nhạc thất bại")); } };
      xhr.onerror = () => reject(new Error("Lỗi mạng khi tải nhạc"));
      xhr.send(fd);
    });
  }
  async function addMusicFile(f) {
    if (!/^(audio|video)\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|aac|flac|opus|webm)$/i.test(f.name)) return toast("Hãy chọn tệp nhạc (MP3, M4A, WAV…)", true);
    const zs = $$('[data-drop="music"]'); zs.forEach((z) => z.classList.add("uploading"));
    try {
      const m = await uploadMusic(f, (p) => zs.forEach((z) => ($(".up-progress i", z).style.width = p * 100 + "%")));
      MUSIC.unshift(m); selectMusic(m); toast(`Đã thêm "${m.name}" vào thư viện nhạc`);
    } catch (e) { toast(e.message, true); }
    finally { zs.forEach((z) => { z.classList.remove("uploading"); $(".up-progress i", z).style.width = "0"; }); }
  }
  $$(".btnAddMusic").forEach((b) => b.addEventListener("click", () => {
    const inp = $("#fileAudio"); inp.multiple = true;
    inp.onchange = async () => { const files = [...inp.files]; inp.value = ""; for (const f of files) await addMusicFile(f); };
    inp.click();
  }));
  loadMusic();

  // ---------------------------------------------------------- export
  async function ensureFonts() {
    await Promise.all(R.fontsUsed(S).map(([w, f]) => document.fonts.load(`${w} 40px "${f}"`).catch(() => { })));
  }
  const toBlob = (c) => new Promise((r) => c.toBlob(r, "image/png"));
  const newCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

  let rendering = false, lastJob = null;
  // Tạo/ tái sử dụng giọng đọc cho 1 bài trong danh sách
  async function ttsForPost(p) {
    const text = (p.id === S.activeId ? ttsText() : (p.content.text || "").trim());
    if (!text) return null;
    const sig = JSON.stringify([text, voiceOf(p), S.voice.speed, S.voice.pitch, S.subs.maxChars, speechSig()]);
    if (p.tts && p.tts.sig === sig) return p.tts;
    const j = await api("/api/tts", { method: "POST", body: { text, voice: voiceOf(p), speed: S.voice.speed, pitch: S.voice.pitch, maxChars: S.subs.maxChars, ...speechBody() } });
    if (j.warning) toast(j.warning);
    p.tts = { audioId: j.audioId, url: j.url, duration: j.duration, cues: j.cues, sig };
    if (p.id === S.activeId) { S.tts = clone(p.tts); renderTts(); }
    return p.tts;
  }
  const snapshotProject = () => { syncActivePost(); const p = clone(S); delete p.lastVideo; return p; };

  // opts.combined + opts.posts → gộp nhiều bài vào 1 video (đọc lần lượt)
  async function renderVideo(opts = {}) {
    if (rendering) return null;
    const combined = !!opts.combined;
    if (!combined && !(S.content.text || "").trim() && !S.stickers.length) { if (!opts.batch) { toast("Chưa có nội dung. Hãy nhập nội dung ở Bước 1.", true); goStep(0); } return null; }
    if (S.bg.type === "video" && !S.bg.uploadId && !opts.batch) { toast("Bạn chọn nền video nhưng chưa tải video – dùng gradient thay thế."); }
    rendering = true; pause();
    const btn = $("#btnRender"), state = $("#renderState"), bar = $("#renderBar");
    btn.disabled = true; $("#btnRender2").disabled = true; bar.hidden = false; bar.firstElementChild.style.width = "2%";
    state.className = "render-state"; $("#btnSave").disabled = true;
    const setState = (t) => { state.textContent = t; btn.querySelector("span").textContent = t.length < 28 ? t.toUpperCase() : "ĐANG XỬ LÝ..."; };
    try {
      // 1) chuẩn bị các đoạn (mỗi bài = 1 đoạn)
      const segs = [];
      if (combined) {
        for (const [i, p] of opts.posts.entries()) {
          setState(`Đang tạo giọng đọc ${i + 1}/${opts.posts.length}...`);
          const tts = S.voice.enabled ? await ttsForPost(p) : null;
          const a = { ...assets, avatar: p.content.avatar ? await loadImg(p.content.avatar).catch(() => null) : null, postImage: p.content.postImage ? await loadImg(p.content.postImage).catch(() => null) : null };
          segs.push({ content: p.content, tts, assets: a, post: p });
          bar.firstElementChild.style.width = 2 + (8 * (i + 1)) / opts.posts.length + "%";
        }
        save();
      } else {
        if (S.voice.enabled && ttsText() && (!S.tts || S.tts.sig !== ttsSig())) { setState("Đang tạo giọng đọc..."); await generateVoice(); }
        segs.push({ content: S.content, tts: S.voice.enabled ? S.tts : null, assets, post: S.posts.find((x) => x.id === S.activeId) });
      }
      // 2) dòng thời gian
      const lead = Number(S.voice.leadIn) || 0, tail = Number(S.voice.tail) || 0, gap = Number(S.batch.gap) || 0;
      const perPost = combined ? Number(S.batch.secondsPerPost) || 5 : Number(S.duration) || 10;
      let t = 0;
      segs.forEach((g, i) => {
        const isLast = i === segs.length - 1;
        g.start = t;
        if (g.tts) { g.voiceAt = t + lead; g.end = g.voiceAt + g.tts.duration + (isLast ? tail : gap); }
        else g.end = t + perPost;
        t = g.end;
      });
      const dur = t;
      bar.firstElementChild.style.width = "10%";
      setState("Đang dựng khung hình...");
      await ensureFonts();
      const [W, H] = R.size(S.aspect);
      const fd = new FormData();
      const first = segs[0].content;
      const cfg = {
        aspect: S.aspect, fps: S.export.fps, quality: S.export.quality,
        fileName: S.export.fileName || (combined ? `threads-gop-${segs.length}-bai` : first.username ? "threads-" + first.username : "threads-video"),
        duration: dur, voices: segs.filter((g) => g.tts).map((g) => ({ audioId: g.tts.audioId, at: g.voiceAt })), tail, voiceVolume: S.voice.volume,
        bg: { type: S.bg.type === "video" && S.bg.uploadId ? "video" : "image", uploadId: S.bg.uploadId, fit: S.bg.fit, start: S.bg.start, speed: S.bg.speed, mirror: S.bg.mirror, keepAudio: S.bg.keepAudio, audioVolume: S.bg.audioVolume, blur: S.bg.type === "video" ? S.bg.blur : 0, dim: S.bg.dim, kenburns: S.bg.type === "image" && S.bg.kenburns },
        music: S.music.uploadId ? { uploadId: S.music.uploadId, volume: S.music.volume, start: S.music.start, duck: S.music.duck, duckLevel: S.music.duckLevel, fadeIn: S.music.fadeIn, fadeOut: S.music.fadeOut } : null,
        progressBar: S.export.progressBar ? { color: S.export.progressColor, height: Math.round(10 * R.unit(W, H)) } : null,
        layers: [], cues: [],
        meta: {
          title: combined ? `Gộp ${segs.length} bài: ${segs.map((g) => g.content.displayName || g.content.username || "bài").slice(0, 4).join(", ")}${segs.length > 4 ? "…" : ""}`
            : `${first.displayName || first.username || "Bài viết"} – ${(first.text || "").replace(/\s+/g, " ").slice(0, 60)}`,
          mode: combined ? "combined" : "single",
          voice: S.voice.enabled ? [...new Set(segs.map((g) => voiceName(combined ? voiceOf(g.post) : curVoice())))].join(", ") : null,
          posts: segs.map((g) => ({ displayName: g.content.displayName, username: g.content.username, url: g.post?.url || "", text: (g.content.text || "").slice(0, 300) })),
          project: snapshotProject(),
        },
      };
      // nền ảnh / gradient
      if (cfg.bg.type !== "video") {
        const c = newCanvas(W, H); R.drawBackground(c.getContext("2d"), W, H, { ...S, bg: { ...S.bg, type: S.bg.type === "video" ? "gradient" : S.bg.type } }, assets, { forExport: true });
        fd.append("bgImage", await toBlob(c), "bg.png");
      }
      // lớp thẻ: mỗi bài 1 lớp, hiện trong khoảng thời gian của bài
      const layerBlobs = [];
      for (const g of segs) {
        const cc = newCanvas(W, H); const cbox = R.drawCard(cc.getContext("2d"), W, H, { ...S, text: textFor(g.post), content: g.content }, g.assets);
        if (!cbox) continue;
        let s0 = g.start, e0 = g.end;
        if (S.text.showFor === "first") e0 = Math.min(g.end, g.start + S.text.showSeconds);
        if (!combined && S.text.showFor !== "first") { s0 = null; e0 = null; }
        cfg.layers.push({ start: s0, end: e0, fade: S.text.fadeIn ? 0.4 : 0 });
        layerBlobs.push(await toBlob(cc));
      }
      // sticker luôn hiện + watermark → 1 lớp; sticker có thời gian → lớp riêng
      const always = newCanvas(W, H); const actx = always.getContext("2d"); let alwaysUsed = false;
      for (const st of S.stickers) {
        if (st.start == null && st.end == null) { R.drawSticker(actx, W, H, st, assets, false); alwaysUsed = true; }
        else {
          const c = newCanvas(W, H); R.drawSticker(c.getContext("2d"), W, H, st, assets, false);
          cfg.layers.push({ start: st.start ?? 0, end: st.end ?? dur }); layerBlobs.push(await toBlob(c));
        }
      }
      if (S.export.watermark) { R.drawWatermark(actx, W, H, S); alwaysUsed = true; }
      if (alwaysUsed) { cfg.layers.push({ start: null, end: null }); layerBlobs.push(await toBlob(always)); }
      layerBlobs.forEach((b, i) => fd.append("layer" + i, b, `layer${i}.png`));
      // phụ đề → ảnh cắt theo vùng chữ, thời gian tuyệt đối
      if (S.voice.enabled && S.subs.enabled) {
        const full = newCanvas(W, H); const fctx = full.getContext("2d");
        const allCues = segs.flatMap((g) => (g.tts?.cues || []).map((c) => ({ text: c.text, start: g.voiceAt + c.start, end: g.voiceAt + c.end })));
        for (const [i, cue] of allCues.entries()) {
          fctx.clearRect(0, 0, W, H);
          const b = R.drawSubtitle(fctx, W, H, S, cue.text); if (!b || b.w <= 0 || b.h <= 0) continue;
          const piece = newCanvas(b.w, b.h); piece.getContext("2d").drawImage(full, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
          cfg.cues.push({ start: cue.start, end: cue.end, x: b.x, y: b.y });
          fd.append("cue" + (cfg.cues.length - 1), await toBlob(piece), `cue${i}.png`);
          if (i % 10 === 0) { state.textContent = `Đang dựng phụ đề ${i + 1}/${allCues.length}...`; await new Promise((r) => setTimeout(r)); }
        }
      }
      fd.append("config", JSON.stringify(cfg));
      setState("Đang gửi dữ liệu...");
      const { jobId } = await api("/api/render", { method: "POST", body: fd });
      setState("Đang xuất video...");
      const job = await new Promise((resolve, reject) => {
        const tick = async () => {
          try {
            const j = await api("/api/jobs/" + jobId);
            bar.firstElementChild.style.width = 10 + j.progress * 0.9 + "%";
            state.textContent = `Đang xuất video... ${Math.round(j.progress)}%`;
            btn.querySelector("span").textContent = `ĐANG XUẤT ${Math.round(j.progress)}%`;
            if (j.status === "done") return resolve(j);
            if (j.status === "error") return reject(new Error(j.error));
            setTimeout(tick, 700);
          } catch (e) { reject(e); }
        };
        tick();
      });
      lastJob = job; S.lastVideo = { file: job.file, url: job.url }; save();
      state.className = "render-state ok"; state.textContent = `✓ Hoàn tất trong ${Math.round(job.elapsed)} giây – ${job.file}`;
      bar.firstElementChild.style.width = "100%";
      $("#btnSave").disabled = false;
      if (!opts.batch) toast(combined ? `🎉 Đã gộp ${segs.length} bài thành 1 video (${fmt(dur)})` : "🎉 Video đã sẵn sàng!");
      setTimeout(loadRecent, 800);
      return job;
    } catch (e) {
      state.className = "render-state err"; state.textContent = "Lỗi: " + e.message.slice(0, 300);
      if (!opts.batch) toast("Tạo video thất bại", true);
      return { error: e.message };
    } finally {
      rendering = false; btn.disabled = false; $("#btnRender2").disabled = false;
      btn.querySelector("span").textContent = "TẠO VIDEO";
      setTimeout(() => (bar.hidden = true), 1500);
    }
  }
  $("#btnRender").addEventListener("click", () => renderVideo());
  $("#btnRender2").addEventListener("click", () => renderVideo());

  function download(url, name) { const a = document.createElement("a"); a.href = url; a.download = name || ""; document.body.appendChild(a); a.click(); a.remove(); }
  $("#btnSave").addEventListener("click", () => { if (S.lastVideo) download(S.lastVideo.url, S.lastVideo.file); });
  $("#btnFolder").addEventListener("click", async () => {
    try { const j = await api("/api/open-folder", { method: "POST", body: { file: S.lastVideo?.file } }); toast("Thư mục video: " + j.path, false, 5000); }
    catch (e) { toast(e.message, true); }
  });
  $("#btnReset").addEventListener("click", () => {
    if (!confirm("Làm mới dự án? Toàn bộ nội dung và cài đặt hiện tại sẽ bị xoá.")) return;
    exitCombo(); pause(); const step = 0; S = DEFAULT(); S.step = step;
    bgVideo.removeAttribute("src"); assets.video = null; assets.bgImage = null; assets.avatar = null; assets.postImage = null;
    voiceAudio.removeAttribute("src"); musicAudio.removeAttribute("src");
    localStorage.removeItem(STORE_KEY); selSticker = null;
    $("#renderState").className = "render-state"; $("#renderState").textContent = "Thời gian xử lý dự kiến khoảng 1–2 phút";
    $("#btnSave").disabled = true; $("#fetchMsg").textContent = "";
    init(); toast("Đã làm mới dự án");
  });

  // ---------------------------------------------------------- xem trước gộp nhiều bài
  function exitCombo() {
    if (!pv.combo) return;
    pv.combo = null; pv.comboAudio = null; pause(); pv.t = 0;
    if (S.tts) voiceAudio.src = S.tts.url; else voiceAudio.removeAttribute("src");
    $("#phone").classList.remove("combo"); markDirty();
  }
  async function previewCombined(e) {
    syncActivePost();
    const list = S.posts.filter((p) => p.checked && (p.content.text || "").trim());
    if (!list.length) return toast("Chưa chọn bài nào có nội dung", true);
    const btn = e?.currentTarget; btn && btnLoading(btn, true);
    try {
      exitCombo();
      const segs = [];
      for (const [i, p] of list.entries()) {
        btn && (btn.lastChild.textContent = ` Đang chuẩn bị ${i + 1}/${list.length}`);
        const tts = S.voice.enabled ? await ttsForPost(p) : null;
        const a = { ...assets, avatar: p.content.avatar ? await loadImg(p.content.avatar).catch(() => null) : null, postImage: p.content.postImage ? await loadImg(p.content.postImage).catch(() => null) : null };
        segs.push({ idx: i, content: clone(p.content), tts, assets: a, post: p });
      }
      const lead = Number(S.voice.leadIn) || 0, tail = Number(S.voice.tail) || 0, gap = Number(S.batch.gap) || 0, per = Number(S.batch.secondsPerPost) || 5;
      let t = 0;
      segs.forEach((g, i) => { g.start = t; if (g.tts) { g.voiceAt = t + lead; g.end = g.voiceAt + g.tts.duration + (i === segs.length - 1 ? tail : gap); } else g.end = t + per; t = g.end; });
      pv.combo = { segs, total: t }; pv.t = 0;
      $("#phone").classList.add("combo"); save(); renderPosts();
      play();
      toast(`▶ Xem trước gộp ${segs.length} bài (${fmt(t)}) – sửa bất kỳ cài đặt nào sẽ thoát chế độ này`);
    } catch (err) { toast(err.message, true); }
    finally { if (btn) { btnLoading(btn, false); btn.lastChild.textContent = "Xem trước gộp"; } }
  }
  $("#btnPreviewCombined").addEventListener("click", previewCombined);

  // ---------------------------------------------------------- thư viện video
  let LIB = [], libSel = new Set(), libCur = null;
  const fmtDate = (ms) => new Date(ms).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
  async function loadRecent() {
    try { LIB = await api("/api/outputs"); } catch { return; }
    $("#libCount").textContent = LIB.length;
    $("#recentList").innerHTML = LIB.length ? LIB.slice(0, 5).map((v) => `
      <div class="rec" data-play="${esc(v.name)}"><img src="${v.thumb}" alt="" style="width:40px;height:56px;object-fit:cover;border-radius:6px;background:#222">
        <div><b title="${esc(v.title)}">${esc(v.title)}</b><small>${fmtDate(v.mtime)} · ${v.duration ? fmt(v.duration) + " · " : ""}${fmtSize(v.size)}</small></div>
        <a href="${v.url}" download="${esc(v.name)}" title="Tải">Tải</a></div>`).join("")
      : `<p class="hint">Chưa có video nào.</p>`;
    if (!$("#libModal").hidden) renderLib();
  }
  $("#btnRefreshList").addEventListener("click", loadRecent);
  $("#recentList").addEventListener("click", (e) => { if (e.target.closest("a")) return; const r = e.target.closest("[data-play]"); if (r) openPlayer(r.dataset.play); });
  function openLibrary() { $("#libModal").hidden = false; libSel.clear(); loadRecent().then(renderLib); renderLib(); setTimeout(() => $("#libSearch").focus(), 50); }
  $("#btnLibrary").addEventListener("click", openLibrary);
  $("#btnLibrary2").addEventListener("click", openLibrary);
  function libFiltered() {
    const q = $("#libSearch").value.trim().toLowerCase(), mode = $("#libMode").value, ar = $("#libAspect").value, sort = $("#libSort").value;
    let list = LIB.filter((v) => {
      if (mode && v.mode !== mode) return false;
      if (ar && v.aspect !== ar) return false;
      if (!q) return true;
      const hay = [v.title, v.name, ...(v.posts || []).flatMap((p) => [p.displayName, p.username, p.text])].join(" ").toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    const by = { new: (a, b) => b.mtime - a.mtime, old: (a, b) => a.mtime - b.mtime, long: (a, b) => (b.duration || 0) - (a.duration || 0), big: (a, b) => b.size - a.size, name: (a, b) => a.title.localeCompare(b.title, "vi") }[sort];
    return list.sort(by);
  }
  function renderLib() {
    const list = libFiltered();
    const total = LIB.reduce((a, v) => a + v.size, 0), totalDur = LIB.reduce((a, v) => a + (v.duration || 0), 0);
    $("#libStats").textContent = `${LIB.length} video · ${fmtSize(total)} · tổng ${fmt(totalDur)}${list.length !== LIB.length ? ` · đang hiện ${list.length}` : ""}`;
    $("#libDelSel").disabled = !libSel.size; $("#libDelSel").textContent = libSel.size ? `🗑 Xoá ${libSel.size} video` : "🗑 Xoá đã chọn";
    $("#libSelAll").checked = list.length > 0 && list.every((v) => libSel.has(v.name));
    $("#libGrid").innerHTML = list.length ? list.map((v) => `
      <div class="lib-card ${libSel.has(v.name) ? "sel" : ""}" data-name="${esc(v.name)}">
        <div class="lib-thumb" data-open>
          <img src="${v.thumb}" alt="" loading="lazy">
          <video muted loop playsinline preload="none" data-src="${v.url}"></video>
          ${v.mode === "combined" ? `<span class="lib-tag">GỘP ${v.posts.length} BÀI</span>` : ""}
          ${v.aspect ? `<span class="lib-tag ar">${v.aspect}</span>` : ""}
          ${v.duration ? `<span class="lib-dur">${fmt(v.duration)}</span>` : ""}
          <label class="chk" data-stop><input type="checkbox" data-sel ${libSel.has(v.name) ? "checked" : ""}><i></i></label>
        </div>
        <div class="lib-body">
          <b title="${esc(v.title)}">${esc(v.title)}</b>
          <small>${fmtDate(v.mtime)} · ${fmtSize(v.size)}${v.voice ? " · 🎙 " + esc(v.voice) : ""}</small>
          <div class="lib-acts">
            <button data-open title="Phát">▶</button>
            <a href="${v.url}" download="${esc(v.name)}" title="Tải về">⬇</a>
            ${v.hasProject ? `<button data-project title="Mở lại dự án để sửa">✎</button>` : ""}
            <button data-folder title="Mở trong thư mục">📁</button>
            <button data-del title="Xoá">🗑</button>
          </div>
        </div>
      </div>`).join("")
      : `<div class="lib-empty">${LIB.length ? "Không có video nào khớp bộ lọc." : "Chưa có video nào. Hãy tạo video đầu tiên của bạn! 🎬"}</div>`;
  }
  ["libSearch", "libMode", "libAspect", "libSort"].forEach((id) => $("#" + id).addEventListener("input", renderLib));
  $("#libSelAll").addEventListener("change", (e) => { for (const v of libFiltered()) e.target.checked ? libSel.add(v.name) : libSel.delete(v.name); renderLib(); });
  $("#libDelSel").addEventListener("click", async () => {
    if (!libSel.size || !confirm(`Xoá vĩnh viễn ${libSel.size} video đã chọn?`)) return;
    for (const n of libSel) await fetch("/api/outputs/" + encodeURIComponent(n), { method: "DELETE" });
    toast(`Đã xoá ${libSel.size} video`); libSel.clear(); loadRecent();
  });
  $("#libOpenFolder").addEventListener("click", async () => { try { const j = await api("/api/open-folder", { method: "POST", body: {} }); toast("Thư mục video: " + j.path, false, 5000); } catch (e) { toast(e.message, true); } });
  const libGrid = $("#libGrid");
  libGrid.addEventListener("change", (e) => {
    if (!e.target.matches("[data-sel]")) return;
    const n = e.target.closest(".lib-card").dataset.name; e.target.checked ? libSel.add(n) : libSel.delete(n); renderLib();
  });
  libGrid.addEventListener("click", async (e) => {
    const card = e.target.closest(".lib-card"); if (!card || e.target.closest("[data-stop]") || e.target.closest("a")) return;
    const n = card.dataset.name;
    if (e.target.closest("[data-del]")) return deleteVideo(n);
    if (e.target.closest("[data-folder]")) return openInFolder(n);
    if (e.target.closest("[data-project]")) return openProject(n);
    if (e.target.closest("[data-open]")) return openPlayer(n);
  });
  libGrid.addEventListener("mouseover", (e) => {
    const th = e.target.closest(".lib-thumb"); if (!th || th.classList.contains("hovering")) return;
    const v = th.querySelector("video"); if (!v.src) v.src = v.dataset.src;
    th.classList.add("hovering"); v.currentTime = 0; v.play().catch(() => { });
    th.addEventListener("mouseleave", () => { th.classList.remove("hovering"); v.pause(); }, { once: true });
  });
  async function deleteVideo(n) {
    if (!confirm("Xoá vĩnh viễn video này?")) return false;
    await fetch("/api/outputs/" + encodeURIComponent(n), { method: "DELETE" });
    libSel.delete(n); toast("Đã xoá video");
    if (S.lastVideo?.file === n) { S.lastVideo = null; $("#btnSave").disabled = true; save(); }
    await loadRecent(); return true;
  }
  async function openInFolder(n) { try { const j = await api("/api/open-folder", { method: "POST", body: { file: n } }); toast("Thư mục video: " + j.path, false, 5000); } catch (e) { toast(e.message, true); } }
  async function openProject(n) {
    if (!confirm("Mở lại dự án của video này? Dự án hiện tại sẽ được thay thế (hãy xuất video trước nếu cần).")) return;
    try {
      const { project } = await api("/api/outputs/" + encodeURIComponent(n) + "/project");
      pause(); exitCombo();
      S = deepMerge(DEFAULT(), project); S.step = 0;
      assets.bgImage = assets.avatar = assets.postImage = null; assets.stickers = {}; thumbCache.clear(); selSticker = null;
      init(); $("#libModal").hidden = true; $("#playerModal").hidden = true; save();
      toast("Đã mở lại dự án – sửa rồi bấm TẠO VIDEO để xuất lại");
    } catch (e) { toast(e.message, true); }
  }
  function openPlayer(n) {
    const v = LIB.find((x) => x.name === n); if (!v) return;
    libCur = v;
    const pvid = $("#playerVideo"); pvid.src = v.url; pvid.play().catch(() => { });
    $("#playerTitle").value = v.title;
    $("#playerMeta").textContent = [fmtDate(v.mtime), v.duration && fmt(v.duration), v.width && `${v.width}×${v.height}`, fmtSize(v.size), v.voice && "Giọng: " + v.voice, v.name].filter(Boolean).join(" · ");
    $("#playerPosts").innerHTML = (v.posts || []).map((p, i) => `<div class="pp"><b>${v.posts.length > 1 ? i + 1 + ". " : ""}${esc(p.displayName || p.username || "Bài viết")}</b>${p.username ? ` <small>@${esc(p.username)}</small>` : ""}<br>${esc((p.text || "").slice(0, 220))}${p.url ? `<br><a href="${esc(p.url)}" target="_blank">Mở bài gốc ↗</a>` : ""}</div>`).join("");
    $("#playerDownload").href = v.url; $("#playerDownload").download = v.name;
    $("#playerProject").hidden = !v.hasProject;
    $("#playerModal").hidden = false;
  }
  $("#playerTitle").addEventListener("change", async (e) => {
    if (!libCur) return;
    await api(`/api/outputs/${encodeURIComponent(libCur.name)}/meta`, { method: "POST", body: { title: e.target.value } }).catch((er) => toast(er.message, true));
    toast("Đã đổi tên"); loadRecent();
  });
  $("#playerTitle").addEventListener("keydown", (e) => e.key === "Enter" && e.target.blur());
  $("#playerFolder").addEventListener("click", () => libCur && openInFolder(libCur.name));
  $("#playerProject").addEventListener("click", () => libCur && openProject(libCur.name));
  $("#playerCopy").addEventListener("click", async () => { if (!libCur) return; try { await navigator.clipboard.writeText(location.origin + libCur.url); toast("Đã sao chép đường dẫn"); } catch { toast(location.origin + libCur.url); } });
  $("#playerDelete").addEventListener("click", async () => { if (libCur && await deleteVideo(libCur.name)) closePlayer(); });
  function closePlayer() { $("#playerModal").hidden = true; $("#playerVideo").pause(); }
  for (const id of ["libModal", "playerModal"]) $("#" + id).addEventListener("click", (e) => {
    if (e.target.id === id || e.target.closest("[data-close]")) id === "playerModal" ? closePlayer() : ($("#libModal").hidden = true);
  });

  // ---------------------------------------------------------- modal & phím tắt
  $("#btnGuide").addEventListener("click", () => ($("#guideModal").hidden = false));
  $("#guideModal").addEventListener("click", (e) => { if (e.target.id === "guideModal" || e.target.closest("[data-close]")) $("#guideModal").hidden = true; });
  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === "Escape") { if (!$("#playerModal").hidden) closePlayer(); else if (!$("#libModal").hidden) $("#libModal").hidden = true; else $("#guideModal").hidden = true; }
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); renderVideo(); }
    if (typing) return;
    if (e.code === "Space") { e.preventDefault(); pv.playing ? pause() : play(); }
    if ((e.key === "Delete" || e.key === "Backspace") && selSticker) { S.stickers = S.stickers.filter((s) => s.id !== selSticker); selSticker = null; renderStickers(); save(); markDirty(); }
  });
  window.addEventListener("resize", layoutPhone);
  document.fonts?.addEventListener?.("loadingdone", markDirty);

  // ---------------------------------------------------------- init
  function init() {
    renderSource(); syncInputs(); renderUploads(); renderTts(); renderStickers(); renderVoiceList(); renderPosts();
    goStep(S.step); layoutPhone(); loadAssets();
    if (S.tts) voiceAudio.src = S.tts.url;
    if (S.music.url) musicAudio.src = S.music.url;
    renderMusic(); renderDict(); scheduleSpoken();
    if (S.lastVideo) $("#btnSave").disabled = false;
    pv.t = 0; markDirty();
  }
  bindAll(); renderEmoji(); init(); loadVoices(); loadRecent();
  requestAnimationFrame((n) => { pv.last = n; loop(n); });
  fetch("/api/health").then((r) => r.json()).then((j) => { if (!j.ok) toast("Không tìm thấy ffmpeg trên máy chủ!", true, 8000); }).catch(() => { });
})();
