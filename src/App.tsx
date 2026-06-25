import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { CollectionTable } from "./components/CollectionTable";
import { Header } from "./components/Header";
import { StatsGrid } from "./components/StatsGrid";
import type { ThemeChoice } from "./components/ThemePicker";
import { ThemePicker } from "./components/ThemePicker";
import { supabase } from "./supabase";
import type { Collection, SavedWebsite } from "./types";

const THEME_STORAGE_KEY = "collections-dashboard-theme";
const LOCAL_DATA_STORAGE_KEY = "collections-dashboard-local-data";

function friendlyAuthError(message: string) {
  const normalized = message.toLocaleLowerCase();
  if (normalized.includes("email rate limit exceeded")) {
    return "Too many emails were requested. Please wait a while, then try again.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  return message;
}

interface LocalData {
  collections: Collection[];
  websites: SavedWebsite[];
}

async function fetchWebsiteTitle(url: string) {
  const titleUrl = `/api/title?url=${encodeURIComponent(url)}`;
  const localTitleUrl = `http://127.0.0.1:8765${titleUrl}`;
  const candidates = [titleUrl];
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    candidates.push(localTitleUrl);
  }
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) continue;
      const data = await response.json() as { title?: string };
      const title = String(data.title ?? "").trim();
      if (title) return title;
    } catch {
      continue;
    }
  }
  return "";
}

interface BackupData {
  version: 1;
  exportedAt: string;
  collections: Array<{
    title: string;
    position: number;
    websites: Array<{
      title: string;
      url: string;
      website: string;
      position: number;
    }>;
  }>;
}

interface AuthPanelProps {
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  onContinueLocally: () => void;
}

