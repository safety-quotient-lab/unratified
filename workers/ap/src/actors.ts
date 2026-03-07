export interface ActorConfig {
  username: string;
  name: string;
  summary: string;
  url: string;
  iconUrl: string;
  publicKeyPem: string;
}

// Public keys are not sensitive — safe to embed in source.
// Private keys are Worker secrets (AP_PRIVATE_KEY_<USERNAME_UPPER>).
const OBSERVATORY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlOKASzQBA99VrQxDrGtX
rSm+iJJRwVGEk7rRW5AyNKdmptjcws7hJZPCPFJmt3jJ6SMdBdxtxQxLwlkIcOwK
Wi7Tbz/ywjn/+mVBqzibIWRpKULxHKa/g4RwZeyhnOQ8WKRWTjTlAsp4noTP4WPX
m8krl0kPIOU/OhQ/DxlY6+qZrD6utKKzcmZxQK/qNuZ/NwMQDtI1SDX85aZWG5Bg
J2p6Flk5Rx6vQkoQq8bsp0KSHI4COSWzoOVynO1Sv0ztDPdaKKiC0nBtTdFohDbH
QPl8HEJCrWwbuzahCYiVQSw0n2eYFYef8xW7f7gyBMrWTjWxmvMs32ILu/tRlQo9
iQIDAQAB
-----END PUBLIC KEY-----`;

export const ACTORS: Record<string, ActorConfig> = {
  observatory: {
    username: 'observatory',
    name: 'Human Rights Observatory',
    summary:
      'Evaluating Hacker News stories against the Universal Declaration of Human Rights. ' +
      'Part of <a href="https://unratified.org">unratified.org</a> — the case for U.S. ICESCR ratification.',
    url: 'https://observatory.unratified.org',
    iconUrl: 'https://observatory.unratified.org/favicon.ico',
    publicKeyPem: OBSERVATORY_PUBLIC_KEY,
  },
};

export function getActor(name: string): ActorConfig | undefined {
  return ACTORS[name.toLowerCase()];
}
