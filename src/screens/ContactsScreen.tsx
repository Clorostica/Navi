import { useEffect, useState, type FormEvent } from 'react';
import Field from '../components/Field';
import ScreenHeader from '../components/ScreenHeader';
import { copy } from '../content/copy';
import { addContact, fetchContacts, removeContact } from '../lib/contacts';
import { useApp } from '../state/AppContext';
import type { TrustedContact } from '../types';

const MAX_CONTACTS = 3;

export default function ContactsScreen() {
  const { goBack } = useApp();
  const c = copy.contacts;

  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchContacts().then((fetched) => {
      if (!cancelled) {
        setContacts(fetched);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (contacts.length >= MAX_CONTACTS) {
      setError(c.errors.maxReached);
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError(c.errors.missingFields);
      return;
    }
    if (!email.includes('@')) {
      setError(c.errors.invalidEmail);
      return;
    }

    setSubmitting(true);
    const { contact, error: addError } = await addContact({ name: name.trim(), email: email.trim() });
    setSubmitting(false);

    if (addError || !contact) {
      setError(addError ?? c.errors.generic);
      return;
    }

    setContacts((prev) => [...prev, contact]);
    setName('');
    setEmail('');
  };

  const handleRemove = async (id: string) => {
    const ok = await removeContact(id);
    if (ok) setContacts((prev) => prev.filter((contact) => contact.id !== id));
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.subtitle}</p>

        {!loading && contacts.length === 0 && <p className="empty-state">{c.emptyState}</p>}

        {contacts.length > 0 && (
          <div className="contact-list">
            {contacts.map((contact) => (
              <div key={contact.id} className="contact-row">
                <div>
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-email">{contact.email}</div>
                </div>
                <button type="button" className="link-button" onClick={() => handleRemove(contact.id)}>
                  {c.remove}
                </button>
              </div>
            ))}
          </div>
        )}

        {contacts.length >= MAX_CONTACTS ? (
          <p className="subtext">{c.maxReachedNotice}</p>
        ) : (
          <form className="form" onSubmit={handleAdd}>
            <Field label={c.fields.name} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Field label={c.fields.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? copy.microcopy.loading : c.addButton}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
