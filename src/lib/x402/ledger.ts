import {
  Address,
  FeeBumpTransaction,
  Networks,
  Transaction,
  TransactionBuilder,
  scValToNative,
  type rpc,
} from '@stellar/stellar-sdk';
import { USDC_TESTNET_ADDRESS } from '@x402/stellar';
import { amountToStroops, type Checkout } from '@/lib/payments/validation';

// Validate the exact SAC call locally, as well as at the facilitator. No arbitrary contracts.
export function transferAuthorization(envelope: string, checkout: Checkout) {
  const decoded = TransactionBuilder.fromXDR(envelope, Networks.TESTNET);
  const tx = decoded instanceof FeeBumpTransaction ? decoded.innerTransaction : decoded;
  if (!(tx instanceof Transaction) || tx.operations.length !== 1) throw new Error('payment_proof');
  const op = tx.operations[0];
  if (
    op.type !== 'invokeHostFunction' ||
    op.func.type !== 'hostFunctionTypeInvokeContract' ||
    op.auth?.length !== 1
  )
    throw new Error('payment_proof');
  const call = op.func.invokeContract;
  if (
    Address.fromScAddress(call.contractAddress).toString() !== USDC_TESTNET_ADDRESS ||
    call.functionName.toString() !== 'transfer'
  )
    throw new Error('payment_proof');
  const args = call.args.map(scValToNative);
  if (
    args.length !== 3 ||
    args[0] !== checkout.payer_address ||
    args[1] !== checkout.payout_address ||
    args[2] !== amountToStroops(checkout.amount)
  )
    throw new Error('payment_proof');
  const auth = op.auth[0];
  const credentials =
    auth.credentials.type === 'sorobanCredentialsAddress'
      ? auth.credentials.address
      : auth.credentials.type === 'sorobanCredentialsAddressV2'
        ? auth.credentials.addressV2
        : undefined;
  const invocation = auth.rootInvocation;
  if (
    !credentials ||
    Address.fromScAddress(credentials.address).toString() !== checkout.payer_address ||
    invocation.subInvocations.length !== 0 ||
    invocation.function.type !== 'sorobanAuthorizedFunctionTypeContractFn' ||
    invocation.function.contractFn.toXdr('base64') !== call.toXDR('base64')
  )
    throw new Error('payment_proof');
  return auth.toXDR('base64');
}
export function verifyAgentLedger(
  checkout: Checkout,
  signedPayload: string,
  result: rpc.Api.GetTransactionResponse,
) {
  if (result.status !== 'SUCCESS' || result.txHash !== checkout.transaction_hash)
    throw new Error('payment_proof');
  const code = result.resultXdr.result;
  if (
    code.type !== 'txSuccess' &&
    !(
      code.type === 'txFeeBumpInnerSuccess' &&
      code.innerResultPair.result.result.type === 'txSuccess'
    )
  )
    throw new Error('payment_proof');
  const closedAt = Number(result.createdAt);
  if (
    !Number.isSafeInteger(closedAt) ||
    closedAt <= 0 ||
    !Number.isSafeInteger(result.ledger) ||
    result.ledger <= 0 ||
    closedAt > Math.floor(Date.parse(checkout.expires_at) / 1000) ||
    closedAt < Math.floor(Date.parse(checkout.created_at) / 1000) - 30
  )
    throw new Error('payment_proof');
  const settled = result.envelopeXdr.toXDR('base64');
  const tx = TransactionBuilder.fromXDR(settled, Networks.TESTNET);
  if (
    Buffer.from(tx.hash()).toString('hex') !== result.txHash ||
    transferAuthorization(settled, checkout) !== transferAuthorization(signedPayload, checkout)
  )
    throw new Error('payment_proof');
  return { hash: result.txHash, ledger: result.ledger, closed_at: closedAt };
}
