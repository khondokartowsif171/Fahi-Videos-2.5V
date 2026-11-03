"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import AdminLoginModal from "@/components/AdminLoginModal";

export default function AdminPortalPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-[#050810] text-slate-100 flex items-center justify-center p-4">
      <AdminLoginModal
        isOpen={true}
        onClose={() => {
          router.push("/");
        }}
      />
    </div>
  );
}
