import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'secrets');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const privatePath = resolve(OUT_DIR, 'ed25519_private.pem');
const publicPath = resolve(OUT_DIR, 'ed25519_public.pem');
const privB64Path = resolve(OUT_DIR, 'ed25519_private.b64');
const pubB64Path = resolve(OUT_DIR, 'ed25519_public.b64');

if (existsSync(privatePath) && !process.argv.includes('--force')) {
  console.error('Keys already exist. Use --force to overwrite.');
  process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const publicPem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
const privateDer = privateKey.export({ format: 'der', type: 'pkcs8' });
const publicDer = publicKey.export({ format: 'der', type: 'spki' });

writeFileSync(privatePath, privatePem, { mode: 0o600 });
writeFileSync(publicPath, publicPem);
writeFileSync(privB64Path, privateDer.toString('base64'));
writeFileSync(pubB64Path, publicDer.toString('base64'));

console.log('✅ Ed25519 keys generated:');
console.log(`   Private (PEM): ${privatePath}`);
console.log(`   Public  (PEM): ${publicPath}`);
console.log(`   Private (B64): ${privB64Path}`);
console.log(`   Public  (B64): ${pubB64Path}`);
console.log('');
console.log('For Vercel deployment, add these env vars:');
console.log('');
console.log('COCO_ED25519_PRIVATE_KEY_B64=' + privateDer.toString('base64'));
console.log('');
console.log('COCO_ED25519_PUBLIC_KEY_B64=' + publicDer.toString('base64'));
