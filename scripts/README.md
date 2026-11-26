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

## Atalhos globais (opcional, recomendado)

Para usar `converterpdf` e `desprotegerpdf` de qualquer pasta, crie links
simbólicos na sua pasta `~/bin` (após clonar o repositório):

```bash
mkdir -p ~/bin
ln -sf "$HOME/Documentos/Pessoal/saas-financas/scripts/converterpdf" ~/bin/converterpdf
ln -sf "$HOME/Documentos/Pessoal/saas-financas/scripts/desprotegerpdf" ~/bin/desprotegerpdf
```

Ajuste o caminho se você clonou o repositório em outro lugar.
