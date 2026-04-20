import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import DocSection from "../components/DocSection.jsx";
import DiagramGallery from "../components/DiagramGallery.jsx";
import ExportBar from "../components/ExportBar.jsx";
import {
  generateDocs,
  generateImage,
  generateVideo,
  getVideoJob,
  previewPages,
  renderGraphviz,
  submitVideoJob,
} from "../lib/api.js";
import DOMPurify from "dompurify";

const STARTER = `# Example Input

Build an AI documentation generator.
- Accept markdown/code
- Generate structured docs
- Render Mermaid + Graphviz
- Export to PDF/HTML
`;

function getNonEmptyPages(doc) {
  return (doc?.pages || []).filter((page) =>
    (page.sections || []).some((section) => String(section?.content || "").trim()),
  );
}

function isDiagramLikeSection(section) {
  const title = String(section?.title || "").toLowerCase();
  const content = String(section?.content || "").toLowerCase().trim();
  if (title.includes("diagram") || title.includes("mermaid") || title.includes("graphviz")) {
    return true;
  }
  if (content.startsWith("flowchart ") || content.startsWith("sequencediagram")) {
    return true;
  }
  if (content.startsWith("graph ") || content.startsWith("digraph ")) {
    return true;
  }
  return content.includes("classdef ") || content.includes("linkstyle ");
}

function getNarrativeSections(doc) {
  return (doc?.sections || []).filter((section) => !isDiagramLikeSection(section));
}

function getDriveFileId(url) {
  const value = String(url || "");
  const match = value.match(/\/file\/d\/([^/]+)/) || value.match(/[?&]id=([^&]+)/);
  return match?.[1] || "";
}

function getEmbeddableVideoUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }

  const driveFileId = getDriveFileId(value);
  if (driveFileId) {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }

  return value;
}

function getDownloadableVideoUrl(url) {
  const value = String(url || "").trim();
  if (!value) {
    return "";
  }

  const driveFileId = getDriveFileId(value);
  if (driveFileId) {
    return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
  }

  return value;
}

