import { useState } from 'react';
import { CalendarPlus, CalendarRange, LayoutDashboard, RefreshCw, Trash2 } from 'lucide-react';
import { AreaErro, Carregando, EstadoVazio } from '@/components/Estados';
import { Botao } from '@/components/Botoes';
import { Campo, Entrada } from '@/components/Campos';
import { Modal } from '@/components/Modal';
import { usePedidoNovo } from '@/hooks/usePedidoNovo';
import { useStoreAno } from '@/store/storeAno';
import { useStoreUI } from '@/store/storeUI';

export function AnosPage() {
  const anos = useStoreAno((s) => s.anos);
  const anoSelecionado = useStoreAno((s) => s.anoSelecionado);
  const carregando = useStoreAno((s) => s.carregando);
  const erro = useStoreAno((s) => s.erro);
  const revalidacoes = useStoreAno((s) => s.revalidacoes);
  const selecionarAno = useStoreAno((s) => s.selecionarAno);
  const criarNovoAno = useStoreAno((s) => s.criarNovoAno);
  const excluirAno = useStoreAno((s) => s.excluirAno);
  const gerarDashboard = useStoreAno((s) => s.gerarDashboard);
  const atualizarAnos = useStoreAno((s) => s.atualizarAnos);

  const irPara = useStoreUI((s) => s.irPara);

  const maiorAno = anos.length > 0 ? Math.max(...anos) : new Date().getFullYear();
  const proximoAno = maiorAno + 1;

  // Ctrl+O → foca o campo "Criar novo ano"
  usePedidoNovo(() => {
    document.getElementById('novo-ano-input')?.focus();
  });

  const [novoAno, setNovoAno] = useState('');
  const [criando, setCriando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [anoCriado, setAnoCriado] = useState<number | null>(null);
  const [gerandoDashboard, setGerandoDashboard] = useState(false);
  const [anoExcluindo, setAnoExcluindo] = useState<number | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const confirmarExcluir = async () => {
    if (anoExcluindo == null) return;
    setExcluindo(true);
    const ok = await excluirAno(anoExcluindo);
    setExcluindo(false);
    if (ok) setAnoExcluindo(null);
  };

  const criar = async () => {
    const texto = novoAno.trim();
    const ano = texto === '' ? proximoAno : Number(texto);
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      setErroFormulario('Informe um ano válido entre 2000 e 2100.');
      return;
    }
    if (anos.includes(ano)) {
      setErroFormulario(`O ano ${ano} já existe.`);
      return;
    }
    setErroFormulario(null);
    setCriando(true);
    const ok = await criarNovoAno(ano);
    setCriando(false);
    if (ok) {
      setNovoAno('');
      setAnoCriado(ano);
    }
  };

  const confirmarDashboard = async () => {
    if (anoCriado == null) return;
    setGerandoDashboard(true);
    await gerarDashboard(anoCriado);
    setGerandoDashboard(false);
    setAnoCriado(null);
  };

  const abrirAno = async (ano: number) => {
    if (ano !== anoSelecionado) await selecionarAno(ano);
    irPara('dashboard');
  };

  return (
    <div className="space-y-3">
      {/* ------- criação ------- */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Criar novo ano</h2>
            <p className="text-xs text-slate-500 hidden" title="Gera as 12 abas de mês, Salário, Extras e Anual na planilha (ação criarAno).">Gera as 12 abas de mês, Salário, Extras e Anual na planilha (ação <code>criarAno</code>).</p>
          </div>
          <Botao
            icone={RefreshCw}
            onClick={() => void atualizarAnos()}
            disabled={revalidacoes > 0}
            title="Buscar a lista de abas novamente"
          >
            Atualizar lista
          </Botao>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <Campo
            rotulo="Ano"
            className="w-40"
          >
            <Entrada
              value={novoAno}
              onChange={(e) => {
                setNovoAno(e.target.value.replace(/[^\d]/g, '').slice(0, 4));
                setErroFormulario(null);
              }}
              placeholder={String(proximoAno)}
              inputMode="numeric"
              id="novo-ano-input"
              autoComplete="off"
              title={`Em branco = ${proximoAno}`}
            />
          </Campo>
          <Botao
            variante="primario"
            icone={CalendarPlus}
            carregando={criando}
            onClick={() => void criar()}
            className="!mb-0"
          >
            Criar ano
          </Botao>
          {erroFormulario && <p className="pb-2 text-sm text-rose-400">{erroFormulario}</p>}
        </div>
      </section>

      {/* ------- lista ------- */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-200">
          Anos existentes <span className="text-slate-500">({anos.length})</span>
        </h2>

        {anos.length === 0 ? (
          carregando ? (
            <Carregando texto="Listando abas…" />
          ) : erro ? (
            <AreaErro mensagem={erro} aoTentar={() => void atualizarAnos()} />
          ) : (
            <EstadoVazio
              icone={CalendarRange}
              titulo="Nenhum ano encontrado"
              descricao="A API não retornou abas. Verifique a conexão e a implantação da planilha."
              acao={
                <Botao icone={RefreshCw} onClick={() => void atualizarAnos()}>
                  Buscar novamente
                </Botao>
              }
            />
          )
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...anos].reverse().map((ano) => {
              const selecionado = ano === anoSelecionado;
              return (
                <li
                  key={ano}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition ${
                    selecionado
                      ? 'border-sky-600/60 bg-sky-950/20'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-lg text-base font-bold ${
                        selecionado ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ano}
                    </span>
                    <div className="text-xs text-slate-500">
                      {seletorInfo(ano)}
                      {selecionado && (
                        <span className="mt-0.5 block font-medium text-sky-400">
                          Em uso agora
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Botao
                      tamanho="sm"
                      variante={selecionado ? 'secundario' : 'primario'}
                      onClick={() => void abrirAno(ano)}
                    >
                      {selecionado ? 'Recarregar' : 'Abrir'}
                    </Botao>
                    {!selecionado && (
                      <Botao
                        tamanho="sm"
                        icone={LayoutDashboard}
                        onClick={() => void gerarDashboard(ano)}
                        title={`Gerar/atualizar a aba Dashboard de ${ano} na planilha`}
                      >
                        Dashboard
                      </Botao>
                    )}
                    <Botao
                      tamanho="sm"
                      variante="perigo"
                      icone={Trash2}
                      onClick={() => setAnoExcluindo(ano)}
                      title={selecionado ? `Antes de excluir, troque para outro ano` : `Excluir o ano ${ano} permanentemente`}
                      disabled={selecionado}
                    >
                      Excluir
                    </Botao>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ------- confirmação de exclusão ------- */}
      <Modal
        aberto={anoExcluindo !== null}
        titulo={`Excluir o ano ${anoExcluindo ?? ''}`}
        aoFechar={() => setAnoExcluindo(null)}
        largura="max-w-md"
        rodape={
          <>
            <Botao onClick={() => setAnoExcluindo(null)} disabled={excluindo}>
              Cancelar
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={excluindo} onClick={() => void confirmarExcluir()}>
              Excluir ano {anoExcluindo ?? ''}
            </Botao>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-300">
          <p className="font-semibold text-rose-300">ATENÇÃO — essa ação não pode ser desfeita.</p>
          <p>
            Excluir o ano <strong className="text-slate-100">{anoExcluindo ?? ''}</strong> apaga
            <strong> tudo o que foi criado para ele</strong>:
          </p>
          <ul className="list-disc pl-5 leading-relaxed">
            <li>Lançamentos mensais</li>
            <li>Salário e extras daquele ano</li>
            <li>Resumo de Pagamentos (despesas e recebidos da Lívia)</li>
            <li>Saldo inicial do ano</li>
            <li>Anos &quot;sentados&quot; via Gestão Anual</li>
          </ul>
          <p className="text-xs text-slate-500 hidden" title="Os demais anos (por exemplo 2026) não são afetados de nenhuma forma.">Os demais anos (por exemplo 2026) <strong>não são afetados</strong> de nenhuma forma.</p>
        </div>
      </Modal>

      {/* ------- oferta pós-criação ------- */}
      <Modal
        aberto={anoCriado !== null}
        titulo={`Ano ${anoCriado ?? ''} criado`}
        aoFechar={() => setAnoCriado(null)}
        largura="max-w-md"
        rodape={
          <>
            <Botao onClick={() => setAnoCriado(null)} disabled={gerandoDashboard}>
              Agora não
            </Botao>
            <Botao
              variante="primario"
              icone={LayoutDashboard}
              carregando={gerandoDashboard}
              onClick={() => void confirmarDashboard()}
            >
              Gerar Dashboard
            </Botao>
          </>
        }
      >
        <p className="text-sm text-slate-300" title="As abas do ano foram criadas na planilha. Deseja gerar agora a aba{' '}           Dashboard com os gráficos deste ano?">As abas do ano foram criadas na planilha. Deseja gerar agora a aba{' '}
          <strong>Dashboard</strong> com os gráficos deste ano?</p>
        <p className="mt-1.5 text-xs text-slate-500 hidden" title="A ação atualizarDashboard desenha a pizza de categorias e as colunas por mês           direto no Google Sheets.">A ação <code>atualizarDashboard</code> desenha a pizza de categorias e as colunas por mês
          direto no Google Sheets.</p>
      </Modal>
    </div>
  );
}

function seletorInfo(ano: number): string {
  const atual = new Date().getFullYear();
  if (ano === atual) return 'Ano corrente';
  if (ano > atual) return 'Próximos anos';
  return 'Histórico';
}
