# Security architecture

Public pages are static Vite assets on Vercel. They query only published public content. No application server accepts anonymous writes and no administrator credentials or API write tokens are shipped to the browser.

Editing and file uploads use Sanity Studio. Sanity's API enforces project membership independently of the frontend. Hiding the Studio URL is not an access control. Use a strong password and two-factor authentication on the GitHub/Google account used to sign in. Keep project membership limited to editors you trust.

All published content and uploaded assets in the public dataset are public. Draft documents require authorized access. Assets themselves are public even before publication or after unpublishing an item. Never upload private files. Removing a page does not remove the asset.

Content is rendered as React text, with no raw HTML or arbitrary script execution. Destination URLs must use HTTPS and cannot include credentials. Public image/file URLs must belong to this project's Sanity asset CDN paths. File downloads use attachment links on Sanity's separate origin. Uploaded HTML/SVG/archive files are not hosted as executable pages under this site's origin.

Response headers enforce an allowlist Content Security Policy, block framing and object embeds, require HTTPS, prevent MIME sniffing, limit referrer disclosure, and disable unused device permissions. Inline styles remain allowed because Sanity Studio uses styled components. Inline scripts and eval are not allowed. Fonts are bundled locally. Public pages do not load marketing scripts or a remote font service.

Dependency versions are pinned by the npm lockfile. GitHub checks build changes and audit high severity advisories. Dependabot proposes updates; review and deploy them. Audits find known advisories, not every possible vulnerability.

Vercel provides platform DDoS mitigation. This application has no custom login or public upload endpoint to protect with an app rate limiter. Sanity is responsible for its own authentication, authorization, API limits and asset delivery.

No architecture guarantees that a site cannot be breached. Account compromise, malicious authorized edits, future dependency flaws and provider incidents remain possible. This work is hardening and functional verification, not an independent penetration test.
