#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migração da planilha "Ganhos-Gastos 2026.xlsx" para o schema do SaaS.

Uso:
    python3 migrar-2026.py --xlsx "Ganhos-Gastos 2026.xlsx" --user-uuid "SEU_UUID"

Saída:
    migracao-2026.sql  (INSERTs prontos para o SQL Editor do Supabase)

Observação: o script não apaga nada. Rode os DELETEs do arquivo
`limpar-2026.sql` antes, se precisar refazer a importação.
"""

import argparse
import re
import sys
import zipfile
from datetime import datetime, timedelta
from xml.etree import ElementTree as ET

NS = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
EPOCH = datetime(1899, 12, 30)


# ---------------------------------------------------------------------------
# Utilitários de leitura do XLSX
# ---------------------------------------------------------------------------

def col_to_num(col):
    num = 0
    for c in col:
        num = num * 26 + (ord(c) - 64)
    return num


def num_to_col(num):
    s = ''
    while num > 0:
        num, resto = divmod(num - 1, 26)
        s = chr(65 + resto) + s
    return s


def excel_date(serial):
    try:
        n = float(serial)
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return None
    return (EPOCH + timedelta(days=int(n))).date().isoformat()


def normalize_date(d):
    """A aba Jan 26 tem datas de 2025 por engano; corrige para 2026."""
    if d and d.startswith('2025-'):
        return '2026-' + d[5:]
    return d


def load_workbook(path):
    z = zipfile.ZipFile(path)
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    sheets = {}
    for sh in wb.find('main:sheets', NS):
        sheets[sh.get('name')] = sh.get('{%s}id' % RNS)

    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    relmap = {rel.get('Id'): rel.get('Target') for rel in rels}

    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in ss.findall('main:si', NS):
            texts = [t.text or '' for t in si.iter('{%s}t' % NS['main'])]
            shared.append(''.join(texts))

    def parse(name):
        rid = sheets[name]
        target = relmap[rid]
        full = 'xl/' + target
        root = ET.fromstring(z.read(full))
        rows = []
        for row in root.iter('{%s}row' % NS['main']):
            cells = {}
            for c in row.findall('main:c', NS):
                ref = c.get('r')
                m = re.match(r'([A-Z]+)', ref)
                if not m:
                    continue
                col = m.group(1)
                t = c.get('t')
                v = c.find('main:v', NS)
                is_ = c.find('main:is', NS)
                val = ''
                if t == 's' and v is not None:
                    idx = int(v.text)
                    val = shared[idx] if idx < len(shared) else ''
                elif t == 'inlineStr' and is_ is not None:
                    val = ''.join(x.text or '' for x in is_.iter('{%s}t' % NS['main']))
                elif v is not None:
                    val = v.text
                cells[col] = val
            rows.append(cells)
        return rows

    return parse


def sql_str(v):
    if v is None:
        return 'null'
    s = str(v).replace("'", "''")
    return "'%s'" % s


def sql_num(v):
    if v is None or v == '':
        return 'null'
    try:
        return str(float(v))
    except ValueError:
        return 'null'


# ---------------------------------------------------------------------------
# Detecta o formato da aba mensal
# ---------------------------------------------------------------------------

MESES = {
    'jan': 1, 'fev': 2, 'mar': 3, 'abr': 4, 'maio': 5, 'mai': 5,
    'jun': 6, 'jul': 7, 'ago': 8, 'set': 9, 'out': 10,
    'nov': 11, 'dez': 12,
}


def detect_month(nome_aba):
    n = nome_aba.lower()
    for chave, num in MESES.items():
        if n.startswith(chave):
            return num
    return None


def parse_mensal(rows, mes):
    """Retorna lista de dicts: categoria, valor, descricao, forma_pgt, tipo,
    quem_paga, data, observacao."""
    # Acha a linha de cabeçalho
    header_idx = None
    fmt = None
    for i, r in enumerate(rows[:10]):
        a = str(r.get('A', '')).strip().upper()
        if a == 'CATEGORIA':
            header_idx = i
            fmt = '8col'
            break
        if a == 'GASTOS':
            header_idx = i
            # 5 ou 6 colunas: verifica se tem ITEM/SERVIÇO
            c = str(r.get('C', '')).strip().upper()
            fmt = '6col' if c in ('ITEM/SERVIÇO', 'ITEM', 'SERVIÇO') else '5col'
            break
        if a == 'COMPRAS':
            header_idx = i
            fmt = '4col'
            break
    if header_idx is None:
        return []

    out = []
    for r in rows[header_idx + 1:]:
        cat = str(r.get('A', '')).strip()
        if not cat:
            continue
        valor = r.get('B', '')
        if valor in ('', None):
            continue
        if fmt == '8col':
            desc = r.get('C', '')
            forma = r.get('D', '')
            tipo = r.get('E', '')
            quem = r.get('F', '')
            data = r.get('G', '')
            obs = r.get('H', '')
        elif fmt == '6col':
            desc = r.get('C', '')
            forma = r.get('D', '')
            tipo = ''
            quem = ''
            data = r.get('F', '')
            obs = r.get('E', '')
        elif fmt == '5col':
            desc = r.get('C', '')
            forma = r.get('D', '')
            tipo = ''
            quem = ''
            data = r.get('E', '')
            obs = ''
        else:  # 4col
            desc = r.get('C', '')
            forma = ''
            tipo = ''
            quem = ''
            data = r.get('D', '')
            obs = ''
        out.append({
            'categoria': cat,
            'valor': sql_num(valor),
            'descricao': desc,
            'forma_pgt': forma,
            'tipo': tipo,
            'quem_paga': quem,
            'data': normalize_date(excel_date(data)) if data else None,
            'observacao': obs,
        })
    return out


# ---------------------------------------------------------------------------
# Leituras específicas
# ---------------------------------------------------------------------------

def parse_imp_ganho(rows):
    """Imp Ganho 26: blocos de 3 colunas (DATA, DESCRIÇÃO, VALOR) por mês."""
    blocos = [
        (1, 'A', 'B', 'C'),   # JAN
        (2, 'F', 'G', 'H'),   # FEV
        (3, 'J', 'K', 'L'),   # MAR
        (4, 'N', 'O', 'P'),   # ABR
        (5, 'R', 'S', 'T'),   # MAI
        (6, 'V', 'W', 'X'),   # JUN
        (7, 'Z', 'AA', 'AB'),  # JUL
        (8, 'AD', 'AE', 'AF'),  # AGO
        (9, 'AH', 'AI', 'AJ'),  # SET
        (10, 'AL', 'AM', 'AN'),  # OUT
        (11, 'AP', 'AQ', 'AR'),  # NOV
        (12, 'AT', 'AU', 'AV'),  # DEZ
    ]
    out = []
    for mes, c_data, c_desc, c_val in blocos:
        for r in rows[2:]:
            desc = str(r.get(c_desc, '')).strip()
            valor = r.get(c_val, '')
            data = r.get(c_data, '')
            if not desc or valor in ('', None):
                continue
            out.append({
                'mes': mes,
                'descricao': desc,
                'valor': sql_num(valor),
                'data': excel_date(data) if data else None,
            })
    return out


def parse_salario_2026(rows):
    """Salário 26: pega hora extra, ajuda custo e ticket por mês."""
    # Colunas: A/DEZ, C/JAN, E/FEV, G/MAR, I/ABR, K/JAN(2), M/FEV, O/MAR,
    # Q/ABR, S/MAI, U/JUN, W/JUL, Y/AGO, AA/SET, AC/OUT, AE/NOV, AG/DEZ
    colunas_mes = {
        1: 'C', 2: 'E', 3: 'G', 4: 'I', 5: 'S', 6: 'U',
        7: 'W', 8: 'Y', 9: 'AA', 10: 'AC', 11: 'AE', 12: 'AG',
    }
    hora_extra = {}
    ajuda_custo = {}
    ticket = {}
    for r in rows:
        for linha, alvo in ((15, hora_extra), (16, ajuda_custo), (17, ticket)):
            if r is rows[linha - 1]:
                for mes, col in colunas_mes.items():
                    v = r.get(col, '')
                    if v not in ('', None):
                        alvo[mes] = sql_num(v)
    return hora_extra, ajuda_custo, ticket


def parse_resumo_2026(rows):
    """Aba '2026': pega SALARIO por mês (coluna L) e EXTRAS (coluna M)."""
    salario = {}
    extras = {}
    for r in rows[7:19]:  # linhas 8..19 (JAN..DEZ)
        mes = r.get('A', '')
        n = detect_month(str(mes))
        if not n:
            continue
        s = r.get('L', '')
        e = r.get('M', '')
        if s not in ('', None):
            salario[n] = sql_num(s)
        if e not in ('', None):
            extras[n] = sql_num(e)
    return salario, extras


def parse_hora_extra(rows):
    out = []
    for r in rows[1:]:
        data = r.get('B', '')
        if not data:
            continue
        out.append({
            'data': excel_date(data),
            'entrada': r.get('C', ''),
            'almoco_inicio': r.get('D', ''),
            'almoco_fim': r.get('E', ''),
            'saida': r.get('F', ''),
            'hora_100': sql_num(r.get('I', '')),
            'hora_50': sql_num(r.get('J', '')),
            'valor_presencial': sql_num(r.get('K', '')),
            'valor_home': sql_num(r.get('L', '')),
            'total': sql_num(r.get('M', '')),
        })
    return out


def parse_ferias(rows):
    out = []
    for r in rows[3:]:
        periodo = str(r.get('A', '')).strip()
        if not periodo:
            continue
        out.append({
            'periodo': periodo,
            'inicio': excel_date(r.get('B', '')),
            'fim': excel_date(r.get('C', '')),
            'dias': r.get('D', ''),
            'dias_restantes': r.get('E', ''),
            'valor_recebido': sql_num(r.get('F', '')),
            'status': r.get('G', ''),
            'observacao': r.get('H', ''),
        })
    return out


def parse_manutencao(rows, veiculo='C4'):
    out = []
    for r in rows[1:]:
        item = str(r.get('A', '')).strip()
        if not item:
            continue
        out.append({
            'veiculo': veiculo,
            'data': excel_date(r.get('B', '')),
            'km': r.get('C', '') if r.get('C', '') not in ('', None) else None,
            'valor': sql_num(r.get('D', '')),
            'mecanico': r.get('E', ''),
            'observacao': r.get('F', ''),
            'prox_data': excel_date(r.get('G', '')),
            'prox_km': r.get('H', '') if r.get('H', '') not in ('', None) else None,
            'status': r.get('J', ''),
        })
    return out


# ---------------------------------------------------------------------------
# Geração do SQL
# ---------------------------------------------------------------------------

def gerar_sql(xlsx, user_uuid):
    parse = load_workbook(xlsx)
    linhas = []
    uid = sql_str(user_uuid)

    # --- Lançamentos mensais ---
    nomes_meses = ['Jan 26', 'Fev 26', 'Mar 26', 'Abr 26', 'Maio 26', 'Jun 26',
                   'Jul 26', 'Ago 26', 'Set 26', 'Out 26', 'NOV 26', 'DEZ 26']
    total_lanc = 0
    for nome in nomes_meses:
        mes = detect_month(nome)
        if not mes:
            continue
        try:
            rows = parse(nome)
        except KeyError:
            continue
        regs = parse_mensal(rows, mes)
        for r in regs:
            linhas.append(
                "insert into lancamentos (user_id, ano, mes, categoria, valor, descricao, forma_pgt, tipo, quem_paga, data, observacao) "
                "values (%s, 2026, %d, %s, %s, %s, %s, %s, %s, %s, %s);"
                % (uid, mes, sql_str(r['categoria']), r['valor'], sql_str(r['descricao']),
                   sql_str(r['forma_pgt']), sql_str(r['tipo']), sql_str(r['quem_paga']),
                   sql_str(r['data']), sql_str(r['observacao']))
            )
            total_lanc += 1

    # --- Extras (ganhos) ---
    try:
        imp = parse('Imp Ganho 26')
        extras = parse_imp_ganho(imp)
        for r in extras:
            linhas.append(
                "insert into extras (user_id, ano, mes, tipo, categoria, descricao, valor, data) "
                "values (%s, 2026, %d, 'ganho', 'Freelance/Outros', %s, %s, %s);"
                % (uid, r['mes'], sql_str(r['descricao']), r['valor'], sql_str(r['data']))
            )
    except KeyError:
        pass

    # --- Salários ---
    try:
        sal_rows = parse('Salário 26')
        hora_extra, ajuda_custo, ticket = parse_salario_2026(sal_rows)
    except KeyError:
        hora_extra, ajuda_custo, ticket = {}, {}, {}
    try:
        res_rows = parse('2026')
        salario, extras_res = parse_resumo_2026(res_rows)
    except KeyError:
        salario, extras_res = {}, {}

    for mes in range(1, 13):
        base = salario.get(mes, 'null')
        he = hora_extra.get(mes, 'null')
        ac = ajuda_custo.get(mes, 'null')
        tk = ticket.get(mes, 'null')
        fr = extras_res.get(mes, 'null')
        linhas.append(
            "insert into salarios (user_id, ano, mes, base, hora_extra, ajuda_custo, ticket, freelance) "
            "values (%s, 2026, %d, %s, %s, %s, %s, %s);"
            % (uid, mes, base, he, ac, tk, fr)
        )

    # --- Horas extras ---
    try:
        he_rows = parse('Hora Extra')
        for r in parse_hora_extra(he_rows):
            linhas.append(
                "insert into horas_extras (user_id, data, entrada, almoco_inicio, almoco_fim, saida, hora_100, hora_50, valor_presencial, valor_home, total) "
                "values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
                % (uid, sql_str(r['data']), sql_str(r['entrada']), sql_str(r['almoco_inicio']),
                   sql_str(r['almoco_fim']), sql_str(r['saida']), r['hora_100'], r['hora_50'],
                   r['valor_presencial'], r['valor_home'], r['total'])
            )
    except KeyError:
        pass

    # --- Férias ---
    try:
        fer_rows = parse('Férias')
        for r in parse_ferias(fer_rows):
            linhas.append(
                "insert into ferias (user_id, periodo, inicio, fim, dias, dias_restantes, valor_recebido, status, observacao) "
                "values (%s, %s, %s, %s, %s, %s, %s, %s, %s);"
                % (uid, sql_str(r['periodo']), sql_str(r['inicio']), sql_str(r['fim']),
                   sql_num(r['dias']), sql_num(r['dias_restantes']), r['valor_recebido'],
                   sql_str(r['status']), sql_str(r['observacao']))
            )
    except KeyError:
        pass

    # --- Manutenção ---
    try:
        man_rows = parse('Manutenção C4')
        for r in parse_manutencao(man_rows, 'C4'):
            linhas.append(
                "insert into manutencao (user_id, veiculo, data, km, valor, mecanico, observacao, prox_data, prox_km, status) "
                "values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"
                % (uid, sql_str(r['veiculo']), sql_str(r['data']), sql_num(r['km']),
                   r['valor'], sql_str(r['mecanico']), sql_str(r['observacao']),
                   sql_str(r['prox_data']), sql_num(r['prox_km']), sql_str(r['status']))
            )
    except KeyError:
        pass

    return linhas, total_lanc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--xlsx', default='Ganhos-Gastos 2026.xlsx')
    ap.add_argument('--user-uuid', default='SEU_USER_UUID')
    ap.add_argument('--out', default='migracao-2026.sql')
    args = ap.parse_args()

    linhas, total = gerar_sql(args.xlsx, args.user_uuid)

    cabecalho = [
        "-- Migração da planilha 2026 para o SaaS",
        "-- User UUID: %s" % args.user_uuid,
        "-- Gerado em: %s" % datetime.now().isoformat(timespec='seconds'),
        "-- Total de lançamentos mensais: %d" % total,
        "",
        "begin;",
        "",
    ]
    rodape = [
        "",
        "commit;",
        "",
    ]

    with open(args.out, 'w', encoding='utf-8') as f:
        f.write('\n'.join(cabecalho + linhas + rodape))

    print("Gerado: %s" % args.out)
    print("Lançamentos mensais: %d" % total)
    print("Total de comandos: %d" % len(linhas))


if __name__ == '__main__':
    main()
