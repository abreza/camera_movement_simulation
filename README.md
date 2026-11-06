This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Rule-based camera simulation

Camera generation runs through `src/service/simulation/rule-based/sequence.ts`.
It uses camera geometry, authored easing, and constraint rules; there is no
optimization objective or numerical trajectory solver. The old `optimization`
module only re-exports this implementation for compatibility.

- Instructions sample the subject's absolute scene frame. Each shot uses exactly
  its requested frame count, and a finished subject track holds its last pose in
  both generation and playback.
- A chained instruction inherits the preceding camera pose. For simple motion,
  this start pose takes precedence over an end-only setup so the next shot does
  not jump backwards to begin its movement.
- Simple movements use their exact authored scale. Rendering and downloading
  the same instructions and subject tracks produce the same camera frames.
- Off-center framing keeps a level horizon using direct yaw/pitch geometry.
  Near vertical views use a deterministic fallback when the requested framing
  cannot be achieved with a level horizon.

These changes draw on absolute-time track sampling and world-up screen framing
in TrainingFree_Cinematographer (`src/environment/sampler.ts` and
`src/optimizer/initialization/motion-step.ts`). They add no dependency on that
project and retain the existing instruction format and editor.

Run the focused geometry and sequence regression checks with
`npm run test:simulation`. Seeded dataset generation remains repeatable, but
sample hashes from older versions change because movement scale and framing
are now computed differently.

## Training dataset quality

The baseline quality policy introduced in generator version 4 retains the
schema-v2 sample format accepted by LensCraft. Static camera prompts always use
constant speed and linear easing. Vehicle paths use smooth position interpolation and velocity-derived
headings on a fixed clip timeline; tight turns receive more time so a distant
following camera does not inherit a one-frame heading flip.

Before writing a sample, the exporter checks the quantized poses that will be
stored, including the exact 30 paired frames selected by LensCraft's default
loader. Candidates are resampled when they violate any of these limits:

- Camera centers must remain outside the subject's oriented bounding box with
  0.02 scene units of clearance. Straight relative segments are also checked
  when subject orientation stays fixed; continuously rotating box sweeps
  between stored poses are not certified.
- World-space camera translation is limited to 3 scene units and rotation to
  30 degrees per step of the normalized 30-frame clip. Both source increments
  and the selected training steps are checked with fixed-point rounding
  tolerances. Acceleration between consecutive observed training velocities
  is limited to 1 scene unit per step squared; no initial rest state is assumed.
- Ordinary framing labels require an in-frame projected center. Offscreen
  centers use existing cardinal outer labels; diagonal offscreen endpoints are
  resampled because the vocabulary has no corresponding outer corner labels.
- Clips requesting continuous subject visibility must retain it in every
  exported frame. Other shots can intentionally crop or exit the frame.

These camera limits are normalized-clip quality bounds, not physical speed
limits. Version 4 records frame rate and duration separately. The manifest records the policy,
accepted camera movement counts, and rejected candidate counts alongside the
requested subject distribution. The same seed/configuration remains repeatable
within this generator version, but produces different samples from earlier versions.

Run `npm run test:simulation` for geometry, heading, quality-gate and archive
regressions. To check a larger noisy batch twice for repeatability and all 17
camera movement types, run:

```bash
LENSCRAFT_DATASET_TEST_SAMPLE_COUNT=1000 node --test scripts/test-dataset.cjs
```

## Standard dataset generation with diversity

Normal dataset exports now enable `rule-based-diversity-v1` by default. The
browser generator, its worker, and the headless command use the same
`buildRandomDatasetArchive` implementation and the existing rule-based camera
solver. With Node.js 22 or newer and dependencies installed:

```bash
npm run generate:dataset -- --count 1000 --seed normal-diversity-v1 --output /tmp/normal-diversity.zip
npm run test:dataset-diversity
```

