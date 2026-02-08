
import { redirect } from 'next/navigation';

/**
 * This is the root page of the application.
 * It immediately redirects to the /discover page, which then handles auth checks.
 */
export default function RootPage() {
  redirect('/discover');
}
