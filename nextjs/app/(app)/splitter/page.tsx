"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplitterRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/budgets/splitter");
  }, [router]);
  return null;
}
