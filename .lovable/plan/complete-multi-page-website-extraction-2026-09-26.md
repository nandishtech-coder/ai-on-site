# Complete multi-page website extraction

## Goal
Make Helix learn the useful content across an entire public website, including sites that render content with JavaScript, instead of relying on one page.

## Changes
- Replace the sequential limited crawler with a robust site discovery pipeline using sitemap indexes, nested sitemaps, internal links, canonical URL cleanup, and duplicate filtering.
- Add browser-rendered extraction fallback for JavaScript-heavy pages and retain the existing script-content fallback for sites that cannot render normally.
- Crawl pages concurrently within each plan's page allowance, while keeping requests bounded and reporting useful progress.
- Preserve each page's URL/title so Training Data shows every discovered source and chat retrieval can answer across pages.
- Improve failure reporting to distinguish unreachable sites from sites where no useful public text was found.
- Verify against the supplied test domain and test the sync/chat path as far as the available session permits.

## Technical notes
- Crawling remains server-side and same-origin only.
- Content remains split into overlapping chunks and embedded into the existing vector index.
- Free, Pro, and Enterprise page limits remain unchanged.
