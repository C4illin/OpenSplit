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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Welcome to OpenSplit!</h1>
        <p className="text-lg text-gray-700">
          This is the main application page. Use the navigation to explore different groups and manage your expenses.
        </p>
        {/* register with google */}
        {!isAuthenticated ? (
          <button
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={handleLogin}
          >
            Sign in with Google
          </button>
        ) : (
          <div className="mt-6">
            <p className="text-green-600">You are logged in as {user?.displayName} ({user?.email})</p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              onClick={logout}
            >
              Logout
            </button>
            <button>
              <a href="/overview" className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Go to Overview</a>
            </button>
          </div>
        )}
      </div>
    </div >
  )
}