import { useState, type FormEvent } from "react";

interface AddWebsiteFormProps {
  onAdd: (title: string, url: string) => Promise<void>;
}

export function AddWebsiteForm({ onAdd }: AddWebsiteFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(title.trim(), url.trim());
      setTitle("");
      setUrl("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button className="show-add-website" type="button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span>
        <span>Add website</span>
      </button>
    );
  }

  return (
    <form className="add-website-form" onSubmit={submit}>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Website title (optional)"
        maxLength={300}
        aria-label="Website title"
      />
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://example.com"
        aria-label="Website URL"
        autoFocus
      />
      <button className="add-website-button" type="submit" disabled={!url.trim() || submitting}>
        {submitting ? "Adding…" : "Save website"}
      </button>
      <button
        className="cancel-add-website"
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle("");
          setUrl("");
        }}
      >
        Cancel
      </button>
    </form>
  );
}
