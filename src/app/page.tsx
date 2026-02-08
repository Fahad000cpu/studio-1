import { redirect } from 'next/navigation';

/**
 * The root page of the application, acting as a "gatekeeper" for routing.
 * This server component performs a single, definitive server-side redirect
 * to the main app content. The layout for that content is then responsible
 * for handling authentication checks.
 */
export default function RootPage() {
  // Immediately redirect to the primary user-facing page.
  // The layout of the destination page (/discover) will handle auth checks.
  redirect('/discover');
}
