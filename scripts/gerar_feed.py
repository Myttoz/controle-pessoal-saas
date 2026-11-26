"""Gera releases.rss e releases.xml com todas as releases do repositório.

Fonte: API do GitHub (já traz o corpo das notas). A URL publicada é
https://myttoz.github.io/controle-pessoal-saas/releases.rss
"""

import html
import json
import os
import re
import subprocess
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.environ.get("GITHUB_REPOSITORY", "Myttoz/controle-pessoal-saas")
URL_RSS = "https://myttoz.github.io/controle-pessoal-saas/releases.rss"


def _api():
    url = "https://api.github.com/repos/%s/releases?per_page=100" % REPO
    headers = {
        "User-Agent": "gerar-feed-rss",
        "Accept": "application/vnd.github+json",
    }
    token = os.environ.get("GH_TOKEN", "")
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def _tags():
    """Fallback offline: usa tags locais e as notas da release atual."""
    try:
        saida = subprocess.check_output(
            ["git", "-C", RAIZ, "for-each-ref", "--sort=-creatordate",
             "--format=%(refname:short)%09%(creatordate:iso8601)", "refs/tags"],
            text=True, stderr=subprocess.DEVNULL, timeout=20,
        )
    except Exception:
        return []
    notas = ""
    try:
        with open(os.path.join(RAIZ, "RELEASE_NOTES.md"), encoding="utf-8") as f:
            notas = f.read()
    except OSError:
        pass
    out = []
    for linha in saida.splitlines():
        tag, data = linha.split("\t")[:2]
        if not re.match(r"^v\d+\.\d+\.\d+$", tag):
            continue
        try:
            dt = datetime.fromisoformat(data.replace("Z", "+00:00")).astimezone(timezone.utc)
        except ValueError:
            dt = datetime.now(timezone.utc)
        out.append({
            "tag_name": tag,
            "html_url": "https://github.com/%s/releases/tag/%s" % (REPO, tag),
            "published_at": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "body": notas if tag == "v3.0.0" else "Versão %s." % tag,
            "draft": False,
        })
    return out


def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    return t


def markdown(texto):
    out, lista, par = [], [], []
    def fecha_lista():
        if lista:
            out.append("<ul>" + "".join("<li>" + x + "</li>" for x in lista) + "</ul>")
            lista.clear()
    def fecha_par():
        if par:
            out.append("<p>" + " ".join(par) + "</p>")
            par.clear()
    for bruto in texto.split("\n") + [""]:
        linha = bruto.strip()
        indent = bruto[:1] in (" ", "\t")
        if not linha:
            fecha_par(); fecha_lista()
        elif indent and lista:
            lista[-1] += " " + inline(linha)
        elif indent and par:
            par.append(inline(linha))
        elif linha.startswith("### "):
            fecha_par(); fecha_lista(); out.append("<h3>" + inline(linha[4:]) + "</h3>")
        elif linha.startswith("## "):
            fecha_par(); fecha_lista(); out.append("<h2>" + inline(linha[3:]) + "</h2>")
        elif linha.startswith("# "):
            fecha_par(); fecha_lista(); out.append("<h2>" + inline(linha[2:]) + "</h2>")
        elif linha.startswith("- "):
            fecha_par(); lista.append(inline(linha[2:]))
        elif linha.startswith("---"):
            fecha_par(); fecha_lista()
        else:
            par.append(inline(linha))
    return "\n".join(out)


def gerar(releases):
    pub = [r for r in releases if not r.get("draft") and r.get("published_at")]
    pub.sort(key=lambda r: r["published_at"], reverse=True)
    itens = []
    for r in pub:
        data = datetime.strptime(r["published_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        titulo = html.escape(r.get("name") or r["tag_name"])
        link = html.escape(r["html_url"])
        desc = markdown(r.get("body") or "")
        itens.append(
            "<item>\n"
            "  <title>%s</title>\n"
            "  <link>%s</link>\n"
            "  <guid isPermaLink=\"true\">%s</guid>\n"
            "  <pubDate>%s</pubDate>\n"
            "  <description><![CDATA[%s]]></description>\n"
            "</item>" % (titulo, link, link, format_datetime(data, usegmt=True), desc)
        )
    agora = format_datetime(datetime.now(timezone.utc), usegmt=True)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        "    <title>Controle Pessoal — novidades</title>\n"
        "    <link>https://github.com/%s/releases</link>\n"
        "    <description>Versões e novidades do Controle Pessoal (SaaS by Myttoz).</description>\n"
        "    <language>pt-BR</language>\n"
        '    <atom:link href="%s" rel="self" type="application/rss+xml" />\n'
        "    <lastBuildDate>%s</lastBuildDate>\n"
        "%s\n  </channel>\n</rss>\n"
    ) % (REPO, URL_RSS, agora, "\n".join(itens))


def main():
    try:
        releases = _api()
    except Exception:
        releases = _tags()
    feed = gerar(releases)
    for nome in ("releases.xml", "releases.rss"):
        with open(os.path.join(RAIZ, nome), "w", encoding="utf-8") as f:
            f.write(feed)
        print("Feed gerado:", nome)


if __name__ == "__main__":
    main()
