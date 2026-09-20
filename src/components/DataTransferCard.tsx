import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Download, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyImport, buildExportZip, readImportZip, saveBlob, type ImportPreview, type TransferMode } from "@/lib/portability";

/** Export everything you own to one file, or bring another export into this account. */
export function DataTransferCard() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<TransferMode>("full");

  const exportAll = async () => {
    setBusy("Export ban raha hai…");
    try {
      const { blob, summary } = await buildExportZip(mode);
      saveBlob(`bnoy-study-${mode}-${new Date().toISOString().slice(0, 10)}.zip`, blob);
      toast.success(`Export ready — ${summary.subjects} subjects, ${summary.sessions} sessions, ${summary.notes} PDFs`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const pick = async (file: File) => {
    setBusy("File padhi ja rahi hai…");
    try {
      setPreview(await readImportZip(file));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    try {
      const result = await applyImport(preview, (label) => setBusy(`Importing ${label}…`));
       if (result.failures.length) toast.warning(`Import hua, lekin ${result.failures.length} items skip hue`);
       else toast.success(`Import complete — ${result.subjects} subjects, ${result.sessions} sessions, ${result.notes} files`);
      setPreview(null);
      void qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="surface-card p-5">
      <h2 className="text-base font-extrabold tracking-tight">Your data</h2>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Profile, subjects, chapters, history, targets aur chapter PDFs — sab ek file me. Dusra user isi file ko apne
        account me import kar sakta hai.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {([{"id":"full","label":"Full account","copy":"Profile, preferences aur complete study record","Icon":ShieldCheck},{"id":"study","label":"Study package","copy":"Subjects, history, classes aur media only","Icon":BookOpen}] as const).map(({id,label,copy,Icon}) => (
          <button type="button" key={id} onClick={() => setMode(id)} className={`min-h-20 rounded-2xl border p-3 text-left transition ${mode === id ? "border-foreground bg-secondary" : "border-border bg-panel"}`}>
            <span className="flex items-center gap-2 text-sm font-extrabold"><Icon className="size-4" />{label}</span>
            <span className="mt-1 block text-[11px] text-muted-foreground">{copy}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button className="gap-2" disabled={!!busy} onClick={() => void exportAll()}>
          <Download className="size-4" /> Export {mode === "full" ? "full account" : "study package"}
        </Button>
        <Button variant="outline" className="gap-2" disabled={!!busy} onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Import a file
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
            e.target.value = "";
          }}
        />
      </div>

      {busy ? <p className="mt-3 text-xs font-semibold text-muted-foreground">{busy}</p> : null}

      {preview ? (
        <div className="mt-4 rounded-2xl border border-border bg-panel p-4">
          <p className="text-sm font-bold">Import preview</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
             <span className="font-bold capitalize">{preview.mode} import</span> · {preview.exportedAt ? `Exported ${new Date(preview.exportedAt).toLocaleDateString()} · ` : ""}
            {preview.summary.subjects} subjects · {preview.summary.chapters} chapters · {preview.summary.sessions}{" "}
            sessions · {preview.summary.notes} PDFs
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Aapka current data delete nahi hoga — same naam ke subjects skip ho jayenge.
          </p>
          <div className="mt-3 flex gap-2">
            <Button disabled={!!busy} onClick={() => void confirmImport()}>
              Import now
            </Button>
            <Button variant="outline" disabled={!!busy} onClick={() => setPreview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
