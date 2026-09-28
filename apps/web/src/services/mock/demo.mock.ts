import "client-only";

import { mockStore } from "@/lib/mock/store";

import type { DemoService } from "../demo.service";
import { sessionStore } from "./_session";
import { latency } from "./_utils";

export const mockDemoService: DemoService = {
  enabled: true,

  async reset() {
    await latency("write");
    mockStore.reset();
    const session = sessionStore.getSnapshot();
    const stillExists = mockStore.read((db) => db.users.some((user) => user.id === session?.user.id));
    if (session && !stillExists) sessionStore.set(null);
  },

  onExternalChange(listener) {
    return mockStore.subscribe(listener);
  },
};
