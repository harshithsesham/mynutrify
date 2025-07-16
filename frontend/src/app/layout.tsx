// src/app/layout.tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
    title: "Nutrify",
    description: "Your personal nutrition and fitness tracker",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        // By adding suppressHydrationWarning, we tell React to ignore
        // attribute mismatches on this element and its children, which
        // is often caused by browser extensions like Grammarly.
        <html lang="en" suppressHydrationWarning>
        <body
            className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        >
        {children}
        </body>
        </html>
    );
}