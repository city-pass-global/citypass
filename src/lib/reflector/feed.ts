import 'server-only';
import { PulseClient } from '@reflector/contract-client';
import { Networks, StrKey } from '@stellar/stellar-sdk';
import { interpretEuroFeed, type EuroFeed } from './quote';

// Testnet fiat Pulse feed. Confirmed on 2026-10-26: base USD, EUR listed, 14 decimals, 300-second resolution.
const FX_CONTRACT = 'CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W';
const RPC_URL = 'https://soroban-testnet.stellar.org';
// Published testnet account. It only sources the unsigned simulation.
const SIMULATION_SOURCE = 'GB5YIP5CO7573MYUDX4EMWZMPXY5L4NORJIDRB3O6FYT3PYT5V4XBTHK';

let cached: { until: number; value: EuroFeed | null } | null = null;
let pending: Promise<EuroFeed | null> | null = null;

function sourceAccount() {
  const configured = process.env.REFLECTOR_PUBLIC_KEY;
  if (configured && StrKey.isValidEd25519PublicKey(configured)) return configured;
  return SIMULATION_SOURCE;
}

async function loadEuroFeed(now: number): Promise<EuroFeed | null> {
  const client = new PulseClient({
    publicKey: sourceAccount(),
    rpcUrl: RPC_URL,
    contractId: FX_CONTRACT,
    networkPassphrase: Networks.TESTNET,
  });
  const [base, assets, decimals, resolution, price, expires] = await Promise.all([
    client.base(),
    client.assets(),
    client.decimals(),
    client.resolution(),
    client.lastPrice('EUR'),
    client.expires('EUR'),
  ]);
  return interpretEuroFeed(
    {
      base,
      assets,
      decimals,
      resolution,
      price: price ?? undefined,
      expires,
    },
    now,
  );
}

export function euroFeed(now = Math.floor(Date.now() / 1000)): Promise<EuroFeed | null> {
  const clock = Date.now();
  if (cached && cached.until > clock) return Promise.resolve(cached.value);
  if (!pending) {
    pending = loadEuroFeed(now)
      .then((value) => {
        cached = { until: Date.now() + (value ? 60_000 : 15_000), value };
        return value;
      })
      .catch(() => {
        cached = { until: Date.now() + 15_000, value: null };
        return null;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
