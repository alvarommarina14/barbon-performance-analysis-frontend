import { useAuth } from './auth/AuthContext';
import ClientListScreen from './screens/ClientListScreen';
import LoginScreen from './screens/LoginScreen';

export default function App() {
  const { user } = useAuth();

  if (user === undefined) {
    return <main className="login"><p className="lede">Loading…</p></main>;
  }

  return user ? <ClientListScreen /> : <LoginScreen />;
}
