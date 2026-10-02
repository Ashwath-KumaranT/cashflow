/**
 * Absolute base URL for links Supabase emails back to the user.
 * window.location.origin would bake localhost into emails requested from a dev
 * server, so an explicit VITE_SITE_URL takes precedence when configured.
 */
export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined
  return configured?.trim().replace(/\/+$/, '') || window.location.origin
}
