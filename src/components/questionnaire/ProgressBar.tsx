interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, (current / total) * 100));

  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>画像问卷</span>
        <strong>{current}/{total}</strong>
      </div>
      <div className="progress-bar" aria-hidden="true">
        <div className="progress-bar__value" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
