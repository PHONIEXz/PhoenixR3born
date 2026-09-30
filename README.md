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
4. No environment variables or API keys are required. Public pages read published content from the dedicated public Sanity project `c5jww98i`, dataset `production`.
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
