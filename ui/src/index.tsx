import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PackageSearch } from "./pages/package";
import { UnitSearch } from "./pages/unit";
import { Welcome } from "./pages/welcome";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Welcome />,
      },
      {
        path: "/packages",
        element: <PackageSearch />,
      },
      {
        path: "/services",
        element: <UnitSearch type={"services"} />,
      },
      {
        path: "/timers",
        element: <UnitSearch type={"timers"} />,
      },
    ],
  },
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