function TitleBlock() {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-slate-400">
          AI Documentation Generator
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-semibold leading-tight">
          Turn rough inputs into clean docs
          <span className="text-sky-300"> with colorful diagrams</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300/90 leading-relaxed">
          Paste text, markdown, or code. The backend returns strict JSON sections
          plus Mermaid diagram code that renders in the UI.
        </p>
      </div>
      <div className="hidden lg:block">
        <div className="rounded-2xl border border-slate-700/40 bg-slate-950/20 px-4 py-3 text-xs text-slate-300">
          <div className="font-semibold text-slate-100">Tip</div>
          <div className="mt-1">
            Use clear nouns (services, modules, flows) to get better diagrams.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeneratorPage() {
  const [text, setText] = useState(STARTER);
  const [pageCount, setPageCount] = useState(5);
  const [preview, setPreview] = useState(null);
  const [doc, setDoc] = useState(null);
  const [mermaidSvgMap, setMermaidSvgMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imagePrompt, setImagePrompt] = useState(
    "Create a clean modern illustration of the system architecture for this documentation topic.",
  );
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, distorted, watermark, low quality, cropped text",
  );
  const [imageWidth, setImageWidth] = useState(1024);
  const [imageHeight, setImageHeight] = useState(768);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [videoStory, setVideoStory] = useState(
    "A futuristic city at night with flying cars. A hero walks through neon streets. Suddenly a robot attacks. A high-speed chase begins. The hero outsmarts the robot and restores calm to the city.",
  );
  const [videoSceneCount, setVideoSceneCount] = useState(4);
  const [videoClipDuration, setVideoClipDuration] = useState(3);
  const [videoWidth, setVideoWidth] = useState(768);
  const [videoHeight, setVideoHeight] = useState(432);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoJobLoading, setVideoJobLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoResult, setVideoResult] = useState(null);
  const [videoJob, setVideoJob] = useState(null);

  const [dot, setDot] = useState(
    `digraph G {
  rankdir=LR;
  node [shape=box, style="rounded,filled", fillcolor="#0b1220", color="#38bdf8", fontcolor="#e2e8f0"];
  edge [color="#94a3b8"];
  Input -> "AI Structuring" -> "Mermaid Diagram" -> "Export PDF/HTML";
  "AI Structuring" -> "Tech Breakdown";
}`,
  );
  const [graphvizSvg, setGraphvizSvg] = useState("");
  const [graphvizSvgMap, setGraphvizSvgMap] = useState({});
  const [graphvizErr, setGraphvizErr] = useState("");

  const exportRef = useRef(null);
  const visiblePages = getNonEmptyPages(doc);
  const visibleSections = getNarrativeSections(doc);
  const finalVideoEmbedUrl = getEmbeddableVideoUrl(videoJob?.video_url);
  const finalVideoDownloadUrl = getDownloadableVideoUrl(videoJob?.video_url);

  const canGenerate = useMemo(() => text.trim().length > 0 && !loading, [text, loading]);
  const canPreview = useMemo(
    () => text.trim().length > 0 && !previewLoading,
    [text, previewLoading],
  );
  const canGenerateImage = useMemo(
    () => imagePrompt.trim().length > 0 && !imageLoading,
    [imagePrompt, imageLoading],
  );
  const canGenerateVideo = useMemo(
    () => videoStory.trim().length > 0 && !videoLoading,
    [videoStory, videoLoading],
  );
  const canSubmitVideoJob = useMemo(
    () => videoStory.trim().length > 0 && !videoJobLoading,
    [videoStory, videoJobLoading],
  );

  useEffect(() => {
    if (!videoJob?.job_id) {
      return undefined;
    }

    if (!["pending", "processing"].includes(videoJob.status)) {
      return undefined;
    }

    const timer = window.setInterval(async () => {
      try {
        const freshJob = await getVideoJob(videoJob.job_id);
        setVideoJob(freshJob);
      } catch {
        return;
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [videoJob]);

  function handleMermaidSvg(index, svg) {
    setMermaidSvgMap((current) => ({
      ...current,
      [index]: svg,
    }));
  }

  async function onPreviewPages() {
    setPreviewLoading(true);
    setError("");
    try {
      const data = await previewPages(text, pageCount);
      setPreview(data);
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Preview request failed. Is the backend running?",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onGenerate() {
    setLoading(true);
    setError("");
    setDoc(null);
    setMermaidSvgMap({});
    setGraphvizSvgMap({});
    try {
      const data = await generateDocs(text, pageCount);
      setDoc(data);
      const graphvizEntries = (data?.diagrams || [])
        .map((diagram, index) => ({ diagram, index }))
        .filter(({ diagram }) => diagram.type === "graphviz" && diagram.code);

      if (graphvizEntries.length > 0) {
        const renderedPairs = await Promise.all(
          graphvizEntries.map(async ({ diagram, index }) => {
            try {
              const res = await renderGraphviz(diagram.code);
              const clean = DOMPurify.sanitize(res?.svg || "", { USE_PROFILES: { svg: true } });
              return [index, clean];
            } catch {
              return [index, ""];
            }
          }),
        );
        setGraphvizSvgMap(Object.fromEntries(renderedPairs));
      }
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
          e?.message ||
          "Request failed. Is the backend running?",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onGenerateImage() {
    setImageLoading(true);
    setImageError("");

    try {
      const data = await generateImage({
        prompt: imagePrompt,
        negativePrompt,
        width: imageWidth,
        height: imageHeight,
      });
      setGeneratedImages((current) => [data, ...current].slice(0, 6));
    } catch (e) {
      setImageError(
        e?.response?.data?.detail ||
          e?.message ||
          "Image generation failed. Check the backend Hugging Face configuration.",
      );
    } finally {
      setImageLoading(false);
    }
  }

  async function onGenerateVideo() {
    setVideoLoading(true);
    setVideoError("");

    try {
      const data = await generateVideo({
        story: videoStory,
        sceneCount: videoSceneCount,
        clipDurationSeconds: videoClipDuration,
        width: videoWidth,
        height: videoHeight,
      });
      setVideoResult(data);
    } catch (e) {
      setVideoError(
        e?.response?.data?.detail ||
          e?.message ||
          "Video generation failed. Check the backend configuration and Hugging Face access.",
      );
    } finally {
      setVideoLoading(false);
    }
  }

  async function onSubmitVideoJob() {
    setVideoJobLoading(true);
    setVideoError("");

    try {
      const data = await submitVideoJob({
        story: videoStory,
        sceneCount: videoSceneCount,
        clipDurationSeconds: videoClipDuration,
        width: videoWidth,
        height: videoHeight,
      });
      setVideoJob(data);
    } catch (e) {
      setVideoError(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not queue the Colab video job.",
      );
    } finally {
      setVideoJobLoading(false);
    }
  }

  async function onRefreshVideoJob() {
    if (!videoJob?.job_id) {
      return;
    }

    setVideoJobLoading(true);
    try {
      const data = await getVideoJob(videoJob.job_id);
      setVideoJob(data);
    } catch (e) {
      setVideoError(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not refresh the queued video job.",
      );
    } finally {
      setVideoJobLoading(false);
    }
  }

  async function onRenderGraphviz() {
    setGraphvizErr("");
    setGraphvizSvg("");
    try {
      const res = await renderGraphviz(dot);
      if (res?.error) {
        setGraphvizErr(res.error);
        return;
      }
      const clean = DOMPurify.sanitize(res?.svg || "", { USE_PROFILES: { svg: true } });
      setGraphvizSvg(clean);
    } catch (e) {
      setGraphvizErr(e?.message || "Graphviz request failed.");
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <TitleBlock />

        <div className="mt-7 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between">
              <div className="text-sm font-semibold">Input</div>
              <div className="text-xs text-slate-400">
                text, markdown, or code
              </div>
            </div>
            <div className="p-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="h-[360px] w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/10"
                placeholder="Paste anything..."
              />
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <label className="block">
                  <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    Target pages
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={pageCount}
                    onChange={(e) => {
                      const nextValue = Number.parseInt(e.target.value || "1", 10);
                      const safeValue = Number.isNaN(nextValue)
                        ? 1
                        : Math.min(50, Math.max(1, nextValue));
                      setPageCount(safeValue);
                    }}
                    className="w-32 rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/10"
                  />
                </label>
                <div className="pb-3 text-xs text-slate-400">
                  Choose any value from 1 to 50 pages.
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button
                  className="bg-emerald-500/15 border-emerald-400/30 hover:bg-emerald-500/20 hover:border-emerald-300/40 text-emerald-50"
                  onClick={onPreviewPages}
                  disabled={!canPreview}
                >
                  {previewLoading ? "Planning..." : "Preview Pages"}
                </Button>
                <Button onClick={onGenerate} disabled={!canGenerate}>
                  {loading ? "Generating..." : "Generate Docs"}
                </Button>
                <Button
                  className="bg-slate-800/40 border-slate-600/40 hover:bg-slate-800/55 hover:border-slate-500/45 text-slate-100"
                  onClick={() => {
                    setText(STARTER);
                    setError("");
                    setPreview(null);
                    setDoc(null);
                    setMermaidSvgMap({});
                    setGraphvizSvgMap({});
                    setGeneratedImages([]);
                    setImageError("");
                    setVideoResult(null);
                    setVideoJob(null);
                    setVideoError("");
                    setPageCount(5);
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
              {error ? (
                <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}
              {preview ? (
                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-slate-950/20 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-emerald-300">
                    Page-wise Preview
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-100">
                    {preview.title}
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-slate-300">
                    {preview.summary}
                  </div>
                  <div className="mt-4 space-y-3">
                    {preview.pages.map((page) => (
                      <div
                        key={page.page_number}
                        className="rounded-xl border border-slate-700/40 bg-slate-900/30 p-3"
                      >
                        <div className="text-sm font-semibold text-sky-200">
                          Page {page.page_number}: {page.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          {page.summary}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {page.sections.map((section, index) => (
                            <span
                              key={`${page.page_number}-${index}`}
                              className="rounded-full border border-slate-700/40 bg-slate-950/40 px-3 py-1 text-xs text-slate-300"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold">Output</div>
              <ExportBar
                doc={doc}
                mermaidSvgMap={mermaidSvgMap}
                graphvizSvgMap={graphvizSvgMap}
                generatedImages={generatedImages}
              />
            </div>

            <div
              ref={exportRef}
              className="p-0"
              style={{ backgroundColor: "rgba(2,6,23,0.35)" }}
            >
              {!doc ? (
                <div className="p-6 text-sm text-slate-400">
                  Generated documentation will appear here.
                </div>
              ) : (
                <div>
                  <DocSection label="Title" value={doc.title} />
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Overview" value={doc.overview} />
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Workflow" value={doc.workflow} />
                  <div className="border-t border-slate-700/40" />
                  <DiagramGallery
                    diagrams={doc.diagrams}
                    onMermaidSvg={handleMermaidSvg}
                    graphvizSvgMap={graphvizSvgMap}
                  />
                  {!!generatedImages.length && (
                    <>
                      <div className="border-t border-slate-700/40" />
                      <section className="p-5">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                          Generated Images
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4">
                          {generatedImages.map((image, index) => (
                            <div
                              key={`${image.prompt}-${index}`}
                              className="rounded-2xl border border-amber-400/20 bg-slate-950/20 p-4"
                            >
                              <img
                                src={image.image_data_url}
                                alt={image.prompt}
                                className="w-full rounded-2xl border border-slate-700/40 bg-slate-950/40 object-cover"
                              />
                              <div className="mt-3 text-sm font-medium text-slate-100">
                                Prompt
                              </div>
                              <div className="mt-1 text-sm leading-relaxed text-slate-300">
                                {image.prompt}
                              </div>
                              <div className="mt-2 text-xs text-slate-400">
                                {image.model} - {image.mime_type}
                              </div>
                              <div className="mt-3">
                                <a
                                  href={image.image_data_url}
                                  download={`generated-image-${index + 1}.png`}
                                  className="inline-flex rounded-xl border border-amber-400/30 bg-amber-500/15 px-3 py-2 text-sm text-amber-50 transition hover:bg-amber-500/20 hover:border-amber-300/40"
                                >
                                  Download Image
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Technical Breakdown" value={doc.technical} />
                  <div className="border-t border-slate-700/40" />
                  <DocSection label="Use Cases" value={doc.use_cases} />
                  {!!visibleSections.length && (
                    <>
                      <div className="border-t border-slate-700/40" />
                      <section className="p-5">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                          Detailed Sections
                        </div>
                        <div className="mt-4 space-y-4">
                          {visibleSections.map((section, index) => (
                            <div
                              key={`${section.title}-${index}`}
                              className="rounded-2xl border border-slate-700/40 bg-slate-950/20 p-4"
                            >
                              <div className="text-sm font-semibold text-slate-100">
                                {section.title}
                              </div>
                              <div className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-200">
                                {section.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                  {!!visiblePages.length && (
                    <>
                      <div className="border-t border-slate-700/40" />
                      <section className="p-5">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                          Export Pages
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          Requested page count: {pageCount}
                        </div>
                        <div className="mt-4 space-y-5">
                          {visiblePages.map((page, index) => (
                            <div
                              key={`${page.title}-${index}`}
                              className="rounded-2xl border border-sky-400/20 bg-slate-900/30 p-4"
                            >
                              <div className="text-sm font-semibold text-sky-200">
                                {page.title}
                              </div>
                              <div className="mt-3 space-y-3">
                                {page.sections.map((section, sectionIndex) => (
                                  <div
                                    key={`${section.title}-${sectionIndex}`}
                                    className="rounded-xl border border-slate-700/40 bg-slate-950/30 p-3"
                                  >
                                    <div className="text-sm font-medium text-slate-100">
                                      {section.title}
                                    </div>
                                    <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                                      {section.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">AI Video Generator</div>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-cyan-500/15 border-cyan-400/30 hover:bg-cyan-500/20 hover:border-cyan-300/40 text-cyan-50"
                  onClick={onGenerateVideo}
                  disabled={!canGenerateVideo}
                >
                  {videoLoading ? "Generating Preview..." : "Generate Quick Preview"}
                </Button>
                <Button
                  className="bg-indigo-500/15 border-indigo-400/30 hover:bg-indigo-500/20 hover:border-indigo-300/40 text-indigo-50"
                  onClick={onSubmitVideoJob}
                  disabled={!canSubmitVideoJob}
                >
                  {videoJobLoading ? "Queueing..." : "Generate Final In Colab"}
                </Button>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-5">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    Story
                  </div>
                  <textarea
                    value={videoStory}
                    onChange={(e) => setVideoStory(e.target.value)}
                    className="h-40 w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                    placeholder="Write the story or explainer script for the video..."
                  />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Scenes
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={videoSceneCount}
                      onChange={(e) => setVideoSceneCount(Number.parseInt(e.target.value || "4", 10) || 4)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Seconds
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={videoClipDuration}
                      onChange={(e) => setVideoClipDuration(Number.parseInt(e.target.value || "3", 10) || 3)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Width
                    </div>
                    <input
                      type="number"
                      min="320"
                      max="1280"
                      step="64"
                      value={videoWidth}
                      onChange={(e) => setVideoWidth(Number.parseInt(e.target.value || "768", 10) || 768)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Height
                    </div>
                    <input
                      type="number"
                      min="240"
                      max="1280"
                      step="64"
                      value={videoHeight}
                      onChange={(e) => setVideoHeight(Number.parseInt(e.target.value || "432", 10) || 432)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-500/10"
                    />
                  </label>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/20 p-4 text-sm text-slate-300">
                  Quick preview pipeline: Story - Scenes - Image prompts - Scene images - Stitched MP4 preview
                </div>
                <div className="rounded-2xl border border-indigo-400/20 bg-slate-950/20 p-4 text-sm text-slate-300">
                  Final automation pipeline: app submits a job, your Colab notebook generates real scene clips, stitches them, and posts the final video back here.
                </div>
                {videoError ? (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {videoError}
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/30 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                  Video Output
                </div>
                {videoResult ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {videoResult.title}
                      </div>
                      <div className="mt-1 text-sm leading-relaxed text-slate-300">
                        {videoResult.summary}
                      </div>
                    </div>
                    <video
                      controls
                      src={videoResult.video_data_url}
                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-950/40"
                    />
                    <a
                      href={videoResult.video_data_url}
                      download="generated-video.mp4"
                      className="inline-flex rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-50 transition hover:bg-cyan-500/20 hover:border-cyan-300/40"
                    >
                      Download Video
                    </a>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-400">
                    Your stitched preview video will appear here with downloadable MP4 output.
                  </div>
                )}

                {videoJob ? (
                  <div className="mt-5 rounded-2xl border border-indigo-400/20 bg-slate-950/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-indigo-200">
                          Colab Job
                        </div>
                        <div className="mt-2 text-sm text-slate-300">
                          Job ID: <span className="text-slate-100">{videoJob.job_id}</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-300">
                          Status: <span className="text-indigo-200">{videoJob.status}</span>
                        </div>
                      </div>
                      <Button
                        className="bg-slate-800/40 border-slate-600/40 hover:bg-slate-800/55 hover:border-slate-500/45 text-slate-100"
                        onClick={onRefreshVideoJob}
                        disabled={videoJobLoading}
                      >
                        {videoJobLoading ? "Refreshing..." : "Refresh Job"}
                      </Button>
                    </div>

                    {videoJob.summary ? (
                      <div className="mt-3 text-sm leading-relaxed text-slate-300">
                        {videoJob.summary}
                      </div>
                    ) : null}

                    {videoJob.error ? (
                      <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        {videoJob.error}
                      </div>
                    ) : null}

                    {videoJob.video_url ? (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl border border-slate-700/40 bg-slate-950/40 p-2">
                          {finalVideoEmbedUrl.includes("drive.google.com/file/d/") ? (
                            <iframe
                              src={finalVideoEmbedUrl}
                              title="Final Colab video"
                              allow="autoplay"
                              className="h-[360px] w-full rounded-xl border-0 bg-slate-950"
                            />
                          ) : (
                            <video
                              controls
                              src={finalVideoEmbedUrl}
                              className="w-full rounded-xl border border-slate-700/40 bg-slate-950/40"
                            />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <a
                            href={videoJob.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-sm text-indigo-50 transition hover:bg-indigo-500/20 hover:border-indigo-300/40"
                          >
                            Open Final Video
                          </a>
                          <a
                            href={finalVideoDownloadUrl}
                            download="final-colab-video.mp4"
                            className="inline-flex rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-50 transition hover:bg-emerald-500/20 hover:border-emerald-300/40"
                          >
                            Download To Device
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-slate-400">
                        Waiting for Colab to process this job and post back the final video URL.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
            {videoResult ? (
              <div className="border-t border-slate-700/40 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Scene Breakdown
                </div>
                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {videoResult.scenes.map((scene) => (
                    <div
                      key={`${scene.scene_number}-${scene.title}`}
                      className="rounded-2xl border border-cyan-400/20 bg-slate-950/20 p-4"
                    >
                      {scene.image_data_url ? (
                        <img
                          src={scene.image_data_url}
                          alt={scene.title}
                          className="w-full rounded-2xl border border-slate-700/40 bg-slate-950/40 object-cover"
                        />
                      ) : null}
                      <div className="mt-3 text-sm font-semibold text-cyan-200">
                        Scene {scene.scene_number}: {scene.title}
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-slate-300">
                        {scene.narration}
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3 text-xs leading-relaxed text-slate-400">
                        <span className="text-slate-200">Image prompt:</span> {scene.image_prompt}
                      </div>
                    </div>
                  ))}
                </div>
                {!!videoResult.captions?.length && (
                  <div className="mt-5 rounded-2xl border border-slate-700/40 bg-slate-950/20 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Captions
                    </div>
                    <div className="mt-3 space-y-2">
                      {videoResult.captions.map((caption, index) => (
                        <div
                          key={`caption-${index + 1}`}
                          className="rounded-xl border border-slate-700/30 bg-slate-950/40 px-3 py-2 text-sm text-slate-300"
                        >
                          {index + 1}. {caption}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <div className="border-t border-slate-700/40 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Colab Worker Steps
              </div>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
                <div>1. In Colab, call <code>GET /video-jobs/pending</code> with your worker token.</div>
                <div>2. Pick a pending job, generate the Drive video, then call <code>POST /video-jobs/&lt;job_id&gt;/update</code>.</div>
                <div>3. Set status to <code>processing</code>, then <code>completed</code> with the final public <code>video_url</code>.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">AI Image Generator</div>
              <Button
                className="bg-amber-500/15 border-amber-400/30 hover:bg-amber-500/20 hover:border-amber-300/40 text-amber-50"
                onClick={onGenerateImage}
                disabled={!canGenerateImage}
              >
                {imageLoading ? "Generating Image..." : "Generate Image"}
              </Button>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-5">
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    Prompt
                  </div>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="h-36 w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/10"
                    placeholder="Describe the image you want..."
                  />
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    Negative Prompt
                  </div>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="h-24 w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/10"
                    placeholder="Things to avoid..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Width
                    </div>
                    <input
                      type="number"
                      min="256"
                      max="1536"
                      step="64"
                      value={imageWidth}
                      onChange={(e) => setImageWidth(Number.parseInt(e.target.value || "1024", 10) || 1024)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/10"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Height
                    </div>
                    <input
                      type="number"
                      min="256"
                      max="1536"
                      step="64"
                      value={imageHeight}
                      onChange={(e) => setImageHeight(Number.parseInt(e.target.value || "768", 10) || 768)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/10"
                    />
                  </label>
                </div>
                {imageError ? (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {imageError}
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-slate-900/30 p-4">
                <div className="text-xs uppercase tracking-[0.22em] text-amber-200">
                  Latest Image
                </div>
                {generatedImages[0] ? (
                  <div className="mt-4 space-y-3">
                    <img
                      src={generatedImages[0].image_data_url}
                      alt={generatedImages[0].prompt}
                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-950/40 object-cover"
                    />
                    <div className="text-sm leading-relaxed text-slate-300">
                      {generatedImages[0].prompt}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-400">
                    Generated images will appear here and will also be included in exported PDF/HTML files.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-700/40 px-5 py-4 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Graphviz (Optional)</div>
              <Button
                className="bg-fuchsia-500/15 border-fuchsia-400/30 hover:bg-fuchsia-500/20 hover:border-fuchsia-300/40 text-fuchsia-50"
                onClick={onRenderGraphviz}
              >
                Render DOT
              </Button>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <textarea
                value={dot}
                onChange={(e) => setDot(e.target.value)}
                className="h-[260px] w-full resize-none rounded-2xl border border-slate-700/50 bg-slate-950/40 px-4 py-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/10"
              />
              <div className="rounded-2xl border border-fuchsia-400/20 bg-slate-900/40 p-4 overflow-auto min-h-[260px]">
                {graphvizErr ? (
                  <div className="text-sm text-rose-200 whitespace-pre-wrap">
                    {graphvizErr}
                  </div>
                ) : graphvizSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: graphvizSvg }} />
                ) : (
                  <div className="text-sm text-slate-400">
                    Rendered Graphviz SVG will appear here.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8 text-xs text-slate-500">
          API URL:{" "}
          <span className="text-slate-300">
            {import.meta.env.VITE_API_URL || "http://localhost:8000"}
          </span>
        </div>
      </div>
    </div>
  );
}
