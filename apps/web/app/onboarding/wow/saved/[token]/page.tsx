import { notFound } from "next/navigation";
import Link from "next/link";
import { getSavedPreview } from "@orb/api";
import { SavedPreview } from "./saved-preview";

export default async function SavedPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const saved = await getSavedPreview(token);
  if (!saved) notFound();
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-[32px] py-[24px] flex items-center border-b-hairline border-border sm:px-[20px] sm:py-[18px]">
        <Link href="/" className="flex items-center gap-md">
          <span
            className="w-[18px] h-[18px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1a1a1a 60%, #000 100%)",
            }}
          />
          <span className="text-sm font-medium">adfi</span>
        </Link>
      </header>
      <div className="flex-1 max-w-[1080px] w-full mx-auto px-[32px] pt-[60px] pb-[120px] sm:px-[20px] sm:pt-[40px] sm:pb-[80px]">
        <SavedPreview
          businessDescription={saved.businessDescription}
          result={saved.result}
        />
      </div>
    </div>
  );
}
