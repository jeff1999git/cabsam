import { useState } from "react";

interface EditorState<TItem> {
  open: boolean;
  /** Changes on every open; pass it as the dialog's `key` so the form remounts with fresh defaults. */
  key: number;
  /** The item being edited, `null` while creating. */
  item: TItem | null;
}

/** Open / close state of a create-or-edit form dialog. */
export function useEditor<TItem = never>() {
  const [state, setState] = useState<EditorState<TItem>>({ open: false, key: 0, item: null });

  return {
    ...state,
    create: () => setState((previous) => ({ open: true, key: previous.key + 1, item: null })),
    edit: (item: TItem) => setState((previous) => ({ open: true, key: previous.key + 1, item })),
    /** For the dialog's `onOpenChange`; keeps the item mounted through the close animation. */
    onOpenChange: (open: boolean) => {
      if (!open) setState((previous) => ({ ...previous, open: false }));
    },
  };
}
