import "./globals.css";
import "./account.css";
import "./site.css";
import "./cinematic.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SessionProvider } from "@/components/workspace/session-provider";
import "./planner.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('voltroute-theme')==='light'?'light':'dark'}catch(e){}",
          }}
        />
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
