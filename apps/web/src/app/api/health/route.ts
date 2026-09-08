import { NextResponse } from 'next/server';
import { getConstitution } from '@/lib/coco/constitution';
import { loadKeys, signMessage, verifySignature } from '@coco/security';

export async function GET() {
  let constitutionOk = false;
  let laws = 0;
  try {
    const c = getConstitution();
    constitutionOk = true;
    laws = c.laws.laws.length;
  } catch {
    constitutionOk = false;
  }

  let keysOk = false;
  let cryptoOk = false;
  try {
    const { publicKey, privateKey } = loadKeys();
    keysOk = publicKey.length === 32 && privateKey.length === 32;

    const msg = 'health-check-' + Date.now();
    const sig = await signMessage(msg);
    cryptoOk = await verifySignature(msg, sig);
  } catch {
    keysOk = false;
    cryptoOk = false;
  }

  return NextResponse.json({
    status: 'ok',
    service: 'coco-web',
    version: '0.1.0',
    phase: 3,
    checks: {
      constitution_loaded: constitutionOk,
      laws_count: laws,
      ed25519_keys_loaded: keysOk,
      crypto_sign_verify: cryptoOk,
    },
    timestamp: new Date().toISOString(),
  });
}
