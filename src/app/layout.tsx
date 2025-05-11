import "~/styles/globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import NavBar from "~/components/navbar";

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
        <body className="bg-zinc-950 text-white shadow-md">
            <NavBar /> 
            {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
