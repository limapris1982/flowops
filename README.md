# ManutecOS

Projeto React ajustado para rodar localmente com `react-scripts`.

## Como iniciar

1. Instale o Node.js 18 ou 20.
2. Abra o terminal na pasta do projeto.
3. Rode:

```bash
npm install
npm start
```

O sistema abrirá em `http://localhost:3000`.

## O que foi ajustado

- `app.js` renomeado para `App.js`
- `package.json` movido para a raiz do projeto
- scripts do React adicionados
- `index.html` ajustado
- Tailwind incluído via CDN para os estilos utilitários usados no código

## Observação importante

O app usa Firebase. Para funcionar de verdade fora do ambiente onde ele foi gerado, você vai precisar configurar as variáveis/conexões do Firebase e revisar autenticação e regras de acesso antes de colocar em produção.
