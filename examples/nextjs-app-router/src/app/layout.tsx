import type { Metadata } from "next";
import { StellarWalletProvider } from "@/components/stellar-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "stellar-hooks · Next.js App Router",
  description:
    "Minimal example demonstrating the correct client/server boundary when using stellar-hooks in the Next.js App Router.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // This layout is a Server Component: it renders static metadata and mounts
  // the tree. It never accesses browser APIs or wallet state -- that stays in
  // the client children below.
  return (
    <html lang="en">
      <body>
        {/* The provider is a Client Component (it holds wallet state). Wrapping
            children here keeps all hook usage on the client while the rest of
            the tree remains server-rendered. */}
        <StellarWalletProvider>{children}</StellarWalletProvider>
      </body>
    </html>
  );
}
