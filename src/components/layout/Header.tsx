'use client';

import Link from 'next/link';
import { AirtableIcon } from '@/components/icons/AirtableIcon';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { GithubIcon } from '@/components/icons/GithubIcon';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl text-indigo-900">
              PLDG Dashboard
            </span>
          </Link>
        </div>

        <nav className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="https://airtable.com/appFEDy5FPBFHPY5r/shr773Cn3Q3owRDDR"
              target="_blank"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
            >
              <AirtableIcon />
              <span>Airtable</span>
            </Link>

            <Link
              href="https://github.com/seetadev/pldg-dashboard/tree/main"
              target="_blank"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
            >
              <GithubIcon className="w-5 h-5 group-hover:text-indigo-900 transition-colors" />
              <span>GitHub</span>
            </Link>

            <Link
              href="https://discord.gg/hCw74E2mE4"
              target="_blank"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
            >
              <DiscordIcon />
              <span>Discord</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
