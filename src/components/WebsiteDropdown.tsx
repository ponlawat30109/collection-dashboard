import { Fragment, useEffect, useRef, useState } from "react";
import type { SavedWebsite } from "../types";
import { AddWebsiteForm } from "./AddWebsiteForm";
import { ConfirmDialog } from "./ConfirmDialog";

interface WebsiteDropdownProps {
  id: string;
  websites: SavedWebsite[];
  onDelete: (website: SavedWebsite) => Promise<void>;
  onEdit: (website: SavedWebsite, title: string, url: string) => Promise<void>;
  onAdd: (title: string, url: string) => Promise<void>;
  matchingWebsiteIds: Set<string>;
}

export function WebsiteDropdown({ id, websites, onDelete, onEdit, onAdd, matchingWebsiteIds }: WebsiteDropdownProps) {
  const [deleteTarget, setDeleteTarget] = useState<SavedWebsite | null>(null);
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<SavedWebsite | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [failedFavicons, setFailedFavicons] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuTargetId) return;
    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuTargetId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuTargetId]);

  return (
    <Fragment>
      <tr className="dropdown-row">
        <td colSpan={3}>
          <div id={id} className="dropdown-content">
          <div className="website-list">
            {websites.length === 0 && (
              <p className="website-empty">No websites here yet. Add the first one below.</p>
            )}
            {websites.map((site) => (
              <div className="website-entry" data-search-match={matchingWebsiteIds.has(site.id)} key={site.id}>
                <span className="site-monogram" aria-hidden="true">
                  {!failedFavicons.has(site.id) && (
                    <img
                      src={`${new URL(site.url).origin}/favicon.ico`}
                      alt=""
                      loading="lazy"
                      onError={() => setFailedFavicons((current) => new Set(current).add(site.id))}
                    />
                  )}
                  <span data-hidden={!failedFavicons.has(site.id)}>
                    {(site.website || site.title).charAt(0).toUpperCase()}
                  </span>
                </span>
                {editingSite?.id === site.id ? (
                  <form
                    className="rename-website-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!editTitle.trim() || !editUrl.trim() || savingEdit) return;
                      setSavingEdit(true);
                      setEditError("");
                      try {
                        await onEdit(site, editTitle.trim(), editUrl.trim());
                        setEditingSite(null);
                        setEditTitle("");
                        setEditUrl("");
                      } catch (error) {
                        setEditError(error instanceof Error ? error.message : "Could not save website.");
                      } finally {
                        setSavingEdit(false);
                      }
                    }}
                  >
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      aria-label={`Edit title for ${site.title}`}
                      maxLength={300}
                      autoFocus
                    />
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(event) => setEditUrl(event.target.value)}
                      aria-label={`Edit URL for ${site.title}`}
                    />
                    <button type="submit" disabled={!editTitle.trim() || !editUrl.trim() || savingEdit}>
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSite(null);
                        setEditTitle("");
                        setEditUrl("");
                        setEditError("");
                      }}
                    >
                      Cancel
                    </button>
                    {editError && <span role="alert">{editError}</span>}
                  </form>
                ) : (
                  <a className="website-link" href={site.url} target="_blank" rel="noopener noreferrer">
                    <span className="website-title">{site.title}</span>
                    <span className="website-domain">{site.website}</span>
                  </a>
                )}
                <div className="collection-actions website-delete" ref={menuTargetId === site.id ? menuRef : undefined}>
                  <button
                    className="delete-button"
                    type="button"
                    aria-label={`Open actions for ${site.title}`}
                    aria-expanded={menuTargetId === site.id}
                    onClick={() => setMenuTargetId((current) => current === site.id ? null : site.id)}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                  {menuTargetId === site.id && (
                    <div className="collection-actions-menu">
                      <button
                        className="neutral-menu-action"
                        type="button"
                        onClick={() => {
                          setMenuTargetId(null);
                          setEditingSite(site);
                          setEditTitle(site.title);
                          setEditUrl(site.url);
                          setEditError("");
                        }}
                      >
                        Edit website
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuTargetId(null);
                          setDeleteTarget(site);
                        }}
                      >
                        Delete website
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
            <AddWebsiteForm onAdd={onAdd} />
          </div>
        </td>
      </tr>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete “${deleteTarget?.title ?? "website"}”?`}
        description="This website will be permanently removed from the collection."
        onConfirm={() => deleteTarget ? onDelete(deleteTarget) : Promise.resolve()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Fragment>
  );
}
