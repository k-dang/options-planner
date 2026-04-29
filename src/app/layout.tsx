import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Options Planner",
  description: "Build and share options strategy scenarios.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className={`${outfit.className} min-h-full flex flex-col`}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
