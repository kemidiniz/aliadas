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
      attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    async function poll() {
      if (!active) return;
      if (document.visibilityState === "hidden") {
        setStalled(true);
        return;
      }
      const { data, error } = await supabase
        .rpc("mvp_job_status", { request_id: requestId })
        .abortSignal(controller.signal);
      if (!active) return;
      if (error) {
        setJob({ state: "falha", mode: "basica", has_candidate: true });
        return;
      }
      const status = data as ConversationJobState;
      setJob(status);
      if (!["pendente", "executando"].includes(status.state)) {
        if (status.mode === "ia") await done.current();
        return;
      }
      attempt++;
      if (attempt >= JOB_POLL_DELAYS.length) {
        setStalled(true);
        await supabase.rpc("mvp_use_fallback", { request: requestId }).abortSignal(controller.signal);
        if (active) await done.current();
        return;
      }
      timer = setTimeout(poll, JOB_POLL_DELAYS[attempt]);
    }
    timer = setTimeout(poll, 0);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      controller.abort();
    };
  }, [requestId, revision]);
  return { job, stalled, refresh: () => setRevision((x) => x + 1) };
}
