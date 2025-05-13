"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "~/components/ui/button";

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-zinc-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-purple-400">
          Quiztris
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" className="text-white hover:text-purple-400">
              Host Game
            </Button>
          </Link>
          <Link href="/join">
            <Button variant="ghost" className="text-white hover:text-purple-400">
              Join Game
            </Button>
          </Link>
          <Link href="/account">
            <Button variant="ghost" className="text-white hover:text-purple-400">
              Account
            </Button>
          </Link>

          <SignedIn>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10" } }} />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                size="sm"
                className="text-black bg-white hover:bg-purple-500 transition hover:text-white"
              >
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-6 pb-4 space-y-3">
        <Link href="/host" onClick={() => setIsOpen(false)}>
            <Button
            variant="ghost"
            className="w-full text-left text-white hover:text-purple-400"
            >
            Host Game
            </Button>
        </Link>
        <Link href="/join" onClick={() => setIsOpen(false)}>
            <Button
            variant="ghost"
            className="w-full text-left text-white hover:text-purple-400"
            >
            Join Game
            </Button>
        </Link>
        <Link href="/account" onClick={() => setIsOpen(false)}>
            <Button
            variant="ghost"
            className="w-full text-left text-white hover:text-purple-400"
            >
            Account
            </Button>
        </Link>

        <SignedIn>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
        </SignedIn>

        <SignedOut>
            <SignInButton mode="modal">
            <Button
                size="sm"
                className="w-full text-black bg-white hover:bg-purple-500 hover:text-white transition"
            >
                Sign in
            </Button>
            </SignInButton>
        </SignedOut>
        </div>
      )}
    </nav>
  );
}
