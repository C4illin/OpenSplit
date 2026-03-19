import { Button } from '@/components/ui/button';
import { Wrapper } from '@/components/Wrapper';
import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from "../hooks/useAuth";

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user, isAuthenticated, loginWithGoogle, logout } = useAuth();

  // if isAuthenticated redirect to /overview
  // if (isAuthenticated) {
  //   redirect({ to: '/overview' });
  //   return null;
  // }

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <Wrapper className='
      flex min-h-screen flex-col items-center justify-center gap-5
    '>
      <h1 className='mb-5 text-7xl font-black'>OpenSplit</h1>
      <Button onClick={handleLogin} disabled={isAuthenticated} size="lg" className=''>
        Sign in with Google
      </Button>
      {isAuthenticated && (
        <>
          <p>You are logged in as {user?.displayName} ({user?.email})</p>
          <Button onClick={logout}>Logout</Button>
          <Button>
            <a href="/overview">Go to Overview</a>
          </Button>
        </>
      )}
    </Wrapper>
  )
}