The profile balances the planned mixture across the 17 ordinary camera
movements, subject to compatibility: follow/track slots require moving subjects.
Small exports and static-only subject mixtures cannot contain every movement.
Half the default samples retain the base scene scale; the remaining half is
split between log-uniform smaller scenes down to 0.25× and larger scenes up to
3×. Each clip samples one fixed focal length in 24–70 mm and one aspect ratio
from 9:16, 1:1, 4:3, 16:9 and 2.35:1, using the simulator's 35 mm film-gauge
camera model. Planned quotas, accepted counts, rejection counts, scale, lens
values and per-sample generation receipts are recorded in `manifest.json`.

Scene scaling multiplies subject dimensions, subject positions and camera
positions together. Exported dimensions still describe the physical subject
box, and class/body proportions and subject-motion families retain their
meaning. The human dimension limits documented below apply to the base body
before this additional whole-scene scale. This expands physical sizes while
preserving relative composition; it does not by itself make the subject occupy
more or less of the image. Optics and the existing framing/movement sampling
provide composition variation. Quality checks continue to inspect the actual
stored and selected 30-frame geometry. Linear quality caps and camera/subject-box
collision clearance use the declared per-scene scale. Angular caps and absolute
packing tolerances remain unchanged: positions still use a 0.001-scene-unit
grid (1 mm at metre scale). All stored-frame and model-30 quality gates still run.

Track/follow shots of highly curved subject paths through a telephoto lens can
be infeasible when the full curve must fit into one clip. For legacy geometric
subject paths, bounded retries in the same normal TypeScript pipeline can sample
seeded, contiguous trajectory windows with fractions 1, 0.75, 0.5, 0.25 and 0.125.
Static subjects and named human motions (`idle`, `walk`, `run`, `wander`, `stopStart`, `sidestep`,
`backward` and `turnInPlace`) always retain their full authored timeline, with
window fraction 1 and start 0, including on retries. The output keeps
the same frame count and clip duration, interpolates positions and uses SLERP
for orientations; the accepted window start and fraction are recorded in the
manifest. Full curves remain where feasible. Retries retain the assigned
movement family, scene scale, lens and subject class, without dropping their
quotas. This adds actual motion-extent variation and conditional acceptance;
it does not guarantee independent realized marginals across motion, scale and
optics.

To override the distribution, save a JSON `GenerateDatasetConfig`, for example
`/tmp/normal-config.json`:

```json
{
  "minFrameCount": 100,
  "maxFrameCount": 300,
  "framesPerSecond": 30,
  "diversity": {
    "sceneScale": { "min": 0.25, "max": 3, "baseFraction": 0.5 },
    "focalLength": { "min": 24, "max": 70 },
    "aspectRatios": [0.5625, 1, 1.3333333333333333, 1.7777777777777777, 2.35]
  }
}
```

```bash
npm run generate:dataset -- --config /tmp/normal-config.json --count 1000 --seed normal-diversity-v1 --output /tmp/custom-diversity.zip
npm run generate:dataset -- --legacy --count 1000 --seed legacy-comparison --output /tmp/legacy-comparison.zip
```

Explicit `--count` and `--seed` override JSON values. When neither source supplies
them, they default to 1000 and `normal-diversity-v1`. `--legacy` sets `diversity: false`, retaining the
legacy sampling distribution. Shared geometry corrections still apply, so this
is not a promise of historical byte hashes for formerly invalid tiny closeups.
Existing output files are never overwritten; failures remove the command's
partial export. ZIP output streams directly to disk. The final JSON receipt
reports the actual archived clip count, ZIP bytes/SHA-256 and embedded manifest
path/SHA-256. The command reads ZIP metadata and the manifest back from disk
without loading the whole archive into memory.

Keep each archive, manifest and parameter dictionary together. The same seed,
configuration and generator revision reproduce sample contents; random archive
IDs and generation timestamps mean ZIP hashes can differ. Manifest schema 3 /
generator 8 identify this normal profile; legacy and ET profiles retain their
own version markers. These are designed synthetic distributions, not a claim
of improved held-out model scores or a fit to native test trajectories.

`panLeft`/`panRight` retain the simulator's authored rotational-pan meaning.
They are not renamed to the separate CCDM `nativePan` conditioning convention.
The ET calibration profile remains a separate opt-in mode, described below.
It disables normal diversity; explicitly combining an ET profile with normal
diversity settings is rejected.

## ET training profile

