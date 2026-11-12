"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoSession } from "./demo-session-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session } = useDemoSession();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check if onboarding is complete
    const { workspaceCreated, brandProfileApproved } = session.onboarding;
    if (!workspaceCreated || !brandProfileApproved) {
      router.replace("/onboard");
    } else {
      setAuthorized(true);
    }
  }, [session, router]);

  if (!authorized) {
    return null; // or a minimal loading spinner
  }

  return <>{children}</>;
}
