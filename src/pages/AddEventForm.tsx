import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, FolderPlus } from 'lucide-react';
import { api } from '../api';
import { isEventPhoto, prepareEventPhotos } from '../lib/event-photos';
import type { ClubEvent } from '../types';

type Session = { email: string; csrf: string };
export default function AddEventForm({ onPublished, onBusy }: { onPublished: (event: ClubEvent) => void; onBusy: (busy: boolean) => void }) {
  const [session, setSession] = useState<Session | null>(null), [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState('');
  const [files, setFiles] = useState<File[]>([]), [skipped, setSkipped] = useState(0);
  const id = useRef(crypto.randomUUID());
  useEffect(() => { const abort = new AbortController(); api<Session>('/admin/session', { signal: abort.signal }).then(setSession).catch(() => {}).finally(() => { if (!abort.signal.aborted) setChecking(false); }); return () => abort.abort(); }, []);
  function working(value: boolean) { setBusy(value); onBusy(value); }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); working(true); setError('');
    const fields = new FormData(event.currentTarget);
    try { setSession(await api<Session>('/admin/login', { method: 'POST', body: JSON.stringify({ email: fields.get('email'), password: fields.get('password') }) })); }
    catch (error) { setError((error as Error).message); } finally { working(false); }
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!session || busy) return;
    const fields = new FormData(event.currentTarget); working(true); setError('');
    try {
      const photos = await prepareEventPhotos(files, setProgress);
      const details = { title: String(fields.get('title')).trim(), description: String(fields.get('description')).trim(), startsAt: new Date(String(fields.get('startsAt'))).toISOString(), endsAt: '',
        category: String(fields.get('category')).trim(), location: String(fields.get('location')).trim(), albumUrl: String(fields.get('albumUrl') || '').trim(), registrationUrl: String(fields.get('registrationUrl') || '').trim(), published: true };
      setProgress('Publishing event and placing its station…');
      const saved = await api<ClubEvent>(`/admin/experience-events/${id.current}`, { method: 'PUT', headers: { 'X-CSRF-Token': session.csrf }, body: JSON.stringify({ event: details, photos }) });
      onPublished(saved);
    } catch (error) {
      const message = (error as Error).message; setError(message);
      if (/sign in|session/i.test(message)) setSession(null);
    } finally { working(false); setProgress(''); }
  }
  function choose(list: FileList | null) {
    const all = Array.from(list ?? []), photos = all.filter(isEventPhoto).sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name));
    setFiles(photos); setSkipped(all.length - photos.length); setError(photos.length > 20 ? 'Choose a folder with up to 20 photos, or select individual photos.' : '');
  }
  return <>
    <span className="nx-event-category">A new stop on the journey</span><h2>Add Event</h2>
    <p>Publish an event for everyone. Add an album link, upload photos, or publish with just the details. A station will be placed in a clear space along the track.</p>
    {checking && <p role="status">Checking admin access…</p>}
    {!checking && !session && <form className="nx-event-form" onSubmit={login}>
      <p>Sign in with your Nucleus administrator account.</p>
      <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
      <button className="nx-continue" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={16} /></button>
    </form>}
    <form className="nx-event-form" onSubmit={publish} hidden={!session}>
      <label>Event title<input name="title" required minLength={2} maxLength={120} placeholder="Give this connection a name" /></label>
      <label>Event details<textarea name="description" required minLength={20} maxLength={1600} rows={5} placeholder="Paste the event story, highlights and details…" /></label>
      <label>Date and time (your local timezone)<input name="startsAt" type="datetime-local" required /></label>
      <label>Location<input name="location" required minLength={2} maxLength={200} placeholder="Venue or online" /></label>
      <label>Category<input name="category" required minLength={2} maxLength={60} placeholder="Workshop, community, hackathon…" /></label>
      <label>Photo album link (Google Drive or any share URL)<input name="albumUrl" type="url" placeholder="https://drive.google.com/…" /><small>Optional. Use a share link your visitors can open.</small></label>
      <label>Registration link<input name="registrationUrl" type="url" placeholder="https://…" /><small>Optional. Link to the event registration form.</small></label>
      <fieldset disabled={busy}><legend><FolderPlus size={16} /> Photos (optional)</legend>
        <label>Upload a folder<input type="file" aria-label="Upload a photo folder" ref={element => { element?.setAttribute('webkitdirectory', ''); }} multiple onChange={event => choose(event.currentTarget.files)} /></label>
        <label>Or select photos<input type="file" aria-label="Select event photos" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={event => choose(event.currentTarget.files)} /></label>
        <small>Up to 20 photos, 12 MB each. JPG, PNG, WebP or AVIF. Photos are resized for the gallery.</small>
        {!!files.length && <p>{files.length} photo{files.length === 1 ? '' : 's'} selected <button className="nx-text-button" type="button" onClick={() => setFiles([])}>Clear</button></p>}
        {!!skipped && <small>{skipped} unsupported file{skipped === 1 ? '' : 's'} skipped.</small>}
      </fieldset>
      <button className="nx-continue" disabled={busy || files.length > 20}>{busy ? 'Publishing…' : 'Publish event & add station'}<ArrowRight size={16} /></button>
    </form>
    {progress && <p className="nx-form-status" role="status">{progress}</p>}{error && <p className="nx-form-error" role="alert">{error}</p>}
  </>;
}
