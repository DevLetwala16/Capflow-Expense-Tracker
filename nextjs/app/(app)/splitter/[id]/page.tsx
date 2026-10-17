"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SplitterDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    if (params.id) {
      router.replace(`/budgets/splitter/${params.id}`);
    } else {
      router.replace("/budgets/splitter");
    }
  }, [params, router]);
  return null;
}
