# StoreCount Storefront

The customer-facing half of [StoreCount](../storecount). Each merchant gets a
shareable link — `/{slug}` — where their customers browse published products,
place an order as a guest, and track it through to delivery.

Separate repo, separate deployment, **same Supabase project**.

## How it connects to StoreCount

StoreCount is local-first: the merchant's phone is the source of truth and its
sync push is a full-blob, last-write-wins overwrite. Two consequences shape
everything here:

1. **Orders live outside that blob.** They are written by this app into the
   `orders` table and only ever read and status-updated by the merchant. A
   merchant push can never destroy them.
2. **The catalog is a projection.** On each sync push, StoreCount derives
   `store_products` from the published subset of the merchant's products. It is
   derived, never authoritative, and rebuildable at any time.

So `store_products.available_quantity` is a **deliberately stale hint**. This app
only hard-blocks a line at zero; anything above that is allowed through, because
the merchant confirms every order by hand before stock moves. Rejecting on a
stale number would turn away perfectly fillable orders.

## Order lifecycle

```
placed (pending) ──> accepted ──> out_for_delivery ──> delivered
       │                 │
       └──> rejected     └──> cancelled
```

The customer can cancel only while `pending`. Everything after that is the
merchant's to drive from the StoreCount app.

## Security

**`lib/queries.ts` is the only file permitted to touch the database.** This is a
public deployment holding the Supabase service-role key, which bypasses RLS
entirely — an SSRF or dependency compromise here could otherwise read every
merchant's sales history and PIN hashes. An ESLint `no-restricted-imports` rule
enforces the boundary; `npm run lint` fails if anything else imports `@/lib/db`.
Do not add an exception.

Every query in that file is a fixed shape parameterised by a slug or an opaque
token. Nothing reads `users` or `user_data`.

Order tracking authenticates with a 32-byte `tracking_token`, never the `ref` —
the ref's alphabet is far too small to be guessable-resistant and is display-only.

**Planned hardening (Phase 2):** move reads to the anon key with narrow RLS
policies (public read of published stores and their products), keeping the
service role only for the order-insert route. That shrinks the blast radius of a
compromise here from "everything" to "public catalogs".

## The shared contract

`lib/storefront-types.ts` is mirrored byte-for-byte in the StoreCount repo. It is
one dependency-free file, so a package or submodule would cost more than it
saves. Instead the hash is pinned in `lib/.storefront-types.sha` and checked by
`npm run lint` in both repos — edit one side and the other fails to build until
you copy it across.

After an intentional change, copy the file to the other repo and run this in
**both**:

```bash
node scripts/check-contract.mjs --write
```

## Getting started

```bash
npm install
```

Copy `.env.local.example` to `.env.local` and fill in the **same** Supabase
project the merchant app uses:

```bash
cp .env.local.example .env.local
```

Run the schema in `../storecount/supabase/schema.sql` against that project, then:

```bash
npm run dev -- -p 3001
```

Visit `http://localhost:3001/{slug}` using a slug from the `stores` table. Note a
store is created **closed** — open it from StoreCount's Settings before ordering.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase.
Design tokens in `app/globals.css` are copied from StoreCount so the two apps
read as one product family.
