import { redirect } from "next/navigation";

/** Log in now lives in a popup on the home page. */
export default function LoginPage() {
  redirect("/");
}
