# Controle Pessoal — um resumo para a casa

> Este é um resumo do aplicativo de finanças para quem mora aqui em casa. A ideia:
> você entende o que é, o que ele faz e o que fazer se algo aparecer quebrado.
> Ninguém precisa saber de tecnologia para usar.

---

## O que é?

É um aplicativo que o Ma usa para **controlar os gastos e os ganhos da casa** —
mercado, contas, escola, salários, férias, hora extra, manutenção do carro.
Ele substitui a antiga planilha do Excel: agora é um site, com login, que
funciona pelo navegador do computador e do celular.

**Endereço:** https://myttoz.github.io/controle-pessoal-saas/

> Hoje o Ma usa com o computador dele. Se você (esposa) quiser acesso, o Ma
> cria uma conta separada para você.

---

## O que dá para ver e fazer?

- **Dashboard:** para onde foi o dinheiro do mês (gráfico por categoria: mercado, contas, escola…)
- **Lançamentos:** tudo que foi gasto — organizado por mês, com busca e filtros
- **Recebidos (Ganhos):** salário mês a mês + extras (freelances etc.)
- **Férias, Hora Extra, Manutenção do carro:** o Ma registra e o app calcula sozinho
- **Gestão de anos:** trocar de ano (2026) e criar o próximo (2027)

Ninguém vê nada antes de entrar com **e-mail e senha** (ou com a conta do
Google). Os dados só aparecem depois do login.

---

## Onde ficam os dados?

Os dados ficam guardados de forma privada num servidor (Supabase), em São
Paulo. **Não é público:** ninguém vê nada sem a senha. O endereço do site é
público, mas o conteúdo é privado.

---

## E se aparecer algo quebrado?

Diga ao Ma qual tela você está vendo (ou tire um print — print vale mais que
mil palavras). Ele resolve em poucos minutos. As causas mais comuns:

| O que você vê | O que é | O que fazer |
|---|---|---|
| Site abre mas tudo aparece **vazio** | O servidor "dormiu" (nunca acessa → ele desliga sozinho) | O Ma clica em "Restore project" no painel — volta em ~1 minuto |
| **404** ou "página não existe" | Link errado ou site fora do ar | Abrir de novo no link certo; se persistir, avisar o Ma |
| Erro ao entrar com o Google | O login com Google precisa de uma autorização no painel | Avisar o Ma |
| "Sem conexão" no topo | Sem internet ou servidor com problemas | Tentar de novo; avisar se continuar |

---

## O que NÃO compartilhar

- A senha do app (só entre o casal)
- As credenciais do servidor (Supabase) e do Google (ficam com o Ma)
- Prints do app que mostrem salários/gastos pessoais, em grupos abertos

---

## Onde fica cada coisa (para o Ma)

- Endereço no **seu** PC: https://myttoz.github.io/controle-pessoal-saas/
- Os dados foram migrados de uma planilha de 2026 para o servidor
- Se quiser a conta própria (para si mesma/si mesmo): pedir ao Ma — ele cria pelo painel do Supabase e você entra com o seu e-mail/senha