function AuthPanel({ theme, onThemeChange, onContinueLocally }: AuthPanelProps) {
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const authenticate = async (mode: "login" | "signup", event: FormEvent) => {
    event.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    setMessage(
      result.error ? friendlyAuthError(result.error.message) :
      (mode === "signup"
        ? "If this email is new, check your inbox to confirm it. If you already have an account, sign in instead."
        : ""),
    );
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage("Enter your email address first.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    setMessage(
      error ? friendlyAuthError(error.message) :
      "If an account exists for this email, a password reset link has been sent.",
    );
  };

  const switchAuthMode = (mode: "login" | "signup" | "reset") => {
    setAuthMode(mode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setMessage("");
  };

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <div className="auth-theme">
          <ThemePicker value={theme} onChange={onThemeChange} />
        </div>
        <p className="eyebrow">PERSONAL WEB LIBRARY</p>
        <h1>Collections</h1>
        <p>
          {authMode === "login"
            ? "Sign in to open your private library."
            : authMode === "signup"
              ? "Create an account for your private cloud library."
              : "Enter your email and we’ll send you a password reset link."}
        </p>
        <form onSubmit={(event) => {
          if (authMode === "reset") {
            event.preventDefault();
            void resetPassword();
          } else {
            void authenticate(authMode, event);
          }
        }}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" required />
          {authMode !== "reset" && (
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" minLength={6} required />
          )}
          {authMode === "signup" && (
            <>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" minLength={6} required />
              <p className="password-note">Use at least 6 characters. You may need to confirm your email before signing in.</p>
            </>
          )}
          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait…" : authMode === "login" ? "Sign in" : authMode === "signup" ? "Create account" : "Send reset link"}
          </button>
        </form>
        {authMode === "login" ? (
          <div className="auth-links">
            <button type="button" onClick={() => switchAuthMode("reset")}>Forgot password?</button>
            <span>New to Collections?</span>
            <button type="button" onClick={() => switchAuthMode("signup")}>Create an account</button>
          </div>
        ) : (
          <p className="auth-switch">
            {authMode === "signup" ? "Already have an account?" : "Remembered your password?"}
            <button type="button" onClick={() => switchAuthMode("login")}>Back to sign in</button>
          </p>
        )}
        <div className="local-divider"><span>or</span></div>
        <button className="local-mode-button" type="button" onClick={onContinueLocally}>
          Continue locally
          <small>Data stays only in this browser</small>
        </button>
        {message && <p className="auth-message" role="status">{message}</p>}
      </section>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [localMode, setLocalMode] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [websites, setWebsites] = useState<SavedWebsite[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "midnight" || saved === "archive" || saved === "ocean" ||
      saved === "forest" || saved === "violet" || saved === "rose" || saved === "light"
      ? saved
      : "system";
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const applyTheme = () => {
      document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "light" : "midnight") : theme;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  const refresh = useCallback(async () => {
    if (localMode) {
      const saved = localStorage.getItem(LOCAL_DATA_STORAGE_KEY);
      if (saved) {
        const localData = JSON.parse(saved) as LocalData;
        setCollections(localData.collections);
        setWebsites(localData.websites);
      } else {
        setCollections([]);
        setWebsites([]);
      }
      setError("");
      setLoading(false);
      return;
    }
    if (!session) return;
    setLoading(true);
    const [{ data: collectionRows, error: collectionError }, { data: websiteRows, error: websiteError }] = await Promise.all([
      supabase.from("collections").select("id,title,position").order("position"),
      supabase.from("websites").select("id,collection_id,title,url,website,position").order("position"),
    ]);
    const failure = collectionError ?? websiteError;
    if (failure) {
      setError(failure.message);
      setLoading(false);
      return;
    }
    const nextWebsites: SavedWebsite[] = (websiteRows ?? []).map((website) => ({
      id: website.id,
      collectionId: website.collection_id,
      itemPosition: website.position,
      title: website.title,
      url: website.url,
      website: website.website,
    }));
    setWebsites(nextWebsites);
    setCollections((collectionRows ?? []).map((collection) => ({
      ...collection,
      website_count: nextWebsites.filter((website) => website.collectionId === collection.id).length,
    })));
    setError("");
    setLoading(false);
  }, [localMode, session]);

  useEffect(() => { void refresh(); }, [refresh]);

  const addCollection = async (title: string) => {
    if (localMode) {
      const nextCollections = [...collections, {
        id: crypto.randomUUID(),
        title,
        position: Math.max(0, ...collections.map((item) => item.position)) + 1,
        website_count: 0,
      }];
      setCollections(nextCollections);
      localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify({ collections: nextCollections, websites }));
      return;
    }
    if (!session) return;
    const { data, error: requestError } = await supabase.from("collections").insert({
      title,
      user_id: session.user.id,
      position: Math.max(0, ...collections.map((item) => item.position)) + 1,
    }).select("id,title,position").single();
    if (requestError) throw new Error(requestError.message);
    setCollections((current) => [...current, { ...data, website_count: 0 }]);
    setError("");
  };

  const deleteCollection = async (collection: Collection) => {
    if (localMode) {
      const nextCollections = collections.filter((item) => item.id !== collection.id);
      const nextWebsites = websites.filter((item) => item.collectionId !== collection.id);
      setCollections(nextCollections);
      setWebsites(nextWebsites);
      localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify({ collections: nextCollections, websites: nextWebsites }));
      if (selectedCollectionId === collection.id) setSelectedCollectionId("all");
      return;
    }
    const { error: requestError } = await supabase.from("collections").delete().eq("id", collection.id);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setCollections((current) => current.filter((item) => item.id !== collection.id));
    setWebsites((current) => current.filter((item) => item.collectionId !== collection.id));
    setError("");
    if (selectedCollectionId === collection.id) setSelectedCollectionId("all");
  };

  const deleteWebsite = async (website: SavedWebsite) => {
    if (localMode) {
      const nextWebsites = websites.filter((item) => item.id !== website.id);
      const nextCollections = collections.map((collection) => ({
        ...collection,
        website_count: nextWebsites.filter((item) => item.collectionId === collection.id).length,
      }));
      setCollections(nextCollections);
      setWebsites(nextWebsites);
      localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify({ collections: nextCollections, websites: nextWebsites }));
      return;
    }
    const { error: requestError } = await supabase.from("websites").delete().eq("id", website.id);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setWebsites((current) => current.filter((item) => item.id !== website.id));
    setCollections((current) => current.map((collection) =>
      collection.id === website.collectionId
        ? { ...collection, website_count: Math.max(0, collection.website_count - 1) }
        : collection,
    ));
    setError("");
  };

  const editWebsite = async (website: SavedWebsite, title: string, rawUrl: string) => {
    const nextTitle = title.trim();
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Enter a valid URL.");
    const nextUrl = parsed.toString();
    const nextDomain = parsed.hostname.replace(/^www\./, "");
    if (!nextTitle) throw new Error("Website title is required.");
    if (websites.some((item) =>
      item.id !== website.id &&
      item.collectionId === website.collectionId &&
      item.url === nextUrl
    )) {
      throw new Error("This website already exists in the collection.");
    }
    if (localMode) {
      const nextWebsites = websites.map((item) =>
        item.id === website.id
          ? { ...item, title: nextTitle, url: nextUrl, website: nextDomain }
          : item,
      );
      setWebsites(nextWebsites);
      localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify({ collections, websites: nextWebsites }));
      return;
    }
    const { data, error: requestError } = await supabase
      .from("websites")
      .update({ title: nextTitle, url: nextUrl, website: nextDomain })
      .eq("id", website.id)
      .select("id,collection_id,title,url,website,position")
      .single();
    if (requestError) throw new Error(requestError.message);
    const renamedWebsite: SavedWebsite = {
      id: data.id,
      collectionId: data.collection_id,
      itemPosition: data.position,
      title: data.title,
      url: data.url,
      website: data.website,
    };
    setWebsites((current) => current.map((item) => item.id === website.id ? renamedWebsite : item));
  };

  const addWebsite = async (collection: Collection, title: string, rawUrl: string) => {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Enter a valid URL.");
    const normalizedUrl = parsed.toString();
    const websiteDomain = parsed.hostname.replace(/^www\./, "");
    const resolvedTitle = title || await fetchWebsiteTitle(normalizedUrl) || websiteDomain;
    if (localMode) {
      if (websites.some((item) => item.collectionId === collection.id && item.url === normalizedUrl)) {
        throw new Error("This website already exists in the collection.");
      }
      const nextWebsites = [...websites, {
        id: crypto.randomUUID(),
        collectionId: collection.id,
        itemPosition: Math.max(0, ...websites.filter((item) => item.collectionId === collection.id).map((item) => item.itemPosition)) + 1,
        title: resolvedTitle,
        url: normalizedUrl,
        website: websiteDomain,
      }];
      const nextCollections = collections.map((item) => ({
        ...item,
        website_count: nextWebsites.filter((website) => website.collectionId === item.id).length,
      }));
      setCollections(nextCollections);
      setWebsites(nextWebsites);
      localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify({ collections: nextCollections, websites: nextWebsites }));
      return;
    }
    if (!session) return;
    const { data, error: requestError } = await supabase.from("websites").insert({
      collection_id: collection.id,
      user_id: session.user.id,
      title: resolvedTitle,
      url: normalizedUrl,
      website: websiteDomain,
      position: Math.max(0, ...websites.filter((item) => item.collectionId === collection.id).map((item) => item.itemPosition)) + 1,
    }).select("id,collection_id,title,url,website,position").single();
    if (requestError) throw new Error(requestError.message);
    const addedWebsite: SavedWebsite = {
      id: data.id,
      collectionId: data.collection_id,
      itemPosition: data.position,
      title: data.title,
      url: data.url,
      website: data.website,
    };
    setWebsites((current) => [...current, addedWebsite]);
    setCollections((current) => current.map((item) =>
      item.id === collection.id ? { ...item, website_count: item.website_count + 1 } : item,
    ));
  };

  const exportData = () => {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: collections.map((collection) => ({
        title: collection.title,
        position: collection.position,
        websites: websites
          .filter((website) => website.collectionId === collection.id)
          .map((website) => ({
            title: website.title,
            url: website.url,
            website: website.website,
            position: website.itemPosition,
          })),
      })),
    };
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collections-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    const backup = JSON.parse(await file.text()) as BackupData;
    if (backup.version !== 1 || !Array.isArray(backup.collections)) throw new Error("This is not a valid collections backup.");

    if (localMode) {
      const nextCollections = [...collections];
      const nextWebsites = [...websites];
      for (const importedCollection of backup.collections) {
        let collection = nextCollections.find((item) => item.title.toLocaleLowerCase() === importedCollection.title.toLocaleLowerCase());
        if (!collection) {
          collection = {
            id: crypto.randomUUID(),
            title: importedCollection.title,
            position: Math.max(0, ...nextCollections.map((item) => item.position)) + 1,
            website_count: 0,
          };
          nextCollections.push(collection);
        }
        for (const importedWebsite of importedCollection.websites ?? []) {
          if (nextWebsites.some((item) => item.collectionId === collection.id && item.url === importedWebsite.url)) continue;
          const parsed = new URL(importedWebsite.url);
          nextWebsites.push({
            id: crypto.randomUUID(),
            collectionId: collection.id,
            itemPosition: Math.max(0, ...nextWebsites.filter((item) => item.collectionId === collection.id).map((item) => item.itemPosition)) + 1,
            title: importedWebsite.title || parsed.hostname.replace(/^www\./, ""),
            url: parsed.toString(),
            website: importedWebsite.website || parsed.hostname.replace(/^www\./, ""),
          });
        }
      }
      const countedCollections = nextCollections.map((collection) => ({
        ...collection,
        website_count: nextWebsites.filter((website) => website.collectionId === collection.id).length,
      }));
      setCollections(countedCollections);
      setWebsites(nextWebsites);
      localStorage.setItem(LOCAL_DATA_STORAGE_KEY, JSON.stringify({ collections: countedCollections, websites: nextWebsites }));
      return;
    }

    if (!session) return;
    for (const importedCollection of backup.collections) {
      let collection = collections.find((item) => item.title.toLocaleLowerCase() === importedCollection.title.toLocaleLowerCase());
      if (!collection) {
        const { data, error: collectionError } = await supabase.from("collections").insert({
          title: importedCollection.title,
          user_id: session.user.id,
          position: Math.max(0, ...collections.map((item) => item.position)) + 1,
        }).select("id,title,position").single();
        if (collectionError) throw new Error(collectionError.message);
        collection = { ...data, website_count: 0 };
      }
      const existingUrls = new Set(websites.filter((item) => item.collectionId === collection.id).map((item) => item.url));
      const rows = (importedCollection.websites ?? [])
        .filter((item) => !existingUrls.has(new URL(item.url).toString()))
        .map((item, index) => {
          const parsed = new URL(item.url);
          return {
            collection_id: collection.id,
            user_id: session.user.id,
            title: item.title || parsed.hostname.replace(/^www\./, ""),
            url: parsed.toString(),
            website: item.website || parsed.hostname.replace(/^www\./, ""),
            position: index + 1,
          };
        });
      if (rows.length) {
        const { error: websiteError } = await supabase.from("websites").insert(rows);
        if (websiteError) throw new Error(websiteError.message);
      }
    }
    await refresh();
  };

  const visibleCollections = selectedCollectionId === "all" ? collections : collections.filter((item) => item.id === selectedCollectionId);
  const visibleWebsites = selectedCollectionId === "all" ? websites : websites.filter((item) => item.collectionId === selectedCollectionId);
  const largestCollection = collections.reduce(
    (largest, collection) => collection.website_count > largest.website_count ? collection : largest,
    { id: "", position: 0, title: "-", website_count: 0 },
  );

  if (authLoading) return <main><section className="panel loading-panel"><p>Connecting…</p></section></main>;
  if (!session && !localMode) return (
    <AuthPanel
      theme={theme}
      onThemeChange={(nextTheme) => {
        setTheme(nextTheme);
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }}
      onContinueLocally={() => {
        setLocalMode(true);
        setLoading(true);
      }}
    />
  );

  return (
    <main>
      <Header
        collectionCount={collections.length}
        websiteCount={websites.length}
        status={loading ? "loading" : error ? "error" : "connected"}
        theme={theme}
        onThemeChange={(nextTheme) => {
          setTheme(nextTheme);
          localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        }}
        mode={localMode ? "local" : "cloud"}
        onExport={exportData}
        onImport={importData}
        onSignOut={() => {
          if (localMode) {
            setLocalMode(false);
            setCollections([]);
            setWebsites([]);
            setSelectedCollectionId("all");
          } else {
            void supabase.auth.signOut();
          }
        }}
      />
      <section className="collection-switcher" aria-label="Collection filter">
        <label htmlFor="collection-switch">Collection</label>
        <select id="collection-switch" value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)}>
          <option value="all">All collections</option>
          {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
        </select>
      </section>
      <StatsGrid stats={[
        { label: "Collections", value: collections.length },
        { label: "Saved websites", value: websites.length },
        { label: "Largest collection", value: largestCollection.website_count, detail: largestCollection.title },
      ]} />
      {error && <p className="error-banner" role="alert">{error}</p>}
      {loading ? <section className="panel loading-panel"><p>Opening your library…</p></section> : (
        <CollectionTable
          collections={visibleCollections}
          websites={visibleWebsites}
          onAdd={addCollection}
          onDelete={deleteCollection}
          onDeleteWebsite={deleteWebsite}
          onEditWebsite={editWebsite}
          onAddWebsite={addWebsite}
        />
      )}
    </main>
  );
}
