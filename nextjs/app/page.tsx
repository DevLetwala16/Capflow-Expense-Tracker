import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function RootPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("capflow_token");

  if (token) {
    redirect("/dashboard");
  }

  redirect("/splash");
}
