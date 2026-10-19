# Manutenção do perfil

O `README.md` da raiz é o perfil público. O banner está em `assets/systems-banner-v2.svg`; o robô é gerado por `scripts/generate-contribution-bot.mjs` e publicado em `output/contribution-bot.svg` pelo workflow `.github/workflows/contribution-bot.yml`.

## Conferir localmente

Execute a partir da raiz do repositório:

```bash
node --check scripts/generate-contribution-bot.mjs
node scripts/preview-contribution-bot.mjs
node scripts/test-contribution-bot.mjs
```

O preview usa um calendário sintético e grava `dist/contribution-bot.svg`. Abra o SVG para conferir a aparência e o percurso. O banner pode ser aberto diretamente como SVG. Nenhum token é necessário para o preview.

## Publicar

Faça a alteração em uma branch, abra um pull request e integre na `main` após revisão. O workflow regenera o robô no branch `output` após o push; ele precisa de `GITHUB_TOKEN` e `GITHUB_USER` no ambiente do GitHub Actions. Não coloque credenciais no código. Verifique a execução do workflow, a contagem em relação ao gráfico nativo e a renderização do perfil após a publicação.

Para reverter, reverta o pull request por outro pull request. Se o SVG do branch `output` também precisar voltar, reexecute o workflow após restaurar o gerador anterior.

