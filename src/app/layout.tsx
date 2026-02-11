/**
 * 根布局文件：必须包含 html 和 body 标签
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN">
            <body>{children}</body>
        </html>
    );
}