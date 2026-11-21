# Segurança no Vibe Coding: Avaliação Experimental com Recomendações Baseadas na OWASP Top 10 2025

## Sobre o projeto

Este repositório reúne os artefatos utilizados no experimento desenvolvido no trabalho **"Segurança no Vibe Coding: Uma Avaliação Experimental com Recomendações Baseadas na OWASP Top 10 2025"**.

A pesquisa investiga a influência da inclusão de recomendações explícitas de segurança, fundamentadas na OWASP Top 10 2025, na geração de aplicações por meio de *vibe coding*.

O experimento compara duas APIs de autenticação geradas pelo OpenAI Codex a partir da mesma especificação funcional, diferenciadas pela presença ou ausência de recomendações adicionais de segurança.

## Objetivo

Avaliar a influência das recomendações de segurança na quantidade e na distribuição por severidade dos achados reportados nas aplicações geradas e em suas dependências.

## Delineamento experimental

O experimento contempla dois tratamentos:

| Tratamento | Documentos fornecidos | Condição |
|---|---|---|
| A | `AGENTS.md` e `docs/SPECS.md` | Sem recomendações adicionais de segurança. |
| B | `AGENTS.md`, `docs/SPECS.md` e `docs/SECURITY.md` | Com recomendações adicionais baseadas na OWASP Top 10 2025. |

O documento `SECURITY.md`, exclusivo do Tratamento B durante a geração, reúne recomendações fundamentadas nas seguintes categorias:

- A01:2025 – Broken Access Control;
- A02:2025 – Security Misconfiguration;
- A03:2025 – Software Supply Chain Failures;
- A04:2025 – Cryptographic Failures;
- A05:2025 – Injection;
- A07:2025 – Authentication Failures;
- A10:2025 – Mishandling of Exceptional Conditions.

## Estrutura dos documentos de contexto

| Arquivo | Finalidade |
|---|---|
| `AGENTS.md` | Orientações gerais fornecidas ao agente de IA. |
| `docs/SPECS.md` | Especificação funcional da API de autenticação. |
| `docs/SECURITY.md` | Recomendações explícitas de segurança fornecidas exclusivamente ao Tratamento B durante a geração. |

## Tecnologias e ferramentas

**Geração das aplicações:**
- OpenAI Codex – GPT-5.6-Terra;
- TypeScript;
- Node.js e Express;
- Prisma ORM;
- SQLite;
- Docker.

**Análises de segurança:**
- Semgrep – SAST;
- npm audit – SCA;
- OWASP ZAP – DAST.

**Infraestrutura experimental:**
- Git e GitHub;
- GitHub Actions.

## Procedimento experimental

O experimento foi conduzido em etapas:

1. Preparação dos documentos de orientação e especificação funcional.
2. Geração independente das aplicações dos Tratamentos A e B.
3. Verificação funcional e construção das aplicações.
4. Execução do pipeline automatizado de análise de segurança.
5. Coleta e organização dos relatórios e artefatos.
6. Comparação descritiva dos achados identificados.

O mesmo pipeline e as mesmas configurações de análise foram utilizados nos dois tratamentos.

## Resultados

As execuções definitivas apresentaram os seguintes resultados:

| Ferramenta | Tratamento A | Tratamento B |
|---|---:|---:|
| SAST – Semgrep | 1 | 1 |
| SCA – npm audit | 7 | 7 |
| DAST – OWASP ZAP | 11 | 4 |
| **Total** | **19** | **12** |

A comparação apresenta uma redução descritiva de **36,84%** na quantidade agregada de achados do Tratamento B em relação ao Tratamento A.

A diferença concentra-se nos resultados do DAST, enquanto SAST e SCA apresentam quantidades equivalentes.

Os resultados são restritos às aplicações e às execuções efetivamente avaliadas, considerando que o experimento contempla uma geração por tratamento.

## Organização dos repositórios

### Repositório principal

[tcc-vibe-coding-security](https://github.com/DevJoaoVitorB/tcc-vibe-coding-security)

A branch `main` reúne os documentos-base, os arquivos compartilhados do experimento, os arquivos ZIP com as evidências das execuções e a documentação da pesquisa.

### Execuções definitivas

| Branch | Descrição |
|---|---|
| [execucao-tratamento-a](https://github.com/DevJoaoVitorB/tcc-vibe-coding-security/tree/execucao-tratamento-a) | Código-fonte e arquivos específicos do Tratamento A. |
| [execucao-tratamento-b](https://github.com/DevJoaoVitorB/tcc-vibe-coding-security/tree/execucao-tratamento-b) | Código-fonte e arquivos específicos do Tratamento B, incluindo as recomendações de segurança. |

### Validações preliminares

Antes das execuções definitivas, foram realizadas quatro gerações preliminares e 82 execuções do pipeline, com o objetivo de validar e aprimorar os documentos, os procedimentos e a infraestrutura experimental.

Essas atividades foram realizadas nos seguintes repositórios:

| Repositório | Descrição |
|---|---|
| [tcc-experiment-validation-v1](https://github.com/DevJoaoVitorB/tcc-experiment-validation-v1) | Primeira versão do ambiente de validação. |
| [tcc-experiment-validation-v2](https://github.com/DevJoaoVitorB/tcc-experiment-validation-v2) | Segunda versão do ambiente de validação, com ajustes nos procedimentos e no pipeline. |

**Importante:** as aplicações e os resultados das validações preliminares não integram a comparação definitiva do experimento.

## Evidências das execuções

Os artefatos produzidos pelo GitHub Actions estão organizados em arquivos ZIP, incorporados ao repositório principal.

| Etapa | Tratamento A | Tratamento B |
|---|---|---|
| Validação funcional | `validate-evidence-A.zip` | `validate-evidence-B.zip` |
| SAST | `sast-evidence-A.zip` | `sast-evidence-B.zip` |
| SCA | `sca-evidence-A.zip` | `sca-evidence-B.zip` |
| DAST | `dast-evidence-A.zip` | `dast-evidence-B.zip` |
| Consolidação | `analysis-evidence-A.zip` | `analysis-evidence-B.zip` |

Os arquivos contêm relatórios e registros utilizados na análise e comparação dos tratamentos.

## Considerações metodológicas

O experimento segue as etapas de experimentação em Engenharia de Software propostas por Wohlin *et al.* (2024).

A comparação considera os achados reportados individualmente por cada ferramenta, preservando suas classificações originais. O total agregado é utilizado como indicador complementar, não representando necessariamente a quantidade de vulnerabilidades distintas.

Como foi realizada apenas uma geração por tratamento, os resultados possuem caráter descritivo e não permitem generalização automática para outros modelos, aplicações ou contextos.

## Referência

SILVA, João Vitor Bezerra da. **Segurança no Vibe Coding: uma avaliação experimental com recomendações baseadas na OWASP Top 10 2025**. Trabalho de Conclusão de Curso – Análise e Desenvolvimento de Sistemas, 2026.
