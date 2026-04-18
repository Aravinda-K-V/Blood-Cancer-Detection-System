# 🧬 HemoScan AI — Blood Cancer Detection System (Deep Learning + Flask + React)

🚀 **HemoScan AI** is an end-to-end deep learning application that detects blood cancer (Leukemia) from microscopic blood cell images using a trained Keras model.

It combines a **Flask backend API** with a **React + Vite frontend** to deliver fast and interactive predictions.

---

## 🔍 Key Features

* 🧪 AI-powered blood cancer detection
* 🖼️ Image-based classification (224x224 input)
* ⚡ Real-time prediction via REST API
* 🌐 Modern React frontend (TypeScript + Vite)
* 🔗 Full-stack integration (Flask + Deep Learning)

---

## 🧠 Tech Stack

* **Backend:** Python, Flask, TensorFlow/Keras
* **Frontend:** React, TypeScript, Vite
* **Model:** CNN (Convolutional Neural Network)
* **Deployment Ready:** Docker / Cloud (optional)

---

## 📂 Project Structure

```bash
Blood-Cancer-Detection/
│── backend/
│   ├── app.py                # Flask API server
│   ├── keras_model.h5       # Trained deep learning model
│   ├── labels.txt           # Class labels
│   ├── requirements.txt     # Backend dependencies
│
│── src/                     # React frontend (TypeScript)
│── package.json             # Frontend config
```

---

## ⚙️ How It Works

1. Upload a blood smear image
2. Backend preprocesses the image
3. CNN model analyzes features
4. Returns prediction: **Cancer / Normal**

---

## 🚀 Getting Started

### 🔹 Backend Setup

```bash
python3 -m venv .venv
source .venv/bin/activate

pip install -r backend/requirements.txt
python backend/app.py
```

👉 Backend runs at: `http://127.0.0.1:5000`

Test API:

```bash
curl http://127.0.0.1:5000/health
```

---

### 🔹 Frontend Setup

```bash
npm install
npm run dev
```

👉 Open: `http://localhost:5173`

---

## 🧪 API Endpoint

```http
POST /predict
```

**Request:**

* Form-data → image file

**Response:**

```json
{
  "prediction": "Cancer Detected",
  "confidence": 0.92
}
```

---

## 📸 Demo Preview

(Add screenshots or GIF here)

---

## 📈 SEO Keywords

Blood Cancer Detection, Leukemia Detection AI, Medical Image Classification, Deep Learning Healthcare, CNN Medical Diagnosis

---

## 🧩 Future Improvements

* Multi-class cancer detection
* Model optimization (higher accuracy)
* Cloud deployment (AWS / Docker)
* Mobile app integration

---

## 🐳 Deployment (Optional)

For production:

* Use **Gunicorn** for Flask
* Use **Nginx** as reverse proxy
* Build frontend:

```bash
npm run build
```

---

## 🛠️ Troubleshooting

* Ensure `keras_model.h5` exists in `/backend`
* Check Python version (3.9+ recommended)
* Install compatible TensorFlow version

---

## 🔄 Updates

* ✅ Improved backend performance
* ✅ Added prediction optimization
* 🔀 Latest changes pushed to branch: `update-project`

---

## 🤝 Contributing

Pull requests are welcome! Feel free to fork and improve.

---

## 📬 Contact

👤 **Aravind**
🔗 Add your LinkedIn profile

---

⭐ If you found this useful, consider starring the repo!