Enable **Match ET training distribution** in Generator Options, or generate a
seeded export without a browser:

```bash
npm run generate:et -- --profile src/service/dataset/profiles/et_training_20261004_model30.json --count 10000 --seed et-matched-v4 --output /tmp/et-matched.zip
npm run test:et-profile
```

The bundled calibration contains aggregate statistics from 4,096 native ET
training clips. Another 1,024 clips from separate training videos are reserved
for distribution checks. Test and validation videos, including aliases, are
excluded. No native ET trajectory is replayed into the synthetic export.

Calibration measures motion, pauses, camera-subject range and optical framing
on one common 30-frame ET adapter timeline, using linear position interpolation
and camera SLERP. The SIM loader retains its paired nearest-frame selection;
the generator fits its realized 30 selected poses to those ET input statistics.
Legacy mixed native/nearest-frame calibration files are rejected.

The profile generates human center paths with separately controlled extent,
path length, final horizontal displacement and pauses, and camera-local
translations with independent smooth
rotation. Translation-static shots can pan or tilt; only a completely frozen
camera is labelled `static`. Full physical body poses remain in the four-section
MessagePack archive. The manifest asks LensCraft to expose only subject XYZ,
placeholder dimensions, and the primary motion type; heading, body size, endpoint
setup and all simulator instructions are unavailable to the model. Its
`observedMotionText` describes mixed camera motion without adding body-front or
endpoint claims. The diagnostic speed token is absent from model conditioning,
because the sampled mixed trajectories do not guarantee constant speed.

Matched subject centers follow radial paths along the authored travel axis,
with bounded reversals and a controlled endpoint. Full authored curved paths
are not preserved; body headings remain authored and movement-family labels
become diagnostic. This fits measured center statistics without asserting
that reconstructed ET drift represents a particular human action.

All normal export quality checks still apply. The manifest records intended
and accepted distributions, rejected candidates, and source provenance.
Sampling uses the central 5th–95th percentile range to avoid interpolation
through extreme reconstructed tails. Physically ordered quantities share a
quantile rank within subject XZ/XYZ/path/final-displacement, camera excursion/path,
and angular
excursion/path groups. This preserves their marginal quantiles but assumes
dependence within each group; it does not recover ET's measured joint distribution.
Source lengths are floored to 30 frames
at the declared 25-FPS convention; shorter native durations are therefore
extended. Scene scale is authored, not a calibrated conversion from ET units.
Framing calibration covers subject-center rays and optical angles. The ET
inputs used here supply no measured human bounding boxes or body dimensions.
The optional
`useCenteredPrincipalPointFovProxy` adopts the upstream viewer's `2cx × 2cy`
image convention explicitly, rather than treating it as measured resolution.
Horizontal and vertical lens angles share a TRAIN quantile rank. Their tangent
ratio supplies an effective optical aspect for projection; this is an assumed
coupling and is not a measurement of image resolution or image aspect.
The UI preset and CLI enable this lens estimate; disable **Use ET lens estimate**
or pass `--lens fixed` to keep the authored 50-degree horizontal FOV.

Availability is explicit loader metadata. Existing model weights do not acquire
an unknown-heading cue from this metadata alone. Dataset matching is a
preparation step; improvement on ET requires a separate controlled training
and evaluation experiment. Preserve `manifest.json` when extracting exports.

## Human subjects and motion

The standard dataset generator uses defaults with editable subject-class
and movement weights. **Static subjects account for 50% of samples**; the
remaining 50% is divided equally among all 14 other motion types (about 3.57%
each). Finite datasets round these counts to whole samples. Each distribution
has its own **Reset defaults** button. These are designed synthetic mixtures,
not measured ET/CCDM distributions or a claim of improved evaluation scores.

Every sample gets randomized subject dimensions. Dataset generation adds a
shared size multiplier of 0.75–1.25 to the existing class-specific dimension
variation, preserving proportions while varying volume. Human multipliers
are restricted to keep all dimensions within the bounds below. Dimension
sampling is reproducible with the dataset seed.

