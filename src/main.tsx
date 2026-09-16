import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./app.tsx";

const main = (): void => {
  const root = document.querySelector("#root");

  if (root == undefined) {
    alert("couldn't find root");
    return;
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

main();
