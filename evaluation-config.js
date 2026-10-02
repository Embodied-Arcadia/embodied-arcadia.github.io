// Edit this file when the evaluation backend and its supported providers are ready.
window.ROBOOSTEER_EVALUATION_CONFIG = Object.freeze({
  BACKEND_URL: "",
  providers: [
    { id: "openai", label: "OpenAI" },
    { id: "google", label: "Google Gemini" },
    { id: "anthropic", label: "Anthropic" }
  ],
  fileTypes: {
    csv: { extensions: [".csv"], mimeTypes: ["text/csv", "application/csv", "application/vnd.ms-excel"] },
    video: { extensions: [".mp4", ".webm", ".mov"], mimeTypes: ["video/mp4", "video/webm", "video/quicktime"] }
  },
  // Add a real benchmark Task ID and a same-site asset path for each public example.
  // Example: speed: { taskId: "task_xxx", assetUrl: "assets/evaluation/speed.csv" }
  demos: {
    speed: { taskId: "", assetUrl: "" },
    amplitude: { taskId: "", assetUrl: "" },
    direction: { taskId: "", assetUrl: "" },
    trajectory: { taskId: "", assetUrl: "" },
    body_restrain: { taskId: "", assetUrl: "" },
    order: { taskId: "", assetUrl: "" },
    times: { taskId: "", assetUrl: "" }
  },
  // null means that the front end has no independent size limit.
  maxFileBytes: null
});
