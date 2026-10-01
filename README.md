# PhoenixR3born

A compact personal collection for projects, recommendations, learning resources, external links and downloads.

## Run

Use Node 22.12 or newer.

```sh
npm ci
npm run dev
```

## Website

Production: https://phoenixr3born.vercel.app/

Owner Studio: https://phoenixr3born.vercel.app/studio

## Publish to Vercel

1. Create the GitHub repository `PHONIEXz/PhoenixR3born` and push this project.
2. In Vercel, import that repository. The Vite preset uses `npm run build` and `dist`.
3. Name the project `phoenixr3born`. If available, its production address will be `phoenixr3born.vercel.app`. Domain names are case insensitive. The exact address depends on availability in Vercel.
4. Public collection pages read published content from Sanity project `c5jww98i`, dataset `production`. Community pages use the Vercel Supabase integration values described below. Never commit a service-role key.
5. Add any other production or preview hostname to Sanity's allowed CORS origins before editing through that hostname. Allow credentials for Studio login. Local `http://localhost:5173` also needs to be allowed when editing locally.

## Upload and manage content

Open `/studio`, sign in using the Sanity account that owns the project, and create a **Collection item**. Visitors can browse without logging in. Only authorized project members can edit.

Add a title, generate its slug, select a category and write a short introduction. For projects, choose **In progress** or **Completed**. Completion status is separate from publishing. Add the project website for a **Visit website** button, and its GitHub repository for source code or setup instructions. The three starting projects are marked In progress until the owner confirms completion. Add your explanation, a destination link, a cover image, any downloadable files, or a combination of these. Publish to show it publicly. Drafts stay private. Published files are public. Unpublishing an item removes its page from the collection but does not revoke the underlying public asset URL. Delete the asset separately if you need it removed.

The file picker is not restricted to a specific extension. Provider file size and account quotas still apply. For large videos, apps or archives, upload them to a hosting service and add a link here. This site redirects to external destinations; it does not execute uploaded files. Content updates do not require rebuilding Vercel.

To change your introduction or design, edit `src/main.jsx` or `src/style.css`. To add categories, update both the public categories in `main.jsx` and the Studio list in `studio.jsx`.

## Checks

```sh
npm test
npm run build
npm audit --audit-level=high
npm run preview
```

Confirm the collection loads, category/search controls work, item routes open directly, file downloads work, and `/studio` displays its login screen. No write tokens are included in the source. Never put a Sanity write token in a `VITE_` environment variable.

## Security

See SECURITY.md. Fonts are bundled locally, the public site has no anonymous write endpoints, and published content is validated before rendering. Targeted dependency overrides keep Sanity CLI transitive adm-zip, js-yaml and uuid on patched releases; check these overrides when upgrading Sanity. Weekly Dependabot updates and build/audit checks help maintain the baseline.

## Community sharing

The community area is available at `/community`. Visitors can browse approved resources. Contributors sign in at `/account`, create a public profile, and submit a project, textbook, link, or supported file at `/submit`. New submissions stay pending until moderation approves them. Project cards show **Completed** or **In progress**, and approved contributors have public pages at `/u/username`.

The Vercel Supabase integration supplies `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the deployment. The app also accepts `VITE_SUPABASE_ANON_KEY` on older projects. Run `supabase/migrations/202609300001_community.sql` once in the Supabase SQL Editor, then `supabase/migrations/202609300002_community_hardening.sql` and `supabase/migrations/202610010001_moderator_bootstrap.sql`. If the private bucket needs repair, `supabase/storage-bucket.sql` is safe to rerun. The migrations enable Row Level Security, keep email addresses in Supabase Auth, limit uploads to a private bucket, and issue short-lived download URLs only for approved resources.

Set the Supabase Auth Site URL to `https://phoenixr3born.vercel.app` and allow `https://phoenixr3born.vercel.app/account` as a redirect URL. To test locally, also allow `http://127.0.0.1:5173/account`. Sign in with the intended owner account, then copy its User UID from Authentication > Users and run the moderator insert shown in `202610010001_moderator_bootstrap.sql`. Check existing moderator IDs before inviting contributors. Signing in alone does not grant moderation.

A resource must state a sharing license. Public sharing is separate from licensing the repository itself. Contributors remain responsible for having permission to share what they upload.
