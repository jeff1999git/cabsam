"use client";

import { toast } from "@excelcabs/ui/components/sonner";
import { useRouter } from "next/navigation";

import { useSignOut } from "@/queries/auth";

/** Sign out, confirm with a toast and return to the home page. */
export function useSignOutAction() {
  const router = useRouter();
  const signOut = useSignOut();

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        toast.success("Signed out");
        router.replace("/");
      },
    });
  }

  return { signOut: handleSignOut, pending: signOut.isPending };
}
