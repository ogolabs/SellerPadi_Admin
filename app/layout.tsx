import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "SellerPadi Mission Control — Platform Operations & Telemetry",
  description: "Internal operations, merchant supervision, and relayer monitoring suite.",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sellerpadi_theme")||localStorage.getItem("SellerPadi_theme");if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";}}catch(e){}})();`,
          }}
        />
        <meta name="theme-color" content="#F8FAFC" />
      </head>
      <body className="bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-150">
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          id="google-gsi-client"
        />
        <ThemeProvider>
          <QueryProvider>
            <AdminShell>{children}</AdminShell>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
