# RoboSteer project website

An English static project website for **Benchmarking Behavioral Steerability in Humanoid Foundation Models**. No backend, database, build service, or npm dependencies are required.

Static website for https://embodied-arcadia.github.io/ . The website repository is `Embodied-Arcadia/embodied-arcadia.github.io`. Publication metadata and resource links are updated as they become available.

## Preview locally

From this directory, run:

```text
node tools/serve.mjs
```

Then open **http://127.0.0.1:4173/**. The preview server supports video range requests and serves only public website files. Stop it with Ctrl+C when finished. If port 4173 is in use, close the earlier preview before starting a second instance.

Opening `index.html` directly also displays the static page, although browser clipboard and local-file media behavior can differ from HTTP hosting.

## Update publication content

Edit **`site-content.js`**:

| Field | Content |
| --- | --- |
| `authors`, `team`, `contributors` | Approved names, author order, affiliations, and credits |
| `abstract` | Official abstract; an empty value leaves the explicit placeholder |
| `paperUrl` | Final arXiv or paper URL |
| `datasetUrl` | The single primary Hugging Face **dataset repository**, not an account profile |
| `codeUrl` | Actual project code repository, not the website repository unless they coincide |
| `figure` | `src`, accessible `alt`, and `caption` |
| `bibtex` | Exact final entry; leave empty until bibliographic details are known |
| `heroVideos` | The 36 available background media objects (`src`, `poster`, `label`) |
| `cases` | 20 task records: level, task family, input modality, full conditions, prompt, visualization, GT schema and B.3 panel |

Empty resource URLs display as unavailable. No placeholder arXiv IDs or nonexistent dataset/repository links are emitted. Once all three resource URLs are available, the preview release note is hidden automatically.

`index.html` contains the paper title, overview text, section layout, and metadata. If the title changes, update both the visible title and the document metadata. The overview is a concise description aligned with Section 4.1 of the supplied main manuscript; it is not a fabricated formal abstract.

## Motion media

- The hero chooses complete rows and columns from 36 unique skeleton videos to fit the viewport. Every cell retains the source 5:4 aspect ratio at 100% size, with no grid gaps, borders, cropping, or letterboxing. Hero height follows the complete rows and can slightly exceed the viewport. Mobile layouts use two columns; hidden videos are paused. The wall background matches the source render to prevent subpixel seams.
- All 20 case references use human-body/skeleton renderings: 18 corresponding Data/Shared/Video/Skeleton clips and the two original AMASS Order/Times clips. G1 robot videos are no longer used in the gallery. Human video/image/audio task inputs retain their original modalities.
- Backgrounds are muted, looped, and paused when the hero leaves view or the tab is hidden.
- Reduced-motion and data-saving preferences start the background paused, with posters visible; visitors can explicitly play it.
- Twenty detailed cases cover all tasks: 12 in Conditional Steering, 7 in Constraint Steering, and 1 in Compositional Steering. Level 1 groups are Full Conditioning Reproduction, Temporal Completion, and Spatial Completion. Text/audio/video are input modalities within tasks.
- Each case includes the complete selected input, the task requirement and prompt, a full reference video and GT package details. Appendix figure links are omitted. The page uses two case columns on desktop and one on mobile; wide cards place inputs beside the reference video. Long input text can expand in place, and full prompts plus GT details share one disclosure. All 20 case records are retained.
- Completion timelines distinguish provided intervals from target intervals; the label follows the current video time. Level 3 displays a connected, numbered sequence with separate motion timestamps and compact input playback controls. Speech playback duration is distinguished from the motion interval.
- Input audio, video, images, and trajectory conditions are available inline. Case media loads near the viewport and pauses outside it. Playing media in a new case pauses media in other cases.
- Amplitude, Speed, Direction, and Body Restrain currently point to unmodified references. Their videos are labeled accordingly. Times supplies a single source cycle and a separate repeated-motion package; the page does not label the single-cycle video as the repeated result.
- Media is re-encoded at its original frame rate without trimming or changing playback speed. Originals are untouched.
- Exact case provenance is recorded outside the site in `../RoboSteer-Release-Docs/internal/CASE_SOURCES.json`.

`tools/prepare_media.py` prepares only the hero and preserves the case configuration. `tools/prepare_cases.py` prepares the 20 explicitly selected cases, with progress and interactive checkpoint recovery. These local-only helpers and their `.tools/` dependencies are excluded from deployment.

**Local review assets:** this preview includes the Order/Times example visuals from AMASS/BABEL . Their public-release suitability has not been established. Review or replace them before publishing; do not treat this local preview bundle as an approved public dataset release.

## Figure and fonts

The statistics image is rendered from the supplied appendix's `appendix_a1_benchmark_statistics.pdf`. Counts describe the full benchmark, including Order/Times; they do not claim all assets are already downloadable. The original figure remains unchanged.

Fonts are locally hosted Space Grotesk and IBM Plex Sans. Their license files are included in `assets/fonts/`; the site does not depend on a remote font CDN at runtime.

## Later deployment to GitHub Pages

The included `.github/workflows/pages.yml` publishes the allowlisted static page, assets, and public dataset guide from `main`. Once a repository is created under the agreed account, configure its Pages source to **GitHub Actions**. The workflow needs the repository's Pages and Actions permissions to be enabled.

All site URLs use relative paths, so the page works both at an account root and at a repository subpath. The workflow excludes the local tooling, release-review notes, original dataset, and unrelated workspace files. Follow the [GitHub Pages custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Before public release, review the selected visuals, final author list and text, paper/code/dataset links, and applicable publication terms. Dataset licensing is separate from website hosting.

## Case presentation and motion labels

Hero action labels summarize each selected sample’s original text annotation. They are motion descriptions, not benchmark task-family labels. Update `heroVideos[].label` with the corresponding asset.

All 20 cases include `watchFor` (the task requirement) and `previewScope` (what the available visualization demonstrates). Input and reference media use the same player controls. Level 3 retains the boundary image at 2 s and the full 2–4 s video; its poster is taken at motion time 2.9 s to show a different pose. Reference playback highlights the active input interval.

Five cases still lack complete target videos (Speed, Amplitude, Direction, Times, Body Restrain). Rhythm, Rotation-to-Pose and Trajectory have additional visualization or alignment limitations marked in the cards. Source skeletons are not model predictions or verified renderings of the G1 output packages.

## Task modality variants

The gallery keeps 20 task cards and provides 59 examples across their available input modalities. Fifteen task cards include an input-modality tab bar. Switching a tab replaces the input assets, prompt, target interval and motion package with the corresponding task record, pauses the previous media, and preserves keyboard focus. Arrow keys, Home and End switch tabs. The full prompt and media notes remain under Task details.

Temporal Completion: Prediction (5), Retrodiction (4), Interpolation (4), Key-frame Conditioning (4). Spatial Completion: Upper-to-Full (4), Lower-to-Full (4), Target Reaching (2). Level 2: Speed / Amplitude / Direction / Body Restrain (4 each), Order / Times / Trajectory (3 each). Video-to-Motion Imitation has Human video and Skeleton video inputs.
