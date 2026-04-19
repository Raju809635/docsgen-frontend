import axios from "axios";

const PROD_API_URL = "https://docsgen-backend.onrender.com";

function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return PROD_API_URL;
  }

  return "http://localhost:8000";
}

const API_URL = resolveApiUrl();

export async function generateDocs(text, pageCount) {
  const res = await axios.post(`${API_URL}/generate-docs`, {
    text,
    page_count: pageCount,
  });
  return res.data;
}

export async function previewPages(text, pageCount) {
  const res = await axios.post(`${API_URL}/preview-pages`, {
    text,
    page_count: pageCount,
  });
  return res.data;
}

export async function renderGraphviz(dot) {
  const res = await axios.post(`${API_URL}/render-graphviz`, { dot });
  return res.data;
}
