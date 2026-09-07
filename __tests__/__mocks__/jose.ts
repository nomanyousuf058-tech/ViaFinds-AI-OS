class FakeSignJWT {
  private payload: any;
  private protectedHeader: any;
  private exp: string | number | undefined;

  constructor(payload: any) {
    this.payload = payload;
  }

  setProtectedHeader(header: any) {
    this.protectedHeader = header;
    return this;
  }

  setIssuedAt() {
    return this;
  }

  setExpirationTime(time: string | number) {
    this.exp = time;
    return this;
  }

  async sign(secret: Uint8Array) {
    const secretStr = new TextDecoder().decode(secret);
    let token = 'fake.jwt.token';
    if (this.payload) {
      token += '.' + Buffer.from(JSON.stringify(this.payload)).toString('base64');
    }
    if (this.exp === '-1h') {
      token += '.expired';
    }
    if (secretStr === 'wrong-secret') {
      token += '.wrongsecret';
    }
    return token;
  }
}

async function jwtVerify(token: string, secret: Uint8Array) {
  if (token.includes('.expired') || token.includes('.wrongsecret')) {
    throw new Error('Invalid token');
  }
  const secretStr = new TextDecoder().decode(secret);
  if (secretStr === 'wrong-secret') {
    throw new Error('Invalid token');
  }
  if (token.startsWith('fake.jwt.token.')) {
    const payloadB64 = token.split('.')[2];
    if (payloadB64) {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
      return {
        payload,
        protectedHeader: { alg: 'HS256' },
      };
    }
  }
  if (token === 'fake.jwt.token' || token === 'valid_token' || token.startsWith('eyJ')) {
    return {
      payload: { role: 'admin', userId: 'test-admin', sub: 'admin-1', email: 'admin@viafinds.com' },
      protectedHeader: { alg: 'HS256' },
    };
  }
  throw new Error('Invalid token');
}

module.exports = {
  SignJWT: FakeSignJWT,
  jwtVerify,
  importSPKI: async () => 'fake-spki',
  importPKCS8: async () => 'fake-pkcs8',
  decodeJwt: () => ({ role: 'admin', userId: 'test-admin', sub: 'admin-1', email: 'admin@viafinds.com' }),
  decodeProtectedHeader: () => ({ alg: 'HS256' }),
};
