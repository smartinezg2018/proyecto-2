export function ActionButton({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  );
}
