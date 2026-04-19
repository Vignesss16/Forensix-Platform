import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Failed to render React app:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; background: #000; color: #fff; font-family: monospace;">
      <h1 style="color: #ff4444;">FORENSIX - Error</h1>
      <p>Failed to load the application:</p>
      <pre style="color: #ffaaaa;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}
