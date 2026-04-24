import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Trash2, Plus } from "lucide-react";
import type { ReactNode } from "react";

export function RepeatableList<T>({
  items,
  onChange,
  onAdd,
  renderItem,
  addLabel = "Add",
  getKey,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  onAdd: () => void;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel?: string;
  getKey?: (item: T, i: number) => string | number;
}) {
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number) => (patch: Partial<T>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Reorder.Group axis="y" values={items} onReorder={onChange} className="space-y-3">
        {items.map((item, i) => (
          <Row
            key={getKey ? getKey(item, i) : ((item as { id?: string | number }).id ?? i)}
            value={item}
            onRemove={() => remove(i)}
          >
            {renderItem(item, i, update(i))}
          </Row>
        ))}
      </Reorder.Group>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-dashed border-border hover:border-foreground/40 hover:bg-secondary transition-colors"
      >
        <Plus className="h-3 w-3" /> {addLabel}
      </button>
    </div>
  );
}

function Row<T>({ value, onRemove, children }: { value: T; onRemove: () => void; children: ReactNode }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 space-y-3">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}
