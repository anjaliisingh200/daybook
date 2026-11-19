import type { DateKey, EventInstance } from "./types";
import { zoned } from "./dates";

export interface Placed {
  inst: EventInstance;
  /** minutes from midnight */
  top: number;
  bottom: number;
  col: number;
  cols: number;
}

const MIN_BLOCK = 22; // minutes — keeps tiny events clickable

/** Clip timed instances to a day and lay overlapping ones out in side-by-side columns. */
export function layoutDay(instances: EventInstance[], day: DateKey, tz: string): Placed[] {
  const items = instances
    .filter((i) => !i.allDay)
    .map((inst) => {
      const s = zoned(inst.start, tz);
      const e = zoned(Math.max(inst.start, inst.end - 1), tz);
      const top = s.key < day ? 0 : s.key > day ? 1440 : s.minutes;
      let bottom = e.key > day ? 1440 : e.key < day ? 0 : e.minutes + 1;
      if (bottom - top < MIN_BLOCK) bottom = Math.min(1440, top + MIN_BLOCK);
      return { inst, top, bottom, col: 0, cols: 1 };
    })
    .filter((p) => p.top < 1440 && p.bottom > p.top)
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom);

  // Cluster overlapping events, then assign columns inside each cluster.
  let cluster: typeof items = [];
  let clusterEnd = -1;
  const flush = () => {
    const colEnds: number[] = [];
    for (const p of cluster) {
      let c = colEnds.findIndex((end) => end <= p.top);
      if (c === -1) {
        c = colEnds.length;
        colEnds.push(p.bottom);
      } else colEnds[c] = p.bottom;
      p.col = c;
    }
    for (const p of cluster) p.cols = colEnds.length;
    cluster = [];
    clusterEnd = -1;
  };
  for (const p of items) {
    if (cluster.length && p.top >= clusterEnd) flush();
    cluster.push(p);
    clusterEnd = Math.max(clusterEnd, p.bottom);
  }
  if (cluster.length) flush();
  return items;
}

/** Group instances by the display days they touch. */
export function byDay(instances: EventInstance[], days: DateKey[]): Map<DateKey, EventInstance[]> {
  const map = new Map<DateKey, EventInstance[]>(days.map((d) => [d, []]));
  for (const inst of instances) {
    for (const d of days) {
      if (inst.startDate <= d && inst.endDate >= d) map.get(d)!.push(inst);
    }
  }
  return map;
}

export function compareInstances(a: EventInstance, b: EventInstance): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.start - b.start || a.title.localeCompare(b.title);
}
