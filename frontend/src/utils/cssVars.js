/** Apply dynamic CSS custom properties (rules live in styles.css). */
export function bindProgressFill(el, score, color) {
  if (!el || score == null) return;
  el.style.setProperty('--fill-pct', `${Math.min(100, Math.max(0, score))}%`);
  el.style.setProperty('--fill-color', color || '#1e3a5f');
}

export function bindPanelPosition(el, vars) {
  if (!el || !vars) return;
  Object.entries(vars).forEach(([key, value]) => {
    el.style.setProperty(key, value);
  });
}
