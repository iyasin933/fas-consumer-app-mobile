/** Even-odd path: full rect minus circle hole (reveals layer below through the “liquid” cutout). */
export function buildLiquidMaskPath(
  w: number,
  h: number,
  cx: number,
  cy: number,
  holeR: number,
): string {
  return `M 0 0 H ${w} V ${h} H 0 Z M ${cx} ${cy} m ${-holeR},0 a ${holeR},${holeR} 0 1,0 ${
    holeR * 2
  },0 a ${holeR},${holeR} 0 1,0 ${-holeR * 2},0`;
}
