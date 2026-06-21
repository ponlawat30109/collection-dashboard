import { useCallback, useEffect, useMemo, useState } from "react";
import { CollectionTable } from "./components/CollectionTable";
import { Header } from "./components/Header";
import { StatsGrid } from "./components/StatsGrid";
import type { ThemeChoice } from "./components/ThemePicker";
import type { Collection, CollectionsData, SavedWebsite } from "./types";

const API_URL = "http://127.0.0.1:8765/api";
const THEME_STORAGE_KEY = "collections-dashboard-theme";

function normalize(data: CollectionsData) {
  const collections: Collection[] = data.collections.map((collection) => ({
    id: collection.id,
    position: collection.position,
    title: collection.title,
    website_count: collection.websites.length,
  }));
  const websites: SavedWebsite[] = data.collections.flatMap((collection) =>
    collection.websites.map((website) => ({
      id: website.id,
      collection: collection.title,
      collectionPosition: collection.position,
      itemPosition: website.position,
      title: website.title,
      url: website.url,
      website: website.website,
    })),
  );
  return { collections, websites };
}

export default function App() {
  const [data, setData] = useState<CollectionsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "midnight" || saved === "archive" || saved === "ocean" || saved === "light"
      ? saved
      : "system";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      const resolved = theme === "system" ? (media.matches ? "light" : "midnight") : theme;
      document.documentElement.dataset.theme = resolved;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const changeTheme = (nextTheme: ThemeChoice) => {
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/data`);
      if (!response.ok) throw new Error("Could not load collection data");
      setData(await response.json() as CollectionsData);
      setError("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setError("The local JSON API is unavailable."));
  }, [refresh]);

  const normalized = useMemo(
    () => data ? normalize(data) : { collections: [], websites: [] },
    [data],
  );

  const addCollection = async (title: string) => {
    setError("");
    const response = await fetch(`${API_URL}/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Could not add collection");
      throw new Error(payload.error);
    }
    await refresh();
  };

  const deleteCollection = async (collection: Collection) => {
    setError("");
    const response = await fetch(`${API_URL}/collections/${encodeURIComponent(collection.id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Could not delete collection");
      return;
    }
    await refresh();
  };

  const deleteWebsite = async (website: SavedWebsite) => {
    setError("");
    const response = await fetch(`${API_URL}/items/${encodeURIComponent(website.id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Could not delete website");
      return;
    }
    await refresh();
  };

  const addWebsite = async (collection: Collection, title: string, url: string) => {
    setError("");
    const response = await fetch(
      `${API_URL}/collections/${encodeURIComponent(collection.id)}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url }),
      },
    );
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Could not add website");
      throw new Error(payload.error);
    }
    await refresh();
  };

  const websiteCount = normalized.websites.length;
  const largestCollection = normalized.collections.reduce(
    (largest, collection) =>
      collection.website_count > largest.website_count ? collection : largest,
    { id: "", position: 0, title: "-", website_count: 0 },
  );

  return (
    <main>
      <Header
        collectionCount={normalized.collections.length}
        websiteCount={websiteCount}
        status={loading ? "loading" : error ? "error" : "connected"}
        theme={theme}
        onThemeChange={changeTheme}
      />
      <StatsGrid
        stats={[
          { label: "Collections", value: normalized.collections.length },
          { label: "Saved websites", value: websiteCount },
          { label: "Largest collection", value: largestCollection.website_count, detail: largestCollection.title },
        ]}
      />
      {error && <p className="error-banner" role="alert">{error}</p>}
      {loading ? (
        <section className="panel loading-panel" aria-live="polite">
          <span className="loading-mark" aria-hidden="true" />
          <p>Opening your library...</p>
        </section>
      ) : (
        <CollectionTable
          collections={normalized.collections}
          websites={normalized.websites}
          onAdd={addCollection}
          onDelete={deleteCollection}
          onDeleteWebsite={deleteWebsite}
          onAddWebsite={addWebsite}
        />
      )}
    </main>
  );
}
