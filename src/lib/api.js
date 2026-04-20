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

export async function generateImage({
  prompt,
  negativePrompt = "",
  width = 1024,
  height = 768,
}) {
  const res = await axios.post(`${API_URL}/generate-image`, {
    prompt,
    negative_prompt: negativePrompt,
    width,
    height,
  });
  return res.data;
}

export async function generateVideo({
  story,
  sceneCount = 4,
  clipDurationSeconds = 3,
  width = 768,
  height = 432,
}) {
  const res = await axios.post(`${API_URL}/generate-video`, {
    story,
    scene_count: sceneCount,
    clip_duration_seconds: clipDurationSeconds,
    width,
    height,
  });
  return res.data;
}

export async function submitVideoJob({
  story,
  sceneCount = 4,
  clipDurationSeconds = 3,
  width = 768,
  height = 432,
}) {
  const res = await axios.post(`${API_URL}/video-jobs`, {
    story,
    scene_count: sceneCount,
    clip_duration_seconds: clipDurationSeconds,
    width,
    height,
  });
  return res.data;
}

export async function getVideoJob(jobId) {
  const res = await axios.get(`${API_URL}/video-jobs/${jobId}`);
  return res.data;
}
