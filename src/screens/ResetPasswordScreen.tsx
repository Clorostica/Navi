import { useState, type FormEvent } from 'react';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';

export default function ResetPasswordScreen() {
  const { navigate, resetPasswordWithToken } = useApp();
  const c = copy.resetPassword;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError(c.errors.missingFields);
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
    const result = await resetPasswordWithToken(password);
    setLoading(false);

    if (result.status === 'error') {
      setError(result.error ?? c.errors.generic);
      return;
    }
    setDone(true);
  };

  return (
    <div className="screen">
      <ScreenHeader title="" />
      <div className="screen-body">
        <h1>{c.title}</h1>
        <p className="subtext">{c.subtext}</p>

        {done ? (
          <>
            <p className="success-text">{c.success}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('login')}>
              {c.goToLogin}
            </button>
          </>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
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

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? copy.microcopy.loading : c.button}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
