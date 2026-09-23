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
};

export type PairPlan = {
  id: string;
  kind: 'first_run' | 'meetup';
  status: 'planning' | 'confirmed' | 'verified' | 'completed' | 'cancelled' | 'ended';
  activity_key: 'running' | 'walking' | 'cycling' | string | null;
  mode: 'together' | 'separate' | null;
  distance: string | null;
  place_name: string | null;
  place_text: string | null;
  meeting_location_status: 'not_set' | 'proposed' | 'agreed' | 'needs_help' | 'founder_assisted';
  founder_help_required: boolean;
  starts_at: string | null;
  i_open: boolean;
  me: PlanMember;
  them: PlanMember & { first_name: string; avatar_url: string | null };
  messages: { mine: boolean; key: 'opener' | 'lets_go' | 'cant_wait' | 'sounds_good' }[];
  open_proposals?: Proposal[];
};

export type Proposal = {
  id: string;
  field: 'distance' | 'mode' | 'place' | 'time' | 'day_time' | 'reschedule';
  value: any;
  mine: boolean;
  round: number;
};
