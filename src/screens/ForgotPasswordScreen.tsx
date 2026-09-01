import { useState, type FormEvent } from 'react';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function ForgotPasswordScreen() {
  const { navigate, goBack, forgotPassword } = useApp();
  const c = copy.forgotPassword;

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email) {
      setError(c.errors.missingFields);
      return;
    }
    if (!email.includes('@')) {
      setError(c.errors.invalidEmail);
      return;
    }

    setLoading(true);
    await forgotPassword(email);
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="screen">
      <ScreenHeader title="" onBack={goBack} />
      <div className="screen-body">
        <h1>{c.title}</h1>
        <p className="subtext">{c.subtext}</p>

        {sent ? (
          <p className="success-text">{c.checkEmail.replace('{email}', email)}</p>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <Field
              label={c.fields.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? copy.microcopy.loading : c.button}
            </button>
          </form>
        )}

        <button type="button" className="link-button" onClick={() => navigate('login')}>
          {c.backToLogin}
        </button>
      </div>
    </div>
  );
}
