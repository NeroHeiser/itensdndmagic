# Expansão de Itens Mágicos (Itens Mágicos)

[English](README.md) | [Português (Brasil)](README.pt-BR.md)

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-v12%20|%20v14-orange.svg)](https://foundryvtt.com/)
[![System](https://img.shields.io/badge/System-dnd5e%20v3.0%2B-blue.svg)](https://github.com/foundryvtt/dnd5e)
[![Midi-QOL](https://img.shields.io/badge/Midi--QOL-Recomendado-purple.svg)](https://gitlab.com/tposney/midi-qol)
[![Tests](https://img.shields.io/badge/tests-28%20passed-brightgreen.svg)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Módulo completo de itens mágicos para **Foundry Virtual Tabletop (V12 a V14)** e **D&D 5e (v3.0+ e v4.0+)**, integrando a coleção completa de **1.714 itens mágicos** do renomado **The Griffon's Saddlebag: The Inventory** ao longo de todos os seus volumes, com compêndios bilíngues, alinhamento para automação de combate com o **Midi-QOL** e catálogo interativo em **ApplicationV2**.

---

## Destaques

- **1.714 Itens Mágicos Únicos:** Integração completa do The Griffon's Saddlebag (Anos 1 a 7) com IDs alfanuméricos de 16 caracteres 100% determinísticos.
- **Catálogo Interativo em ApplicationV2:** Interface moderna e responsiva com busca em tempo real, múltiplos filtros combinados, preservação de foco do cursor e envio direto para fichas de personagem.
- **Alinhamento com Midi-QOL:** Armas pré-configuradas com tipos de ação (`mwak`/`rwak`), partes de dano base e flags de combate, operando de forma graciosa mesmo sem o Midi-QOL ativo.
- **Motor de Domínio (MagicItemEngine):** Regras puras para validação de sintonização (incluindo escalonamento de 4/5/6 slots para o Artífice), leitura de cargas e recuperação diária ao amanhecer, além de precificação de mercado do DMG/Xanathar.
- **Paridade Bilíngue 1:1:** Dados sincronizados em inglês (`en`) e português (`pt-BR`) com compatibilidade para ambientes com proxy reverso.
- **Suíte de Testes Automatizados:** 28 testes unitários nativos com o Node.js test runner auditando manifestos, compêndios, regras de domínio, estados de interface e simetria de localização.

---

## Tabelas de Domínio e Recursos

### Coleção de Itens por Volume

| Volume / Fonte | Período de Publicação | Quantidade de Itens | Tipos Principais | Foco de Regras |
| :--- | :---: | :---: | :--- | :--- |
| **Years 1–3** | 2019–2021 | 864 | Armas, Itens Maravilhosos, Armaduras | D&D 5e Clássico (2014) |
| **Year 4** | 2022 | 240 | Armas, Varinhas, Anéis, Consumíveis | Expansão de Nível Médio |
| **Year 5** | 2023 | 241 | Equipamentos, Armas, Relíquias | Sinergias Avançadas |
| **Year 6** | 2024 | 247 | Armas, Armaduras, Focos | Alinhamento D&D 2024 |
| **Year 7** | 2025 | 122 | Relíquias de Alto Nível, Equipamentos | Mecânicas Modernas 2024 |

### Diretrizes de Preço de Mercado por Raridade

| Raridade | Faixa de Mercado (DMG) | Preço Padrão Sugerido | Consumíveis (Metade) | Regra de Sintonização |
| :--- | :---: | :---: | :---: | :---: |
| **Comum** | 50–100 po | 100 po | 50 po | Opcional / Nenhuma |
| **Incomum** | 101–500 po | 500 po | 250 po | Variável |
| **Raro** | 501–5.000 po | 5.000 po | 2.500 po | Comumente Requerida |
| **Muito Raro** | 5.001–50.000 po | 50.000 po | 25.000 po | Requerida |
| **Lendário** | 50.001–200.000 po | 100.000 po | 50.000 po | Requerida |
| **Artefato** | 200.001–500.000 po | 500.000 po | 250.000 po | Vinculado ao Destino |

---

## Arquitetura e Componentes

- **`MagicItemsBrowserApp` (`ApplicationV2`):** Layout em duas colunas com busca reativa, filtros por texto, raridade, tipo de item, sintonização e volume, permitindo envio imediato do item à ficha do ator selecionado.
- **`MagicItemEngine`:** Camada de serviço de domínio puro que valida limites de sintonização (considerando os marcos de 10º, 14º e 18º nível do Artífice), extrai fórmulas de recarga diária e calcula faixas de preço.
- **`CompendiumSync`:** Resolve caminhos relativos e prefixos de proxy via `foundry.utils.getRoute` e sincroniza os compêndios na inicialização do módulo.
- **`MidiQOLCompat`:** Detecta a presença do módulo Midi-QOL, conecta ouvintes de fluxo de combate e normaliza identificadores sem criar acoplamento rígido.

---

## Instalação

No painel de configuração do Foundry VTT, em **Instalar Módulo**, cole o link do manifesto:

```text
https://raw.githubusercontent.com/NeroHeiser/itensmagicos/main/module.json
```

Ou extraia o diretório compactado na pasta de módulos do Foundry:
```text
<FoundryData>/Data/modules/itensmagicos
```

---

## Testes Automatizados e Qualidade

O módulo conta com testes unitários nativos executados pelo Node.js test runner:

```bash
# Executar a suíte de testes completa
npm test
```

Invariantes auditados:
- **Integridade do manifesto:** Compatibilidade com v12–v14 e campos essenciais do Foundry.
- **Integridade dos dados:** Validação de 1.714 itens com IDs de 16 caracteres e paridade 1:1 entre `en` e `pt-BR`.
- **Cálculos de domínio:** Escalonamento de preços, limites de sintonização e extração regex de cargas.
- **Interface e Localização:** Preservação de foco, opções do ApplicationV2 e 100% de cobertura das chaves no template.

---

## Compatibilidade e Licença

- **Foundry VTT:** Homologado para v12 e v14.
- **Sistema de Jogo:** `dnd5e` v3.0+ e v4.0+.
- **Automação Recomendada:** [Midi-QOL](https://gitlab.com/tposney/midi-qol).
- **Material Fonte:** Baseado em **The Griffon's Saddlebag: The Inventory** por The Griffon's Saddlebag LLC.
- **Autor do Módulo:** [André Luiz (Lopes / NeroHeiser)](https://github.com/NeroHeiser).
- **Licença:** [MIT](LICENSE).
