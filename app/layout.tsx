import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "投资资金流向",
  description: "个人投资 Sankey 可视化",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full flex bg-background text-foreground">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-border flex flex-col py-6 px-4 gap-1">
          <div className="text-base font-semibold mb-4 px-2">投资流向</div>
          <NavLink href="/sankey">Sankey 图</NavLink>
          <NavLink href="/transactions">交易录入</NavLink>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {children}
    </Link>
  )
}
