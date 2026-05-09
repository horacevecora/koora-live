import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";

// حقن كود Monetag برمجياً كخط دفاع أخير
const injectMonetag = () => {
  if (!document.querySelector('script[src*="alwingulla.com"]')) {
    const script = document.createElement('script');
    script.src = "https://alwingulla.com/88/p.js?management=892345";
    document.head.prepend(script);
  }
};
injectMonetag();

createRoot(document.getElementById("root")!).render(<App />);