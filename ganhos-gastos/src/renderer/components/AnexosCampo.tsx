import { useEffect, useRef, useState } from 'react';
import { Download, Paperclip, Trash2, Upload } from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { listarAnexos, removerAnexo, uploadAnexo, urlAnexo, type Anexo, type EntidadeAnexo } from '@/services/anexos';
import { useStoreUI } from '@/store/storeUI';

function formatBytes(n: number | null | undefined): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnexosCampo({
  entidadeTipo,
  entidadeId,
}: {
  entidadeTipo: EntidadeAnexo;
  entidadeId?: string | null;
}) {
  const toast = useStoreUI((s) => s.toast);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviandoRef = useRef(false);

  const carregar = async () => {
    if (!entidadeId) { setAnexos([]); return; }
    setCarregando(true);
    try {
      setAnexos(await listarAnexos(entidadeTipo, entidadeId));
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Falha ao carregar anexos.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { void carregar(); }, [entidadeTipo, entidadeId]);

  const aoEnviar = async (files: FileList | null) => {
    if (!files || !entidadeId || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    try {
      for (const file of Array.from(files)) {
        await uploadAnexo(entidadeTipo, entidadeId, file);
      }
      toast('sucesso', files.length > 1 ? 'Anexos enviados.' : 'Anexo enviado.');
      await carregar();
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Falha ao enviar anexo.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const aoAbrir = async (a: Anexo) => {
    try {
      const url = await urlAnexo(a);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Falha ao abrir anexo.');
    }
  };

  const aoRemover = async (a: Anexo) => {
    if (enviandoRef.current) return;
    if (!confirm(`Remover anexo "${a.nome}"?`)) return;
    enviandoRef.current = true;
    try {
      await removerAnexo(a);
      setAnexos((prev) => prev.filter((x) => x.id !== a.id));
      toast('sucesso', 'Anexo removido.');
    } catch (e) {
      toast('erro', e instanceof Error ? e.message : 'Falha ao remover anexo.');
    } finally {
      enviandoRef.current = false;
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5" /> Anexos
        </p>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void aoEnviar(e.target.files)}
          />
          <Botao
            type="button"
            icone={Upload}
            disabled={!entidadeId || enviando}
            onClick={() => inputRef.current?.click()}
          >
            {enviando ? 'Enviando…' : 'Anexar'}
          </Botao>
        </div>
      </div>

      {!entidadeId ? (
        <p className="text-[11px] text-slate-500">Salve o registro para anexar arquivos.</p>
      ) : carregando ? (
        <p className="text-[11px] text-slate-500">Carregando anexos…</p>
      ) : anexos.length === 0 ? (
        <p className="text-[11px] text-slate-500">Nenhum anexo.</p>
      ) : (
        <ul className="space-y-1.5">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate text-slate-200" title={a.nome}>{a.nome}</p>
                <p className="text-[10px] text-slate-500">{formatBytes(a.tamanho)} {a.mime ? `· ${a.mime}` : ''}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-sky-300" title="Abrir/baixar" onClick={() => void aoAbrir(a)}>
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-rose-300" title="Remover" onClick={() => void aoRemover(a)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
