// Champ texte avec libellé associé, icône facultative et aide sous le champ.
export default function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon: Icon,
  hint,
  className = '',
  ...inputProps
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const input = (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      aria-describedby={hintId}
      onChange={(e) => onChange(e.target.value)}
      {...inputProps}
    />
  );
  return (
    <div className={`form-group mini ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      {Icon ? (
        <div className="icon-input-group">
          <Icon size={14} className="input-icon" aria-hidden="true" />
          {input}
        </div>
      ) : (
        input
      )}
      {hint && (
        <p id={hintId} className="editor-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
