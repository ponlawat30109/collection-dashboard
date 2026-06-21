import { useState, type FormEvent } from "react";

interface AddCollectionFormProps {
  onAdd: (title: string) => Promise<void>;
}

export function AddCollectionForm({ onAdd }: AddCollectionFormProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAdd(title.trim());
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="collection-name">New collection name</label>
      <input
        id="collection-name"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Collection name"
        maxLength={120}
      />
      <button type="submit" disabled={!title.trim() || submitting}>
        {submitting ? "Adding…" : "Add collection"}
      </button>
    </form>
  );
}
