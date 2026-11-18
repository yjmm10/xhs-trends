interface EmptyStateProps {
  title: string;
  detail?: string;
}

export default function EmptyState({ title, detail }: EmptyStateProps) {
  return (
    <div className="empty">
      <div>{title}</div>
      {detail && <div style={{ fontSize: 12, marginTop: 6 }}>{detail}</div>}
    </div>
  );
}
