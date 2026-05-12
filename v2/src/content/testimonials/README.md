# Testimonials

Three to five short quotes from coworkers, managers, or collaborators.

## Workflow

1. Ask via DM or LinkedIn. Aim for 2–3 sentences, specific, in their
   voice. "Abhinav shipped X, which let our team Y" is much stronger
   than generic praise.
2. Copy `_template.yaml` to `<author-slug>.yaml`.
3. Fill in `quote`, `author`, `role`, `company`. `linkedinUrl` and
   `photo` are optional; the section renders the author's initials in a
   placeholder bubble if no photo is provided.
4. Get the author's explicit sign-off on the wording before flipping
   `published` to `true`. The site treats `published: false` as a stage
   slot, so you can commit a draft without it appearing live.
5. Use `order` to sort: lower numbers render first.

## Where it shows up

Once at least one entry has `published: true`, the homepage gains a
**Testimonials** section between Writing and Contact. With zero
published entries, the section is hidden entirely.

## Photos

If you have a headshot, place the file under `src/assets/people/` so
Astro Image can process it (AVIF + WebP at build), then reference it
from the YAML as `../../assets/people/<filename>.jpg`. The placeholder
bubble (initials on a panel background) is fine if you don't have one.
