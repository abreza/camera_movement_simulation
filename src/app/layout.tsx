import { ReduxProvider } from "@/redux/provider";
import ThemeRegistry from "../components/ui/ThemeRegistry";

import { ToastContainer } from "react-toastify";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
          <ToastContainer />
        </ReduxProvider>
      </body>
    </html>
  );
}
