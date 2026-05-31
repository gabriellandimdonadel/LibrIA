"""
LibrIA v2 — API de Simplificação de Texto para Surdos
Usa Gemini (Google AI) para simplificar textos complexos em português,
tornando-os acessíveis para pessoas surdas que têm Libras como L1.

Técnicas: Few-shot Prompting + Chain-of-Thought + JSON mode
"""

import json
import os
import sys

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import google.generativeai as genai
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

load_dotenv()

# ── Gemini ─────────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("[OK] Gemini API configurada.")
else:
    print("[AVISO] GEMINI_API_KEY não definida.")

# ── Groq ───────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
groq_client  = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
if GROQ_API_KEY:
    print("[OK] Groq API configurada (fallback automático).")
else:
    print("[AVISO] GROQ_API_KEY não definida. Sem fallback para Groq.")

# ── Exemplos few-shot ──────────────────────────────────────────────────────────
FEW_SHOT = [
    {
        "original": "O beneficiário deverá comparecer à repartição competente munido de documentação hábil, nos termos do regulamento vigente, para efetuar o requerimento do auxílio previdenciário.",
        "simples":  "Você precisa ir ao INSS com seus documentos. Leve RG, CPF e comprovante de residência. Lá você vai pedir o seu benefício.",
        "respostas": ["Tenho os documentos", "Não tenho documentos", "Quando devo ir?", "Não entendi"],
    },
    {
        "original": "Em virtude das adversidades climáticas que assolaram a região metropolitana, a municipalidade declarou situação de emergência e interditou diversas vias de acesso.",
        "simples":  "Choveu muito na cidade. Causou muitos problemas. A prefeitura fechou algumas ruas. Isso é uma emergência.",
        "respostas": ["Entendido", "Preciso de ajuda", "Estou em segurança", "Não entendi"],
    },
    {
        "original": "O paciente deve manter-se em jejum absoluto por período não inferior a oito horas que antecedem o procedimento cirúrgico.",
        "simples":  "Antes da cirurgia, não coma nada. Não beba nada. Fique 8 horas sem comer nem beber.",
        "respostas": ["Vou seguir as instruções", "Posso beber água?", "Tenho uma dúvida", "Não entendi"],
    },
    {
        "original": "Solicita-se que os discentes compareçam ao estabelecimento de ensino portando os materiais didáticos elencados no plano pedagógico.",
        "simples":  "Venha para a escola com todos os seus materiais. Veja a lista de materiais. Traga tudo no primeiro dia.",
        "respostas": ["Tenho o material", "Não tenho o material", "Qual é a lista?", "Não entendi"],
    },
]

# ── System prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Você é um assistente de acessibilidade para pessoas surdas no Brasil.

CONTEXTO:
Pessoas surdas usam Libras (Língua Brasileira de Sinais) como primeira língua.
O português escrito é a segunda língua delas.
Textos formais e complexos são difíceis de entender para muitas pessoas surdas.

SUA MISSÃO: Simplificar textos em português E gerar respostas contextuais para o surdo.

REGRAS DE SIMPLIFICAÇÃO:
1. Frases curtas — máximo 12 palavras por frase
2. Palavras simples do dia a dia — sem termos técnicos ou formais
3. Voz ativa — "O médico examinou você", não "Você foi examinado pelo médico"
4. Ordem direta — Quem fez → O que fez → Para quem ou o quê
5. Sem metáforas, provérbios ou expressões idiomáticas
6. Uma ideia por frase. Ponto final entre as frases.
7. Substitua palavras difíceis por palavras comuns

REGRAS PARA RESPOSTAS_SUGERIDAS:
- Gere 3 a 4 frases curtas (máximo 6 palavras cada) que a PESSOA SURDA poderia responder ao ouvinte
- As respostas devem ser diretamente relacionadas ao contexto do texto
- Escreva em primeira pessoa, do ponto de vista do surdo
- Se o texto faz uma pergunta ou apresenta escolhas, as respostas devem responder/escolher
- Inclua sempre pelo menos uma opção de "Não entendi" ou equivalente
- As respostas serão lidas em voz alta pelo app para o ouvinte

EXEMPLOS:

Exemplo 1:
ORIGINAL: {ex0_orig}
SIMPLIFICADO: {ex0_simp}
RESPOSTAS: {ex0_resp}

Exemplo 2:
ORIGINAL: {ex1_orig}
SIMPLIFICADO: {ex1_simp}
RESPOSTAS: {ex1_resp}

Exemplo 3:
ORIGINAL: {ex2_orig}
SIMPLIFICADO: {ex2_simp}
RESPOSTAS: {ex2_resp}

Exemplo 4:
ORIGINAL: {ex3_orig}
SIMPLIFICADO: {ex3_simp}
RESPOSTAS: {ex3_resp}

