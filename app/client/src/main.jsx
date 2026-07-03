import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Toaster } from "sonner";
import "./i18n/index.js";

import "leaflet/dist/leaflet.css";
import "./index.css";

// Registro automático de la PWA
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    if (
      confirm("Hay una nueva versión de AgroSkopos disponible. ¿Actualizar?")
    ) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("AgroSkopos está listo para trabajar sin conexión.");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="bottom-right" richColors closeButton />
    </BrowserRouter>
  </React.StrictMode>,
);
