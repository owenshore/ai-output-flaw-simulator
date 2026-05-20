import "./globals.css";

export const metadata = {
  title: "AI 输出漏洞模拟器",
  description: "用于批判性思维 RED 模型训练的课堂演示工具"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
