(() => {
  "use strict";
  const content = window.ROBOOSTEER;
  if (!content) return;
  const byId = id => document.getElementById(id);
  const safeUrl = value => typeof value === "string" && /^https:\/\//.test(value);
  const setText = (id, value) => { if (value) byId(id).textContent = value; };
  setText("authors", content.authors); setText("team", content.team);
  setText("abstract", content.abstract); setText("contributors", content.contributors);
  const resources = [
    ["Homepage", "#home"], ["Paper", content.paperUrl],
    ["Dataset", content.datasetUrl], ["Code", content.codeUrl]
  ];
  for (const [label, url] of resources) {
    const available = url === "#home" || safeUrl(url);
    const item = document.createElement(available ? "a" : "span");
    item.className = "resource-link";
    item.textContent = available ? label : `${label} · forthcoming`;
    if (available) { item.href = url; if (url !== "#home") { item.target = "_blank"; item.rel = "noopener noreferrer"; } }
    else item.setAttribute("aria-disabled", "true");
    byId("resource-links").append(item);
  }
  if (content.figure?.src) {
    const img = document.createElement("img"); img.src = content.figure.src;
    img.alt = content.figure.alt || "RoboSteer overview"; img.loading = "lazy";
    document.querySelector(".figure-placeholder").replaceWith(img);
    setText("main-caption", content.figure.caption);
  }
  if (content.bibtex) {
    byId("bibtex").hidden = false; byId("bibtex").textContent = content.bibtex;
    byId("copy-citation").hidden = false; byId("citation-note").hidden = true;
    byId("copy-citation").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(content.bibtex); byId("copy-status").textContent = "BibTeX copied."; }
      catch { byId("copy-status").textContent = "Copy was unavailable. Select the BibTeX text above to copy it manually."; }
    });
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const saveData = navigator.connection?.saveData === true;
  let paused = reduced.matches || saveData;
  let heroVisible = true;
  const heroVideos = [];
  // One distinct source per cell; the grid never duplicates clips to fill space.
  content.heroVideos.forEach((asset, index) => {
    const tile = document.createElement("div"); tile.className = "motion-tile";
    const video = document.createElement("video");
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
    video.preload = "none"; video.tabIndex = -1;
    if (asset.poster) video.poster = asset.poster;
    video.dataset.src = asset.src; video.dataset.index = String(index);
    video.addEventListener("error", () => tile.classList.add("failed"));
    tile.append(video);
    if (asset.label) {
      const label = document.createElement("span"); label.className = "motion-label"; label.textContent = asset.label;
      tile.append(label);
    }
    byId("motion-wall").append(tile); heroVideos.push(video);
  });
  function updatePlayback() {
    const shouldPlay = !paused && heroVisible && !document.hidden;
    heroVideos.forEach(video => {
      if (!shouldPlay || video.parentElement.hidden) { video.pause(); return; }
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      video.play().catch(() => { /* Poster remains visible when autoplay is blocked. */ });
    });
    byId("motion-toggle").textContent = paused ? "Play motion ▷" : "Pause motion Ⅱ";
    byId("motion-toggle").setAttribute("aria-pressed", String(paused));
    byId("motion-toggle").setAttribute("aria-label", paused ? "Play background motion" : "Pause background motion");
  }
  byId("motion-toggle").addEventListener("click", () => { paused = !paused; updatePlayback(); });
  reduced.addEventListener("change", event => { paused = event.matches || saveData; updatePlayback(); });
  function layoutMotionWall() {
    const hero = byId("home");
    const width = hero.clientWidth;
    if (!width || !heroVideos.length) return;
    // Match the cells to the prepared clips' native ratio,
    // then size the entire hero to whole rows: no cropping or letterboxing.
    const aspect = content.heroAspectRatio || 5 / 4;
    const targetHeight = Math.max(560, window.innerHeight);
    const minColumns = width <= 760 ? 2 : Math.max(3, Math.ceil(width / 440));
    const maxColumns = width <= 760 ? 2 : Math.max(minColumns, Math.min(9, Math.floor(width / 190)));
    let best;
    for (let columns = minColumns; columns <= maxColumns; columns++) {
      const rows = Math.ceil(targetHeight * columns * aspect / width);
      const count = columns * rows;
      if (count > heroVideos.length) continue;
      const height = rows * width / columns / aspect;
      const score = (height - targetHeight) / targetHeight + Math.abs(count - 24) * .0005;
      if (!best || score < best.score) best = { columns, rows, count, height, score };
    }
    // Keep complete rows even in unusually tall embedded viewports.
    if (!best) {
      const columns = 2, rows = Math.floor(heroVideos.length / columns);
      best = { columns, rows, count: columns * rows, height: rows * width / columns / aspect };
    }
    hero.style.setProperty("--wall-columns", best.columns);
    hero.style.setProperty("--wall-rows", best.rows);
    hero.style.setProperty("--wall-height", `${best.height}px`);
    heroVideos.forEach((video, index) => { video.parentElement.hidden = index >= best.count; });
    updatePlayback();
  }
  let resizeFrame;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(layoutMotionWall);
  });
  let previousWallWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== previousWallWidth) { previousWallWidth = width; layoutMotionWall(); }
  }).observe(byId("home"));
  document.addEventListener("visibilitychange", () => { updatePlayback(); if (document.hidden) document.querySelectorAll(".case video, .case audio").forEach(media => media.pause()); });
  const heroObserver = new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; updatePlayback(); }, { threshold: .05 });
  heroObserver.observe(byId("home"));
  layoutMotionWall();
  const caseObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const video = entry.target;
    if (entry.isIntersecting) { if (!video.getAttribute("src")) { video.src = video.dataset.src; video.load(); } }
    else video.pause();
  }), { rootMargin: "150px 0px" });
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const disclosure = (label, body) => {
    const details = el("details"); details.append(el("summary", "", label), body); return details;
  };
  function playable(asset, article, type = "video") {
    const media = el(type);
    media.controls = true; media.preload = "none";
    media.setAttribute("aria-label", `${article.dataset.title}: ${asset.label}`);
    if (type === "video") { media.playsInline = true; if (asset.poster) media.poster = asset.poster; }
    media.dataset.src = asset.src;
    media.addEventListener("error", () => {
      if (media.nextElementSibling?.classList.contains("media-error")) return;
      media.after(el("p", "media-error", "Media unavailable. Please reload the page."));
    });
    media.addEventListener("play", () => document.querySelectorAll(".case video, .case audio").forEach(other => {
      if (other.closest(".case") !== article) other.pause();
    }));
    caseObserver.observe(media);
    return media;
  }
  function casePlayer(asset, article, type = asset.kind || "video") {
    const media = playable(asset, article, type); media.controls = false;
    const wrapper = el("div", `case-player case-player-${type}`);
    const controls = el("div", "player-controls");
    const name = `${article.dataset.title}: ${asset.label}`;
    const button = el("button", "player-play", `▶ Play ${type}`); button.type = "button";
    const clock = el("span", "player-clock", "0:00.0");
    const seek = el("input", "player-seek"); seek.type = "range"; seek.min = "0"; seek.max = "1"; seek.step = ".01"; seek.value = "0"; seek.disabled = true;
    seek.setAttribute("aria-label", `Seek ${name}`);
    const formatTime = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}` : "0:00.0";
    const update = () => {
      button.textContent = `${media.paused ? "▶ Play" : "Ⅱ Pause"} ${type}`;
      button.setAttribute("aria-label", `${media.paused ? "Play" : "Pause"} ${name}`);
      button.setAttribute("aria-pressed", String(!media.paused));
      clock.textContent = `${formatTime(media.currentTime)}${Number.isFinite(media.duration) ? ` / ${formatTime(media.duration)}` : ""}`;
      if (Number.isFinite(media.duration) && media.duration > 0) { seek.disabled = false; seek.max = String(media.duration); }
      seek.value = String(media.currentTime);
      seek.setAttribute("aria-valuetext", `${formatTime(media.currentTime)} of ${formatTime(media.duration)}`);
    };
    button.addEventListener("click", async () => {
      if (!media.paused) { media.pause(); return; }
      if (!media.getAttribute("src")) media.src = media.dataset.src;
      button.disabled = true; button.textContent = "Loading…"; wrapper.setAttribute("aria-busy", "true");
      try { if (media.ended) media.currentTime = 0; await media.play(); }
      catch { clock.textContent = "Unable to play. Try again."; }
      finally { button.disabled = false; button.textContent = `${media.paused ? "▶ Play" : "Ⅱ Pause"} ${type}`; wrapper.removeAttribute("aria-busy"); }
    });
    seek.addEventListener("input", () => { media.currentTime = Number(seek.value); update(); });
    ["play", "pause", "ended", "timeupdate", "loadedmetadata"].forEach(event => media.addEventListener(event, update));
    controls.append(button, clock);
    if (type === "video") {
      const fullscreen = el("button", "player-fullscreen", "⛶"); fullscreen.type = "button";
      fullscreen.setAttribute("aria-label", `Fullscreen ${name}`); fullscreen.title = "Fullscreen";
      fullscreen.addEventListener("click", async () => {
        try { if (document.fullscreenElement === wrapper) await document.exitFullscreen(); else if (wrapper.requestFullscreen) await wrapper.requestFullscreen(); else media.webkitEnterFullscreen?.(); }
        catch { clock.textContent = "Fullscreen unavailable."; }
      }); controls.append(fullscreen);
    }
    wrapper.append(media, controls, seek); update();
    return { wrapper, media };
  }
  const taskDescriptions = {
    "text_to_motion_generation": "Generate a full-body behavior that faithfully follows the textual behavioral condition.",
    "video_to_motion_imitation": "Imitate the full-body behavior demonstrated in the input video.",
    "audio_to_motion_generation": "Generate a full-body behavior that faithfully follows the spoken behavioral instruction.",
    "rhythm_to_motion_alignment": "Realize the textual behavioral condition while aligning the generated behavior with the musical rhythm.",
    "rotation_to_pose_generation": "Realize a full-body behavior that satisfies the supplied per-frame joint rotations and root conditions.",
    "motion_prediction": "Generate the unseen future segment so that it naturally continues the observed prefix and satisfies the provided behavioral condition.",
    "motion_retrodiction": "Generate the unseen past segment so that it naturally leads into the observed suffix and satisfies the provided behavioral condition.",
    "motion_interpolation": "Generate the missing intermediate segment while satisfying the observed prefix and suffix as temporal behavioral conditions.",
    "key_frame_conditioning": "Generate a continuous behavior that satisfies the behavioral instruction and the key-frame pose conditions at their specified timestamps.",
    "upper_to_full_body_completion": "Complete the lower-body behavior while preserving the supplied upper-body behavioral condition.",
    "lower_to_full_body_completion": "Complete the upper-body behavior while preserving the supplied lower-body behavioral condition.",
    "target_reaching": "Preserve the intended behavior while satisfying the specified local body-part goal.",
    "speed": "Preserve the intended behavior while satisfying the specified execution-speed constraint.",
    "amplitude": "Preserve the intended behavior while satisfying the specified movement-amplitude constraint.",
    "direction": "Preserve the intended behavior while satisfying the specified movement-direction constraint.",
    "order": "Realize the specified behaviors in the required temporal order while maintaining continuous transitions.",
    "times": "Realize the intended behavior with the specified repetition count.",
    "trajectory": "Preserve the intended behavior while satisfying the specified root-trajectory constraint.",
    "body_restrain": "Preserve the intended behavior while keeping the specified non-core body parts still.",
    "interleaved_multi_source_steering": "Jointly satisfy multiple temporally interleaved behavioral requirements from heterogeneous sources within a single behavior sequence."
};
  function caseCard(task, headingTag, activeVariant) {
    const variants = task.variants || [];
    const selected = variants.find(variant => variant.variantId === activeVariant) || variants[0];
    const item = selected ? { ...selected, id: task.id, title: task.title } : task;
    const article = el("article", "case"); article.id = `task-${item.id}`; article.dataset.title = item.title;
    if (selected) article.dataset.modality = selected.variantId;
    if (item.level === 3) article.classList.add("interleaved-case");
    const header = el("header", "case-header");
    header.append(el(headingTag, "case-title", item.title), el("p", "case-purpose", taskDescriptions[task.id]));
    article.append(header);
    if (variants.length > 1) {
      const tabs = el("div", "modality-tabs"); tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", `${task.title}: input modality`);
      const selectVariant = variant => {
        article.querySelectorAll("video, audio").forEach(media => { media.pause(); caseObserver.unobserve(media); });
        const replacement = caseCard(task, headingTag, variant.variantId);
        article.replaceWith(replacement);
        replacement.querySelector('[role="tab"][aria-selected="true"]').focus({ preventScroll: true });
      };
      variants.forEach((variant, index) => {
        const button = el("button", "modality-tab", variant.variantLabel); button.type = "button";
        const active = selected.variantId === variant.variantId;
        button.id = `${article.id}-modality-${variant.variantId}`;
        button.setAttribute("role", "tab"); button.setAttribute("aria-selected", String(active));
        button.setAttribute("aria-controls", `${article.id}-panel`); button.tabIndex = active ? 0 : -1;
        button.addEventListener("click", () => { if (!active) selectVariant(variant); });
        button.addEventListener("keydown", event => {
          let target;
          if (event.key === "ArrowRight") target = (index + 1) % variants.length;
          if (event.key === "ArrowLeft") target = (index + variants.length - 1) % variants.length;
          if (event.key === "Home") target = 0;
          if (event.key === "End") target = variants.length - 1;
          if (target !== undefined) { event.preventDefault(); selectVariant(variants[target]); }
        });
        tabs.append(button);
      });
      article.append(tabs);
    }
    const input = el("section", "case-input"); input.setAttribute("aria-label", `${item.title}: input condition`);
    input.append(el("h6", "case-block-title", item.level === 3 ? "Ordered input sequence" : "Input condition"));
    const inputs = el(item.level === 3 ? "ol" : "div", item.level === 3 ? "interleaved-inputs" : "case-inputs");
    for (const [index, asset] of item.inputs.entries()) {
      const block = el(item.level === 3 ? "li" : "div", "input-item");
      if (item.level === 3) {
        const heading = el("div", "step-heading");
        const marker = el("span", "step-number", String(asset.step).padStart(2, "0")); marker.setAttribute("aria-hidden", "true");
        heading.append(marker, el("p", "input-label", asset.modalityTitle), el("span", "step-motion-time", asset.motionTime)); block.append(heading);
      } else block.append(el("p", "input-label", asset.label));
      if (asset.kind === "text") {
        const text = el("p", "input-text", asset.text); block.append(text);
        if (asset.text.length > 360) {
          text.id = `${article.id}-input-${index}`; text.classList.add("is-collapsed");
          const toggle = el("button", "input-expand", "Read full input"); toggle.type = "button";
          toggle.setAttribute("aria-controls", text.id); toggle.setAttribute("aria-expanded", "false");
          toggle.addEventListener("click", () => {
            const collapsed = text.classList.toggle("is-collapsed");
            toggle.setAttribute("aria-expanded", String(!collapsed)); toggle.textContent = collapsed ? "Read full input" : "Collapse input";
          }); block.append(toggle);
        }
      }
      else if (asset.kind === "image") {
        const image = el("img"); image.src = asset.src; image.alt = `${item.title}: ${asset.label}`; image.loading = "lazy"; block.append(image);
      } else block.append(casePlayer(asset, article).wrapper);
      if (asset.note) block.append(el("p", "input-context", asset.note));
      inputs.append(block);
    }
    input.append(inputs);
    if (item.transcript) input.append(disclosure("Read spoken-instruction transcript", el("p", "input-text", item.transcript)));
    if (item.modifier) {
      const constraint = el("div", "case-constraint"); constraint.append(el("p", "input-label", "Explicit constraint"), el("p", "", item.modifier)); input.append(constraint);
    }
    if (item.sequence && item.id !== "times") {
      const sequence = el("ol", "action-sequence"); item.sequence.forEach(step => sequence.append(el("li", "", step))); input.append(sequence);
    }
    const caseBody = el("div", "case-body"); caseBody.append(input);
    const output = el("section", "case-output");
    const outputTitle = item.id === "times" ? "BABEL-labeled example" : "Motion reference";
    output.setAttribute("aria-label", `${item.title}: ${outputTitle.toLowerCase()}`);
    output.append(el("h6", "case-block-title", outputTitle));
    if (item.sequence && item.id === "times") {
      const sequence = el("ol", "action-sequence"); item.sequence.forEach(step => sequence.append(el("li", "", step))); output.append(sequence);
    }
    if (item.level === 3) output.append(el("p", "sequence-output-note", "01 → 02 → 03 → 04 · one continuous motion"));
    if (item.timeline) {
      const timeline = el("div", "task-timeline");
      for (const part of item.timeline) {
        const span = el("span", `timeline-${part.kind}`, `${part.label}\n${part.start}–${part.end} s`);
        span.style.flexGrow = String(part.end - part.start); timeline.append(span);
      }
      output.append(timeline);
    }
    output.append(el("p", "input-label", item.video.label));
    const { wrapper: mediaBox, media: video } = casePlayer(item.video, article); output.append(mediaBox);
    if (item.level === 3) {
      const status = el("p", "interval-status", "Motion 0–2 s · Text instruction"); output.append(status);
      video.addEventListener("timeupdate", () => {
        const t = video.currentTime;
        const step = t < 2 ? 1 : t < 4 ? 3 : t <= 5 ? 4 : 0;
        const description = step === 1 ? "Text instruction" : step === 3 ? "Video instruction" : step === 4 ? "Spoken instruction" : "Unassigned source tail";
        status.textContent = `Motion ${t.toFixed(2)} s · ${Math.abs(t - 2) < .08 ? "Key-frame boundary + " : ""}${description}`;
        [...inputs.children].forEach((block, index) => block.classList.toggle("is-current-step", index + 1 === step || (index === 1 && Math.abs(t - 2) < .08)));
      });
    }
    if (item.targetWindow) {
      const status = el("p", "interval-status", `Target interval: ${item.targetWindow[0]}–${item.targetWindow[1]} s`);
      video.addEventListener("timeupdate", () => {
        const inTarget = video.currentTime >= item.targetWindow[0] && video.currentTime < item.targetWindow[1];
        status.textContent = `${video.currentTime.toFixed(2)} s · ${inTarget ? "Target interval — generate" : "Condition interval — provided"}`;
        status.classList.toggle("is-target", inTarget);
      }); output.append(status);
    }
    const packageInfo = el("div", "package-info");
    if (item.previewScope) packageInfo.append(el("p", "input-label", "Media notes"), el("p", "motion-note", item.previewScope));
    packageInfo.append(el("p", "input-label", "Task prompt"), el("p", "input-text", item.prompt), el("p", "motion-note", item.motionNote), el("p", "case-id", item.taskId));
    const table = el("table"); table.append(el("caption", "", "Motion package referenced by the task"));
    const head = el("thead"), headrow = el("tr");
    ["Component", "Shape / format"].forEach(label => { const th = el("th", "", label); th.scope = "col"; headrow.append(th); });
    head.append(headrow); table.append(head);
    const body = el("tbody");
    item.package.forEach(component => { const row = el("tr"); row.append(el("td", "", component.file), el("td", "", component.shape)); body.append(row); });
    table.append(body); packageInfo.append(table);
    const path = el("p", "package-path"); path.append(el("span", "", "Dataset-relative path: "), el("code", "", item.packagePath)); packageInfo.append(path);
    if (item.trajectoryPoints && Object.keys(item.trajectoryPoints).length) packageInfo.append(el("pre", "", JSON.stringify(item.trajectoryPoints, null, 2)));
    caseBody.append(output);
    const details = disclosure("Task details", packageInfo); details.className = "case-technical";
    if (variants.length > 1) {
      const panel = el("div", "case-variant-panel"); panel.id = `${article.id}-panel`;
      panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", `${article.id}-modality-${selected.variantId}`);
      panel.append(caseBody, details); article.append(panel);
    } else article.append(caseBody, details);
    return article;
  }
  const familyDescriptions = {
    "Full Conditioning Reproduction": "Full Conditioning Reproduction evaluates whether a model realizes a behavior from a fully specified behavioral condition. The five task types use textual conditions, spoken instructions, demonstrated behaviors in video, text accompanied by music, or per-frame joint and root conditions. The generated behavior must faithfully satisfy the supplied condition; Rhythm-Motion Alignment additionally requires alignment with the musical rhythm.",
    "Temporal Completion": "Temporal Completion evaluates whether a model generates the unspecified parts of a behavior while satisfying the available temporal conditions. Motion Prediction uses an observed prefix to generate an unseen future segment; Motion Retrodiction uses an observed suffix to generate an unseen past segment. Motion Interpolation fills a missing intermediate segment, while Key-frame Conditioning requires the generated behavior to satisfy pose conditions at specified timestamps. These segments need not divide the sequence into equal durations.",
    "Spatial Completion": "Spatial Completion evaluates whether a model generates a coherent full-body behavior from spatially partial behavioral conditions. Upper-to-Full Body Completion preserves the upper-body condition while completing the lower-body behavior; Lower-to-Full Body Completion reverses that relationship. Target Reaching requires the intended behavior to satisfy a specified local body-part goal. The generated behavior must satisfy the local condition while remaining consistent as a whole."
  };
  const levels = [
    [1, "Conditional Steering", "Realize behaviors from fully specified, temporally partial, or spatially partial conditions. Conditional Steering tests whether a model faithfully follows the supplied behavioral condition. Full Conditioning Reproduction uses fully specified conditions, Temporal Completion supplies only selected temporal segments or key frames, and Spatial Completion provides partial-body conditions or local goals. The generated behavior must satisfy the provided information while completing what remains unspecified."],
    [2, "Constraint Steering", "Preserve the intended behavior while satisfying an explicit constraint on how it is performed. Constraint Steering comprises seven constraint types: Speed, Amplitude, Direction, Order, Times, Trajectory, and Body Restrain. Each task instance specifies a behavioral constraint that the generated behavior must satisfy, such as a change in execution speed, movement amplitude, direction, ordering, repetition count, root trajectory, or non-core body-part movement."],
    [3, "Compositional Steering", "Jointly satisfy multiple temporally interleaved behavioral requirements from heterogeneous sources within a single behavior sequence. Compositional Steering requires a model to satisfy the semantic content and temporal assignment of every requirement. Interleaved Multi-Source Steering combines text, image, video, and spoken-audio conditions at specified intervals or timestamps; the generated behavior must jointly satisfy these requirements while maintaining continuity across their boundaries."]
  ];
  for (const [level, title, description] of levels) {
    const section = el("section", "case-level-section"); section.id = `cases-level-${level}`;
    section.setAttribute("aria-labelledby", `case-level-heading-${level}`);
    const heading = el("h3", "case-level-heading", `Level ${level} · ${title}`); heading.id = `case-level-heading-${level}`;
    section.append(heading, el("p", "level-description", description));
    const items = content.cases.filter(item => item.level === level);
    const groups = level === 1 ? [...new Set(items.map(item => item.group))] : [""];
    for (const group of groups) {
      const subset = group ? items.filter(item => item.group === group) : items;
      const groupSection = el("div", "case-family");
      if (group) { groupSection.id = `family-${group.toLowerCase().replaceAll(" ", "-")}`; groupSection.append(el("h4", "family-heading", group), el("p", "family-description", familyDescriptions[group])); }
      const taskLinks = el("nav", "task-index"); taskLinks.setAttribute("aria-label", `${group || title} task types`);
      for (const item of subset) { const link = el("a", "", item.title); link.href = `#task-${item.id}`; taskLinks.append(link); }
      const grid = el("div", level === 3 ? "case-grid interleaved-grid" : "case-grid");
      subset.forEach(item => grid.append(caseCard(item, group ? "h5" : "h4")));
      groupSection.append(taskLinks, grid); section.append(groupSection);
    }
    byId("case-grid").append(section);
  }
})();
