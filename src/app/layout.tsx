import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "ElevateLend — Premium Australian Business Lending",
    description:
          "Compare 75+ Australian business lenders in minutes. Fast approvals, competitive rates, no credit hit. Small business loans, lines of credit, vehicle & equipment finance.",
    keywords: [
          "business loans australia",
          "small business finance",
          "business lending",
          "equipment finance",
          "line of credit",
          "commercial lending",
          "business loan comparison",
        ],
    icons: {
          icon: [
            { url: "/images/favicon-32.png", sizes: "32x32", type: "image/png" },
            { url: "/images/favicon.png", sizes: "512x512", type: "image/png" },
                ],
          apple: "/images/apple-touch-icon.png",
    },
    openGraph: {
          title: "ElevateLend — Premium Australian Business Lending",
          description:
                  "Compare 75+ Australian business lenders in minutes. Fast approvals, competitive rates.",
          type: "website",
          locale: "en_AU",
          siteName: "ElevateLend",
          images: [
            {
                      url: "/images/og-image.png",
                      width: 1200,
                      height: 630,
                      alt: "ElevateLend — Premium Australian Business Lending",
            },
                ],
    },
    twitter: {
          card: "summary_large_image",
          title: "ElevateLend — Premium Australian Business Lending",
          description:
                  "Compare 75+ Australian business lenders in minutes. Fast approvals, competitive rates.",
          images: ["/images/og-image.png"],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
          <html lang="en" className={`${inter.variable} antialiased`}>
                  <body className="min-h-screen font-sans">{children}</body>body>
          </html>html>
        );
}
</body>
