import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import {
  AuthProvider,
  AuthCredentials,
  AuthError,
  Session,
  User,
  AuthStateChangeCallback,
  AuthProviderOptions,
} from "./types";

export class CognitoAuthProvider implements AuthProvider {
  private userPool: CognitoUserPool;
  private options: AuthProviderOptions;
  private listeners: AuthStateChangeCallback[] = [];

  constructor(options: AuthProviderOptions = {}) {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error(
        "Missing Cognito configuration: NEXT_PUBLIC_COGNITO_USER_POOL_ID or NEXT_PUBLIC_COGNITO_CLIENT_ID",
      );
    }

    this.userPool = new CognitoUserPool({
      UserPoolId: userPoolId,
      ClientId: clientId,
    });

    this.options = {
      redirectUrl:
        typeof window !== "undefined" ? window.location.origin : undefined,
      ...options,
    };
  }

  // Helper to format Cognito user to our User interface
  private async formatUser(cognitoUser: CognitoUser): Promise<User | null> {
    return new Promise((resolve) => {
        cognitoUser.getUserAttributes((err, attributes) => {
            if (err || !attributes) {
                console.error("Error fetching attributes", err);
                resolve(null);
                return;
            }

            const attrs: Record<string, string> = {};
            attributes.forEach(attr => {
                attrs[attr.getName()] = attr.getValue();
            });

            resolve({
                id: cognitoUser.getUsername(),
                email: attrs.email || null,
                displayName: attrs.name || cognitoUser.getUsername(),
                firstName: attrs.given_name || null,
                lastName: attrs.family_name || null,
                metadata: attrs
            });
        });
    });
  }

  private formatError(error: any): AuthError | null {
    if (!error) return null;
    return {
      message: error.message || "An unknown error occurred",
      code: error.code,
      status: 400, // Default to bad request for auth errors
    };
  }

  async signUp(credentials: AuthCredentials) {
    return new Promise<{
      user: User | null;
      session: Session | null;
      error: AuthError | null;
    }>((resolve) => {
      const attributeList = [];
      
      const emailAttribute = {
        Name: "email",
        Value: credentials.email,
      };
      attributeList.push(new CognitoUserAttribute(emailAttribute));

      if (credentials.metadata) {
          Object.entries(credentials.metadata).forEach(([key, value]) => {
             attributeList.push(new CognitoUserAttribute({ Name: key, Value: String(value) }));
          });
      }

      this.userPool.signUp(
        credentials.email,
        credentials.password,
        attributeList,
        [],
        (err, result) => {
          if (err) {
            resolve({
              user: null,
              session: null,
              error: this.formatError(err),
            });
            return;
          }

          // SignUp successful, but usually requires verification
          // We return success but session might be null until verified/logged in
          resolve({
            user: result?.user ? { 
                id: result.user.getUsername(), 
                email: credentials.email 
            } : null,
            session: null,
            error: null,
          });
        }
      );
    });
  }

  async signIn(credentials: AuthCredentials) {
    const authenticationDetails = new AuthenticationDetails({
      Username: credentials.email,
      Password: credentials.password,
    });

    const cognitoUser = new CognitoUser({
      Username: credentials.email,
      Pool: this.userPool,
    });

    return new Promise<{
      user: User | null;
      session: Session | null;
      error: AuthError | null;
    }>((resolve) => {
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: async (result) => {
          const user = await this.formatUser(cognitoUser);
          const accessToken = result.getAccessToken().getJwtToken();
          // idToken is available via result.getIdToken().getJwtToken() if needed
          const refreshToken = result.getRefreshToken().getToken();
          
          const session: Session = {
             user,
             accessToken, // Standard access token
             refreshToken,
             expiresAt: result.getAccessToken().getExpiration(),
          };

          this.notifyListeners(session);

          resolve({
            user,
            session,
            error: null,
          });
        },
        onFailure: (err) => {
          resolve({
            user: null,
            session: null,
            error: this.formatError(err),
          });
        },
      });
    });
  }

  async signInWithGoogle() {
      // Cognito hosted UI handling would go here, 
      // but simpler to return error for now or implement if using Federation
      return {
          user: null,
          session: null,
          error: { message: "Google Auth not implemented directly in Cognito class yet" }
      };
  }

  async signOut() {
    const cognitoUser = this.userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    this.notifyListeners(null);
    return { error: null };
  }

  async getSession(): Promise<Session | null> {
    const cognitoUser = this.userPool.getCurrentUser();
    if (!cognitoUser) return null;

    return new Promise((resolve) => {
      cognitoUser.getSession(async (err: any, session: any) => {
        if (err || !session.isValid()) {
          resolve(null);
          return;
        }

        const user = await this.formatUser(cognitoUser);
        
        resolve({
            user,
            accessToken: session.getAccessToken().getJwtToken(),
            refreshToken: session.getRefreshToken().getToken(),
            expiresAt: session.getAccessToken().getExpiration()
        });
      });
    });
  }

  async refreshSession() {
      // Handled automatically by getSession usually, or implement specific refresh logic
      return this.getSession();
  }

  async getCurrentUser() {
     const session = await this.getSession();
     return session?.user || null;
  }

  async updateUser(attributes: Partial<User>) {
      // Implement using cognitoUser.updateAttributes
     return { user: null, error: { message: "Not implemented" } };
  }

  async resetPassword(email: string) {
       // Implement using cognitoUser.forgotPassword
       return { error: { message: "Not implemented" } };
  }

  async updatePassword(newPassword: string) {
      // Implement using cognitoUser.changePassword
      return { error: { message: "Not implemented" } };
  }

  onAuthStateChange(callback: AuthStateChangeCallback) {
    this.listeners.push(callback);
    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter((l) => l !== callback);
      },
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach((listener) => listener(session));
  }
}
