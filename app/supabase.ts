/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

function cleanEnvValue(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const publishableKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  if (!url || !publishableKey) {
    console.warn('Human Atlas: Supabase não configurado; o Atlas continuará disponível sem sincronização na nuvem.');
    client = null;
    return client;
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      throw new Error('Invalid protocol or hostname');
    }
  } catch {
    console.error('Human Atlas: VITE_SUPABASE_URL inválida. Confira a variável de ambiente no Cloudflare Pages. O Atlas será carregado sem login.');
    client = null;
    return client;
  }

  client = createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
