(() => {
  "use strict";
  const csvConstraints = new Set(["speed", "amplitude", "direction", "trajectory", "body_restrain"]);
  const videoConstraints = new Set(["order", "times"]);

  class EvaluationError extends Error {
    constructor(code, message) { super(message); this.name = "EvaluationError"; this.code = code; }
  }

  async function loadDemo(constraint) {
    if (!csvConstraints.has(constraint) && !videoConstraints.has(constraint)) {
      throw new EvaluationError("INVALID_CONSTRAINT", "Choose a valid constraint.");
    }
    const demo = window.ROBOOSTEER_EVALUATION_CONFIG?.demos?.[constraint];
    if (!demo?.taskId?.trim() || !demo?.assetUrl?.trim()) {
      throw new EvaluationError("DEMO_UNAVAILABLE", "This example is not configured yet.");
    }
    let assetUrl;
    try { assetUrl = new URL(demo.assetUrl, document.baseURI); }
    catch { throw new EvaluationError("DEMO_UNAVAILABLE", "This example asset URL is invalid."); }
    if (assetUrl.origin !== new URL(document.baseURI).origin || !["http:", "https:"].includes(assetUrl.protocol)) {
      throw new EvaluationError("DEMO_UNAVAILABLE", "Example assets must be hosted on this website.");
    }
    let response;
    try { response = await fetch(assetUrl.href); }
    catch { throw new EvaluationError("DEMO_UNAVAILABLE", "The example asset could not be loaded."); }
    if (!response.ok) throw new EvaluationError("DEMO_UNAVAILABLE", "The example asset could not be loaded.");
    const blob = await response.blob();
    const filename = assetUrl.pathname.split("/").pop();
    return { taskId: demo.taskId.trim(), file: new File([blob], filename, { type: blob.type }) };
  }

  async function request(kind, { taskId, constraint, file, provider, apiKey }) {
    const allowed = kind === "csv" ? csvConstraints : videoConstraints;
    if (!allowed.has(constraint)) throw new EvaluationError("INVALID_CONSTRAINT", "Choose a valid constraint.");
    if (!taskId?.trim() || !file) throw new EvaluationError("INVALID_INPUT", "Enter a Task ID and choose a file.");
    if (kind === "video" && (!provider || !apiKey?.trim())) throw new EvaluationError("INVALID_INPUT", "Choose a provider and enter an API Key.");

    const base = window.ROBOOSTEER_EVALUATION_CONFIG?.BACKEND_URL?.trim().replace(/\/+$/, "");
    if (!base) throw new EvaluationError("BACKEND_UNAVAILABLE", "Evaluation backend is not configured yet.");
    const body = new FormData();
    body.append("task_id", taskId.trim());
    body.append("constraint", constraint);
    if (kind === "video") {
      body.append("provider", provider);
      body.append("api_key", apiKey);
    }
    body.append("file", file, file.name);

    let response;
    try {
      response = await fetch(`${base}/api/level2/evaluate/${kind}`, { method: "POST", body });
    } catch {
      throw new EvaluationError("BACKEND_UNAVAILABLE", "Evaluation service is unreachable. Please try again later.");
    }
    let data;
    try { data = await response.json(); }
    catch { throw new EvaluationError("INVALID_RESPONSE", "Evaluation service returned an unreadable response."); }

    if (!response.ok || data?.success === false) {
      const raw = typeof data?.error?.message === "string" ? data.error.message : "Evaluation failed. Please try again.";
      // A backend must not echo credentials, but avoid displaying them if it does.
      const message = apiKey && raw.includes(apiKey) ? "Evaluation failed. Please try again." : raw;
      throw new EvaluationError(data?.error?.code || "BACKEND_ERROR", message);
    }
    if (data?.success !== true || !data.result || typeof data.result !== "object" || Array.isArray(data.result)) {
      throw new EvaluationError("INVALID_RESPONSE", "Evaluation service returned an unexpected result.");
    }
    const result = data.result;
    if (result.satisfied != null && typeof result.satisfied !== "boolean") throw new EvaluationError("INVALID_RESPONSE", "Evaluation service returned an unexpected result.");
    if (result.score != null && (typeof result.score !== "number" || !Number.isFinite(result.score))) throw new EvaluationError("INVALID_RESPONSE", "Evaluation service returned an unexpected result.");
    if (result.message != null && typeof result.message !== "string") throw new EvaluationError("INVALID_RESPONSE", "Evaluation service returned an unexpected result.");
    const safeMessage = apiKey && result.message?.includes(apiKey) ? "Evaluation completed." : result.message;
    return {
      taskId: typeof data.task_id === "string" ? data.task_id : taskId.trim(),
      constraint: typeof data.constraint === "string" ? data.constraint : constraint,
      result: { satisfied: result.satisfied, score: result.score, message: safeMessage }
    };
  }

  window.RoboSteerEvaluationService = Object.freeze({
    EvaluationError,
    loadDemo,
    evaluateCsv: fields => request("csv", fields),
    evaluateVideo: fields => request("video", fields)
  });
})();
