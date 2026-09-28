import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      username: string;
      displayName?: string | null;
      emailVerifiedAt?: string | null;
    };
  }

  interface User {
    username?: string;
    displayName?: string | null;
    emailVerifiedAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    displayName?: string | null;
    emailVerifiedAt?: string | null;
  }
}
