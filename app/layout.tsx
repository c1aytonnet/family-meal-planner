import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Family Meal Planner",
  description: "Filesystem-first AI meal planning for one household.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
