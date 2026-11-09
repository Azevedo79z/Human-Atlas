import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

type Props = { onUserChange: (user: User | null) => void };

export default function AuthPanel({ onUserChange }: Props) {
  const supabase = getSupabaseClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) { onUserChange(null); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      onUserChange(data.session?.user ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      onUserChange(next?.user ?? null);
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [supabase, onUserChange]);

  const sendLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    setMessage(error ? 'Não foi possível enviar o e-mail. Confira o endereço e tente novamente.' : 'Link enviado! Abra seu e-mail para entrar no Atlas.');
  };

  const signOut = async () => {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error ? 'Não foi possível encerrar a sessão.' : 'Sessão encerrada.');
  };

  return <div className="atlas-auth">
    <button type="button" className="atlas-auth-trigger" onClick={() => setOpen(v => !v)}>{session?.user.email ? 'Conta' : 'Entrar'}</button>
    {open && <section className="atlas-auth-popover" aria-label="Acesso do estudante">
      <div className="atlas-auth-heading"><strong>Área do estudante</strong><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}>×</button></div>
      {!supabase ? <p>O acesso será habilitado quando as variáveis públicas do Supabase forem configuradas na hospedagem.</p>
        : session?.user ? <>
          <p>Sessão ativa para <strong>{session.user.email}</strong>.</p>
          <button type="button" disabled={busy} onClick={signOut}>{busy ? 'Aguarde…' : 'Sair da conta'}</button>
        </> : <form onSubmit={sendLink}>
          <label htmlFor="atlas-student-email">E-mail do estudante</label>
          <input id="atlas-student-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="estudante@exemplo.com"/>
          <button type="submit" disabled={busy || !email.trim()}>{busy ? 'Enviando…' : 'Enviar link de acesso'}</button>
          <small>Você receberá um link de confirmação por e-mail. Não precisa criar senha.</small>
        </form>}
      {message && <p role="status">{message}</p>}
    </section>}
  </div>;
}
