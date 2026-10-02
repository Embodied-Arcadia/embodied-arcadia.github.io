# Level 2 Evaluation API contract

The static homepage at `https://robosteer.github.io/` calls a separate backend. Configure its HTTPS base URL in `evaluation-config.js` as `BACKEND_URL` (no trailing slash needed). The frontend sends one sample per request as `multipart/form-data`; the browser sets the boundary and `Content-Type` automatically.

## CSV evaluation

`POST {BACKEND_URL}/api/level2/evaluate/csv`

| Field | Type | Requirement |
| --- | --- | --- |
| `task_id` | text | Nonempty RoboSteer benchmark Task ID |
| `constraint` | text | One of `speed`, `amplitude`, `direction`, `trajectory`, `body_restrain` |
| `file` | file | User model's single-sample CSV output |

## Video + VLM evaluation

`POST {BACKEND_URL}/api/level2/evaluate/video`

| Field | Type | Requirement |
| --- | --- | --- |
| `task_id` | text | Nonempty RoboSteer benchmark Task ID |
| `constraint` | text | `order` or `times` |
| `provider` | text | Selected provider ID configured in `evaluation-config.js` |
| `api_key` | text | User-provided provider key, for this request only |
| `file` | file | User model's single-sample video output |

The current frontend file type configuration accepts `.csv` for CSV and `.mp4`, `.webm`, `.mov` for video. `maxFileBytes` is `null` until an agreed size limit is available. Coordinate provider IDs, actual video codec support, and any size limit with the backend before launch.

## Website examples

For each constraint, `evaluation-config.js` has a `demos` entry with `taskId` and `assetUrl`. Leave either blank to keep its `Try a Demo` button disabled. Once both contain a real benchmark Task ID and a same-site CSV/video asset path, the button loads the asset into the existing form. The user then clicks **Evaluate**. The frontend sends the same POST fields and uses the same backend endpoint as an uploaded file; there is no mock evaluation path. Video examples still require the user's chosen provider and API Key. Publish example assets under `assets/` so the Pages workflow includes them.

## Responses

Successful JSON response (HTTP 2xx):

```json
{
  "success": true,
  "task_id": "task_xxx",
  "constraint": "speed",
  "result": {
    "satisfied": true,
    "score": 0.87,
    "message": "Constraint satisfied."
  }
}
```

`result.satisfied` is a boolean when present. `result.score` is a finite number or `null`; `result.message` is a string or `null`. The frontend omits absent or null result fields. Additional response fields may be included; the UI does not depend on them. The backend should define the meaning and range of each score, since the frontend displays the number without converting it to a percentage.

Failure JSON response (appropriate HTTP 4xx/5xx):

```json
{
  "success": false,
  "error": { "code": "INVALID_TASK_ID", "message": "Task ID was not found." }
}
```

Use short, user-safe error messages. The backend must resolve the benchmark task and reference data from `task_id`, perform **all** real CSV evaluation and VLM/API calls, and return the result. Never persist or log a user's API Key or echo it in errors. Allow CORS requests from `https://robosteer.github.io` after deployment.
