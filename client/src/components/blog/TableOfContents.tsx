import React from "react";

export interface TocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

interface TableOfContentsProps {
  headings: TocHeading[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  if (!headings || headings.length === 0) return null;

  return (
    <div className="mb-8 rounded-lg border bg-card text-card-foreground shadow">
      <div className="p-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Table of Contents
        </h3>
        <nav aria-label="Table of contents">
          <ul className="space-y-2">
            {headings.map((h) => (
              <li key={h.id} className={h.depth === 3 ? "pl-4 border-l" : undefined}>
                <a
                  href={`#${h.id}`}
                  className="text-sm text-foreground hover:text-primary"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
