import * as React from 'react';
import { Github } from 'lucide-react';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t py-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-3 text-indigo-900">Data Sources</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://airtable.com/appFEDy5FPBFHPY5r/shr773Cn3Q3owRDDR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
                >
                  <Image
                    src="/logos/Airtable Icon.png"
                    alt="Airtable"
                    width={16}
                    height={16}
                    className="group-hover:opacity-80 transition-opacity"
                  />
                  <span>Engagement Data (Airtable)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/seetadev/pldg-dashboard/tree/main"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
                >
                  <Github className="w-4 h-4 group-hover:text-indigo-900 transition-colors" />
                  <span>Source Code (GitHub)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/hCw74E2mE4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors group"
                >
                  <Image
                    src="/logos/Discord Icon.png"
                    alt="Discord"
                    width={16}
                    height={16}
                    className="group-hover:opacity-80 transition-opacity"
                  />
                  <span>Community Discussion (Discord)</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-indigo-900">
              Update Frequency
            </h3>
            <p className="text-sm text-indigo-600">
              • Airtable: Real-time updates
              <br />
              • GitHub: Every 5 minutes
              <br />• Discord: Daily digest
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-indigo-900">About PLDG</h3>
            <p className="text-sm text-indigo-600">
              Accelerating developer impact in open-source ecosystems
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-indigo-600">
          <p>
            © {new Date().getFullYear()} Protocol Labs. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
