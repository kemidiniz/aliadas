import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { abrirFoto, areaDoRecorte, recortarFoto, type Enquadramento } from "../lib/fotos";
import { rotuloCampo } from "./Campo";

// Foto de perfil de qualquer lugar: escolher (no celular abre câmera, fototeca e
// arquivos), arrastar e soltar, colar e, no computador, usar a webcam. Depois,
// enquadrar com zoom e posição. Sem biblioteca: canvas do próprio navegador.
const botao =
  "inline-flex h-12 items-center rounded-xl border-2 border-destaque px-5 font-semibold text-destaque transition-colors hover:bg-superficie";
const discreto = "text-sm font-semibold text-suave underline underline-offset-4 hover:text-destaque";

export function FotoPerfil({
  previaAtual,
  iniciais,
  aoMudar,
}: {
  previaAtual?: string | null;
  iniciais: string;
  aoMudar: (foto: Blob | null) => void; // null = remover
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<ImageBitmap | null>(null);
  const [enq, setEnq] = useState<Enquadramento>({ zoom: 1, x: 0, y: 0 });
  const [previa, setPrevia] = useState<string | null>(null);
  const [removida, setRemovida] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [camera, setCamera] = useState(false);
  // "Usar a câmera" só no computador (no celular o "Escolher foto" já oferece a câmera)
  const [temWebcam] = useState(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && window.matchMedia?.("(pointer: fine)").matches,
  );

  async function receber(f: Blob | null | undefined) {
    if (!f) return;
    setErro("");
    try {
      const bmp = await abrirFoto(f);
      setImg(bmp);
      setEnq({ zoom: 1, x: 0, y: 0 });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não conseguimos abrir essa foto.");
    }
  }
  async function confirmar() {
    if (!img) return;
    try {
      const blob = await recortarFoto(img, enq);
      if (previa) URL.revokeObjectURL(previa);
      setPrevia(URL.createObjectURL(blob));
      setRemovida(false);
      aoMudar(blob);
      setImg(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não conseguimos usar essa foto.");
    }
  }
  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastando(false);
    receber(e.dataTransfer.files?.[0]);
  }
  function colar(e: ClipboardEvent) {
    const item = [...e.clipboardData.items].find((i) => i.type.startsWith("image/"));
    if (item) {
      e.preventDefault();
      receber(item.getAsFile());
    }
  }
  const src = previa ?? (removida ? null : previaAtual) ?? null;

  return (
    <div className="space-y-3">
      <span className={rotuloCampo} id={`${id}-rotulo`}>
        Foto (opcional)
      </span>
      <div
        tabIndex={0}
        role="group"
        aria-labelledby={`${id}-rotulo`}
        aria-describedby={`${id}-ajuda`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        onPaste={colar}
        className={`flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed p-3 ${arrastando ? "border-destaque bg-superficie" : "border-transparent"}`}
      >
        {src ? (
          <img src={src} alt="Prévia da foto" className="h-16 w-16 shrink-0 rounded-full border-2 border-coral object-cover" />
        ) : (
          <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-coral bg-vinho text-lg font-semibold text-off-white">
            {iniciais}
          </span>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Escolher foto"
          onChange={(e) => {
            receber(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => input.current?.click()} className={botao}>
          {src ? "Trocar foto" : "Escolher foto"}
        </button>
        {temWebcam && (
          <button type="button" onClick={() => setCamera(true)} className={discreto}>
            Usar a câmera
          </button>
        )}
        {src && (
          <button
            type="button"
            onClick={() => {
              if (previa) URL.revokeObjectURL(previa);
              setPrevia(null);
              setRemovida(true);
              aoMudar(null);
            }}
            className={discreto}
          >
            Remover
          </button>
        )}
      </div>
      <p id={`${id}-ajuda`} className={`text-sm ${erro ? "text-erro" : "text-suave"}`} role={erro ? "alert" : undefined}>
        {erro || "Do celular ou do computador. Você pode ajustar o enquadramento."}
      </p>
      {camera && (
        <Webcam
          aoTirar={(b) => {
            setCamera(false);
            receber(b);
          }}
          aoFechar={() => setCamera(false)}
          aoErro={(m) => {
            setCamera(false);
            setErro(m);
          }}
        />
      )}
      {img && <Recorte img={img} enq={enq} setEnq={setEnq} aoConfirmar={confirmar} aoCancelar={() => setImg(null)} />}
    </div>
  );
}

function Recorte({
  img,
  enq,
  setEnq,
  aoConfirmar,
  aoCancelar,
}: {
  img: ImageBitmap;
  enq: Enquadramento;
  setEnq: (e: Enquadramento) => void;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const { sx, sy, lado } = areaDoRecorte(img.width, img.height, enq);
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, c.width, c.height);
  }, [img, enq]);
  const faixa = (rotulo: string, k: keyof Enquadramento, min: number, max: number, step: number) => (
    <label className="block text-sm">
      <span className="font-semibold">{rotulo}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={enq[k]}
        onChange={(e) => setEnq({ ...enq, [k]: Number(e.target.value) })}
        className="mt-1 block w-full accent-[var(--destaque)]"
      />
    </label>
  );
  return (
    <div role="dialog" aria-label="Ajuste o enquadramento" className="space-y-4 rounded-2xl border border-linha p-4">
      <p className="font-semibold">Ajuste o enquadramento</p>
      <div className="flex flex-wrap items-start gap-6">
        <canvas ref={canvas} width={240} height={240} className="h-40 w-40 rounded-full border-2 border-coral sm:h-48 sm:w-48" />
        <div className="min-w-48 flex-1 space-y-3">
          {faixa("Zoom", "zoom", 1, 3, 0.05)}
          {faixa("Horizontal", "x", -1, 1, 0.05)}
          {faixa("Vertical", "y", -1, 1, 0.05)}
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={aoConfirmar} className="inline-flex h-12 items-center rounded-xl bg-destaque px-5 font-semibold text-sobre-destaque">
          Usar esta foto
        </button>
        <button type="button" onClick={aoCancelar} className={discreto}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Webcam({ aoTirar, aoFechar, aoErro }: { aoTirar: (b: Blob) => void; aoFechar: () => void; aoErro: (m: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => aoErro("Não conseguimos abrir a câmera. Confira a permissão do navegador."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);
  function tirar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => b && aoTirar(b), "image/png");
  }
  return (
    <div role="dialog" aria-label="Câmera" className="space-y-3 rounded-2xl border border-linha p-4">
      <video ref={video} autoPlay playsInline muted className="w-full max-w-sm rounded-xl" />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={tirar} className="inline-flex h-12 items-center rounded-xl bg-destaque px-5 font-semibold text-sobre-destaque">
          Tirar foto
        </button>
        <button type="button" onClick={aoFechar} className={discreto}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
