import type {
  Session,
  SignInInput,
  SignUpInput,
  Unsubscribe,
  User,
} from "@excelcabs/types";

import { mockAuthService } from "./mock/auth.mock";

export interface AuthService {
  /**
   * @throws VALIDATION · UNAUTHORIZED(INVALID_CREDENTIALS) ·
   *   FORBIDDEN(ACCOUNT_DISABLED | WRONG_PORTAL — `details.portal` is the account's portal)
   */
  signIn(input: SignInInput): Promise<Session>;
  /** Customer self-signup; signs the new customer in. @throws VALIDATION · CONFLICT(EMAIL_TAKEN) */
  signUp(input: SignUpInput): Promise<Session>;
  /** Idempotent; never throws. */
  signOut(): Promise<void>;
  /** The signed-in user, re-validated. @throws UNAUTHORIZED(SESSION_INVALID) */
  getCurrentUser(): Promise<User>;
  /** Synchronous, referentially stable snapshot for `useSyncExternalStore`. Browser-only. */
  getSessionSnapshot(): Session | null;
  /** Notified on sign-in / sign-up / sign-out, including from other tabs. */
  subscribe(listener: () => void): Unsubscribe;
}

/** Swap point: replace with an API-backed implementation. */
export const authService: AuthService = mockAuthService;
