"""
WHY THIS EXISTS:
This script trains the first classical ML model for CareerLens email
classification.

WHAT IT DOES:
It reads labeled Gmail examples, trains TF-IDF + Logistic Regression, evaluates
the model, and exports a JSON model that the Node.js backend can load.

HOW IT WORKS:
Raw email text is cleaned, converted into TF-IDF vectors, learned by Logistic
Regression, then exported as vocabulary, IDF values, class names, weights, and
bias terms.
"""

import json
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "training_emails.csv"
MODEL_PATH = BASE_DIR / "models" / "email-classifier-v1.json"
METRICS_PATH = BASE_DIR / "models" / "metrics.json"


def clean_text(value):
    return (
        str(value or "")
        .lower()
        .replace("\n", " ")
        .replace("\r", " ")
    )


def build_training_text(df):
    return (
        df["subject"].fillna("").map(clean_text)
        + " "
        + df["from"].fillna("").map(clean_text)
        + " "
        + df["snippet"].fillna("").map(clean_text)
        + " "
        + df["bodyText"].fillna("").map(clean_text)
    )


def main():
    df = pd.read_csv(DATA_PATH)

    required_columns = {
        "subject",
        "from",
        "snippet",
        "bodyText",
        "label",
    }

    missing_columns = required_columns - set(df.columns)

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {sorted(missing_columns)}"
        )

    if df["label"].nunique() < 2:
        raise ValueError(
            "Training requires at least two email classes."
        )

    df["text"] = build_training_text(df)

    label_counts = df["label"].value_counts()
    can_stratify = label_counts.min() >= 2

    stratify_labels = (
        df["label"]
        if can_stratify
        else None
    )

    class_count = df["label"].nunique()
    test_size = max(
        0.2,
        class_count / len(df)
    )

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"],
        df["label"],
        test_size=test_size,
        random_state=42,
        stratify=stratify_labels,
    )

    vectorizer = TfidfVectorizer(
        max_features=3000,
        ngram_range=(1, 2),
        stop_words="english",
        lowercase=True,
    )

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    model = LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
    )

    model.fit(X_train_vec, y_train)

    predictions = model.predict(X_test_vec)

    metrics = {
        "accuracy": accuracy_score(y_test, predictions),
        "report": classification_report(
            y_test,
            predictions,
            output_dict=True,
            zero_division=0,
        ),
        "trainingSamples": int(len(X_train)),
        "testSamples": int(len(X_test)),
        "classes": model.classes_.tolist(),
    }

    MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    weights = model.coef_.tolist()
    bias = model.intercept_.tolist()

    if len(model.classes_) == 2 and len(weights) == 1:
        weights = [
            [-value for value in weights[0]],
            weights[0],
        ]
        bias = [
            -bias[0],
            bias[0],
        ]

    exported_model = {
        "version": "email-classifier-v1",
        "algorithm": "tfidf-logistic-regression",
        "ngramRange": [1, 2],
        "classes": model.classes_.tolist(),
        "vocabulary": vectorizer.get_feature_names_out().tolist(),
        "idf": vectorizer.idf_.tolist(),
        "weights": weights,
        "bias": bias,
    }

    MODEL_PATH.write_text(
        json.dumps(exported_model),
        encoding="utf-8",
    )

    METRICS_PATH.write_text(
        json.dumps(metrics, indent=2),
        encoding="utf-8",
    )

    print("Model trained successfully")
    print(f"Accuracy: {metrics['accuracy']:.3f}")
    print(f"Model saved to: {MODEL_PATH}")
    print(f"Metrics saved to: {METRICS_PATH}")


if __name__ == "__main__":
    main()
