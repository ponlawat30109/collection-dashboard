import { Fragment, useEffect, useRef, useState } from "react";
import type { SavedWebsite } from "../types";
import { AddWebsiteForm } from "./AddWebsiteForm";
import { ConfirmDialog } from "./ConfirmDialog";

interface WebsiteDropdownProps {
  id: string;
  websites: SavedWebsite[];
  onDelete: (website: SavedWebsite) => Promise<void>;
  onAdd: (title: string, url: string) => Promise<void>;
  matchingWebsiteIds: Set<string>;
}

export function WebsiteDropdown({ id, websites, onDelete, onAdd, matchingWebsiteIds }: WebsiteDropdownProps) {
  const [deleteTarget, setDeleteTarget] = useState<SavedWebsite | null>(null);
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null);
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
        <td colSpan={2}>
          <div id={id} className="dropdown-content">
          <div className="website-list">
            {websites.length === 0 && (
              <p className="website-empty">No websites here yet. Add the first one below.</p>
            )}
            {websites.map((site) => (
              <div className="website-entry" data-search-match={matchingWebsiteIds.has(site.id)} key={site.id}>
                <span className="site-monogram" aria-hidden="true">
                  {(site.website || site.title).charAt(0).toUpperCase()}
                </span>
                <a className="website-link" href={site.url} target="_blank" rel="noopener noreferrer">
                  <span className="website-title">{site.title}</span>
                  <span className="website-domain">{site.website}</span>
                </a>
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
