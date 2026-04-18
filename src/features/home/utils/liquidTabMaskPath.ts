/**
 * Builds the SVG path for the bottom navigation bar background.
 *
 * The shape has:
 *  - Rounded top-left / top-right corners (cornerR)
 *  - A smooth cubic-bezier notch at the horizontal centre, deep enough to
 *    cradle the floating action button that protrudes above the bar.
 *
 * Geometry (all values in px, y increases downward):
 *   notchR  – half-depth of the notch; equals FAB_RADIUS + small_gap so the
 *             FAB centre lands just above the bar top.
 *   ctrlLen – horizontal reach of the bezier control handles, controls how
 *             "sharp" or "smooth" the shoulder transitions are.
 */
export function buildNotchBarPath(
  w: number,
  h: number,
  cornerR = 24,
  notchR = 36,
  ctrlLen = 22,
): string {
  const cx = w / 2;
  const lx = cx - notchR - ctrlLen; // left shoulder start
  const rx = cx + notchR + ctrlLen; // right shoulder end

  return [
    `M 0 ${cornerR}`,
    `Q 0 0 ${cornerR} 0`,
    `L ${lx} 0`,
    // left shoulder → notch bottom
    `C ${cx - notchR} 0 ${cx - notchR} ${notchR} ${cx} ${notchR}`,
    // notch bottom → right shoulder
    `C ${cx + notchR} ${notchR} ${cx + notchR} 0 ${rx} 0`,
    `L ${w - cornerR} 0`,
    `Q ${w} 0 ${w} ${cornerR}`,
    `V ${h}`,
    `H 0`,
    `Z`,
  ].join(' ');
}
