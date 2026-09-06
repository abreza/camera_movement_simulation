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

New archives use generator version 3 and retain the schema-v2 format accepted
by LensCraft. Static camera prompts always use constant speed and linear
easing. Vehicle paths use smooth position interpolation and velocity-derived
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

These are normalized-clip quality bounds, not physical speed limits: exports
do not record a frame rate or duration. The manifest records the policy,
accepted camera movement counts, and rejected candidate counts alongside the
requested subject distribution. The same seed/configuration remains repeatable
within this generator version, but produces different samples from version 2.

Run `npm run test:simulation` for geometry, heading, quality-gate and archive
regressions. To check a larger noisy batch twice for repeatability and all 17
camera movement types, run:

```bash
LENSCRAFT_DATASET_TEST_SAMPLE_COUNT=1000 node --test scripts/test-dataset.cjs
```

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
