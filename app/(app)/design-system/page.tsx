import { notFound } from "next/navigation";
import { DesignSystem } from "@/components/design/DesignSystem";

/** A development reference: the page does not exist in production. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystem />;
}
