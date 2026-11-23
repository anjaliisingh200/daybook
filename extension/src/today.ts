import { columnOrderFor } from "@/components/tasks/taskModel";
import type { DateKey, Task } from "@/lib/types";

/**
 * The tasks due on `day`, in the website's Tasks day-view order (it is the website's own sorting rule).
 * Done tasks stay in the list, marked done. Subtasks are not rows of their own: each card shows its own.
 * If the person has ever placed a task by hand, the hand-made order is kept; otherwise newest first.
 */
export function tasksForDay(tasks: Task[], day: DateKey): Task[] {
  const top = tasks.filter((t) => !t.parentId && t.due === day);
  return top.sort(columnOrderFor(top.some((t) => t.meta.order !== undefined)));
}
