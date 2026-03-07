// HTTP Signatures — draft-cavage-http-signatures-12
// Mastodon uses this format, NOT RFC 9421.

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function signRequest(
  method: string,
  url: string,
  body: string | null,
  keyId: string,
  privateKeyPem: string,
): Promise<Record<string, string>> {
  const parsedUrl = new URL(url);
  const date = new Date().toUTCString();
  const headers: Record<string, string> = {
    host: parsedUrl.host,
    date,
  };

  let headersToSign = '(request-target) host date';

  if (body !== null) {
    const digest = bufferToBase64(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body)),
    );
    headers['digest'] = `SHA-256=${digest}`;
    headers['content-type'] = 'application/activity+json';
    headersToSign += ' digest content-type';
  }

  const requestTarget = `${method.toLowerCase()} ${parsedUrl.pathname}${parsedUrl.search}`;
  const signingLines = headersToSign.split(' ').map((h) =>
    h === '(request-target)' ? `(request-target): ${requestTarget}` : `${h}: ${headers[h]}`,
  );
  const signingString = signingLines.join('\n');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = bufferToBase64(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingString)),
  );

  headers['signature'] =
    `keyId="${keyId}",algorithm="rsa-sha256",headers="${headersToSign}",signature="${signature}"`;

  return headers;
}

export async function verifySignature(request: Request): Promise<boolean> {
  const sigHeader = request.headers.get('signature');
  if (!sigHeader) return false;

  const parts: Record<string, string> = {};
  for (const part of sigHeader.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim().replace(/^"(.*)"$/, '$1');
    parts[k] = v;
  }

  const { keyId, headers: headerList, signature } = parts;
  if (!keyId || !headerList || !signature) return false;

  // Fetch the remote actor's public key
  let publicKeyPem: string;
  try {
    const actorUrl = keyId.replace(/#.*$/, '');
    const res = await fetch(actorUrl, {
      headers: { accept: 'application/activity+json' },
    });
    if (!res.ok) return false;
    const actor = (await res.json()) as { publicKey?: { publicKeyPem?: string } };
    publicKeyPem = actor.publicKey?.publicKeyPem ?? '';
    if (!publicKeyPem) return false;
  } catch {
    return false;
  }

  const url = new URL(request.url);
  const requestTarget = `${request.method.toLowerCase()} ${url.pathname}${url.search}`;

  const signingLines = headerList.split(' ').map((h) => {
    if (h === '(request-target)') return `(request-target): ${requestTarget}`;
    return `${h}: ${request.headers.get(h) ?? ''}`;
  });
  const signingString = signingLines.join('\n');

  try {
    const key = await crypto.subtle.importKey(
      'spki',
      pemToDer(publicKeyPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      Uint8Array.from(atob(signature), (c) => c.charCodeAt(0)),
      new TextEncoder().encode(signingString),
    );
  } catch {
    return false;
  }
}
