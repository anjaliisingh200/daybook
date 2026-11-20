/**
 * Scrolls a scroller sideways, only if needed, so a column is fully visible.
 * A column that was cut off ends up centred. `insetLeft` is the width of any sticky
 * column on the left (the hour labels) that the column must not hide behind.
 */
export function revealColumn(scroller: HTMLElement, column: HTMLElement, insetLeft = 0): void {
  const s = scroller.getBoundingClientRect();
  const c = column.getBoundingClientRect();
  const left = s.left + insetLeft;
  if (c.left >= left && c.right <= s.right) return;
  scroller.scrollLeft += (c.left + c.right) / 2 - (left + s.right) / 2;
}
