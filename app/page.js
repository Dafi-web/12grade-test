import { redirect } from 'next/navigation';

export default function Page() {
  // Avoid iframe on mobile devices (especially Samsung/Android),
  // because nested scroll containers can become unresponsive.
  redirect('/index.html');
}

