import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Nether Hub Route Planner",
  description: "Planeje rotas precisas de túneis para os portais do seu Nether Hub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${chakraPetch.variable} ${ibmPlexMono.variable} h-full antialiased`}>
      <body className="flex h-full flex-col bg-app font-display text-body">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
