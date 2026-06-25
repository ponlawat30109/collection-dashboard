import { Fragment, useEffect, useRef, useState } from "react";
import type { Collection, SavedWebsite } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { WebsiteDropdown } from "./WebsiteDropdown";

interface CollectionRowProps {
  collection: Collection;
  expanded: boolean;
  onToggle: () => void;
  websites: SavedWebsite[];
  onDelete: () => Promise<void>;
  onDeleteWebsite: (website: SavedWebsite) => Promise<void>;
  onEditWebsite: (website: SavedWebsite, title: string, url: string) => Promise<void>;
  onAddWebsite: (title: string, url: string) => Promise<void>;
  matchingWebsiteIds: Set<string>;
}

export function CollectionRow({
  collection,
  expanded,
  onToggle,
  websites,
  onDelete,
  onDeleteWebsite,
  onEditWebsite,
  onAddWebsite,
  matchingWebsiteIds,
}: CollectionRowProps) {
  const dropdownId = `collection-${collection.id}-websites`;
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpen]);

  return (
    <Fragment>
      <tr className="collection-row" data-expanded={expanded}>
        <td>
          <button className="collection-toggle" type="button" aria-expanded={expanded} aria-controls={dropdownId} onClick={onToggle}>
            <span className="chevron" aria-hidden="true">
              <svg viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
            </span>
            <span className="collection-name">{collection.title}</span>
          </button>
        </td>
        <td className="actions-cell">
          <span className="count">
            <strong>{collection.website_count}</strong>
          </span>
          <div className="collection-actions" ref={menuRef}>
            <button
              className="delete-button"
              type="button"
              aria-label={`Open actions for ${collection.title}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            {menuOpen && (
              <div className="collection-actions-menu">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmingDelete(true);
                  }}
                >
                  Delete collection
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <WebsiteDropdown
          id={dropdownId}
          websites={websites}
          onDelete={onDeleteWebsite}
          onEdit={onEditWebsite}
          onAdd={onAddWebsite}
          matchingWebsiteIds={matchingWebsiteIds}
        />
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete “${collection.title}”?`}
        description={`This will permanently remove the collection and its ${collection.website_count} saved ${collection.website_count === 1 ? "website" : "websites"}.`}
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </Fragment>
  );
}
