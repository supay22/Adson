# Implantação no Netlify

Este projeto foi configurado para ser compatível com o Netlify.

## Passos para Implantação

1.  **Conecte seu repositório** ao Netlify.
2.  **Configurações de Build**:
    *   **Build Command**: `npm run build`
    *   **Publish directory**: `dist`
3.  **Variáveis de Ambiente**:
    *   Adicione `GEMINI_API_KEY` nas configurações do Netlify para que os palpites de IA funcionem.
4.  **Aviso sobre o Backend**:
    *   O Netlify é uma plataforma para sites estáticos. O servidor Express (`server.ts`) e o banco de dados SQLite (`minhasorte.db`) **não funcionarão** nativamente no Netlify.
    *   As funcionalidades de Comunidade, Mural de Ganhadores e Login requerem um servidor persistente. Recomendamos usar plataformas como **Render**, **Railway** ou **Fly.io** para hospedar o backend, ou converter o backend para **Netlify Functions** usando um banco de dados externo (como Supabase).

## Arquivos de Configuração Incluídos
*   `netlify.toml`: Define as regras de build e redirecionamento para SPAs.
*   `public/_redirects`: Garante que as rotas do React funcionem corretamente após o reload.
