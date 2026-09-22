# CareerLens Email Classifier

## WHY THIS EXISTS

This folder contains the first traditional Machine Learning layer for CareerLens.
It classifies Gmail messages into career-related categories such as `JOB`,
`INTERVIEW`, `OFFER`, `REJECTION`, `NEWSLETTER`, `WEBINAR`, and `PROMOTION`.

## WHAT IT DOES

The training script uses:

- TF-IDF Vectorizer
- Logistic Regression
- A labeled CSV dataset

It exports a JSON model that the Node.js backend can load during Gmail sync.

## HOW IT WORKS

```text
Labeled emails
↓
Text cleaning
↓
TF-IDF vectorization
↓
Logistic Regression training
↓
JSON model export
↓
Node.js inference during Gmail sync
```

## Train

Install Python dependencies:

```bash
pip install -r ml/email-classifier/requirements.txt
```

Train the model:

```bash
python ml/email-classifier/scripts/train_email_classifier.py
```

The script creates:

```text
ml/email-classifier/models/email-classifier-v1.json
ml/email-classifier/models/metrics.json
```

## Dataset Format

Edit:

```text
ml/email-classifier/data/training_emails.csv
```

Required columns:

```text
subject,from,snippet,bodyText,label
```

Recommended labels:

```text
JOB
APPLICATION
INTERVIEW
OFFER
REJECTION
NEWSLETTER
WEBINAR
PROMOTION
```

The sample CSV is only a starter template. Replace it with real labeled emails
before trusting the model in production.
