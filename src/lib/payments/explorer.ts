import { z } from 'zod';

// Explorer URLs are derived from validated network data, never a provider-supplied URL.
export function transactionExplorerUrl(network: 'testnet', hash: string): string {
  z.literal('testnet').parse(network);
  z.string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(hash);
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

export function ledgerExplorerUrl(network: 'testnet', ledger: number): string {
  z.literal('testnet').parse(network);
  z.number().int().positive().safe().parse(ledger);
  return `https://stellar.expert/explorer/${network}/ledger/${ledger}`;
}
