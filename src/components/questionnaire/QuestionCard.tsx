import type { Question, QuestionValue } from '../../types/question';

interface QuestionCardProps {
  question: Question;
  value: QuestionValue | undefined;
  error?: string;
  onChange: (value: QuestionValue) => void;
}

export function QuestionCard({ question, value, error, onChange }: QuestionCardProps) {
  const selectedValue = typeof value === 'string' ? value : '';
  const selectedValues = Array.isArray(value) ? value : [];

  return (
    <section className="question-card">
      <header className="question-card__header">
        <span className="eyebrow">{question.required ? '必答' : '选答'}</span>
        <h2>{question.title}</h2>
        {question.helper ? <p className="question-card__helper">{question.helper}</p> : null}
        {question.type === 'multi' && question.maxSelect ? <p>最多选 {question.maxSelect} 项</p> : null}
      </header>

      {(question.type === 'single' || question.type === 'multi') && question.options ? (
        <div className="chip-grid">
          {question.options.map((option) => {
            const isActive = question.type === 'single' ? selectedValue === option.value : selectedValues.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`choice-chip${isActive ? ' is-active' : ''}`}
                onClick={() => {
                  if (question.type === 'single') {
                    onChange(option.value);
                    return;
                  }

                  const nextValues = isActive
                    ? selectedValues.filter((item) => item !== option.value)
                    : [...selectedValues, option.value].slice(0, question.maxSelect ?? selectedValues.length + 1);
                  onChange(nextValues);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {question.type === 'dropdown' && question.options ? (
        <label className="field">
          <span>请选择</span>
          <select value={selectedValue} onChange={(event) => onChange(event.target.value)}>
            <option value="">{question.placeholder ?? '请选择'}</option>
            {question.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {question.type === 'text' ? (
        <label className="field">
          <span>{question.maxLength ? `最多 ${question.maxLength} 字` : '自由填写'}</span>
          <textarea
            value={selectedValue}
            maxLength={question.maxLength}
            placeholder={question.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
          <small>{selectedValue.length}/{question.maxLength ?? 120}</small>
        </label>
      ) : null}

      {error ? <p className="field-error">{error}</p> : null}
    </section>
  );
}