Human boxes vary in height (1.50–2.05 scene units), width (0.38–0.72), and
depth (0.22–0.44), with correlated stature/build variation. The preview uses a
procedural human mesh without external assets. The learning signal comes from
the exported body dimensions and root poses; it is not just a mesh change.
As with other subjects, positions denote the bounding-box centre, the world is
Y-up, and the body's forward direction is local **-Z**. There is no extra
hidden head/torso attention target.

| Motion | Exported behaviour |
| --- | --- |
| `static` | Exactly fixed position and body heading; works for every class |
| `idle` | Small weight shifts, root-height variation, and looking around |
| `walk` / `run` | Seeded speed and gentle root bob tied to travelled distance |
| `wander` | Smooth seeded changes of course, with a bounded turning rate |
| `stopStart` | Smooth braking, a genuine stationary interval, then resuming |
| `sidestep` | Lateral travel while keeping the body's forward direction |
| `backward` | Travel opposite to the body's forward direction |
| `turnInPlace` | Smooth body rotation with an unchanged position |

These eight new motions require a Human subject. Cars and bicycles retain the
six existing moving path families; humans can also use those families with
walking-scale travel. Props remain static. Allocation preserves the requested
movement counts with largest-remainder rounding and assigns compatible classes
within each movement. Thus class weights are conditional, not a promise of the
same global class percentages. Incompatible positive weights fail before export.
The manifest records the effective distributions and realized class×motion
counts as well as accepted camera movement counts and rejection reasons.

**Apply Movement Noise** is enabled by default and can be switched off.
Static subjects remain exactly still when it is enabled. Human motion is a
procedural **root trajectory**, not an articulated gait or
motion-capture sequence. The proxy's gentle upward bob keeps its box above the
floor; it does not model planted feet. Named human motions author their own
variation and bypass generic noise and vehicle heading recovery, which would
otherwise erase a stop or make a backward walker face the wrong way. A fixed
seed and duration define a continuous clip, independently of export frame count.

`framesPerSecond` defaults to 30 and accepts 10–120. Sample timestamps are
`frameIndex / framesPerSecond`; duration is `(frameCount - 1) / framesPerSecond`.
New human motions use seconds to set travel speed. Legacy vehicle curves still
retain their authored clip-scale travel. The manifest's `time` block documents
this sampling contract. LensCraft currently selects 30 paired camera/subject
poses and does **not** receive timestamps as model inputs.

```ts
await buildRandomDatasetArchive({
  simulationCount: 1000,
  seed: "human-motion-pilot-v5",
  framesPerSecond: 30,
  minFrameCount: 100,
  maxFrameCount: 300,
});
```

The MessagePack tuple and xyz/Euler/dimensions fields remain compatible with
LensCraft. Its caption vocabulary and dynamic evaluation cohorts include the
new names, so walking or turning subjects are not called stationary or silently
excluded from a dynamic evaluation. Old archives remain readable. Generator-v5
sample hashes and dynamic-cohort metadata differ from earlier runs; keep each
archive and its own manifest/dictionary together.

For the model experiment, generate a fresh pilot, inspect the realized mixture
and trajectory previews, then compare training runs with the same update budget,
evaluation checkpoint, and held-out splits. The ET audit also found inferred
subject heading/size and incomplete captions; adding human motion does not
resolve those conversion/conditioning issues by itself. Keep an independent
ET/CCDM test set instead of fitting this generator to their test trajectories.

Existing downloaded datasets are unchanged. Generate a fresh archive to apply
these fixes. Training paths and fitting normalization on a training-only split
are configured in the separate LensCraft training project.

## Dataset benchmark

With Node.js 22 or newer and dependencies installed, run:

```bash
npm run benchmark:dataset
npm run benchmark:dataset -- 1000
```

The default is 100 samples with a fixed seed and 100–500 frames per sample.
The command reports generation time, samples per second, archive size, and a
SHA-256 hash of the simulation MessagePack contents. It checks the ZIP entries
and every file's CRC. Timing includes archive creation and excludes source
loading and verification. The archive stays in memory and is not saved.

Compare runs with the same sample count and Node version. The sample hash
excludes random dataset IDs and timestamps, so it can detect changes to generated
samples independently of archive metadata.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
