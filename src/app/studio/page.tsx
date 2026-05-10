import type { Metadata } from "next";
import { WizardShell } from "@/components/studio/wizard-shell";

export const metadata: Metadata = {
  title: "스튜디오",
  description:
    "사진을 올리고 가게 정보를 입력해 인스타 카드뉴스를 만들어보세요.",
};

export default function StudioPage() {
  return <WizardShell />;
}
