import os
import numpy as np
import pandas as pd
import joblib
import nltk
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

# Disable CUDA loading for torch to avoid DLL errors on Windows
import os
os.environ["TORCH_DISABLE_CUDA"] = "1"

# Hard-disabled advanced ML models to prevent Windows torch DLL WinError 1114
EMBEDDING_AVAILABLE = False
T5_AVAILABLE = False

# Download NLTK data
nltk.download("vader_lexicon", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("omw-1.4", quiet=True)

# =============================
# FastAPI App
# =============================

app = FastAPI(
    title="HR Toxicity ML Service",
    description="FastAPI microservice for workplace toxicity analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# Pydantic Models
# =============================

class AnalyzeRequest(BaseModel):
    text: str
    absenteeism: float = 0
    after_hours: float = 0

class AnalyzeResponse(BaseModel):
    risk_score: float
    risk_category: str
    sentiment: float
    distress: int
    emotional_intensity: float
    suppression_score: float
    stress_index: float
    logic_insights: List[str]
    ai_interpretation: str
    confidence: str
    source: str

class RetrainResponse(BaseModel):
    success: bool
    message: str
    model_path: Optional[str] = None

# =============================
# CONFIG
# =============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "workplace_toxicity_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

# =============================
# Global State
# =============================

model = None
vectorizer = None
sia = SentimentIntensityAnalyzer()
embedding_model = None
template_embeddings = None
t5_tokenizer = None
t5_model = None

# =============================
# Distress & Suppression
# =============================

DISTRESS_WORDS = [
    "overwhelmed", "exhausted", "drained", "burnout", "stressed", "anxious",
    "ignored", "undervalued", "unheard", "unsupportive", "brushed aside",
    "struggles", "pressure", "constant", "little flexibility", "one-sided",
    "must adapt", "lacking", "frustrating", "pointless", "meaningless", "tired",
    "biased", "unfair", "favoritism", "toxic", "awful", "terrible", "bad",
    "micromanaged", "disappointed", "angry", "upset", "hostile", "bullying",
    "harassment", "rude", "disrespectful", "quit", "leaving", "resign"
]

SUPPRESSION_TEMPLATES = [
    "This has already been decided",
    "We will revisit this later",
    "Leadership has aligned on this",
    "Let's move on",
    "Your concern is noted",
    "This is not the priority right now",
    "We discussed this earlier",
    "Interesting perspective",
    "I have adjusted my expectations",
    "I no longer assume ownership"
]

# =============================
# Feature Extraction
# =============================

def extract_features(text: str):
    text_lower = text.lower()
    
    # Calculate base sentiment via VADER
    vader_scores = sia.polarity_scores(text)
    base_sentiment = vader_scores["compound"]
    
    # Count distress/frustration phrases (with basic stemming)
    distress = sum(w in text_lower for w in DISTRESS_WORDS)
    
    # Boost distress if VADER shows strong negativity even without matched words
    if vader_scores["neg"] > 0.15:
        distress += 1
    if vader_scores["neg"] > 0.30:
        distress += 2
        
    # Apply a penalty to VADER for subtle frustration that VADER misses
    sentiment = max(-1.0, base_sentiment - (distress * 0.15))
    
    # Ensure emotional intensity reflects both negative sentiment and distress signs
    emotional_intensity = abs(sentiment) + (distress * 0.1)
    
    suppression_score = 0.0
    if EMBEDDING_AVAILABLE and embedding_model is not None and template_embeddings is not None:
        text_embedding = embedding_model.encode([text])
        similarity = cosine_similarity(text_embedding, template_embeddings)
        suppression_score = float(np.max(similarity))
    else:
        # Fallback suppression detection
        for template in SUPPRESSION_TEMPLATES:
            if template.lower() in text_lower:
                suppression_score = max(suppression_score, 0.7)

    return sentiment, distress, emotional_intensity, suppression_score

def build_features(dataframe, vec, fit=False):
    if fit:
        text_vectors = vec.fit_transform(dataframe["text"])
    else:
        text_vectors = vec.transform(dataframe["text"])

    extra = dataframe[
        ["sentiment", "distress", "emotional_intensity",
         "suppression_score", "absenteeism", "after_hours"]
    ].values

    return np.hstack((text_vectors.toarray(), extra))

# =============================
# Interpretation Logic
# =============================

def generate_logic_insights(risk_score, sentiment, distress, suppression_score, absenteeism, after_hours):
    insights = []

    if sentiment < -0.4:
        insights.append("Employee feedback contains strong negative emotional tone.")
    if distress >= 2:
        insights.append("Multiple distress indicators suggest psychological strain.")
    if suppression_score > 0.55:
        insights.append("Communication patterns indicate potential conversational suppression.")
    if absenteeism >= 3:
        insights.append("Elevated absenteeism may indicate disengagement or burnout risk.")
    if after_hours >= 8:
        insights.append("Frequent after-hours work suggests sustained workload pressure.")

    if risk_score > 70:
        insights.append("Overall indicators strongly suggest a toxic workplace environment.")
    elif risk_score > 40:
        insights.append("Workplace risk indicators show moderate cultural strain.")
    else:
        insights.append("Current signals suggest relatively healthy workplace dynamics.")

    return insights

def ai_rewrite_interpretation(insights, risk_score, sentiment):
    if T5_AVAILABLE and t5_tokenizer is not None and t5_model is not None:
        text_in = " ".join(insights)
        prompt = (
            f"As an expert HR analyst, write a concise, professional 3-sentence executive summary "
            f"interpreting these algorithmic indicators: {text_in} "
            f"Risk Score: {risk_score}/100. Sentiment: {sentiment:.2f}. "
            f"Focus on the business impact and cultural health."
        )
        inputs = t5_tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        outputs = t5_model.generate(
            **inputs, 
            max_length=150, 
            temperature=0.7, 
            do_sample=True, 
            top_p=0.9, 
            repetition_penalty=1.2
        )
        return t5_tokenizer.decode(outputs[0], skip_special_tokens=True)
    else:
        return " ".join(insights)

# =============================
# Load / Train Model
# =============================

def load_or_train_model():
    global model, vectorizer

    model_files = sorted(os.listdir(MODEL_DIR)) if os.path.exists(MODEL_DIR) else []
    model_files = [f for f in model_files if f.endswith('.pkl')]

    if model_files and os.path.exists(VECTORIZER_PATH):
        latest_model = os.path.join(MODEL_DIR, model_files[-1])
        model = joblib.load(latest_model)
        vectorizer = joblib.load(VECTORIZER_PATH)
        print(f"Loaded existing model: {latest_model}")
    elif os.path.exists(DATA_PATH):
        train_model_from_data()
    else:
        print("No data or model found. ML model will use fallback analysis.")

def train_model_from_data():
    global model, vectorizer

    df = pd.read_csv(DATA_PATH)

    if "absenteeism" not in df.columns:
        df["absenteeism"] = 0
    if "after_hours" not in df.columns:
        df["after_hours"] = 0

    df[["sentiment", "distress", "emotional_intensity", "suppression_score"]] = \
        df["text"].apply(lambda x: pd.Series(extract_features(x)))

    vectorizer = TfidfVectorizer(max_features=500, stop_words="english")
    X = build_features(df, vectorizer, fit=True)
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=42
    )

    base_model = XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42
    )

    model = CalibratedClassifierCV(base_model, method="isotonic", cv=3)
    model.fit(X_train, y_train)

    version = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_path = os.path.join(MODEL_DIR, f"model_{version}.pkl")

    joblib.dump(model, model_path)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    print(f"Model saved: {model_path}")
    return model_path

