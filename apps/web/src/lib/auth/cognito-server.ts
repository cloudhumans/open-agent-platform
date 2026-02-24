import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Lazily-created JWKS fetcher for Cognito token validation.
 * Caches the JWKS keys internally (handled by jose).
 */
let cognitoJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getUserPoolId(): string {
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error(
      "NEXT_PUBLIC_COGNITO_USER_POOL_ID is required for Cognito JWT validation",
    );
  }
  return userPoolId;
}

function getIssuer(): string {
  const userPoolId = getUserPoolId();
  const region = userPoolId.split("_")[0];
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

function getJWKS() {
  if (!cognitoJWKS) {
    const jwksUrl = new URL(`${getIssuer()}/.well-known/jwks.json`);
    cognitoJWKS = createRemoteJWKSet(jwksUrl);
  }
  return cognitoJWKS;
}

/**
 * Verify a Cognito JWT (access or id token) against the JWKS endpoint.
 * Returns `true` if the token is valid, `false` otherwise.
 */
export async function verifyCognitoToken(token: string): Promise<boolean> {
  try {
    const JWKS = getJWKS();
    await jwtVerify(token, JWKS, {
      issuer: getIssuer(),
    });
    return true;
  } catch {
    return false;
  }
}
