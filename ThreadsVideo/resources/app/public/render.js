// Bộ vẽ dùng chung cho khung xem trước và khi xuất video (WYSIWYG)
// Mọi kích thước tính theo "đơn vị thiết kế": khung rộng 1080px → s = W / 1080
(function () {
  const SIZES = { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] };
  const size = (a) => SIZES[a] || SIZES["9:16"];
  const unit = (W, H) => Math.min(W, H) / 1080;

  const fontStr = (weight, px, family) => `${weight} ${Math.round(px)}px "${family}", "Be Vietnam Pro", system-ui, sans-serif`;

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- media fit
  function drawFit(ctx, src, sw, sh, W, H, fit, mirror) {
    if (!sw || !sh) return;
    ctx.save();
    if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const cover = Math.max(W / sw, H / sh), contain = Math.min(W / sw, H / sh);
    const draw = (k) => { const w = sw * k, h = sh * k; ctx.drawImage(src, (W - w) / 2, (H - h) / 2, w, h); };
    if (fit === "stretch") ctx.drawImage(src, 0, 0, W, H);
    else if (fit === "contain") { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); draw(contain); }
    else if (fit === "blurfill") {
      ctx.save(); ctx.filter = `blur(${Math.round(30 * unit(W, H))}px)`; draw(cover * 1.1); ctx.restore();
      draw(contain);
    } else draw(cover);
    ctx.restore();
  }

  // Vẽ nền. opts.forExport: bỏ qua lớp làm tối (ffmpeg xử lý)
  function drawBackground(ctx, W, H, st, assets, opts = {}) {
    const bg = st.bg;
    const blurPx = (bg.blur || 0) * unit(W, H) * 1.2;
    ctx.save();
    ctx.fillStyle = "#0f1020"; ctx.fillRect(0, 0, W, H);
    if (blurPx && !(opts.forExport && bg.type === "video")) ctx.filter = `blur(${blurPx}px)`;
    if (blurPx) { ctx.translate(W / 2, H / 2); ctx.scale(1.06, 1.06); ctx.translate(-W / 2, -H / 2); }
    if (bg.type === "video" && assets.video && assets.video.readyState >= 2) {
      drawFit(ctx, assets.video, assets.video.videoWidth, assets.video.videoHeight, W, H, bg.fit, bg.mirror);
    } else if (bg.type === "image" && assets.bgImage) {
      drawFit(ctx, assets.bgImage, assets.bgImage.naturalWidth, assets.bgImage.naturalHeight, W, H, bg.fit, false);
    } else if (bg.type === "color") {
      ctx.fillStyle = bg.color; ctx.fillRect(0, 0, W, H);
    } else if (bg.type === "gradient" || bg.type === "video" || bg.type === "image") {
      const a = ((bg.gradAngle ?? 160) - 90) * Math.PI / 180;
      const r = Math.hypot(W, H) / 2;
      const g = ctx.createLinearGradient(W / 2 - Math.cos(a) * r, H / 2 - Math.sin(a) * r, W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r);
      g.addColorStop(0, bg.grad1 || "#1e1b4b"); g.addColorStop(1, bg.grad2 || "#312e81");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (bg.type === "gradient") {
        // ánh sáng nhẹ trang trí
        const rg = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, W * 0.7);
        rg.addColorStop(0, "rgba(255,255,255,.10)"); rg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
    }
    ctx.restore();
    if (!opts.forExport && bg.dim > 0) { ctx.fillStyle = `rgba(0,0,0,${bg.dim})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- rich text (hashtag / mention / link tô màu nhấn)
  function tokenize(text) {
    const out = [];
    for (const para of String(text || "").replace(/\r/g, "").split("\n")) {
      out.push(para.split(/(\s+)/).filter((x) => x !== "").map((w) => ({ w, accent: /^(#|@|https?:\/\/)\S+/.test(w) })));
    }
    return out;
  }
  function wrapRich(ctx, paras, maxW) {
    const lines = [];
    for (const words of paras) {
      if (!words.length) { lines.push([]); continue; }
      let line = [], lw = 0;
      for (const tok of words) {
        const isSpace = /^\s+$/.test(tok.w);
        const tw = ctx.measureText(tok.w).width;
        if (!isSpace && lw + tw > maxW && line.length) {
          while (line.length && /^\s+$/.test(line[line.length - 1].w)) line.pop();
          lines.push(line); line = []; lw = 0;
        }
        if (isSpace && !line.length) continue;
        // từ quá dài → cắt ký tự
        if (!isSpace && tw > maxW) {
          let part = "";
          for (const ch of tok.w) {
            if (ctx.measureText(part + ch).width > maxW && part) { lines.push([{ w: part, accent: tok.accent }]); part = ""; }
            part += ch;
          }
          line = [{ w: part, accent: tok.accent }]; lw = ctx.measureText(part).width; continue;
        }
        line.push(tok); lw += tw;
      }
      while (line.length && /^\s+$/.test(line[line.length - 1].w)) line.pop();
      lines.push(line);
    }
    return lines.map((l) => ({ toks: l, width: l.reduce((a, t) => a + ctx.measureText(t.w).width, 0) }));
  }
  function drawRichLine(ctx, line, x, y, maxW, align, color, accent) {
    let cx = align === "center" ? x + (maxW - line.width) / 2 : align === "right" ? x + maxW - line.width : x;
    for (const t of line.toks) { ctx.fillStyle = t.accent ? accent : color; ctx.fillText(t.w, cx, y); cx += ctx.measureText(t.w).width; }
  }

  // ---------- icons
  function iconPath(ctx, kind, x, y, sz) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sz / 24, sz / 24); ctx.beginPath();
    const p = {
      heart: "M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.3 1 5 3 1.7-2 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z",
      comment: "M20.7 16.4A9 9 0 1 0 17 20l4 1.2z",
      repost: "M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4",
      share: "M22 3 9.2 10.7M22 3l-7.5 18-3.3-8.3L3 9.5z",
    }[kind];
    ctx.restore();
    return p;
  }
  function drawIcon(ctx, kind, x, y, sz, color, lw) {
    const d = iconPath(ctx, kind);
    ctx.save(); ctx.translate(x, y); ctx.scale(sz / 24, sz / 24);
    ctx.strokeStyle = color; ctx.lineWidth = lw * 24 / sz; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.stroke(new Path2D(d)); ctx.restore();
  }
  function drawVerified(ctx, x, y, r) {
    ctx.save(); ctx.fillStyle = "#0095f6"; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r * 0.86 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.28; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x - r * 0.42, y + r * 0.02); ctx.lineTo(x - r * 0.1, y + r * 0.34); ctx.lineTo(x + r * 0.45, y - r * 0.3); ctx.stroke();
    ctx.restore();
  }
  function drawAvatar(ctx, img, name, x, y, d) {
    ctx.save(); ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.clip();
    if (img) {
      const k = Math.max(d / img.naturalWidth, d / img.naturalHeight);
      ctx.drawImage(img, x + (d - img.naturalWidth * k) / 2, y + (d - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
    } else {
      const g = ctx.createLinearGradient(x, y, x + d, y + d); g.addColorStop(0, "#8b7bff"); g.addColorStop(1, "#ec4899");
      ctx.fillStyle = g; ctx.fillRect(x, y, d, d);
      ctx.fillStyle = "#fff"; ctx.font = fontStr(700, d * 0.42, "Be Vietnam Pro"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((name || "?").trim().charAt(0).toUpperCase(), x + d / 2, y + d / 2 + d * 0.02);
    }
    ctx.restore();
  }

  // ---------- Thẻ bài viết. Trả về bbox
  function layoutCard(ctx, W, H, st, assets) {
    const t = st.text, c = st.content, s = unit(W, H);
    const cardW = W * (t.width / 100);
    const pad = (t.style === "card" ? 48 : 20) * s;
    const innerW = cardW - pad * 2;
    const maxH = H * (W > H ? 0.86 : 0.74);
    const showImg = c.showImage && assets.postImage;
    let fs = t.size * s;
    const headerH = t.showHeader ? 96 * s : 0;
    const footerH = t.style === "card" && t.showFooter ? 76 * s : 0;
    let lines, lh, imgH = 0;
    const paras = tokenize(c.text || "");
    for (let iter = 0; iter < 40; iter++) {
      ctx.font = fontStr(t.weight, fs, t.font);
      lh = fs * t.lineHeight;
      lines = wrapRich(ctx, paras, innerW);
      imgH = showImg ? Math.min(innerW * assets.postImage.naturalHeight / assets.postImage.naturalWidth, H * 0.3) : 0;
      const total = pad * 2 + headerH + lines.length * lh + (imgH ? imgH + 24 * s : 0) + footerH;
      if (!t.autoFit || total <= maxH || fs <= 20 * s) break;
      fs *= 0.94;
    }
    // cắt bớt nếu vẫn quá dài
    const avail = maxH - pad * 2 - headerH - (imgH ? imgH + 24 * s : 0) - footerH;
    const maxLines = Math.max(1, Math.floor(avail / lh));
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      const last = lines[maxLines - 1]; last.toks = [...last.toks, { w: " …", accent: false }];
    }
    const h = pad * 2 + headerH + lines.length * lh + (imgH ? imgH + 24 * s : 0) + footerH;
    const cx = W * ((t.x ?? 50) / 100), cy = H * (t.y / 100);
    let x = cx - cardW / 2, y = cy - h / 2;
    x = Math.max(0, Math.min(W - cardW, x)); y = Math.max(0, Math.min(H - h, y));
    return { x, y, w: cardW, h, pad, innerW, fs, lh, lines, headerH, footerH, imgH, s };
  }

  function drawCard(ctx, W, H, st, assets) {
    const t = st.text, c = st.content;
    if (t.style === "none" || !(c.text || "").trim()) return null;
    const L = layoutCard(ctx, W, H, st, assets);
    const { x, y, w, h, pad, innerW, fs, lh, lines, headerH, imgH, s } = L;
    const dark = t.theme !== "light";
    const muted = dark ? "rgba(255,255,255,.55)" : "#8e8e8e";
    ctx.save();
    ctx.textBaseline = "alphabetic";
    if (t.style === "card") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 40 * s; ctx.shadowOffsetY = 14 * s;
      ctx.globalAlpha = t.opacity / 100;
      roundRect(ctx, x, y, w, h, t.radius * s); ctx.fillStyle = t.bgColor; ctx.fill();
      ctx.restore();
      if (t.theme === "glass") { roundRect(ctx, x, y, w, h, t.radius * s); ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2 * s; ctx.stroke(); }
    }
    let cy = y + pad;
    if (t.showHeader) {
      const d = 76 * s;
      drawAvatar(ctx, assets.avatar, c.displayName || c.username || "T", x + pad, cy, d);
      const nx = x + pad + d + 22 * s;
      const name = c.displayName || c.username || "Threads user";
      ctx.font = fontStr(700, 32 * s, "Be Vietnam Pro");
      const nameColor = t.style === "card" ? t.color : "#fff";
      ctx.fillStyle = nameColor; ctx.textAlign = "left";
      const maxNameW = innerW - d - 22 * s - 150 * s;
      let nm = name; while (ctx.measureText(nm).width > maxNameW && nm.length > 3) nm = nm.slice(0, -2);
      if (nm !== name) nm += "…";
      ctx.fillText(nm, nx, cy + 34 * s);
      const nw = ctx.measureText(nm).width;
      if (c.verified) drawVerified(ctx, nx + nw + 22 * s, cy + 23 * s, 14 * s);
      ctx.font = fontStr(400, 26 * s, "Be Vietnam Pro");
      ctx.fillStyle = t.style === "card" ? muted : "rgba(255,255,255,.75)";
      if (c.username) ctx.fillText("@" + c.username.replace(/^@/, ""), nx, cy + 70 * s);
      if (c.time) { ctx.textAlign = "right"; ctx.fillText(c.time, x + w - pad, cy + 34 * s); ctx.textAlign = "left"; }
      cy += headerH;
    }
    ctx.font = fontStr(t.weight, fs, t.font);
    for (const [i, line] of lines.entries()) {
      const by = cy + i * lh + fs * 0.92 + (lh - fs) / 2;
      if (t.style === "highlight" && line.toks.length) {
        const px = 18 * s;
        const lx = t.align === "center" ? x + pad + (innerW - line.width) / 2 : t.align === "right" ? x + pad + innerW - line.width : x + pad;
        ctx.save(); ctx.globalAlpha = t.opacity / 100;
        roundRect(ctx, lx - px, cy + i * lh + (lh - fs * 1.32) / 2, line.width + px * 2, fs * 1.32, Math.min(t.radius, 24) * s);
        ctx.fillStyle = t.bgColor; ctx.fill(); ctx.restore();
      }
      if (t.style === "plain") { ctx.shadowColor = "rgba(0,0,0,.75)"; ctx.shadowBlur = 14 * s; ctx.shadowOffsetY = 3 * s; }
      drawRichLine(ctx, line, x + pad, by, innerW, t.align, t.color, t.accent);
      ctx.shadowColor = "transparent";
    }
    cy += lines.length * lh;
    if (imgH) {
      cy += 24 * s;
      const im = assets.postImage;
      ctx.save(); roundRect(ctx, x + pad, cy, innerW, imgH, 22 * s); ctx.clip();
      const k = Math.max(innerW / im.naturalWidth, imgH / im.naturalHeight);
      ctx.drawImage(im, x + pad + (innerW - im.naturalWidth * k) / 2, cy + (imgH - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
      ctx.restore();
      cy += imgH;
    }
    if (L.footerH) {
      const iy = cy + 30 * s, sz = 34 * s;
      ctx.font = fontStr(500, 25 * s, "Be Vietnam Pro"); ctx.textAlign = "left";
      let ix = x + pad;
      for (const [k, val] of [["heart", c.likes], ["comment", c.comments], ["repost", c.reposts], ["share", ""]]) {
        drawIcon(ctx, k, ix, iy, sz, dark ? "rgba(255,255,255,.8)" : "#2a2a2a", 2.4 * s);
        ix += sz + 10 * s;
        if (val) { ctx.fillStyle = muted; ctx.fillText(String(val), ix, iy + sz * 0.78); ix += ctx.measureText(String(val)).width; }
        ix += 34 * s;
      }
    }
    ctx.restore();
    return { x, y, w, h };
  }

  // ---------- Sticker
  function stickerBox(ctx, W, H, stk, assets) {
    const s = unit(W, H);
    const px = stk.size * 1080 * s;
    if (stk.kind === "text") {
      ctx.font = fontStr(700, px * 0.32, "Be Vietnam Pro");
      const tw = ctx.measureText(stk.value).width;
      return { w: tw + px * 0.5, h: px * 0.62 };
    }
    if (stk.kind === "image") {
      const im = assets.stickers?.[stk.id];
      if (!im) return { w: px, h: px };
      return { w: px, h: px * im.naturalHeight / im.naturalWidth };
    }
    return { w: px, h: px };
  }
  function drawSticker(ctx, W, H, stk, assets, selected) {
    const b = stickerBox(ctx, W, H, stk, assets);
    const cx = stk.x * W, cy = stk.y * H;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate((stk.rotation || 0) * Math.PI / 180);
    ctx.globalAlpha = stk.opacity ?? 1;
    if (stk.kind === "emoji") {
      ctx.font = `${Math.round(b.h * 0.86)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(stk.value, 0, b.h * 0.04);
    } else if (stk.kind === "image") {
      const im = assets.stickers?.[stk.id];
      if (im) ctx.drawImage(im, -b.w / 2, -b.h / 2, b.w, b.h);
    } else {
      ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = b.h * 0.2; ctx.shadowOffsetY = b.h * 0.06;
      roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.h / 2); ctx.fillStyle = stk.bg || "#ffffff"; ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.font = fontStr(700, b.h * 0.52, "Be Vietnam Pro"); ctx.fillStyle = stk.color || "#111"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(stk.value, 0, b.h * 0.04);
    }
    if (selected) {
      ctx.globalAlpha = 1; ctx.setLineDash([10 * unit(W, H), 8 * unit(W, H)]); ctx.strokeStyle = "#8b7bff"; ctx.lineWidth = 3 * unit(W, H);
      ctx.strokeRect(-b.w / 2 - 8, -b.h / 2 - 8, b.w + 16, b.h + 16);
    }
    ctx.restore();
    return { x: cx - b.w / 2, y: cy - b.h / 2, w: b.w, h: b.h };
  }

  function drawWatermark(ctx, W, H, st) {
    const txt = (st.export.watermark || "").trim(); if (!txt) return;
    const s = unit(W, H), m = 44 * s;
    ctx.save(); ctx.font = fontStr(600, 30 * s, "Be Vietnam Pro"); ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 6 * s;
    const pos = st.export.watermarkPos || "br";
    ctx.textAlign = pos.includes("r") ? "right" : "left";
    ctx.textBaseline = pos.includes("t") ? "top" : "bottom";
    ctx.fillText(txt, pos.includes("r") ? W - m : m, pos.includes("t") ? m + (st.export.progressBar ? 14 * s : 0) : H - m);
    ctx.restore();
  }

  // ---------- Phụ đề. Trả về bbox
  function drawSubtitle(ctx, W, H, st, text) {
    const sb = st.subs, s = unit(W, H);
    if (!text) return null;
    if (sb.uppercase) text = text.toUpperCase();
    const fs = sb.size * s;
    ctx.save();
    ctx.font = fontStr(800, fs, sb.font);
    const maxW = W * 0.86;
    const lines = wrapRich(ctx, tokenize(text), maxW);
    const lh = fs * 1.25;
    const totalH = lines.length * lh;
    const cy = H * (sb.y / 100);
    let top = Math.max(fs * 0.4, Math.min(H - totalH - fs * 0.4, cy - totalH / 2));
    const maxLW = Math.max(...lines.map((l) => l.width));
    const padX = fs * 0.45, padY = fs * 0.22;
    let bbox = { x: (W - maxLW) / 2 - padX - fs * 0.2, y: top - padY - fs * 0.2, w: maxLW + padX * 2 + fs * 0.4, h: totalH + padY * 2 + fs * 0.4 };
    if (sb.style === "box") {
      ctx.globalAlpha = 0.85; roundRect(ctx, (W - maxLW) / 2 - padX, top - padY, maxLW + padX * 2, totalH + padY * 2, fs * 0.25);
      ctx.fillStyle = sb.bgColor; ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    lines.forEach((l, i) => {
      const y = top + i * lh + fs * 0.92 + (lh - fs) / 2;
      const x = (W - l.width) / 2;
      if (sb.style === "pill") { roundRect(ctx, x - padX, top + i * lh + (lh - fs * 1.3) / 2, l.width + padX * 2, fs * 1.3, fs * 0.65); ctx.fillStyle = sb.bgColor; ctx.fill(); }
      const str = l.toks.map((t) => t.w).join("");
      if (sb.style === "outline") { ctx.lineJoin = "round"; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = sb.bgColor; ctx.strokeText(str, x, y); }
      if (sb.style === "shadow") { ctx.shadowColor = "rgba(0,0,0,.85)"; ctx.shadowBlur = fs * 0.25; ctx.shadowOffsetY = fs * 0.06; }
      ctx.fillStyle = sb.color; ctx.fillText(str, x, y);
      ctx.shadowColor = "transparent";
    });
    ctx.restore();
    bbox.x = Math.max(0, Math.floor(bbox.x)); bbox.y = Math.max(0, Math.floor(bbox.y));
    bbox.w = Math.min(W - bbox.x, Math.ceil(bbox.w)); bbox.h = Math.min(H - bbox.y, Math.ceil(bbox.h));
    return bbox;
  }

  function drawProgress(ctx, W, H, st, p) {
    if (!st.export.progressBar) return;
    const h = Math.round(10 * unit(W, H));
    ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = st.export.progressColor || "#5eead4"; ctx.fillRect(0, 0, W * p, h);
  }

  function fontsUsed(st) {
    return [[st.text.weight, st.text.font], [700, "Be Vietnam Pro"], [400, "Be Vietnam Pro"], [500, "Be Vietnam Pro"], [600, "Be Vietnam Pro"], [800, st.subs.font]];
  }

  window.Renderer = { SIZES, size, unit, drawBackground, drawCard, drawSticker, stickerBox, drawWatermark, drawSubtitle, drawProgress, fontsUsed, roundRect };
})();
