export interface WeeklySetsReps {
  setsRepsWk1?: string | null;
  setsRepsWk2?: string | null;
  setsRepsWk3?: string | null;
  setsRepsWk4?: string | null;
}

// A week the coach left empty repeats the week before it, so an exercise prescribed the same every
// week is typed once. The training program PDF applies the same rule on the server.
export function setsRepsByWeek(exercise: WeeklySetsReps): (string | undefined)[] {
  const weeks = [exercise.setsRepsWk1, exercise.setsRepsWk2, exercise.setsRepsWk3, exercise.setsRepsWk4];
  let previous: string | undefined;
  return weeks.map((week) => {
    previous = week?.trim() || previous;
    return previous;
  });
}

export function setsRepsForCycleWeek(exercise: WeeklySetsReps, cycleWeek: number): string | undefined {
  return setsRepsByWeek(exercise)[cycleWeek - 1];
}
