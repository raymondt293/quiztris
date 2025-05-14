import "~/styles/globals.css";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import NavBar from "~/components/navbar";
import { Toaster } from "~/components/ui/toaster"

export const metadata: Metadata = {
  title: "Quiztris",
  description: "Trivia app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable}`}>
        <body>
            <NavBar /> 
            {children}
            <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
