import { useAuth } from "../hooks/useAuth";

export const App = () => {
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
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-bold text-gray-800">Welcome to OpenSplit!</h1>
        <p className="text-lg text-gray-700">
          This is the main application page. Use the navigation to explore different groups and manage your expenses.
        </p>
        {/* register with google */}
        {!isAuthenticated ? (
          <button
            className="
              mt-6 rounded-sm bg-blue-600 px-4 py-2 text-white transition
              hover:bg-blue-700
            "
            onClick={handleLogin}
          >
            Sign in with Google
          </button>
        ) : (
          <div className="mt-6">
            <p className="text-green-600">You are logged in as {user?.displayName} ({user?.email})</p>
            <button
              className="
                mt-4 rounded-sm bg-red-600 px-4 py-2 text-white transition
                hover:bg-red-700
              "
              onClick={logout}
            >
              Logout
            </button>
            <button>
              <a href="/overview" className="
                mt-4 rounded-sm bg-green-600 px-4 py-2 text-white transition
                hover:bg-green-700
              ">Go to Overview</a>
            </button>
          </div>
        )}
      </div>
    </div >
  )
}