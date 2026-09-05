import { useAuth } from './auth/AuthContext';
import { NavProvider } from './nav';
import Shell from './Shell';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <main className="login">
        <p className="lede">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}
