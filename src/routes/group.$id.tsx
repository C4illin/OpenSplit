import { createFileRoute, redirect } from '@tanstack/react-router';
import { pb } from '../lib/pocketbase';

export const Route = createFileRoute('/group/$id')({
  beforeLoad: () => {
    if (!pb.authStore.isValid) {
      throw redirect({ to: '/' });
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/group/$id"!</div>
}
