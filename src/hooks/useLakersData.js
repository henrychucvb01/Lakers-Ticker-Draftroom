import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function useLakersData(session, mode) {
  const [data, setData] = useState({
    profile: null,
    season: null,
    member: null,
    members: [],
    games: [],
    runs: [],
    order: [],
    picks: [],
  });
  const [loading, setLoading] = useState(Boolean(session));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!supabase || !session?.user) return;
    setLoading(true);

    const profileResult = await supabase
      .from("lakers_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (profileResult.error) {
      setError(profileResult.error.message);
      setLoading(false);
      return;
    }

    const seasonResult = await supabase
      .from("lakers_seasons")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (seasonResult.error || !seasonResult.data) {
      setError(seasonResult.error?.message || "No active Lakers season is configured.");
      setLoading(false);
      return;
    }

    const seasonId = seasonResult.data.id;
    const [membersResult, gamesResult, runsResult] = await Promise.all([
      supabase.from("lakers_season_members").select("*").eq("season_id", seasonId).order("created_at"),
      supabase.from("lakers_games").select("*").eq("season_id", seasonId).order("game_date"),
      supabase.from("lakers_draft_runs").select("*").eq("season_id", seasonId),
    ]);
    const firstError = membersResult.error || gamesResult.error || runsResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const activeRun = runsResult.data.find((run) => run.mode === mode) || null;
    const [orderResult, picksResult] = activeRun
      ? await Promise.all([
          supabase
            .from("lakers_draft_order_entries")
            .select("*, member:lakers_season_members(*)")
            .eq("draft_run_id", activeRun.id)
            .order("position"),
          supabase
            .from("lakers_draft_picks")
            .select("*, game:lakers_games(*), member:lakers_season_members(*)")
            .eq("draft_run_id", activeRun.id)
            .order("overall_pick"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (orderResult.error || picksResult.error) {
      setError(orderResult.error?.message || picksResult.error?.message);
      setLoading(false);
      return;
    }

    setData({
      profile: profileResult.data,
      season: seasonResult.data,
      member:
        membersResult.data.find((member) => member.user_id === session.user.id) || null,
      members: membersResult.data.map((member) => ({
        ...member,
        gamesAllowed: member.games_allowed,
      })),
      games: gamesResult.data.map((game) => ({
        ...game,
        date: game.game_date,
        time: game.game_time,
      })),
      runs: runsResult.data,
      order: orderResult.data,
      picks: picksResult.data,
    });
    setError("");
    setLoading(false);
  }, [session, mode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !session?.user) return undefined;
    const channel = supabase
      .channel(`lakers-draft-${mode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lakers_draft_runs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lakers_draft_picks" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lakers_draft_order_entries" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lakers_games" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lakers_season_members" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, mode, refresh]);

  const run = useMemo(
    () => data.runs.find((item) => item.mode === mode) || null,
    [data.runs, mode]
  );
  const pickedGameIds = useMemo(
    () => new Set(data.picks.map((pick) => pick.game_id)),
    [data.picks]
  );
  const availableGames = useMemo(
    () => data.games.filter((game) => game.status === "draft" && !pickedGameIds.has(game.id)),
    [data.games, pickedGameIds]
  );

  async function rpc(name, parameters) {
    const result = await supabase.rpc(name, parameters);
    if (result.error) throw result.error;
    await refresh();
    return result.data;
  }

  return {
    ...data,
    run,
    availableGames,
    loading,
    error,
    refresh,
    randomize: () => rpc("lakers_randomize_draft_order", { requested_run_id: run.id }),
    reveal: () => rpc("lakers_reveal_draft_order", { requested_run_id: run.id }),
    completeReveal: () => rpc("lakers_complete_draft_reveal", { requested_run_id: run.id }),
    makePick: (gameId) => rpc("lakers_make_pick", { requested_run_id: run.id, requested_game_id: gameId }),
    control: (action, clock = null) => rpc("lakers_set_draft_control", {
      requested_run_id: run.id,
      requested_action: action,
      requested_clock_seconds: clock,
    }),
    reset: () => rpc("lakers_reset_draft", { requested_run_id: run.id, requested_mode: mode }),
    updateAllowance: (memberId, allowance) => rpc("lakers_update_member_allowance", {
      requested_member_id: memberId,
      requested_allowance: allowance,
    }),
  };
}
