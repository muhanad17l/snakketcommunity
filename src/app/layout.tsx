import type { Metadata } from "next";
import { Inter, Zain } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const zain = Zain({ 
  subsets: ["arabic"], 
  weight: ["200", "300", "400", "700", "800", "900"],
  variable: "--font-zain" 
});

export const metadata: Metadata = {
  title: "Snakket Academy | المستقبل يبدأ من هنا",
  description: "المجتمع التعليمي الأول لتعلم البرمجة باحترافية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`h-full ${zain.variable} ${inter.variable}`}>
      <body className={`${zain.className} min-h-full flex flex-col bg-background text-foreground antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
