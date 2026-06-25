import { useMemo, useState } from "react";
import type { Collection, SavedWebsite } from "../types";
import { CollectionRow } from "./CollectionRow";
import { SearchInput } from "./SearchInput";
import { AddCollectionForm } from "./AddCollectionForm";

const SORT_STORAGE_KEY = "collections-dashboard-table-sort-v2";

type SortField = "name" | "contents" | "created";
type SortDirection = "asc" | "desc";

interface SortChoice {
  field: SortField;
  direction: SortDirection;
}

const DEFAULT_SORT: SortChoice = { field: "name", direction: "asc" };

interface CollectionTableProps {
  collections: Collection[];
  websites: SavedWebsite[];
  onAdd: (title: string) => Promise<void>;
  onDelete: (collection: Collection) => Promise<void>;
  onDeleteWebsite: (website: SavedWebsite) => Promise<void>;
  onEditWebsite: (website: SavedWebsite, title: string, url: string) => Promise<void>;
  onAddWebsite: (collection: Collection, title: string, url: string) => Promise<void>;
}

export function CollectionTable({ collections, websites, onAdd, onDelete, onDeleteWebsite, onEditWebsite, onAddWebsite }: CollectionTableProps) {
  const [query, setQuery] = useState("");
  const [sortChoice, setSortChoice] = useState<SortChoice>(() => {
    const savedSort = localStorage.getItem(SORT_STORAGE_KEY);
    if (!savedSort) return DEFAULT_SORT;
    try {
      const parsed = JSON.parse(savedSort) as Partial<SortChoice>;
      if (
        (parsed.field === "name" || parsed.field === "contents" || parsed.field === "created") &&
        (parsed.direction === "asc" || parsed.direction === "desc")
      ) {
        return { field: parsed.field, direction: parsed.direction };
      }
    } catch {
      if (savedSort === "asc" || savedSort === "desc") return { field: "name", direction: savedSort };
    }
    return DEFAULT_SORT;
  });
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<string>>(new Set());

  const updateSort = (field: SortField) => {
    setSortChoice((current) => {
      const nextSort: SortChoice = {
        field,
        direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
      };
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(nextSort));
      return nextSort;
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (sortChoice.field !== field) {
      return <path d="m6 7 4-4 4 4M10 3v14M6 13l4 4 4-4" />;
    }
    return sortChoice.direction === "asc"
      ? <path d="m6 9 4-4 4 4M10 5v10" />
      : <path d="m6 11 4 4 4-4M10 5v10" />;
  };

  const getCreatedTime = (collection: Collection) => {
    const createdTime = collection.createdAt ? new Date(collection.createdAt).getTime() : Number.NaN;
    return Number.isNaN(createdTime) ? collection.position : createdTime;
  };

  const formatCreatedDate = (collection: Collection) => {
    if (!collection.createdAt) return "Unknown";
    const createdDate = new Date(collection.createdAt);
    if (Number.isNaN(createdDate.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(createdDate);
  };

  const filteredCollections = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = collections.filter((collection) => {
      if (!normalizedQuery) return true;
      if (collection.title.toLocaleLowerCase().includes(normalizedQuery)) return true;
      return websites.some(
        (website) =>
          website.collectionId === collection.id &&
          [website.title, website.url, website.website].some((value) =>
            value.toLocaleLowerCase().includes(normalizedQuery),
          ),
      );
    });

    return filtered.sort((first, second) => {
      const direction = sortChoice.direction === "asc" ? 1 : -1;
      if (sortChoice.field === "name") {
        const comparison = first.title.localeCompare(second.title, undefined, { sensitivity: "base" });
        return comparison * direction || second.website_count - first.website_count;
      }
      if (sortChoice.field === "created") {
        const comparison = getCreatedTime(first) - getCreatedTime(second);
        return comparison * direction || first.title.localeCompare(second.title);
      }
      const comparison = first.website_count - second.website_count;
      return comparison * direction || first.title.localeCompare(second.title);
    });
  }, [collections, websites, query, sortChoice]);

  const websitesByCollection = useMemo(() => {
    return websites.reduce<Map<string, SavedWebsite[]>>((grouped, website) => {
      const group = grouped.get(website.collectionId) ?? [];
      group.push(website);
      grouped.set(website.collectionId, group);
      return grouped;
    }, new Map());
  }, [websites]);

  const matchingWebsiteIds = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return new Set<string>();
    return new Set(
      websites
        .filter((website) =>
          [website.title, website.url, website.website].some((value) =>
            value.toLocaleLowerCase().includes(normalizedQuery),
          ),
        )
        .map((website) => website.id),
    );
  }, [query, websites]);

  const toggleCollection = (collectionId: string) => {
    setExpandedCollectionIds((current) => {
      const next = new Set(current);
      if (next.has(collectionId)) next.delete(collectionId);
      else next.add(collectionId);
      return next;
    });
  };

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <p className="section-kicker">YOUR LIBRARY</p>
          <h2>{query ? `${filteredCollections.length} matching collections` : "Browse collections"}</h2>
          <p>Open a collection to view and manage its saved websites.</p>
        </div>
        <div className="toolbar-controls">
          <SearchInput value={query} onChange={setQuery} />
        </div>
      </div>
      <div className="create-strip">
        <div>
          <strong>Create a collection</strong>
          <span>Group related websites into a space of their own.</span>
        </div>
        <AddCollectionForm onAdd={onAdd} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <button
                  className="column-sort"
                  type="button"
                  aria-label={`Sort collection names ${sortChoice.field === "name" && sortChoice.direction === "asc" ? "Z to A" : "A to Z"}`}
                  aria-pressed={sortChoice.field === "name"}
                  onClick={() => updateSort("name")}
                >
                  Collection
                  <svg className="sort-icon" aria-hidden="true" viewBox="0 0 20 20">
                    {renderSortIcon("name")}
                  </svg>
                </button>
              </th>
              <th>
                <button
                  className="column-sort"
                  type="button"
                  aria-label={`Sort collections by content size ${sortChoice.field === "contents" && sortChoice.direction === "asc" ? "largest first" : "smallest first"}`}
                  aria-pressed={sortChoice.field === "contents"}
                  onClick={() => updateSort("contents")}
                >
                  Contents
                  <svg className="sort-icon" aria-hidden="true" viewBox="0 0 20 20">
                    {renderSortIcon("contents")}
                  </svg>
                </button>
              </th>
              <th>
                <button
                  className="column-sort"
                  type="button"
                  aria-label={`Sort collections by created date ${sortChoice.field === "created" && sortChoice.direction === "asc" ? "newest first" : "oldest first"}`}
                  aria-pressed={sortChoice.field === "created"}
                  onClick={() => updateSort("created")}
                >
                  Created
                  <svg className="sort-icon" aria-hidden="true" viewBox="0 0 20 20">
                    {renderSortIcon("created")}
                  </svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCollections.map((collection) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                expanded={
                  expandedCollectionIds.has(collection.id) ||
                  (Boolean(query.trim()) &&
                    (websitesByCollection.get(collection.id) ?? []).some((website) =>
                      matchingWebsiteIds.has(website.id),
                    ))
                }
                onToggle={() => toggleCollection(collection.id)}
                websites={websitesByCollection.get(collection.id) ?? []}
                onDelete={() => onDelete(collection)}
                onDeleteWebsite={onDeleteWebsite}
                onEditWebsite={onEditWebsite}
                onAddWebsite={(title, url) => onAddWebsite(collection, title, url)}
                matchingWebsiteIds={matchingWebsiteIds}
                createdLabel={formatCreatedDate(collection)}
              />
            ))}
          </tbody>
        </table>
        {filteredCollections.length === 0 && (
          <div className="empty">
            <strong>No matches found</strong>
            <span>Try a collection name, website title, or domain.</span>
          </div>
        )}
      </div>
    </section>
  );
}
