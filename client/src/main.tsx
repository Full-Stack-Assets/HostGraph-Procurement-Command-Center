import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const analyticsEndpoint = (import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined) ?? "";
const analyticsWebsiteId = (import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined) ?? "";

if (analyticsEndpoint && analyticsWebsiteId) {
  const normalizedEndpoint = analyticsEndpoint.replace(/\/+$/, "");
  const script = document.createElement("script");
  script.defer = true;
  script.src = `${normalizedEndpoint}/umami`;
  script.setAttribute("data-website-id", analyticsWebsiteId);
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(<App />);