FORMATO DE RESPOSTA:
Retorne APENAS um objeto JSON válido, sem markdown, sem texto extra fora do JSON:
{{
  "texto_simplificado": "texto simplificado aqui",
  "nivel_complexidade_original": "baixo" ou "médio" ou "alto",
  "principais_mudancas": ["mudança 1", "mudança 2", "mudança 3"],
  "respostas_sugeridas": ["Resposta 1", "Resposta 2", "Resposta 3", "Não entendi"]
}}""".format(
    ex0_orig=FEW_SHOT[0]["original"], ex0_simp=FEW_SHOT[0]["simples"], ex0_resp=FEW_SHOT[0]["respostas"],
    ex1_orig=FEW_SHOT[1]["original"], ex1_simp=FEW_SHOT[1]["simples"], ex1_resp=FEW_SHOT[1]["respostas"],
    ex2_orig=FEW_SHOT[2]["original"], ex2_simp=FEW_SHOT[2]["simples"], ex2_resp=FEW_SHOT[2]["respostas"],
    ex3_orig=FEW_SHOT[3]["original"], ex3_simp=FEW_SHOT[3]["simples"], ex3_resp=FEW_SHOT[3]["respostas"],
)

# ── FastAPI ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="LibrIA API",
    description="Simplificação de texto em português para a comunidade surda — powered by Gemini + Groq",
    version="2.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ────────────────────────────────────────────────────────────────────
ALLOWED_MODELS = {"gemini-2.5-flash", "gemini-2.5-pro", "groq-llama-3.3-70b"}
GROQ_MODEL_MAP = {"groq-llama-3.3-70b": "llama-3.3-70b-versatile"}

class SimplifyRequest(BaseModel):
    text: str
    model: str = "gemini-2.5-flash"


class SimplifyResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    original:   str
    simplified: str
    complexity: str
    changes:    list[str]
    responses:  list[str]
    model_used: str


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gemini_ready": bool(GEMINI_API_KEY),
        "groq_ready": bool(GROQ_API_KEY),
        "version": "2.2.0",
    }


# ── Endpoint principal ────────────────────────────────────────────────────────
@app.post("/simplify", response_model=SimplifyResponse)
async def simplify(req: SimplifyRequest):
    if not GEMINI_API_KEY and req.model not in GROQ_MODEL_MAP:
        raise HTTPException(503, "Chave da API Gemini não configurada no servidor.")
    if not GEMINI_API_KEY and not groq_client:
        raise HTTPException(503, "Nenhuma API de IA configurada no servidor.")

    if req.model not in ALLOWED_MODELS:
        raise HTTPException(400, f"Modelo inválido. Use: {', '.join(ALLOWED_MODELS)}")

    text = req.text.strip()
    if len(text) < 10:
        raise HTTPException(400, "Texto muito curto. Digite ao menos 10 caracteres.")
    if len(text) > 4000:
        raise HTTPException(400, "Texto muito longo. Máximo 4000 caracteres.")

    user_prompt = (
        f"Simplifique este texto para pessoas surdas e gere respostas contextuais "
        f"que o surdo pode usar para responder ao ouvinte.\n\n"
        f"TEXTO:\n{text}\n\n"
        f"Retorne apenas o JSON válido."
    )

    def parse_result(raw: str) -> dict:
        raw = raw.strip()
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json\n"):
                raw = raw[5:]
        return json.loads(raw.strip())

    def build_response(result: dict, model_used: str) -> SimplifyResponse:
        return SimplifyResponse(
            original=text,
            simplified=result.get("texto_simplificado", ""),
            complexity=result.get("nivel_complexidade_original", "médio"),
            changes=result.get("principais_mudancas", []),
            responses=result.get("respostas_sugeridas", ["Não entendi"]),
            model_used=model_used,
        )

    # ── Groq direto (modelo groq-* selecionado explicitamente) ─────────────────
    if req.model in GROQ_MODEL_MAP:
        if not groq_client:
            raise HTTPException(503, "Groq API não configurada no servidor.")
        try:
            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL_MAP[req.model],
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            raw = completion.choices[0].message.content
            return build_response(parse_result(raw), req.model)
        except json.JSONDecodeError as e:
            print(f"[ERRO] Groq JSON inválido: {e}")
            raise HTTPException(500, "Erro ao interpretar resposta da IA (Groq).")
        except Exception as e:
            msg = str(e)
            print(f"[ERRO] Groq: {msg[:200]}")
            raise HTTPException(500, f"Erro ao chamar Groq: {msg[:120]}")

    # ── Gemini (com fallback automático para Groq se cota esgotada) ────────────
    try:
        gemini = genai.GenerativeModel(
            model_name=req.model,
            system_instruction=SYSTEM_PROMPT,
        )
        response = gemini.generate_content(
            user_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        return build_response(parse_result(response.text), req.model)

    except json.JSONDecodeError as e:
        print(f"[ERRO] Gemini JSON inválido: {e}\nResposta bruta: {response.text[:300]}")
        raise HTTPException(500, "Erro ao interpretar resposta da IA.")

    except Exception as e:
        msg = str(e)
        print(f"[ERRO] Gemini: {msg[:200]}")
        is_quota = "429" in msg or "quota" in msg.lower() or "rate" in msg.lower()

        if is_quota and groq_client:
            print("[INFO] Gemini sem cota — usando Groq como fallback.")
            try:
                completion = groq_client.chat.completions.create(
                    model=GROQ_MODEL_MAP["groq-llama-3.3-70b"],
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.3,
                )
                raw = completion.choices[0].message.content
                return build_response(parse_result(raw), "groq-llama-3.3-70b (fallback)")
            except Exception as fe:
                print(f"[ERRO] Groq fallback: {str(fe)[:200]}")
                raise HTTPException(500, "Falha no Gemini e no Groq. Tente novamente mais tarde.")

        if is_quota:
            raise HTTPException(429, "Limite de uso da IA atingido. Adicione GROQ_API_KEY no servidor para fallback automático.")
        raise HTTPException(500, f"Erro ao chamar a IA: {msg[:120]}")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[LibrIA v2.2] Servidor iniciando na porta 8000...")
    print(f"[LibrIA v2.2] Gemini: {'configurado ✓' if GEMINI_API_KEY else 'FALTANDO GEMINI_API_KEY ✗'}")
    print(f"[LibrIA v2.2] Groq:   {'configurado ✓ (fallback automático)' if GROQ_API_KEY else 'não configurado'}")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
