import type { Metadata } from "next";
import "./globals.css";
import { ShopThemeProvider } from "@/components/theme/ShopThemeProvider";

export const metadata: Metadata = {
  title: "Tyler's Barbershop",
  description: "Professional barbershop services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ShopThemeProvider>{children}</ShopThemeProvider>
      </body>
    </html>
  );
}
