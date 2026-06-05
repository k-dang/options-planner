import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Builder",
};

export default function BuildIndexPage() {
  redirect("/");
}
