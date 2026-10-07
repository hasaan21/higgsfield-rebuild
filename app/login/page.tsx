import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in — Higgsfield Rebuild" };

export default function LoginPage() {
  return (
    <main className="relative grid flex-1 place-items-center overflow-hidden px-4 py-12">
      <video
        className="absolute inset-0 -z-10 size-full object-cover opacity-30"
        src="/media/nebula.mp4"
        poster="/media/nebula.jpg"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
