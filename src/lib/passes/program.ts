import { StrKey } from '@stellar/stellar-sdk';
import { z } from 'zod';
// Public recipient explicitly provided by the project owner. Never accepted from a form.
export const CITYPASS_TREASURY = z
  .string()
  .refine(StrKey.isValidEd25519PublicKey)
  .parse('GC6RIEORZ5UF7L2KKXCZLSGMSIYY5NG6FXCKR3J5P7ZYIXSMXLX2QJKU');
