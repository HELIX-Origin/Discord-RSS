import crypto from 'node:crypto';

function derLength(len: number): Buffer {
  if (len < 128) return Buffer.from([len]);
  const bytes: number[] = [];
  let temp = len;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derTag(tag: number, content: Buffer | Uint8Array | string): Buffer {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return Buffer.concat([Buffer.from([tag]), derLength(buf.length), buf]);
}

function derSequence(items: Buffer[]): Buffer {
  return derTag(0x30, Buffer.concat(items));
}

function derInteger(num: number | Buffer): Buffer {
  if (Buffer.isBuffer(num)) {
    if (num[0] !== undefined && num[0] & 0x80) {
      return derTag(0x02, Buffer.concat([Buffer.from([0x00]), num]));
    }
    return derTag(0x02, num);
  }
  let hex = num.toString(16);
  if (hex.length % 2 !== 0) hex = '0' + hex;
  const buf = Buffer.from(hex, 'hex');
  if (buf[0] !== undefined && buf[0] & 0x80) {
    return derTag(0x02, Buffer.concat([Buffer.from([0x00]), buf]));
  }
  return derTag(0x02, buf);
}

function derBitString(buf: Buffer): Buffer {
  return derTag(0x03, Buffer.concat([Buffer.from([0x00]), buf]));
}

function derOctetString(buf: Buffer): Buffer {
  return derTag(0x04, buf);
}

function derOid(oidStr: string): Buffer {
  const parts = oidStr.split('.').map(Number);
  const bytes = [parts[0]! * 40 + parts[1]!];
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i]!;
    const subBytes: number[] = [];
    subBytes.push(val & 0x7f);
    val >>= 7;
    while (val > 0) {
      subBytes.unshift((val & 0x7f) | 0x80);
      val >>= 7;
    }
    bytes.push(...subBytes);
  }
  return derTag(0x06, Buffer.from(bytes));
}

function derUtcTime(date: Date): Buffer {
  const pad = (n: number) => String(n).padStart(2, '0');
  const str =
    pad(date.getUTCFullYear() % 100) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z';
  return derTag(0x17, Buffer.from(str, 'ascii'));
}

function derUtf8String(str: string): Buffer {
  return derTag(0x0c, Buffer.from(str, 'utf8'));
}

export interface GeneratedTlsCertificate {
  key: string;
  cert: string;
}

/**
 * Generates an in-memory self-signed X.509 certificate and RSA private key
 * using native Node.js crypto and ASN.1 DER encoding.
 * Enables zero-configuration HTTPS without external binaries or openSSL CLI.
 */
export function generateSelfSignedCertificate(
  commonName = 'localhost',
  altNames: string[] = [],
): GeneratedTlsCertificate {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const privKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

  // SHA-256 with RSA encryption OID: 1.2.840.113549.1.1.11
  const sha256RsaOid = derSequence([derOid('1.2.840.113549.1.1.11'), derTag(0x05, Buffer.alloc(0))]);

  // Name: CommonName
  const cnRdn = derTag(0x31, derSequence([derOid('2.5.4.3'), derUtf8String(commonName)]));
  const nameSeq = derSequence([cnRdn]);

  // Serial number (16 random bytes)
  const serial = crypto.randomBytes(16);

  // Validity: 1 minute ago up to 1 year ahead
  const notBefore = new Date(Date.now() - 60_000);
  const notAfter = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  const validity = derSequence([derUtcTime(notBefore), derUtcTime(notAfter)]);

  // SAN extension (OID 2.5.29.17)
  // [2] dNSName, [7] iPAddress
  const sanEntries: Buffer[] = [
    derTag(0x82, Buffer.from('localhost', 'ascii')),
    derTag(0x87, Buffer.from([127, 0, 0, 1])),
  ];

  const unique = new Set([commonName, ...altNames]);
  for (const raw of unique) {
    const hostOnly = raw
      .replace(/^https?:\/\//, '')
      .split(':')[0]
      ?.trim();
    if (!hostOnly || hostOnly === 'localhost' || hostOnly === '127.0.0.1') continue;

    const ipParts = hostOnly.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every((p) => Number.isInteger(p) && p >= 0 && p <= 255)) {
      sanEntries.push(derTag(0x87, Buffer.from(ipParts)));
    } else {
      sanEntries.push(derTag(0x82, Buffer.from(hostOnly, 'ascii')));
    }
  }

  // 1. SAN extension (OID 2.5.29.17)
  const sanContent = derSequence(sanEntries);
  const sanExtension = derSequence([derOid('2.5.29.17'), derOctetString(sanContent)]);

  // 2. Basic Constraints (OID 2.5.29.19): cA: TRUE
  const bcExtension = derSequence([derOid('2.5.29.19'), derOctetString(Buffer.from([0x30, 0x03, 0x01, 0x01, 0xff]))]);

  // 3. Extended Key Usage (OID 2.5.29.37): serverAuth, clientAuth
  const ekuContent = derSequence([derOid('1.3.6.1.5.5.7.3.1'), derOid('1.3.6.1.5.5.7.3.2')]);
  const ekuExtension = derSequence([derOid('2.5.29.37'), derOctetString(ekuContent)]);

  const extensionsSeq = derTag(0xa3, derSequence([sanExtension, bcExtension, ekuExtension]));

  // Version 3: [0] EXPLICIT INTEGER 2
  const version = derTag(0xa0, derInteger(2));

  // TBSCertificate
  const tbs = derSequence([
    version,
    derInteger(serial),
    sha256RsaOid,
    nameSeq, // Issuer
    validity,
    nameSeq, // Subject
    spkiDer, // SubjectPublicKeyInfo
    extensionsSeq,
  ]);

  // Sign TBSCertificate
  const signer = crypto.createSign('SHA256');
  signer.update(tbs);
  const signature = signer.sign(privateKey);

  // Complete Certificate
  const certDer = derSequence([tbs, sha256RsaOid, derBitString(signature)]);

  const certB64 =
    certDer
      .toString('base64')
      .match(/.{1,64}/g)
      ?.join('\n') ?? certDer.toString('base64');
  const certPem = `-----BEGIN CERTIFICATE-----\n${certB64}\n-----END CERTIFICATE-----\n`;

  return {
    key: String(privKeyPem),
    cert: certPem,
  };
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Loads an existing self-signed certificate from disk or generates and saves a new one.
 * Ensures the certificate fingerprint remains stable across restarts so that browser
 * security exceptions or trusted root installations persist.
 */
export function getOrCreateSelfSignedCertificate(
  certsDir: string,
  commonName = 'localhost',
  altNames: string[] = [],
): GeneratedTlsCertificate {
  const certPath = resolve(certsDir, 'self-signed-cert.pem');
  const keyPath = resolve(certsDir, 'self-signed-key.pem');

  if (existsSync(certPath) && existsSync(keyPath)) {
    try {
      const cert = readFileSync(certPath, 'utf8');
      const key = readFileSync(keyPath, 'utf8');
      const x509 = new crypto.X509Certificate(cert);
      const expiry = new Date(x509.validTo).getTime();
      // Reuse if valid for at least 30 days
      if (expiry - Date.now() > 30 * 24 * 3600 * 1000) {
        return { cert, key };
      }
    } catch {
      // Re-generate if reading or parsing fails
    }
  }

  const generated = generateSelfSignedCertificate(commonName, altNames);
  try {
    mkdirSync(certsDir, { recursive: true });
    writeFileSync(certPath, generated.cert, 'utf8');
    writeFileSync(keyPath, generated.key, 'utf8');
  } catch {
    // Non-fatal if filesystem is read-only
  }
  return generated;
}
