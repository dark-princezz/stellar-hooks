import React from "react";
import ReactDOM from "react-dom/client";
import { StellarProvider } from "stellar-hooks";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StellarProvider network="testnet">
      <App />
    </StellarProvider>
  </React.StrictMode>
);