# =============================
# Startup
# =============================

@app.on_event("startup")
async def startup():
    global embedding_model, template_embeddings, t5_tokenizer, t5_model

    # Load embedding model
    if EMBEDDING_AVAILABLE:
        try:
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            template_embeddings = embedding_model.encode(SUPPRESSION_TEMPLATES)
            print("Embedding model loaded")
        except Exception as e:
            print(f"Embedding model failed to load: {e}")

    # Load T5 model
    if T5_AVAILABLE:
        try:
            t5_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-large")
            t5_model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-large")
            print("T5 model loaded")
        except Exception as e:
            print(f"T5 model failed to load: {e}")

    # Load or train ML model
    load_or_train_model()

# =============================
# Endpoints
# =============================

@app.get("/health")
async def health():
    return {"status": "ok", "ml_model_loaded": model is not None}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    sentiment, distress, emotional_intensity, suppression_score = extract_features(text)
    stress_index = distress + emotional_intensity

    confidence = "high"
    source = "ml_model"

    if model is not None and vectorizer is not None:
        temp_df = pd.DataFrame({
            "text": [text],
            "sentiment": [sentiment],
            "distress": [distress],
            "emotional_intensity": [emotional_intensity],
            "suppression_score": [suppression_score],
            "absenteeism": [request.absenteeism],
            "after_hours": [request.after_hours]
        })

        combined = build_features(temp_df, vectorizer)
        probability = model.predict_proba(combined)[0][1]
        risk_score = round(probability * 100, 2)

        if 0.45 < probability < 0.55:
            confidence = "low"
        elif 0.35 < probability < 0.65:
            confidence = "medium"
    else:
        # Fallback scoring
        source = "fallback"
        confidence = "medium"
        risk_score = min(100, max(0,
            distress * 8 + emotional_intensity * 10 +
            suppression_score * 15 +
            min(request.absenteeism, 10) * 3 +
            min(request.after_hours, 15) * 2
        ))
        risk_score = round(risk_score, 2)

    if risk_score < 35:
        risk_category = "Healthy Cultural Indicators"
    elif risk_score < 70:
        risk_category = "Moderate Workplace Risk"
    else:
        risk_category = "High Toxic Environment Risk"

    logic_insights = generate_logic_insights(
        risk_score, sentiment, distress,
        suppression_score, request.absenteeism, request.after_hours
    )

    ai_interpretation = ai_rewrite_interpretation(logic_insights, risk_score, sentiment)

    return AnalyzeResponse(
        risk_score=risk_score,
        risk_category=risk_category,
        sentiment=round(sentiment, 3),
        distress=distress,
        emotional_intensity=round(emotional_intensity, 3),
        suppression_score=round(suppression_score, 3),
        stress_index=round(stress_index, 3),
        logic_insights=logic_insights,
        ai_interpretation=ai_interpretation,
        confidence=confidence,
        source=source
    )

@app.post("/retrain", response_model=RetrainResponse)
async def retrain():
    if not os.path.exists(DATA_PATH):
        raise HTTPException(status_code=404, detail="Training data not found")

    try:
        model_path = train_model_from_data()
        return RetrainResponse(success=True, message="Model retrained successfully", model_path=model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
