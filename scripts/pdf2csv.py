#!/usr/bin/env python3
"""Converte o extrato em PDF do Mercado Pago (conta) para CSV.

Uso:
    python3 scripts/pdf2csv.py extrato.pdf saida.csv

O PDF não precisa ser desprotegido: o pdftotext (poppler) lê o texto.
O CSV gerado tem as colunas: Data;Descrição;Valor;Observação
que podem ser mapeadas diretamente na aba "Importação CSV" do SaaS.
"""

import re
import subprocess
import sys
import os

DATA_RE = re.compile(r"\b(\d{2})[-/](\d{2})[-/](\d{4})\b")
VALOR_RE = re.compile(r"R\$\s*(-?\s*[\d\.,]+)")
ID_RE = re.compile(r"\b(\d{9,})\b")
PAGINA_RE = re.compile(r"^\s*\d+/\d+\s*$")


def extrair_texto(pdf):
    out = subprocess.run(
        ["pdftotext", "-layout", pdf, "-"],
        capture_output=True, text=True, check=True,
    ).stdout
    return out


def parsear(texto):
    linhas = texto.splitlines()
    # remove rodapé/numeração de página e cabeçalho da tabela
    filtradas = []
    for l in linhas:
        if PAGINA_RE.match(l):
            continue
        if "DETALHE DOS MOVIMENTOS" in l or l.strip().startswith("Data         Descri") or l.strip().startswith("Data           Descri"):
            continue
        if "Data de geração" in l:
            break
        filtradas.append(l)

    # agrupa em blocos separados por linha em branco
    blocos = []
    atual = []
    for l in filtradas:
        if l.strip() == "":
            if atual:
                blocos.append(atual)
                atual = []
        else:
            atual.append(l)
    if atual:
        blocos.append(atual)

    registros = []
    for bloco in blocos:
        texto_bloco = "\n".join(bloco)
        mdata = DATA_RE.search(texto_bloco)
        if not mdata:
            continue
        dia, mes, ano = mdata.group(1), mdata.group(2), mdata.group(3)
        data_iso = f"{ano}-{mes}-{dia}"
        mvalor = VALOR_RE.search(texto_bloco)
        mid = ID_RE.search(texto_bloco)
        if not mvalor:
            continue
        valor = mvalor.group(1).replace(" ", "")
        opid = mid.group(1) if mid else ""

        # descrição = todo o texto do bloco, sem data/id/valor/saldo
        desc = texto_bloco
        desc = DATA_RE.sub("", desc)
        desc = VALOR_RE.sub("", desc)
        desc = ID_RE.sub("", desc)
        desc = re.sub(r"R\$", "", desc)
        desc = re.sub(r"\s+", " ", desc).strip()
        desc = desc.replace("Entradas: ", "").replace("Saidas: ", "").replace("Saldo inicial: ", "").replace("Saldo final: ", "")

        # remove palavras duplicadas (consecutivas ou não): "ALEXANDRE REGALI ... ALEXANDRE REGALI" -> uma vez
        vistos = set()
        dedup = []
        for w in desc.split():
            low = w.lower()
            if low in vistos:
                continue
            vistos.add(low)
            dedup.append(w)
        desc = " ".join(dedup)

        obs = f"ID {opid}" if opid else ""
        registros.append({"data": data_iso, "descricao": desc, "valor": valor, "obs": obs})

    return registros


def main():
    if len(sys.argv) < 3:
        print("Uso: python3 scripts/pdf2csv.py extrato.pdf saida.csv", file=sys.stderr)
        sys.exit(1)
    pdf, saida = sys.argv[1], sys.argv[2]
    texto = extrair_texto(pdf)
    regs = parsear(texto)

    with open(saida, "w", encoding="utf-8", newline="") as f:
        f.write("Data;Descrição;Valor;Observação\n")
        for r in regs:
            # normaliza valor para formato BR com vírgula
            v = r["valor"].replace(".", "").replace(",", ".") if False else r["valor"]
            f.write(f'{r["data"]};{r["descricao"]};{v};{r["obs"]}\n')

    print(f"Geradas {len(regs)} linhas em {saida}")


if __name__ == "__main__":
    main()
