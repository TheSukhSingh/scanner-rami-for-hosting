# scan_image.py (interactive version)

import cv2
import numpy as np
import tensorflow as tf
import os

# Load the trained model
model = tf.keras.models.load_model("image_threat_model.h5")
classes = ['Clean', 'Stego', 'Batch', 'Malicious']

def preprocess_image(image_path):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError(f"Unable to read image at: {image_path}")
    resized = cv2.resize(img, (224, 224)).reshape(1, 224, 224, 1) / 255.0
    return resized

def predict_image(image_path):
    image = preprocess_image(image_path)
    prediction = model.predict(image)[0]
    label = classes[np.argmax(prediction)]
    confidence = float(np.max(prediction))
    return label, confidence

if __name__ == "__main__":
    print("🖼️  Enter image path (relative to current folder, e.g., test_images/clean.png):")
    image_path = input(">> ").strip()

    if not os.path.isfile(image_path):
        print(f"❌ File not found: {image_path}")
        exit(1)

    try:
        label, confidence = predict_image(image_path)
        print(f"✅ Prediction: {label} ({confidence:.2f} confidence)")
    except Exception as e:
        print(f"❌ Error: {e}")
        exit(1)
