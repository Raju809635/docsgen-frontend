import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function generateDocs(text) {
  const res = await axios.post(`${API_URL}/generate-docs`, { text });
  return res.data;
}

export async function renderGraphviz(dot) {
  const res = await axios.post(`${API_URL}/render-graphviz`, { dot });
  return res.data;
}

