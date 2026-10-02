(() => {
  "use strict";
  const config = window.ROBOOSTEER_EVALUATION_CONFIG;
  const service = window.RoboSteerEvaluationService;
  const byId = id => document.getElementById(id);
  if (!config || !service || !byId("evaluation")) return;

  const groups = {
    csv: { values: ["speed", "amplitude", "direction", "trajectory", "body_restrain"], label: "CSV" },
    vlm: { values: ["order", "times"], label: "video" }
  };
  const state = { csv: { file: null, busy: false }, vlm: { file: null, busy: false } };
  let activeType = "csv";
  const tab = type => byId(type === "csv" ? "tab-csv" : "tab-vlm");
  const panel = type => byId(type === "csv" ? "panel-csv" : "panel-vlm");
  const form = type => byId(`${type}-evaluation-form`);
  const resultBox = type => byId(`${type}-result-box`);

  function status(type, name, message) {
    const box = resultBox(type);
    box.dataset.state = name;
    box.replaceChildren();
    const content = document.createElement("div");
    content.className = "result-placeholder";
    const heading = document.createElement("h4");
    heading.textContent = name === "idle" ? "Evaluation Output" : name === "file-selected" ? "File selected" : name === "validating" ? "Checking input" : name === "demo-loading" ? "Loading example…" : name === "evaluating" ? "Evaluating…" : name === "invalid-input" ? "Check your input" : "Evaluation unavailable";
    const text = document.createElement("p");
    text.textContent = message;
    content.append(heading, text);
    box.append(content);
  }

  function showResult(type, response) {
    const box = resultBox(type);
    const result = response.result;
    box.dataset.state = "success";
    box.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "result-container";
    const header = document.createElement("div");
    header.className = "result-header";
    const title = document.createElement("strong");
    title.textContent = "Result";
    const context = document.createElement("span");
    context.className = "result-timestamp";
    context.textContent = `${response.constraint.replaceAll("_", " ")} · ${response.taskId}`;
    header.append(title, context);
    wrap.append(header);

    if (typeof result.satisfied === "boolean") {
      const verdict = document.createElement("div");
      verdict.className = `result-status-banner ${result.satisfied ? "status-pass" : "status-fail"}`;
      verdict.textContent = result.satisfied ? "✓ Constraint satisfied" : "✗ Constraint not satisfied";
      wrap.append(verdict);
    }
    if (result.score != null) {
      const score = document.createElement("div");
      score.className = "result-score";
      const label = document.createElement("span");
      label.textContent = "Score";
      const value = document.createElement("strong");
      value.textContent = String(result.score);
      score.append(label, value);
      wrap.append(score);
    }
    if (result.message) {
      const message = document.createElement("p");
      message.className = "result-explanation";
      message.textContent = result.message;
      wrap.append(message);
    }
    if (wrap.children.length === 1) {
      const note = document.createElement("p");
      note.textContent = "Evaluation completed. No result fields were returned.";
      wrap.append(note);
    }
    box.append(wrap);
  }

  function setActive(type, clearSelection = false) {
    if (activeType === "vlm" && type !== "vlm") byId("vlm-api-key").value = "";
    activeType = type;
    for (const other of ["csv", "vlm"]) {
      const active = other === type;
      tab(other).classList.toggle("active", active);
      tab(other).setAttribute("aria-selected", String(active));
      panel(other).hidden = !active;
      panel(other).classList.toggle("active", active);
    }
    if (clearSelection) {
      byId("csv-constraint-select").value = "";
      byId("vlm-constraint-select").value = "";
      syncConstraintButtons("");
      status(type, "idle", `Choose a constraint, enter a Task ID, and upload your ${groups[type].label} output.`);
    }
    updateDemoButton(type);
  }

  function syncConstraintButtons(selected) {
    byId("eval-constraint-picker").querySelectorAll("button").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.constraint === selected));
    });
  }

  function updateDemoButton(type) {
    const constraint = byId(`${type}-constraint-select`).value;
    const demo = config.demos?.[constraint];
    const available = Boolean(demo?.taskId?.trim() && demo?.assetUrl?.trim());
    byId(`${type}-demo-btn`).disabled = state[type].busy || !available;
    byId(`${type}-demo-note`).textContent = !constraint ? "Choose a constraint to check example availability." : available ? "Use a website example with its benchmark Task ID." : "Example not configured yet. You can upload your own output.";
  }

  function selectConstraint(value) {
    const type = groups.csv.values.includes(value) ? "csv" : "vlm";
    setActive(type);
    byId("csv-constraint-select").value = type === "csv" ? value : "";
    byId("vlm-constraint-select").value = type === "vlm" ? value : "";
    syncConstraintButtons(value);
    updateDemoButton(type);
    status(type, "idle", `Enter a Task ID and upload your ${groups[type].label} output.`);
  }

  const configFileType = type => config.fileTypes[type === "csv" ? "csv" : "video"];
  function validFile(type, file) {
    if (!file) return "Choose a file.";
    if (file.size === 0) return "Choose a nonempty file.";
    const settings = configFileType(type);
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!settings.extensions.includes(extension)) return `Choose a ${settings.extensions.join(" or ")} file.`;
    if (file.type && file.type !== "application/octet-stream" && !settings.mimeTypes.includes(file.type)) return "This file type is not supported.";
    if (config.maxFileBytes != null && file.size > config.maxFileBytes) return "This file exceeds the configured upload size limit.";
    return "";
  }

  function setFile(type, file) {
    const error = file ? validFile(type, file) : "";
    if (error) {
      state[type].file = null;
      byId(`${type}-file-input`).value = "";
      byId(`${type}-file-name`).textContent = `Click or drop a ${groups[type].label} file here`;
      byId(`${type}-dropzone`).classList.remove("has-file");
      byId(`${type}-file-actions`).hidden = true;
      status(type, "invalid-input", error);
      return;
    }
    state[type].file = file;
    byId(`${type}-file-name`).textContent = file ? `${file.name} (${(file.size / 1048576).toFixed(2)} MB)` : `Click or drop a ${groups[type].label} file here`;
    byId(`${type}-dropzone`).classList.toggle("has-file", Boolean(file));
    byId(`${type}-file-actions`).hidden = !file;
    if (file) status(type, "file-selected", `${file.name} is ready. Enter the remaining details and evaluate.`);
    else status(type, "idle", `Choose a constraint, enter a Task ID, and upload your ${groups[type].label} output.`);
  }

  function clearStaleResult(type) {
    if (["success", "backend-error", "invalid-input"].includes(resultBox(type).dataset.state)) {
      status(type, state[type].file ? "file-selected" : "idle", state[type].file ? "File selected. Review the details and evaluate again." : `Choose a constraint, enter a Task ID, and upload your ${groups[type].label} output.`);
    }
  }

  function setupFile(type) {
    const input = byId(`${type}-file-input`);
    const zone = byId(`${type}-dropzone`);
    input.accept = configFileType(type).extensions.join(",");
    input.addEventListener("change", () => { if (!state[type].busy && input.files[0]) setFile(type, input.files[0]); });
    zone.addEventListener("keydown", event => {
      if ((event.key === "Enter" || event.key === " ") && !state[type].busy) { event.preventDefault(); input.click(); }
    });
    zone.addEventListener("dragover", event => { event.preventDefault(); if (!state[type].busy) zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", event => {
      event.preventDefault(); zone.classList.remove("drag-over");
      if (!state[type].busy && event.dataTransfer.files[0]) setFile(type, event.dataTransfer.files[0]);
    });
    byId(`${type}-replace`).addEventListener("click", () => { if (!state[type].busy) { input.value = ""; input.click(); } });
    byId(`${type}-remove`).addEventListener("click", () => { input.value = ""; setFile(type, null); });
  }

  function setBusy(type, busy, label = "Evaluating…") {
    state[type].busy = busy;
    form(type).querySelectorAll("input, select, button").forEach(control => { control.disabled = busy; });
    byId("eval-constraint-picker").querySelectorAll("button").forEach(control => { control.disabled = busy; });
    for (const item of ["csv", "vlm"]) tab(item).disabled = busy;
    byId(`btn-eval-${type}`).textContent = busy ? label : "Evaluate";
    resultBox(type).setAttribute("aria-busy", String(busy));
    if (!busy) updateDemoButton(type);
  }

  async function prepareDemo(type) {
    if (state[type].busy) return;
    const constraint = byId(`${type}-constraint-select`).value;
    byId(`${type}-task-id`).value = "";
    byId(`${type}-file-input`).value = "";
    setFile(type, null);
    setBusy(type, true, "Loading example…");
    status(type, "demo-loading", "Loading the website example…");
    try {
      const demo = await service.loadDemo(constraint);
      const error = validFile(type, demo.file);
      if (error) throw new service.EvaluationError("INVALID_INPUT", error);
      byId(`${type}-task-id`).value = demo.taskId;
      byId(`${type}-file-input`).value = "";
      setFile(type, demo.file);
      status(type, "file-selected", "Example loaded. Click Evaluate to run the real backend evaluation.");
    } catch (caught) {
      status(type, "backend-error", caught instanceof service.EvaluationError ? caught.message : "The example asset could not be loaded.");
    } finally {
      setBusy(type, false);
    }
  }

  async function evaluate(type) {
    if (state[type].busy) return;
    status(type, "validating", "Checking your input…");
    const constraint = byId(`${type}-constraint-select`).value;
    const taskId = byId(`${type}-task-id`).value.trim();
    const file = state[type].file;
    const provider = type === "vlm" ? byId("vlm-provider-select").value : undefined;
    const keyInput = type === "vlm" ? byId("vlm-api-key") : null;
    const apiKey = keyInput?.value || "";
    let error = !constraint ? "Choose a constraint." : !taskId ? "Enter a Task ID." : !file ? `Choose a ${groups[type].label} file.` : validFile(type, file);
    if (!error && type === "vlm" && !provider) error = "Choose a VLM provider.";
    if (!error && type === "vlm" && !apiKey.trim()) error = "Enter an API Key.";
    if (error) { status(type, "invalid-input", error); return; }

    setBusy(type, true);
    status(type, "evaluating", "Your sample is being evaluated…");
    try {
      const fields = { taskId, constraint, file, provider, apiKey };
      const response = await (type === "csv" ? service.evaluateCsv(fields) : service.evaluateVideo(fields));
      showResult(type, response);
    } catch (caught) {
      status(type, "backend-error", caught instanceof service.EvaluationError ? caught.message : "Evaluation failed. Please try again.");
    } finally {
      if (keyInput) keyInput.value = "";
      setBusy(type, false);
    }
  }

  for (const type of ["csv", "vlm"]) {
    setupFile(type);
    form(type).addEventListener("submit", event => { event.preventDefault(); evaluate(type); });
    byId(`btn-reset-${type}`).addEventListener("click", () => {
      form(type).reset();
      byId(`${type}-file-input`).value = "";
      setFile(type, null);
      syncConstraintButtons("");
      updateDemoButton(type);
    });
    byId(`${type}-constraint-select`).addEventListener("change", event => { syncConstraintButtons(event.target.value); updateDemoButton(type); clearStaleResult(type); });
    byId(`${type}-task-id`).addEventListener("input", () => clearStaleResult(type));
    byId(`${type}-demo-btn`).addEventListener("click", () => prepareDemo(type));
  }
  byId("vlm-provider-select").addEventListener("change", () => clearStaleResult("vlm"));
  byId("vlm-api-key").addEventListener("input", () => clearStaleResult("vlm"));
  byId("eval-constraint-picker").addEventListener("click", event => {
    const value = event.target.closest("button")?.dataset.constraint;
    if (value) selectConstraint(value);
  });
  for (const type of ["csv", "vlm"]) {
    tab(type).addEventListener("click", () => { if (activeType !== type) setActive(type, true); });
  }
  const providerSelect = byId("vlm-provider-select");
  for (const provider of config.providers) {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = provider.label;
    providerSelect.append(option);
  }
  byId("vlm-file-types").textContent = `One sample · ${config.fileTypes.video.extensions.join(" / ")}`;
  if (!config.BACKEND_URL.trim()) byId("eval-backend-note").textContent = "Prototype interface: the evaluation backend is not configured yet. No result will be generated until the service is connected.";
  setActive("csv");
})();
