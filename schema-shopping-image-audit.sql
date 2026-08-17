/* ════════════════════════════════════════════════════════════════
   CABANA · scraped_shopping image audit
   ────────────────────────────────────────────────────────────────
   Every image_url in scraped_shopping was an unverified Unsplash
   photo ID. Rendering all 22 rows showed most of them depict
   something other than the product being sold, e.g.

     Hand-carved Giraffe (Medium)  → a panda
     Raw Kenyan Forest Honey 1kg   → a watermelon
     Traditional Kanga Wrap Set    → a neon-lit Japanese alley
     Kitenge Print Dress           → a man operating machinery
     Infinix Note 40 Pro           → an iPhone on a MacBook
     Bata Kenya Leather Sandals    → a Nike-style trainer
     Maasai Beaded Necklace        → HTTP 404, no image at all

   A wrong product photo is worse than none: it misrepresents what
   the buyer receives. This nulls every image that does not depict
   its product, so /shopping and the dashboard rail both fall back
   to their category tile until a real photo is supplied. Both
   surfaces already handle a null/failed image_url.

   Run once. Safe to re-run: it only clears the listed rows.
   Prices, names, sellers and stock flags are untouched.
   ════════════════════════════════════════════════════════════════ */

UPDATE public.scraped_shopping
SET image_url = NULL
WHERE dedupe_key IN (
  'bead-work-evening-bag',        -- generic pink clutch, not beadwork
  'kenya-running-shoes-support',  -- yellow tracksuit on a beach, not a vest
  'kikoy-beach-wrap-authentic',   -- grey t-shirts on hangers
  'kitenge-print-dress',          -- man operating machinery
  'maasai-beaded-necklace',       -- dead URL (404)
  'maasai-market-experience',     -- man in a bucket hat
  'nairobi-art-print',            -- Dutch floral still-life painting
  'african-print-bag',            -- plain navy backpack, not a print tote
  'leather-sandals-nairobi',      -- athletic trainer, wrong product and brand
  'wooden-giraffe-sculpture',     -- a panda
  'infinix-note-40-pro',          -- an iPhone, wrong brand
  'soapstone-hippo',              -- graffiti face mural
  'kenyan-honey-raw',             -- a watermelon
  'rhino-charge-wristband',       -- woman in a blazer holding a laptop
  'phone-repair-cbd',             -- office full of monitors
  'kangas-traditional'            -- neon-lit alley with a paper lantern
);

/* Verified as actually depicting their product, left in place:
     african-spices-set        → spices
     kenyan-coffee-dormans     → coffee brewing
     kenya-tea-collection      → brewed tea
     kenya-wine-rift-valley    → red wine and grapes
     samsung-galaxy-a55        → a Samsung handset
     nairobi-coffee-table-book → bookshelves                      */

-- Check what remains after the update:
-- SELECT dedupe_key, name, image_url IS NOT NULL AS has_image
-- FROM public.scraped_shopping ORDER BY has_image DESC, name;
