import React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SidebarLayout } from "@/components/sidebar";
import { AuthProvider } from "@/providers/Auth";
import { DOCS_LINK } from "@/constants";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDemoApp = process.env.NEXT_PUBLIC_DEMO_APP === "true";
  return (
    <>
      {isDemoApp && (
        <div className="fixed top-0 right-0 left-0 z-10 bg-[#CFC8FE] py-2 text-center text-black shadow-md">
          You're currently using the demo application. To use your own agents,
          and run in production, check out the{" "}
          <a
            className="underline underline-offset-2"
            href={DOCS_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            documentation
          </a>
        </div>
      )}
      <NuqsAdapter>
        <AuthProvider>
          <SidebarLayout>{children}</SidebarLayout>
        </AuthProvider>
      </NuqsAdapter>
    </>
  );
}
