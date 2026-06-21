import { Fragment, useState } from "react";
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
  onAddWebsite,
  matchingWebsiteIds,
}: CollectionRowProps) {
  const dropdownId = `collection-${collection.position}-websites`;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
          <button
            className="delete-button"
            type="button"
            aria-label={`Delete ${collection.title}`}
            onClick={() => setConfirmingDelete(true)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </td>
      </tr>
      {expanded && (
        <WebsiteDropdown
          id={dropdownId}
          websites={websites}
          onDelete={onDeleteWebsite}
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
