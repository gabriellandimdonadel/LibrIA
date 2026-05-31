# 🤟 LibrIA — Plataforma Educacional de Reconhecimento de Libras

> **"Libras em primeiro lugar"** — Uma plataforma inclusiva onde o usuário surdo sinaliza para a webcam e a IA reconhece o gesto em tempo real, exibindo o conceito visual e a soletração letra por letra.

---

## 🎯 Filosofia Libras-First

O LibrIA foi projetado com a comunidade surda no centro. A interface não exige que o usuário leia português para interagir — cada palavra reconhecida é apresentada como:

1. **Emoji conceitual** (ex: 💧 para "água")
2. **Soletração visual** com os emojis de datilologia (alfabeto manual)
3. **Barra de confiança** para feedback sobre a qualidade do sinal

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIO                               │
│              (sinaliza para a webcam 🤟)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 FRONTEND React + Tailwind                     │
│  ┌──────────────────┐     ┌──────────────────────────────┐  │
│  │  <LibrasCamera>  │────▶│  WebSocket (ws://...8000)    │  │
│  │  - getUserMedia  │◀────│  - envia frame JPEG Base64   │  │
│  │  - canvas 320×240│     │  - recebe JSON {word, conf.} │  │
│  │  - datilologia   │     └──────────────────────────────┘  │
│  └──────────────────┘                                        │
│          Vite :5173                                           │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket (100ms/frame)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND FastAPI + Python                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  server.py  (:8000)                                    │  │
│  │  ┌──────────────┐   ┌────────────────────────────┐    │  │
│  │  │  MediaPipe   │──▶│  Buffer deque(maxlen=30)   │    │  │
│  │  │  Hands       │   │  → model.predict()          │    │  │
│  │  │  (126 kpts)  │   │  → confidence > 0.85        │    │  │
│  │  └──────────────┘   └────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────┘  │
│          uvicorn :8000                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Requisitos

| Componente | Versão mínima |
|------------|---------------|
| Python     | 3.10+         |
| Node.js    | 18+           |
| npm        | 9+            |
| Webcam     | Qualquer      |

---

## 🚀 Instalação

### Backend

```bash
# Entre na pasta do backend
cd libria/backend

# (Recomendado) Crie um ambiente virtual
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
.venv\Scripts\activate         # Windows

# Instale as dependências
pip install -r requirements.txt
```

### Frontend

```bash
# Entre na pasta do frontend
cd libria/frontend

# Instale as dependências
npm install
```

---

## 🗂️ Coleta de Dados

### Estrutura esperada dos vídeos

Antes de extrair os keypoints, popule a pasta `videos_originais/` com vídeos `.mp4` da seguinte forma:

```
backend/
└── videos_originais/
    ├── agua/
    │   ├── 0.mp4
    │   ├── 1.mp4
    │   ├── ...
    │   └── 29.mp4      ← 30 vídeos por sinal
    ├── casa/
    │   ├── 0.mp4
    │   └── ...
    ├── comer/
    │   └── ...
    └── estudar/
        └── ...
```

**Cada vídeo** deve ter pelo menos **30 frames** (~1 segundo a 30fps) de uma única execução do sinal.

### Alternativa: coleta pela webcam

Se não tiver os vídeos, você pode coletar diretamente pela câmera:

```bash
cd libria/backend
python extract_keypoints.py webcam
```

---

## ▶️ Como Executar (passo a passo)

### 1️⃣ Extrair keypoints dos vídeos

```bash
cd libria/backend
python extract_keypoints.py
# ou para coleta pela webcam:
python extract_keypoints.py webcam
```

Isso cria a pasta `Libras_Data/` com os arquivos `.npy`.

### 2️⃣ Treinar o modelo LSTM

```bash
cd libria/backend
python train_model.py
```

Aguarde o treinamento (≈5–15 min dependendo do hardware). O modelo será salvo em `backend/libras_model.h5`.

### 3️⃣ Iniciar o servidor backend

```bash
cd libria/backend
python server.py
```

O servidor estará disponível em `http://localhost:8000`.  
Verifique: `http://localhost:8000/health`

### 4️⃣ Iniciar o frontend

```bash
cd libria/frontend
npm run dev
```

Abra `http://localhost:5173` no navegador.

---

## 🛠️ Troubleshooting — 5 Erros Mais Comuns

### ❌ 1. `ModuleNotFoundError: No module named 'mediapipe'`

**Causa:** Dependências Python não instaladas ou ambiente virtual não ativado.

```bash
# Verifique se o venv está ativo (deve aparecer (.venv) no terminal)
pip install -r requirements.txt
```

---

### ❌ 2. `FileNotFoundError: libras_model.h5`

**Causa:** O modelo ainda não foi treinado.

```bash
# Rode na ordem:
python extract_keypoints.py
python train_model.py
python server.py
```

---

### ❌ 3. WebSocket não conecta (`WifiOff` vermelho no frontend)

**Causa:** O backend não está rodando ou a porta 8000 está ocupada.

```bash
# Verifique se o servidor está ativo:
curl http://localhost:8000/health

# Se a porta estiver ocupada, altere em server.py:
uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=True)
# E atualize em LibrasCamera.jsx:
# const ws = new WebSocket('ws://localhost:8001/ws/libras')
```

---

### ❌ 4. Câmera não abre (`NotAllowedError`)

**Causa:** O navegador bloqueou o acesso à câmera.

- Clique no ícone de cadeado na barra de endereço → **Câmera → Permitir**
- Recarregue a página (`F5`)

---

### ❌ 5. Acurácia muito baixa (< 60%) ou nenhuma detecção

**Causas possíveis:**

1. **Poucos dados:** garanta 30 vídeos × 30 frames por sinal.
2. **Iluminação ruim:** grave os vídeos com boa luz frontal.
3. **Modelo ainda não converge:** aumente `epochs=200` em `train_model.py`.
4. **Threshold muito alto:** reduza `CONFIDENCE_THRESHOLD = 0.70` em `server.py`.

---

## 📁 Estrutura Final do Projeto

```
libria/
├── backend/
│   ├── extract_keypoints.py   ← extração de keypoints com MediaPipe
│   ├── train_model.py         ← treinamento do LSTM
│   ├── server.py              ← servidor FastAPI + WebSocket
│   ├── requirements.txt       ← dependências Python
│   ├── libras_model.h5        ← gerado após treinar
│   ├── Libras_Data/           ← gerado após extração
│   └── videos_originais/      ← seus vídeos de treinamento
│       ├── agua/
│       ├── casa/
│       ├── comer/
│       └── estudar/
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── index.css
    │   └── components/
    │       └── LibrasCamera.jsx
    ├── vite.config.js
    └── package.json
```

---

## 📄 Licença

MIT — Use, adapte e compartilhe livremente. Acessibilidade não tem copyright. 🤟
