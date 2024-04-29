import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from "./App";
import GithubLogin from './GithubLogin'; // Make sure to create this component

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<GithubLogin />} />  // Route for the login page
      <Route path="/home" element={<App />} />  // Route for the main app
    </Routes>
  </BrowserRouter>
);
