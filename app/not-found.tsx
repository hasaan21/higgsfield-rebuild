import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid flex-1 place-items-center p-8 text-center">
      <div>
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This scene was cut.</h1>
        <Link href="/" className="mt-4 inline-block text-primary underline-offset-4 hover:underline">
          Back to the set
        </Link>
      </div>
    </main>
  );
}
