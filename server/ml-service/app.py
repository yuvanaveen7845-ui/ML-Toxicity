import os
import threading
import time
import numpy as np
import pandas as pd
import joblib
import nltk
import schedule
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Disable CUDA loading for torch to avoid DLL errors on Windows if necessary
os.environ["TORCH_DISABLE_CUDA"] = "1"

# Enable advanced ML models
EMBEDDING_AVAILABLE = True
T5_AVAILABLE = True

# Configuration
RETRAIN_THRESHOLD = 30
CONFIDENCE_RANGE = (0.45, 0.55)

# Download NLTK data
nltk.download("vader_lexicon", quiet=True)

# =============================
# FastAPI App
# =============================

app = FastAPI(
    title="WorkShield AI Intelligence",
    description="Advanced ML microservice for workplace toxicity analysis",
    version="2.0.0"
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
# CONFIG & Global State
# =============================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "workplace_toxicity_dataset.csv")
MODEL_DIR = os.path.join(BASE_DIR, "models")
VECTORIZER_PATH = os.path.join(BASE_DIR, "vectorizer.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

model = None
vectorizer = None
sia = SentimentIntensityAnalyzer()
embedding_model = None
template_embeddings = None
t5_tokenizer = None
t5_model = None

uncertain_predictions = 0

# =============================
# Suppression Templates
# =============================

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

DISTRESS_WORDS = [
    "overwhelmed", "exhausted", "drained", "burnout", "stressed", "anxious",
    "ignored", "undervalued", "unheard"
]

# =============================
# Feature Extraction
# =============================

def extract_features(text: str):
    text_lower = text.lower()
    
    # Sentiment via VADER
    sentiment = sia.polarity_scores(text)["compound"]
    
    # Distress indicators
    distress = sum(w in text_lower for w in DISTRESS_WORDS)
    
    # Emotional intensity
    emotional_intensity = abs(sentiment)
    
    # Suppression score via Sentence Transformers
    suppression_score = 0.0
    if EMBEDDING_AVAILABLE and embedding_model is not None:
        text_embedding = embedding_model.encode([text], convert_to_numpy=True)
        similarity = cosine_similarity(text_embedding, template_embeddings)
        suppression_score = float(np.max(similarity))
    else:
        # Fallback keyword-based suppression
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

def ai_rewrite_interpretation(insights):
    if T5_AVAILABLE and t5_tokenizer is not None and t5_model is not None:
        text_in = " ".join(insights)
        prompt = f"Rewrite the following workplace insights into a professional HR report. Insights: {text_in} Produce a concise executive-style explanation."
        
        inputs = t5_tokenizer(prompt, return_tensors="pt", truncation=True)
        outputs = t5_model.generate(
            **inputs,
            max_length=120,
            temperature=0.2,
            do_sample=False
        )
        return t5_tokenizer.decode(outputs[0], skip_special_tokens=True)
    else:
        return " ".join(insights)

# =============================
# Training / Loading
# =============================

def train_model_from_data():
    global model, vectorizer
    if not os.path.exists(DATA_PATH):
        return None

    df_train = pd.read_csv(DATA_PATH)
    if "absenteeism" not in df_train.columns: df_train["absenteeism"] = 0
    if "after_hours" not in df_train.columns: df_train["after_hours"] = 0

    # Ensure all features exist
    df_train[["sentiment", "distress", "emotional_intensity", "suppression_score"]] = \
        df_train["text"].apply(lambda x: pd.Series(extract_features(x)))

    vectorizer = TfidfVectorizer(max_features=500, stop_words="english")
    X = build_features(df_train, vectorizer, fit=True)
    y = df_train["label"]

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

def load_or_train():
    global model, vectorizer
    model_files = sorted([f for f in os.listdir(MODEL_DIR) if f.endswith(".pkl")]) if os.path.exists(MODEL_DIR) else []
    
    if model_files and os.path.exists(VECTORIZER_PATH):
        latest_model = os.path.join(MODEL_DIR, model_files[-1])
        model = joblib.load(latest_model)
        vectorizer = joblib.load(VECTORIZER_PATH)
        print(f"Loaded model: {latest_model}")
    else:
        train_model_from_data()

# =============================
# Scheduled Tasks
# =============================

def run_schedule_loop():
    while True:
        schedule.run_pending()
        time.sleep(60)

def scheduled_retraining():
    print("Executing scheduled daily retraining...")
    train_model_from_data()

# =============================
# Startup
# =============================

@app.on_event("startup")
async def startup():
    global embedding_model, template_embeddings, t5_tokenizer, t5_model

    print("Initializing AI models...")
    
    if EMBEDDING_AVAILABLE:
        try:
            embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            template_embeddings = embedding_model.encode(SUPPRESSION_TEMPLATES, convert_to_numpy=True)
            print("SentenceTransformer loaded")
        except Exception as e:
            print(f"Embedding load failed: {e}")

    if T5_AVAILABLE:
        try:
            t5_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
            t5_model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")
            print("T5 HR AI loaded")
        except Exception as e:
            print(f"T5 load failed: {e}")

    load_or_train()
    
    # Start schedule thread
    schedule.every().day.at("02:00").do(scheduled_retraining)
    thread = threading.Thread(target=run_schedule_loop, daemon=True)
    thread.start()
    
    print("WorkShield ML Service READY")

# =============================
# Endpoints
# =============================

@app.get("/health")
async def health():
    return {
        "status": "ok", 
        "ml_model": model is not None,
        "embedding_model": embedding_model is not None,
        "hr_ai": t5_model is not None
    }

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    text = request.text.strip()
    if not text: raise HTTPException(status_code=400, detail="Text required")

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
        feat = build_features(temp_df, vectorizer)
        prob = model.predict_proba(feat)[0][1]
        risk_score = round(prob * 100, 2)
        
        if CONFIDENCE_RANGE[0] < prob < CONFIDENCE_RANGE[1]:
            confidence = "low"
            # Track uncertain predictions for auto-retraining
            global uncertain_predictions
            uncertain_predictions += 1
            if uncertain_predictions >= RETRAIN_THRESHOLD:
                print("Uncertainty threshold reached. Triggering auto-retrain...")
                train_model_from_data()
                uncertain_predictions = 0
                
    else:
        source = "fallback"
        confidence = "medium"
        risk_score = min(100, max(0, 
            distress * 8 + emotional_intensity * 10 + suppression_score * 15 +
            min(request.absenteeism, 10) * 3 + min(request.after_hours, 15) * 2
        ))

    if risk_score < 35: category = "Healthy Cultural Indicators"
    elif risk_score < 70: category = "Moderate Workplace Risk"
    else: category = "High Toxic Environment Risk"

    insights = generate_logic_insights(risk_score, sentiment, distress, suppression_score, request.absenteeism, request.after_hours)
    interpretation = ai_rewrite_interpretation(insights)

    return AnalyzeResponse(
        risk_score=risk_score,
        risk_category=category,
        sentiment=round(sentiment, 3),
        distress=distress,
        emotional_intensity=round(emotional_intensity, 3),
        suppression_score=round(suppression_score, 3),
        stress_index=round(stress_index, 3),
        logic_insights=insights,
        ai_interpretation=interpretation,
        confidence=confidence,
        source=source
    )

@app.post("/retrain", response_model=RetrainResponse)
async def retrain():
    try:
        path = train_model_from_data()
        return RetrainResponse(success=True, message="Retrained successfully", model_path=path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)

