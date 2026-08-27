import { useState, type FormEvent } from 'react';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function SignUpScreen() {
  const { navigate, goBack, signUp } = useApp();
  const c = copy.signup;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError(c.errors.missingFields);
      return;
    }
    if (!email.includes('@')) {
      setError(c.errors.invalidEmail);
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setError(c.errors.weakPassword);
      return;
    }
    if (password !== confirmPassword) {
      setError(c.errors.passwordMismatch);
      return;
    }

    setLoading(true);
    const result = await signUp(name, email, password);
    setLoading(false);

    if (result.status === 'error') {
      setError(result.error);
      return;
    }
    if (result.status === 'checkEmail') {
      setCheckEmail(true);
    }
    // status === 'signedIn' navigates to home automatically via context
  };

  return (
    <div className="screen">
      <ScreenHeader title="" onBack={goBack} />
      <div className="screen-body">
        <h1>{c.welcomeText}</h1>
        <p className="subtext">{c.subtext}</p>

        {checkEmail ? (
          <p className="success-text">{c.checkEmail.replace('{email}', email)}</p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <Field label={c.fields.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
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
              autoComplete="new-password"
            />
            <p className="helper-text">{c.passwordGuidance}</p>
            <Field
              label={c.fields.confirmPassword}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

            {error && <p className="error-text">{error}</p>}

            <p className="legal-text">{c.termsText}</p>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? copy.microcopy.loading : c.button}
            </button>
          </form>
        )}

        <button type="button" className="link-button" onClick={() => navigate('login')}>
          Already have an account? Log in
        </button>
      </div>
    </div>
  );
}
