import { useState } from 'react';
import { copy } from '../content/copy';
import { useApp } from '../state/AppContext';
import { useTheme } from '../state/ThemeContext';

export default function ProfileScreen() {
  const { user, logOut, navigate } = useApp();
  const { theme, setTheme } = useTheme();
  const c = copy.profile;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="screen">
      <div className="screen-body">
        <h1>{c.title}</h1>
        {user && (
          <div className="profile-summary">
            <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="profile-name">{user.name}</div>
              <div className="profile-email">{user.email}</div>
            </div>
          </div>
        )}

        <div className="menu-section-label">{c.appearance.title}</div>
        <div className="theme-toggle">
          <button
            type="button"
            className={`theme-toggle-option ${theme === 'dark' ? 'active' : ''}`}
            aria-pressed={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            {c.appearance.dark}
          </button>
          <button
            type="button"
            className={`theme-toggle-option ${theme === 'light' ? 'active' : ''}`}
            aria-pressed={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            {c.appearance.light}
          </button>
          <button
            type="button"
            className={`theme-toggle-option ${theme === 'halloween' ? 'active' : ''}`}
            aria-pressed={theme === 'halloween'}
            onClick={() => setTheme('halloween')}
          >
            {c.appearance.halloween}
          </button>
        </div>

        <div className="menu-list">
          <button type="button" className="menu-item">
            {c.personalDetails}
          </button>
          <button type="button" className="menu-item">
            {c.privacy}
          </button>
          <button type="button" className="menu-item" onClick={() => navigate('myReports')}>
            {c.myReports}
          </button>
          <button type="button" className="menu-item" onClick={() => navigate('contacts')}>
            {c.trustedContacts}
          </button>
          <button type="button" className="menu-item" onClick={logOut}>
            {c.logout}
          </button>

          {!confirmingDelete ? (
            <button type="button" className="menu-item danger" onClick={() => setConfirmingDelete(true)}>
              {c.deleteAccount}
            </button>
          ) : (
            <div className="card tone-high">
              <p>{c.deleteAccountConfirm}</p>
              <button type="button" className="btn btn-danger" onClick={logOut}>
                {c.deleteAccount}
              </button>
              <button type="button" className="link-button" onClick={() => setConfirmingDelete(false)}>
                {copy.microcopy.cancel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
