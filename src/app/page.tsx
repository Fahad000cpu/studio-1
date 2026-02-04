import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to the discover page, which is the main entry point for authenticated users.
  // The (main) layout will handle redirecting to /login if the user is not authenticated.
  redirect('/discover');
}
