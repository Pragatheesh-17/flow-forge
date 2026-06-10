import type { Metadata } from "next";
import { ensureInternalSchedulerStarted } from "@/lib/worflow/scheduler";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowForge",
  description: "Workflow automation builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  ensureInternalSchedulerStarted();

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
