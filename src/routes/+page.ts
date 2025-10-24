/**
 * @file src/routes/+page.ts
 * @description This configuration file for the root page ('/') sets the `prerender` option to `true`.
 * This is a crucial setting for the client-side redirect strategy. By enabling prerendering for this
 * specific page, SvelteKit is instructed to generate a static `index.html` file at the root of the
 * built site. When a user navigates to the site's root URL, this static HTML is served immediately,
 * allowing the client-side JavaScript in `+page.svelte` to execute and perform the language-based
 * redirect without needing a server-side round trip.
 */
export const prerender = true;
