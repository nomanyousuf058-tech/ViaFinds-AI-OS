/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { adminOnly } from '@/lib/auth';

const getCredentialsPath = () => path.join(process.cwd(), 'data', 'credentials.json');

const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'viafinds-fallback-local-key-32b';
  return crypto.scryptSync(secret, 'salt', 32);
};

const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedText: string) => {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
};

function getCredentials() {
  const credentialsPath = getCredentialsPath();
  if (fs.existsSync(credentialsPath)) {
    const fileContent = fs.readFileSync(credentialsPath, 'utf8');
    try { return JSON.parse(decrypt(fileContent)); } catch { return JSON.parse(fileContent); }
  }
  return {};
}

export async function GET() {
  try {
    await adminOnly();
    const credentials = getCredentials();
    const safeData: Record<string, any> = {};
    for (const [key, val] of Object.entries(credentials)) {
      safeData[key] = { ...(val as Record<string, any>) };
      if (safeData[key].apiKey && typeof safeData[key].apiKey === 'string') {
        const k = safeData[key].apiKey;
        safeData[key].apiKey = k.substring(0, 4) + '...' + k.substring(Math.max(4, k.length - 4));
      }
    }
    return NextResponse.json(safeData);
  } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    await adminOnly();
    const credentialsPath = getCredentialsPath();
    const dir = path.dirname(credentialsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const body = await req.json();
    let existing: Record<string, any> = {};
    if (fs.existsSync(credentialsPath)) {
      const encryptedData = fs.readFileSync(credentialsPath, 'utf8');
      existing = JSON.parse(decrypt(encryptedData));
    }

    for (const [providerId, updates] of Object.entries(body)) {
      existing[providerId] = { ...existing[providerId], ...(updates as Record<string, any>) };
    }

    fs.writeFileSync(credentialsPath, encrypt(JSON.stringify(existing)));
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 }); }
}