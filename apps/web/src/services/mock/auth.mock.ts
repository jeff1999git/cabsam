import "client-only";

import type { Session, User } from "@excelcabs/types";

import { nowIso } from "@/lib/datetime";
import { mockStore } from "@/lib/mock/store";
import { LOGIN_PATH } from "@/lib/safe-redirect";
import { signInInputSchema, signUpInputSchema } from "@/lib/schemas/auth";

import type { AuthService } from "../auth.service";
import { conflict, forbidden, unauthorized } from "../errors";
import { requireUser, sessionStore } from "./_session";
import { latency, mockRead, newId, newToken, parseInput } from "./_utils";
import { toSessionUser } from "./_views";

const ROLE_LABEL: Record<User["role"], string> = {
  customer: "Customer",
  driver: "Driver",
  admin: "Admin",
};

function startSession(user: User): Session {
  const session: Session = { token: newToken(), user: toSessionUser(user), issuedAt: nowIso() };
  sessionStore.set(session);
  return structuredClone(session);
}

export const mockAuthService: AuthService = {
  async signIn(input) {
    await latency("write");
    const { email, password, portal } = parseInput(signInInputSchema, input);
    const user = mockStore.read((db) => {
      const match = db.users.find((candidate) => candidate.email === email);
      const credential = match && db.credentials.find((record) => record.userId === match.id);
      if (!match || credential?.password !== password) {
        throw unauthorized("INVALID_CREDENTIALS", "Invalid email or password");
      }
      return match;
    });
    if (user.status !== "active") {
      throw forbidden("This account has been disabled. Please contact Excel Cabs.", "ACCOUNT_DISABLED");
    }
    if (user.role !== portal) {
      throw forbidden(
        `${ROLE_LABEL[user.role]} accounts sign in at ${LOGIN_PATH[user.role]}`,
        "WRONG_PORTAL",
        { portal: user.role },
      );
    }
    return startSession(user);
  },

  async signUp(input) {
    await latency("write");
    const values = parseInput(signUpInputSchema, input);
    const user = mockStore.write((draft) => {
      if (draft.users.some((candidate) => candidate.email === values.email)) {
        throw conflict("EMAIL_TAKEN", "An account with this email already exists", {
          fieldErrors: { email: "An account with this email already exists" },
        });
      }
      const now = nowIso();
      const customer: User = {
        id: newId("usr"),
        role: "customer",
        name: values.name,
        email: values.email,
        mobile: values.mobile,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      draft.users.push(customer);
      draft.credentials.push({ userId: customer.id, password: values.password });
      return customer;
    });
    return startSession(user);
  },

  async signOut() {
    await latency("read");
    sessionStore.set(null);
  },

  getCurrentUser() {
    return mockRead((db) => requireUser(db));
  },

  getSessionSnapshot: sessionStore.getSnapshot,
  subscribe: sessionStore.subscribe,
};
