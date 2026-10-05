<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use Firecrawl through the linked gateway as the primary full-site reader, with the same-origin built-in crawler as fallback, because customer sites may be JavaScript-rendered or have complex sitemaps.
- Wait briefly for client-rendered site sections during crawling and include full catalog-page chunks for service/price questions, because initial markdown and top semantic matches can omit visible product details.
- Reuse embeddings for unchanged website chunks during re-sync and never discard previous training before replacements are ready, so temporary AI-credit failures do not damage a working bot.
- Serve cross-account admin reporting through authenticated server functions with a server-verified admin role before privileged reads, because browser-only navigation cannot protect user data.
