import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"  # 🔥 IMPORTANT FIX

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf
from PIL import Image
import pathlib
import logging

app = Flask(__name__)
CORS(app)  # 🔥 allow frontend connection

# 🔥 LOAD MODEL (safe mode)
# Load model (safe mode)
MODEL_PATH = pathlib.Path(__file__).parent / "keras_model.h5"
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)

# Load labels from file
LABELS_PATH = pathlib.Path(__file__).parent / "labels.txt"
if not LABELS_PATH.exists():
    raise FileNotFoundError(f"Labels file not found: {LABELS_PATH}")

with open(LABELS_PATH, "r") as f:
    labels = [line.strip().split(maxsplit=1)[1] for line in f if line.strip()]

# Image size
IMG_SIZE = 224

# 🔧 Preprocess function
def preprocess_image(image):
    image = image.resize((IMG_SIZE, IMG_SIZE))
    image = np.array(image) / 255.0
    image = np.expand_dims(image, axis=0)
    return image

# 🚀 API Route
@app.route('/predict', methods=['POST'])
def predict():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        image = Image.open(file).convert('RGB')

        processed = preprocess_image(image)

        prediction = model.predict(processed)
        class_index = int(np.argmax(prediction))
        confidence = float(np.max(prediction))

        label = labels[class_index] if 0 <= class_index < len(labels) else str(class_index)

        return jsonify({
            "prediction": label,
            "confidence": confidence
        })

    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500


# 🏁 Run server
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    host = os.environ.get('APP_HOST', '0.0.0.0')
    port = int(os.environ.get('APP_PORT', 5000))
    app.run(host=host, port=port, debug=os.environ.get('FLASK_DEBUG', '1') == '1')