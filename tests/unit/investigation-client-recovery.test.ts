import { describe, expect, it } from "vitest";
import {
  attachInvestigationDelegates,
  hasPrismaInvestigationDelegates,
} from "@/lib/investigation/libsql-delegates";

describe("investigation Prisma delegate recovery", () => {
  it("detects missing investigationCase findUnique", () => {
    expect(hasPrismaInvestigationDelegates({} as never)).toBe(false);
    expect(
      hasPrismaInvestigationDelegates({
        investigationCase: {},
        investigationPlayerState: {},
      } as never),
    ).toBe(false);
  });

  it("attaches libsql shims with findUnique when Prisma delegates are absent", () => {
    const client = {} as {
      investigationCase?: { findUnique?: unknown };
      investigationPlayerState?: { findUnique?: unknown };
    };
    attachInvestigationDelegates(client);
    expect(typeof client.investigationCase?.findUnique).toBe("function");
    expect(typeof client.investigationPlayerState?.findUnique).toBe(
      "function",
    );
    expect(hasPrismaInvestigationDelegates(client as never)).toBe(true);
  });

  it("does not overwrite working Prisma delegates", () => {
    const native = {
      findUnique: async () => ({ id: "native" }),
    };
    const client = {
      investigationCase: native,
      investigationPlayerState: {
        findUnique: async () => ({ id: "native-state" }),
      },
    };
    attachInvestigationDelegates(client);
    expect(client.investigationCase).toBe(native);
  });
});
