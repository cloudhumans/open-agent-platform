import { CognitoJwtVerifier } from "aws-jwt-verify";
import { CognitoAccessTokenPayload } from "aws-jwt-verify/jwt-model";

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error(
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID are required for Cognito JWT validation",
      );
    }

    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: "access",
      clientId,
    });
  }
  return verifier;
}

/**
 * Verify a Cognito access token against the JWKS endpoint.
 * Validates issuer, signature, expiration, token_use, and client_id.
 * Returns the decoded payload on success, or null on failure.
 */
export async function verifyCognitoToken(
  token: string,
): Promise<CognitoAccessTokenPayload | null> {
  try {
    return await getVerifier().verify(token) as CognitoAccessTokenPayload;
  } catch {
    return null;
  }
}
