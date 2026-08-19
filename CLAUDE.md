# CLAUDE.md

Instruções permanentes de projeto para trabalhar neste repositório.

## GIT WORKFLOW

- Nunca implementar alterações diretamente na branch `main`.
- Cada fase ou funcionalidade relevante deve começar em uma branch própria.
- Usar nomes claros, por exemplo:
  - `feature/accounts-transactions`
  - `feature/dashboard`
  - `fix/auth-refresh`
  - `refactor/transaction-service`
- Fazer commits pequenos e coerentes usando Conventional Commits
  (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Ao finalizar a tarefa:
  - rodar testes;
  - rodar build;
  - revisar o diff;
  - fazer push da branch;
  - abrir ou preparar um Pull Request para `main`.
- Não fazer merge do Pull Request sem autorização explícita do usuário.
- Não fazer push direto na `main`.
- Informar ao final:
  - branch utilizada;
  - commits realizados;
  - testes executados;
  - título do PR;
  - descrição do PR;
  - link do PR, se criado.

Não criar Pull Requests artificiais ou sem propósito apenas para gerar
atividade — o fluxo acima se aplica a mudanças relevantes, não a cada
edição trivial.
