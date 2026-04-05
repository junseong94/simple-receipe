import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "냉장고 탐색 | Simple Recipe",
  description: "냉장고 재료로 만들 수 있는 레시피를 찾아보세요",
};

export default function PrototypeALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
