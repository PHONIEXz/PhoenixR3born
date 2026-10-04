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

The community area is available at `/community`. Visitors can browse approved resources. Contributors create an account at `/signup`, confirm the email link, and log in at `/login`. Existing passwordless accounts may continue using an email link from `/login`. Password recovery is at `/forgot-password`. Use the **Upload** button in the navigation or **Upload or add a resource** in Your space. Contributors create a public profile at `/account` and submit a project, textbook, link, or file at `/submit`. Resources default to **Private**, visible only to their uploader. Choosing **Public** requests moderation; visitors can see and download a resource only after approval. Owners can request public sharing or make a resource private again from `/account`. Changing visibility clears any earlier approval. Private resources are also hidden from moderators. Project cards show **Completed** or **In progress**, and approved contributors have public pages at `/u/username`.

The Vercel Supabase integration supplies `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the deployment. The app also accepts `VITE_SUPABASE_ANON_KEY` on older projects. Apply the numbered migrations in `supabase/migrations/` in order. For an existing P3 project, apply missing migrations in order, including `202610040001_private_spaces.sql`, **before deploying the matching frontend**. This migration makes existing community submissions private, adds sharing controls and quota reporting, and fixes the recursive Storage upload policy. If the private bucket needs repair, `supabase/storage-bucket.sql` can be rerun. The migrations enable Row Level Security, keep email addresses in Supabase Auth, cap uploads at 20 MB per file, 100 MB total and 25 stored objects per user, and issue 60-second download URLs only for the uploader or approved public resources (and moderators reviewing a public submission). Storage is a cloud service, not Vercel's deployment filesystem. File retention still depends on the provider account, quota, and backups; do not promise indefinite retention without an independent backup plan.

Set the Supabase Auth Site URL to `https://phoenixr3born.vercel.app`. Allow `/account` and `/reset-password` on the production origin as exact redirect URLs. For local testing, allow the same paths on `http://127.0.0.1:5173`. Keep **Confirm email** enabled in Auth Providers. Set a server-side minimum password length of at least 12 characters and enable leaked password protection if available on the plan. Supabase's default email sender only sends to members of the project's Supabase organization and allows two messages per hour. Configure custom SMTP or a Send Email hook before public sign-up can actually reach arbitrary users. Sign in with the intended owner account, then copy its User UID from Authentication > Users and run the moderator insert shown in `202610010001_moderator_bootstrap.sql`. Signing in alone does not grant moderation.

Files of any extension are stored in the private `community` bucket with `application/octet-stream`, and available to the uploader immediately. Public downloads require approval. The uploader can delete their resource, including its file, from `/account`. Signed download URLs already issued may remain usable briefly. Deletion is permanent through the Storage API and is not an archival or recovery mechanism. A Storage deletion followed by a failed database deletion leaves a listing that the uploader can retry removing.

A resource must state a sharing license. Public sharing is separate from licensing the repository itself. Contributors remain responsible for having permission to share what they upload.

The home collection includes approved public resources from the owner profile `phoenixr3born`. Moving old Sanity projects into the owner account requires verified ownership in Supabase and unpublishing the old Sanity documents; hiding frontend cards alone does not make public CMS content private. Custom SMTP remains required for reliable verification email delivery to arbitrary users.

To prepare the owner transfer, export the normalized legacy collection to a local JSON file, set `P3_OWNER_EMAIL` to the verified owner email, and run `node scripts/prepare-owner-import.mjs source.json /tmp/owner-import.sql`. Apply the generated SQL in the Supabase SQL Editor after the private-spaces migration. It checks the exact verified Auth account and inserts private resources without replacing existing user-managed rows. Do not commit the generated SQL or source export. Unpublish the corresponding Sanity documents separately to remove their public API copies.

Known upstream audit limitation: the current `braces` release (3.0.3), used by Sanity CLI's code-generation tools, is flagged by GHSA-vfj7-8cjw-p6xm. `npm audit` reports eight high-severity entries along that dependency chain; `npm audit fix` currently leaves them unresolved. The public UI does not expose code-generation glob inputs. Recheck for an upstream fix before treating the dependency audit as clear.
