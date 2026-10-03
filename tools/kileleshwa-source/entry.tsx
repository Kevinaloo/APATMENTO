import { createRoot } from "react-dom/client";
import Home from "./app/page";

const container = document.getElementById("root");
if (container) createRoot(container).render(<Home />);

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("dialog[open]") && window.parent !== window) {
    window.parent.postMessage({ type: "cabana-tour-close" }, location.origin);
  }
});
