import { useState } from 'react';
import type { ReportReason } from '../../types/domain';

const reasons: { label: string; value: ReportReason }[] = [
  { label: '骚扰 / 不当言论', value: 'harassment' },
  { label: '虚假信息 / 冒充他人', value: 'fake' },
  { label: '广告 / 诈骗', value: 'spam' },
  { label: '色情 / 低俗内容', value: 'nsfw' },
  { label: '其他', value: 'other' },
];

interface ReportModalProps {
  open: boolean;
  targetName: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail: string) => Promise<void>;
}

export function ReportModal({ open, targetName, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <span className="eyebrow">举报用户</span>
        <h2>告诉我们为什么想举报 {targetName}</h2>
        <div className="stack-sm">
          {reasons.map((item) => (
            <label key={item.value} className="radio-row">
              <input type="radio" name="reason" checked={reason === item.value} onChange={() => setReason(item.value)} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <label className="field">
          <span>补充说明（选填，最多 200 字）</span>
          <textarea value={detail} maxLength={200} onChange={(event) => setDetail(event.target.value)} />
          <small>{detail.length}/200</small>
        </label>
        <div className="modal-actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="button button--danger"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onSubmit(reason, detail);
                setDetail('');
                onClose();
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? '提交中...' : '提交举报'}
          </button>
        </div>
      </div>
    </div>
  );
}
