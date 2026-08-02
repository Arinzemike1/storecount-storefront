import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/queries";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  return (
    <div className="flex-1 flex flex-col mx-auto w-full max-w-md">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur pt-safe">
        <div className="px-5 h-14 flex items-center">
          <Link href={`/${slug}`} className="min-w-0">
            <h1 className="text-[20px] font-bold tracking-tight text-ink truncate">
              {store.name}
            </h1>
          </Link>
        </div>
        {!store.isOpen && (
          <p className="bg-warning-soft text-warning text-[13px] font-medium px-5 py-2">
            This shop isn&apos;t taking orders right now. Have a look around and
            check back soon.
          </p>
        )}
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
