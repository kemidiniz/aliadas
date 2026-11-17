import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  JOB_POLL_DELAYS,
  type ConversationJobState,
} from "./conversationStatus";
export function useConversationJob(
  requestId: string | undefined,
  completed: () => Promise<void>,
) {
  const [job, setJob] = useState<ConversationJobState | null>(null);
  const [stalled, setStalled] = useState(false);
  const [revision, setRevision] = useState(0);
  const done = useRef(completed);
  done.current = completed;
  useEffect(() => {
    setJob(null);
    setStalled(false);
    if (!requestId) return;
    let active = true,
      attempt = 0, finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function poll() {
      timer = undefined;
      if (!active || finished) return;
      if (document.visibilityState === "hidden") {
        return;
      }
      const { data, error } = await supabase
        .rpc("mvp_job_status", { request_id: requestId })
        .abortSignal(controller.signal);
      if (!active) return;
      if (error) {
        finished=true;
        setJob({ state: "falha", mode: "regra", has_candidate: true });
        return;
      }
      const status = data as ConversationJobState;
      setJob(status);
      if (!["pendente", "executando"].includes(status.state)) {
        finished=true;
        if (status.mode === "ia") await done.current();
        return;
      }
      attempt++;
      if (attempt >= JOB_POLL_DELAYS.length) {
        finished=true;
        setStalled(true);
        await supabase.rpc("mvp_use_fallback", { request: requestId }).abortSignal(controller.signal);
        if (active) await done.current();
        return;
      }
      timer = setTimeout(poll, JOB_POLL_DELAYS[attempt]);
    }
    const visible = () => { if (document.visibilityState === "visible" && active && !finished && timer === undefined) timer=setTimeout(poll,0); };
    document.addEventListener("visibilitychange",visible);
    timer = setTimeout(poll, 0);
    return () => {
      document.removeEventListener("visibilitychange",visible);
      active = false;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [requestId, revision]);
  return { job, stalled, refresh: () => setRevision((x) => x + 1) };
}
