export type PlanMember = {
  distance_answer: string | null;
  mode_answer: 'together' | 'separate' | null;
  confirmed_at: string | null;
  on_my_way_at: string | null;
  here_at: string | null;
  finished_at: string | null;
  checkin: 'done' | 'later' | 'cant' | null;
  checkin_at: string | null;
  miss_reason: string | null;
  planned_at?: string | null;
  cant_make_it_at?: string | null;
};

export type PairPlan = {
  id: string;
  kind: 'first_run' | 'meetup';
  status: 'planning' | 'confirmed' | 'verified' | 'completed' | 'cancelled' | 'ended' | 'missed';
  activity_key: 'running' | 'jogging' | 'walking' | 'cycling' | string | null;
  mode: 'together' | 'separate' | null;
  // The SHARED amount: set only when both chose the same. Read amounts
  // through features/plans/amounts.ts, never this field on its own.
  distance: string | null;
  // Sessions a week the pair agreed, 1 to 7. NULL means still to be agreed.
  // ABSENT means the server predates 202610020910: not the same thing, and
  // planStep() only asks when it is explicitly null.
  cadence?: number | null;
  // A make-up session, and the missed session whose circle it fills.
  is_repair?: boolean;
  repairs_plan_id?: string | null;
  // When this session counts as missed: the later of the two local midnights.
  due_at?: string | null;
  place_name: string | null;
  place_text: string | null;
  meeting_location_status: 'not_set' | 'proposed' | 'agreed' | 'needs_help' | 'founder_assisted';
  founder_help_required: boolean;
  starts_at: string | null;
  qr_verified_at?: string | null;
  qr_mine?: boolean;
  i_open: boolean;
  me: PlanMember;
  them: PlanMember & { first_name: string; avatar_url: string | null };
  messages: { mine: boolean; key: 'opener' | 'lets_go' | 'cant_wait' | 'sounds_good' }[];
  open_proposals?: Proposal[];
  reactions?: { mine: boolean; reaction: string }[];
  my_share?: boolean | null;
};

export type Proposal = {
  id: string;
  field: 'distance' | 'cadence' | 'mode' | 'place' | 'time' | 'day_time' | 'reschedule';
  value: any;
  mine: boolean;
  round: number;
};

// What the pair owes after a missed session (get_repair_debt). One debt for
// the pair, not one each: a session needs both people, so it happened for
// neither.
export type RepairDebt =
  | { owed: false; lost: number }
  | {
      owed: true;
      // 'in_progress' once a make-up session is being planned.
      state: 'owed' | 'in_progress';
      missed_plan_id: string;
      missed_at: string | null;
      // Past this the "this week" option is gone and the debt has rolled over.
      this_week_ends_at: string;
      // Past this the debt lapses and the circle resolves as missed.
      repair_by: string;
      preference: 'this_week' | 'next_week' | null;
      // What actually applies now, after any roll-over.
      when: 'this_week' | 'next_week';
      repair_plan_id: string | null;
      // Second misses in a week: marked, never owed.
      lost: number;
    };

// One circle of a streak (get_streak). A circle is a planned session.
export type StreakCircle =
  // Both completed it, or it was missed and then repaired.
  | { state: 'done'; at: string | null; plan_id: string; repaired?: boolean }
  // The day passed. While `repairable` it has not resolved yet.
  | { state: 'missed'; at: string | null; plan_id: string; repairable: boolean }
  // Confirmed and still ahead.
  | { state: 'planned'; at: string | null; plan_id: string }
  // Not planned yet.
  | { state: 'ahead' };

export type Streak = {
  // The 12 in "a 12 session streak". Null until the person has picked one.
  target: number | null;
  cadence: number | null;
  // Exactly `target` circles when there is a target.
  circles: StreakCircle[];
  done: number;
  // done, plus misses that can no longer be repaired.
  resolved: number;
  // All circles resolved. 11 of 12 is a real ending.
  complete: boolean;
  // The heart: sessions completed with the CURRENT partner. Not the streak.
  with_partner: number;
};
