
import { redirect } from 'next/navigation';

/**
 * The root page of the application.
 * This is a Server Component that provides an immediate, clean redirect
 * to the primary content page of the application ('/discover').
 * The authentication check and further redirection are handled by the
 * layout of the target route, ensuring a single source of truth for routing logic.
 */
export default function RootPage() {
  redirect('/discover');
}
