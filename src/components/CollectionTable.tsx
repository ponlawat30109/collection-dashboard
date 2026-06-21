import { useMemo, useState } from "react";
import type { Collection, SavedWebsite } from "../types";
import { CollectionRow } from "./CollectionRow";
import { SearchInput } from "./SearchInput";
import { AddCollectionForm } from "./AddCollectionForm";

const SORT_STORAGE_KEY = "collections-dashboard-name-sort";

interface CollectionTableProps {
  collections: Collection[];
  websites: SavedWebsite[];
  onAdd: (title: string) => Promise<void>;
  onDelete: (collection: Collection) => Promise<void>;
  onDeleteWebsite: (website: SavedWebsite) => Promise<void>;
  onAddWebsite: (collection: Collection, title: string, url: string) => Promise<void>;
}

export function CollectionTable({ collections, websites, onAdd, onDelete, onDeleteWebsite, onAddWebsite }: CollectionTableProps) {
  const [query, setQuery] = useState("");
  const [nameSort, setNameSort] = useState<"none" | "asc" | "desc">(() => {
    const savedSort = localStorage.getItem(SORT_STORAGE_KEY);
    return savedSort === "asc" || savedSort === "desc" ? savedSort : "none";
  });
  const [expandedPositions, setExpandedPositions] = useState<Set<number>>(new Set());

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
      if (nameSort !== "none") {
        const comparison = first.title.localeCompare(second.title, undefined, { sensitivity: "base" });
        return nameSort === "asc" ? comparison : -comparison;
      }
      return second.website_count - first.website_count || first.title.localeCompare(second.title);
    });
  }, [collections, websites, query, nameSort]);

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

  const toggleCollection = (position: number) => {
    setExpandedPositions((current) => {
      const next = new Set(current);
      if (next.has(position)) next.delete(position);
      else next.add(position);
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
                  aria-label={`Sort collection names ${nameSort === "asc" ? "Z to A" : "A to Z"}`}
                  onClick={() =>
                    setNameSort((current) => {
                      const nextSort = current === "asc" ? "desc" : "asc";
                      localStorage.setItem(SORT_STORAGE_KEY, nextSort);
                      return nextSort;
                    })
                  }
                >
                  Collection
                  <svg className="sort-icon" aria-hidden="true" viewBox="0 0 20 20">
                    {nameSort === "asc" ? (
                      <path d="m6 9 4-4 4 4M10 5v10" />
                    ) : nameSort === "desc" ? (
                      <path d="m6 11 4 4 4-4M10 5v10" />
                    ) : (
                      <path d="m6 7 4-4 4 4M10 3v14M6 13l4 4 4-4" />
                    )}
                  </svg>
                </button>
              </th>
              <th>Contents</th>
            </tr>
          </thead>
          <tbody>
            {filteredCollections.map((collection) => (
              <CollectionRow
                key={collection.position}
                collection={collection}
                expanded={
                  expandedPositions.has(collection.position) ||
                  (Boolean(query.trim()) &&
                    (websitesByCollection.get(collection.id) ?? []).some((website) =>
                      matchingWebsiteIds.has(website.id),
                    ))
                }
                onToggle={() => toggleCollection(collection.position)}
                websites={websitesByCollection.get(collection.id) ?? []}
                onDelete={() => onDelete(collection)}
                onDeleteWebsite={onDeleteWebsite}
                onAddWebsite={(title, url) => onAddWebsite(collection, title, url)}
                matchingWebsiteIds={matchingWebsiteIds}
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
