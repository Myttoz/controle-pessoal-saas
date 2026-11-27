# Scripts utilitários

## `pdf2csv.py` — Extrato PDF do Mercado Pago → CSV

Converte o extrato em PDF (conta do Mercado Pago) para CSV com as colunas
`Data;Descrição;Valor;Observação`, prontas para importar na aba **Importação CSV**
do SaaS. O PDF não precisa ser desprotegido — o `pdftotext` lê o texto.

```bash
python3 scripts/pdf2csv.py extrato.pdf saida.csv
```

Pré-requisito: `pdftotext` (pacote `poppler-utils`). No Linux:
`sudo apt install poppler-utils`.

## Desproteger PDF (para abrir no LibreOffice)

Se o LibreOffice pedir senha (restrições de cópia/impressão), gere um PDF
sem restrições com Ghostscript:

```bash
gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/ebook -dNOPDFMARKS \
   -sOutputFile=extrato-desprotegido.pdf extrato.pdf
```

O arquivo resultante abre no LibreOffice sem senha e pode ser exportado para CSV.

## Observação

O parser é específico do formato de extrato do Mercado Pago. Para outros
bancos, adapte a função `parsear` em `scripts/pdf2csv.py`.

## `backup-financa` — Backup manual (banco + anexos)

Gera, na hora, o `.dump` do banco **e** uma pasta com os anexos do Storage —
sem esperar o backup semanal do GitHub.

```bash
backup-financa                         # banco + anexos
backup-financa /caminho/para/salvar    # pasta de saída customizada
backup-financa --sem-anexos            # só o banco
backup-financa --configurar-anexos     # cadastra a chave secret (uma vez)
backup-financa --help                  # ajuda
```

- Sem argumento, salva em `~/Documentos/Pessoal/backups-saas-financas/`:
  - `backup-AAAA-MM-DD-HHMM.dump`
  - `anexos-AAAA-MM-DD/` (com a mesma estrutura do bucket)
- **Banco:** na primeira execução, pede apenas a **senha do banco** (a digitação
  não aparece) e monta a connection string do Session pooler sozinho, guardando
  em `~/.config/saas-financas/db-url` (permissão `600`).
- **Anexos:** são opcionais. Exigem a **chave secret** do Supabase, cadastrada
  uma vez com `backup-financa --configurar-anexos` e guardada em
  `~/.config/saas-financas/service-role` (permissão `600`). Sem ela, o script
  salva o banco e avisa que os anexos foram pulados.
- Requer `pg_dump` 17+ e, para os anexos, `node` + `backups/backup-anexos.mjs`.
- A chave secret **nunca** vai para o GitHub, para o `.env` nem para o chat.

## `baixarfinanca` — Atualizar o projeto

Baixa as novidades do GitHub (`git pull --ff-only`) e roda `npm install` sozinho
quando as dependências mudaram.

```bash
baixarfinanca
```

Se houver alterações locais não commitadas, ele avisa e não mexe em nada.

## Atalhos globais (opcional, recomendado)

Para usar `converterpdf`, `desprotegerpdf`, `backup-financa` e `baixarfinanca`
de qualquer pasta, crie links simbólicos na sua pasta `~/bin` (após clonar o
repositório):

```bash
mkdir -p ~/bin
ln -sf "$HOME/Documentos/Pessoal/saas-financas/scripts/converterpdf" ~/bin/converterpdf
ln -sf "$HOME/Documentos/Pessoal/saas-financas/scripts/desprotegerpdf" ~/bin/desprotegerpdf
ln -sf "$HOME/Documentos/Pessoal/saas-financas/scripts/backup-financa" ~/bin/backup-financa
ln -sf "$HOME/Documentos/Pessoal/saas-financas/scripts/baixarfinanca" ~/bin/baixarfinanca
```

Ajuste o caminho se você clonou o repositório em outro lugar.
