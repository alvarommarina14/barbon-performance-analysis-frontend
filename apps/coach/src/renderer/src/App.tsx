import { useAuth } from './auth/AuthContext';
import { TitleBar } from './components/TitleBar';
import { NavProvider } from './nav';
import Shell from './Shell';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <TitleBar />
      <div className="app-content">
        {user === undefined ? (
          <main className="login">
            <p className="lede">Loading…</p>
          </main>
        ) : !user ? (
          <LoginScreen />
        ) : (
          <NavProvider>
            <Shell />
          </NavProvider>
        )}
      </div>
    </>
  );
}
