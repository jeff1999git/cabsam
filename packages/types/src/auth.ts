import type { ISODateTime } from "./common";
import type { User, UserRole } from "./user";

export type SessionUser = Pick<User, "id" | "role" | "name" | "email" | "mobile">;

export interface Session {
  /** Opaque token. In the API implementation this is the bearer token / session id. */
  token: string;
  user: SessionUser;
  issuedAt: ISODateTime;
}

/** Which sign-in page was used. Staff and customers sign in through different portals. */
export type AuthPortal = UserRole;

export interface SignInInput {
  email: string;
  password: string;
  portal: AuthPortal;
}

export interface SignUpInput {
  name: string;
  email: string;
  mobile: string;
  password: string;
}
