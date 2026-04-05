import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simple Recipe — 레시피 보드",
  description: "내 재료로 만들 수 있는 레시피를 Pinterest 스타일로 탐색하세요",
};

export default function PrototypeBLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
