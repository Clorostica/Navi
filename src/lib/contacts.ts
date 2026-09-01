import { apiAddContact, apiDeleteContact, apiFetchContacts } from './api';
import type { TrustedContact } from '../types';

export async function fetchContacts(): Promise<TrustedContact[]> {
  return apiFetchContacts();
}

export async function addContact(input: { name: string; email: string }) {
  return apiAddContact(input);
}

export async function removeContact(id: string): Promise<boolean> {
  return apiDeleteContact(id);
}
