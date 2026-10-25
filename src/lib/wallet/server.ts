import 'server-only';
import { pollarConfig } from './config';
export function walletConfiguration() {
  return pollarConfig(
    process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY ?? process.env.POLLAR_PUSHABLE_KEY,
  );
}
export function bridgeSecret() {
  const value = process.env.POLLAR_SESSION_BRIDGE_KEY;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) throw new Error('not_configured');
  return value;
}
export function pollarConfigured() {
  const config = walletConfiguration();
  return Boolean(
    config &&
    process.env.POLLAR_SECRET_KEY?.startsWith(`sec_${config.network}_`) &&
    /^[a-f0-9]{64}$/.test(process.env.POLLAR_SESSION_BRIDGE_KEY ?? ''),
  );
}
