import { useState, type FormEvent } from 'react';
import Field from '../components/Field';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function LoginScreen() {
  const { navigate, goBack, signIn, signInWithGoogle, googleAuthError } = useApp();
  const c = copy.login;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(googleAuthError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(c.errors.missingFields);
      return;
    }

    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);

    if (result.status === 'error') {
      setError(result.error);
    }
    // status === 'signedIn' navigates to home automatically via context
  };

  return (
    <div className="screen">
      <ScreenHeader title="" onBack={goBack} />
      <div className="screen-body">
        <h1>{c.welcomeBack}</h1>
        <p className="subtext">{c.subtext}</p>

        <form className="form" onSubmit={handleSubmit}>
          <Field
            label={c.fields.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Field
            label={c.fields.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="error-text">{error}</p>}

          <button type="button" className="link-button align-end" onClick={() => navigate('forgotPassword')}>
            {c.forgotPassword}
          </button>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? copy.microcopy.loading : c.button}
          </button>
        </form>

        <div className="divider">{copy.microcopy.orDivider}</div>
        <GoogleSignInButton onClick={signInWithGoogle} />

        <button type="button" className="link-button" onClick={() => navigate('signup')}>
          New to Navi? Create an account
        </button>
      </div>
    </div>
  );
}
