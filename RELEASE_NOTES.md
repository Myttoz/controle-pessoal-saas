# Notas da próxima release (lidas pelo workflow de release).
#
# Como funciona:
#   git push -u origin master
#   git tag vX.Y.Z
#   git push origin vX.Y.Z
#
# O workflow `.github/workflows/release.yml` cria a página da release
# usando ESTE arquivo como corpo (não mais commits brutos).
#
# Ou seja: ANTES de criar a tag, edite este arquivo com as notas da nova
# versão. Mantenha sempre a versão ATUAL aqui.

# Controle Pessoal — v2.0.0

Release de consolidação do SaaS (GitHub Pages + Supabase). ~60 commits desde a v1.0.0.

## Novidades

- **Duplicar lançamento para o mês seguinte** (botão direito na tabela): mesmo lançamento, DATA +1 mês, parcela "7/12" → "8/12".
- **Ponto eletrônico**: total de HE do mês lançado manualmente (sempre a 50%) + tabela dedicada; entra no gráfico; plantões filtrados por ano (com "ver todos"); coluna Data ordenável.
- **Extras virou Serviços**: data, cliente, serviço, despesas cliente (informativo), ganhos peças/serviços e minhas despesas — o **total do mês entra como FREELANCE** na aba Recebidos → Salário. Gastos mantidos à parte.
- **Resumo Pagamentos automático** (Salário, Despesas = Total Gasto, Recebido Lívia = ½ 50/50 + tudo "Livia") em todos os anos; saldo acumulado pelo saldo inicial; sem abas de mês no topo.
- **Resumo Mensal Tipo / Resumo Mensal Categoria**: colunas dinâmicas por mês, totais por coluna e total geral, rolagem horizontal.
- **Dashboard**: Total gasto no ano = Despesas − Recebido Lívia; novo card "Total ganho no ano"; Saldo = ganho − gasto; ranking anual por tipo; gráficos por categoria/mês.
- **Ctrl+O** por setor; **Lembretes** viram Enviado ao abrir o Google Agenda; **Férias** com status; **TOTAL GANHOS** unificado; máscara R$ com 2 casas em todo campo monetário; **HORA EXTRA** calculada ao vivo.

## Correções

- Tabela de Lançamentos quebrada em 2027; autocomplete com Tab/Enter/Esc corretos; extras de ano novo "não existiam"; mês do extra sempre 1; plantões salvos mas invisíveis; férias perdiam o abono a cada sincronização.

## Banco de dados

`sql/002`–`sql/006` já versionados (extras/serviços, RLS, férias, horas extras). Execute no SQL Editor do Supabase quem ainda não rodou.

## Segurança

RLS revisado e aplicado em todas as tabelas (incluindo as `backup_*` que estavam públicas).
