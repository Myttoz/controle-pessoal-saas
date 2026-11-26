import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  Download,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada } from '@/components/Campos';
import { LISTAS } from '@/types/api-types';
import { useStoreLocal } from '@/store/storeLocal';

function quando(ts: number | null): string {
  if (!ts) return 'nunca';
  return new Date(ts).toLocaleString('pt-BR');
}

/**
 * Sincronização e backup dos DADOS LOCAIS.
 *
 * Os lançamentos mensais/salário já vivem na planilha e sincronizam sozinhos.
 * Aqui ficam as áreas que antes eram só do dispositivo: Horas Extras, Férias,
 * Manutenção e a configuração (salário bruto / KM).
 */
export function SincronizacaoPage() {
  const sincronizando = useStoreLocal((s) => s.sincronizando);
  const pendente = useStoreLocal((s) => s.pendente);
  const erroSync = useStoreLocal((s) => s.erroSync);
  const ultima = useStoreLocal((s) => s.ultimaSincronizacao);
  const sincronizar = useStoreLocal((s) => s.sincronizar);
  const exportar = useStoreLocal((s) => s.exportarBackup);
  const importar = useStoreLocal((s) => s.importarBackup);
  const config = useStoreLocal((s) => s.dados.config);
  const setConfig = useStoreLocal((s) => s.setConfig);

  const inputRef = useRef<HTMLInputElement>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(
    null,
  );

  const aoEscolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      const resultado = await importar(texto);
      setMensagem({
        tipo: resultado.ok ? 'ok' : 'erro',
        texto: resultado.mensagem,
      });
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível ler o arquivo.' });
    }
  };

  const estado = erroSync
    ? {
        icone: CloudOff,
        cor: 'text-amber-300',
        fundo: 'border-amber-700/50 bg-amber-500/10',
        titulo: 'Sem conexão com o servidor',
        detalhe:
          'As alterações estão salvas neste dispositivo e serão enviadas automaticamente quando a internet voltar.',
      }
    : pendente
      ? {
          icone: AlertTriangle,
          cor: 'text-amber-300',
          fundo: 'border-amber-700/50 bg-amber-500/10',
          titulo: 'Alterações pendentes',
          detalhe: 'Salvas neste dispositivo. Clique em "Sincronizar agora" para enviar.',
        }
      : {
          icone: CheckCircle2,
          cor: 'text-emerald-400',
          fundo: 'border-emerald-800/50 bg-emerald-500/10',
          titulo: 'Tudo sincronizado',
          detalhe: 'Os dados locais estão iguais na planilha e neste dispositivo.',
        };

  const IconeEstado = estado.icone;

  return (
    <div className="space-y-3">
      {/* ---------- status ---------- */}
      <section className={`rounded-xl border p-4 ${estado.fundo}`}>
        <div className="flex items-start gap-3">
          <IconeEstado className={`mt-0.5 h-5 w-5 shrink-0 ${estado.cor}`} />
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold ${estado.cor}`}>{estado.titulo}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{estado.detalhe}</p>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Última sincronização: <strong className="text-slate-400">{quando(ultima)}</strong>
            </p>
            {erroSync && (
              <p className="mt-1 break-words text-[11px] text-amber-400/80">{erroSync}</p>
            )}
          </div>
        </div>
      </section>

      {/* ---------- ações ---------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">Ações</h2>
        <p className="mt-1 text-xs text-slate-500 hidden" title="Use o mesmo login nos computadores Linux, Windows e no navegador para manter           Horas Extras, Férias, Manutenção e salário iguais em todos eles.">Use o mesmo login nos computadores Linux, Windows e no navegador para manter
          Horas Extras, Férias, Manutenção e salário iguais em todos eles.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Botao
            variante="primario"
            icone={RefreshCw}
            carregando={sincronizando}
            onClick={() => void sincronizar(true)}
          >
            Sincronizar agora
          </Botao>
          <Botao variante="secundario" icone={Download} onClick={exportar}>
            Exportar backup (.json)
          </Botao>
          <Botao
            variante="secundario"
            icone={Upload}
            onClick={() => inputRef.current?.click()}
          >
            Importar backup
          </Botao>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={aoEscolherArquivo}
          />
        </div>

        {mensagem && (
          <p
            className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
              mensagem.tipo === 'ok'
                ? 'border-emerald-800/60 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-800/60 bg-rose-500/10 text-rose-300'
            }`}
          >
            {mensagem.texto}
          </p>
        )}
      </section>

      {/* ---------- orçamento e alertas (Bloco 8, reversível) ---------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Orçamento e alertas inteligentes</h2>
            <p className="mt-1 text-xs text-slate-500 hidden" title="Reversível: desligue a chave para ocultar o painel e ignorar os alertas. Os orçamentos são salvos localmente/sincronizados.">Reversível: desligue a chave para ocultar o painel e ignorar os alertas. Os orçamentos são salvos localmente/sincronizados.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={!!config.alertasInteligentesAtivo}
              onChange={(e) => setConfig({ alertasInteligentesAtivo: e.target.checked })}
            />
            Ativar
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Avisar ao atingir (%)" dica="Ex.: 80 = alerta quando categoria chega a 80% do orçamento">
            <Entrada
              type="number"
              min={1}
              max={100}
              value={String(config.alertaOrcamentoPercentual ?? 80)}
              onChange={(e) => {
                const v = Number(e.target.value);
                setConfig({ alertaOrcamentoPercentual: Number.isFinite(v) ? Math.min(100, Math.max(1, v)) : 80 });
              }}
            />
          </Campo>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Orçamento mensal por categoria (R$)</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LISTAS.CATEGORIA.map((cat) => {
              const atual = config.orcamentosCategoria?.[cat];
              return (
                <label key={cat} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-300">
                  <span className="min-w-0 flex-1 truncate" title={cat}>{cat}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={atual ?? ''}
                    placeholder="0,00"
                    onChange={(e) => {
                      const raw = e.target.value;
                      const orcamentos = { ...(config.orcamentosCategoria ?? {}) };
                      if (raw === '') {
                        delete orcamentos[cat];
                      } else {
                        const n = Number(raw);
                        if (Number.isFinite(n) && n >= 0) orcamentos[cat] = n;
                      }
                      setConfig({ orcamentosCategoria: orcamentos });
                    }}
                    className="w-28 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-right text-slate-200"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- como funciona (tooltip) ---------- */}
      <section
        className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-400"
        title="Como funciona: as alterações são salvas no dispositivo e enviadas em segundo plano; sem internet ficam guardadas e sobem quando a conexão volta. Em outro dispositivo, os dados mais recentes são baixados ao abrir. Conflitos: vale a última gravação — use o backup antes de mudanças grandes. O .json pode ser guardado e importado em qualquer versão."
      >
        Como funciona
      </section>
    </div>
  );
}
