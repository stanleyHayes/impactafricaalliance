# Showcase imagery — 8 September 2026

Six distinct illustrative images were generated using the built-in imagegen tool for the Home and Get Involved showcase cards. These are fictional scenes, not documentary photographs of Alliance participants. The media library tags and descriptions identify them as AI-generated.

The complete generation prompts, optimized file paths and alt descriptions are in `tools/showcase-imagery.json`. The six WebP assets are in `apps/marketing/public/images/`, named after their CMS slot with a `-v2` suffix.

All six images were uploaded to Cloudinary and assigned to the production CMS on 8 September 2026. Editors can replace them under **Site Images**, selecting the Home showcase or Get Involved slot, uploading a replacement and setting its alt text. Images are also reusable from the media library. Active CMS uploads take precedence over the bundled fallback; deactivating a slot restores its fallback.

The marketing changes make these six cards read the CMS alt description, then the uploaded asset description. They require a frontend deployment; the production image assignments themselves are already saved.

`node tools/publish-showcase-imagery.mjs` validates local assets and reads existing CMS slots. Add `--confirm` to upload and assign the six images. Use `--env path/to/env` for another environment. The publisher preserves old Cloudinary assets and backs up existing slot records under `output/showcase-imagery/` before writing.

Validation: shared build and marketing TypeScript check; five focused tests covering CMS image/description precedence, inactive fallbacks, and the homepage impact section; generated asset visual review; production CMS readback and public API verification. No browser walkthrough or frontend deployment was performed in this change.
