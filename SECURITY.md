# Security architecture

Public pages are static Vite assets on Vercel. The personal collection queries only published content. The community area uses a publishable Supabase key for approved reads and signed-in writes. No administrator credentials or API write tokens are shipped to the browser.

Editing and file uploads use Sanity Studio. Sanity's API enforces project membership independently of the frontend. Hiding the Studio URL is not an access control. Use a strong password and two-factor authentication on the GitHub/Google account used to sign in. Keep project membership limited to editors you trust.

All published content and uploaded assets in the public dataset are public. Draft documents require authorized access. Assets themselves are public even before publication or after unpublishing an item. Never upload private files. Removing a page does not remove the asset.

Content is rendered as React text, with no raw HTML or arbitrary script execution. Destination URLs must use HTTPS and cannot include credentials. Public image/file URLs must belong to this project's Sanity asset CDN paths. File downloads use attachment links on Sanity's separate origin. Uploaded HTML/SVG/archive files are not hosted as executable pages under this site's origin.

Response headers enforce an allowlist Content Security Policy, block framing and object embeds, require HTTPS, prevent MIME sniffing, limit referrer disclosure, and disable unused device permissions. Inline styles remain allowed because Sanity Studio uses styled components. Inline scripts and eval are not allowed. Fonts are bundled locally. Public pages do not load marketing scripts or a remote font service.

Dependency versions are pinned by the npm lockfile. GitHub checks build changes and audit high severity advisories. Dependabot proposes updates; review and deploy them. Audits find known advisories, not every possible vulnerability.

Vercel provides platform DDoS mitigation. This application has no custom login or anonymous upload endpoint. Sanity is responsible for its own authentication, authorization, API limits and asset delivery. Supabase Auth and Postgres RLS protect community identities, submissions and private files.

No architecture guarantees that a site cannot be breached. Account compromise, malicious authorized edits, future dependency flaws and provider incidents remain possible. This work is hardening and functional verification, not an independent penetration test.

## Community security model

- Supabase Auth holds account email addresses. Public profiles expose only the chosen username, display name, and bio.
- Moderators are assigned by the project owner to a known Supabase Auth User UID in the SQL Editor. No visitor can grant themselves moderation by signing in.
- Profiles and submissions use Postgres Row Level Security. A contributor can create only their own profile and pending submissions. Moderation rows are private and can only be changed through the moderator policy.
- Community files live in a private Storage bucket. The client never receives a service role key. Approved downloads use short-lived signed URLs. Uploads are limited by type, size, path, and daily submission count.
- Submissions are reviewed before publication, but moderation is not malware scanning. Review files before opening them, and do not upload private or unlawful material.
- No security design can promise an unbreachable system. Keep the provider, dependencies, redirect URLs, and deployment settings maintained.
