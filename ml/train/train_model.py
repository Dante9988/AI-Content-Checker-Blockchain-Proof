#!/usr/bin/env python3
"""
VeriChain ML Training Script

Trains a simple CNN classifier to distinguish between real and AI-generated images.
Exports:
  - ./models/model.keras       (Native Keras 3 format)
  - ./models/saved_model/      (TensorFlow SavedModel; use this in convert-env for tf2onnx)
  - ./models/model.onnx        (ONLY if tf2onnx is available in this environment)

Usage:
    python train_model.py [--epochs 10] [--samples 1000] [--output-dir ./models] [--img-size 224]

Environment guidance:
- Train in tf-env (TensorFlow 2.20.0; DO NOT install tf2onnx/onnx here)
- Convert in convert-env (TensorFlow 2.17.1 + tf2onnx==1.16.1 + onnx==1.17.0 + protobuf==3.20.3)

"""

import os
# Quiet TF CUDA noise on CPU-only machines (e.g., AMD without ROCm)
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import sys
import argparse
import json
import hashlib
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from datetime import datetime
from typing import Tuple, Union

# ---------------------------
# Utilities
# ---------------------------

def dir_size_mb(path: str) -> float:
    """Compute total size of a directory in MB."""
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total / (1024 * 1024)

def hash_file_or_dir(path: str) -> str:
    """Return SHA-256 hex of file bytes or of all files within a directory (stable order)."""
    h = hashlib.sha256()
    if os.path.isdir(path):
        for root, _, files in os.walk(path):
            for f in sorted(files):
                fp = os.path.join(root, f)
                h.update(f.encode("utf-8"))  # include file name for stability
                try:
                    with open(fp, "rb") as fh:
                        while True:
                            chunk = fh.read(1024 * 1024)
                            if not chunk:
                                break
                            h.update(chunk)
                except OSError:
                    continue
    elif os.path.isfile(path):
        with open(path, "rb") as fh:
            while True:
                chunk = fh.read(1024 * 1024)
                if not chunk:
                    break
                h.update(chunk)
    else:
        return "unknown"
    return h.hexdigest()

# ---------------------------
# Data & Model
# ---------------------------

def create_synthetic_dataset(num_samples=1000, img_size=224, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """Create synthetic dataset for demonstration purposes (deterministic)."""
    print(f"Creating synthetic dataset with {num_samples} samples...")
    rng = np.random.default_rng(seed)

    X = rng.random((num_samples, img_size, img_size, 3), dtype=np.float32)

    # Add patterns to make classification slightly possible
    half = num_samples // 2
    noise_real = rng.normal(0, 0.10, (half, img_size, img_size, 3)).astype(np.float32)
    noise_fake = rng.normal(0, 0.05, (num_samples - half, img_size, img_size, 3)).astype(np.float32)

    X[:half] += noise_real
    X[half:] += noise_fake

    # grid-like artifacts for the "fake" half
    for j in range(0, img_size, 32):
        X[half:, j, :, :] += 0.1

    X = np.clip(X, 0.0, 1.0)

    # Labels: 0 = real, 1 = AI-generated
    y = np.concatenate([np.zeros(half, dtype=np.int32), np.ones(num_samples - half, dtype=np.int32)])
    return X, y

def create_model(img_size=224, include_augmentation=True) -> keras.Model:
    """Create a simple CNN model for binary classification."""
    print("Creating CNN model...")

    data_augmentation = keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.1),
    ])

    inputs = keras.Input(shape=(img_size, img_size, 3), name="input")
    
    # Apply data augmentation only during training, not for inference
    if include_augmentation:
        x = data_augmentation(inputs)
    else:
        x = inputs
        
    x = layers.Rescaling(1./255.0)(x)

    x = layers.Conv2D(32, 3, strides=2, padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling2D(3, strides=2, padding="same")(x)

    x = layers.Conv2D(64, 3, strides=2, padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.MaxPooling2D(3, strides=2, padding="same")(x)

    x = layers.Conv2D(128, 3, padding="same")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Activation("relu")(x)
    x = layers.GlobalAveragePooling2D()(x)

    x = layers.Dropout(0.2)(x)
    x = layers.Dense(128, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(1, activation="sigmoid", name="score")(x)

    model = keras.Model(inputs, outputs, name="verichain_cnn")
    return model

def train_model(X_train, y_train, X_test, y_test, epochs=10, batch_size=32, img_size=224) -> Tuple[keras.Model, dict, float]:
    """Train the model and evaluate on test set."""
    print(f"Training model for {epochs} epochs...")

    model = create_model(img_size=img_size, include_augmentation=True)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="binary_crossentropy",
        metrics=["accuracy"]
    )

    callbacks = [
        keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=3, restore_best_weights=True),
        keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=2, min_lr=1e-7)
    ]

    history = model.fit(
        X_train, y_train,
        batch_size=batch_size,
        epochs=epochs,
        validation_split=0.2,
        callbacks=callbacks,
        verbose=1
    )

    test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test accuracy: {test_accuracy:.4f}")
    print(f"Test loss: {test_loss:.4f}")

    return model, history.history, float(test_accuracy)

# ---------------------------
# Export
# ---------------------------

def export_models(model: keras.Model, output_dir: str, img_size: int) -> Tuple[float, Union[str, None], str]:
    """
    Export artifacts:
      - Always saves ./models/model.keras
      - Always exports ./models/saved_model/ (for tf2onnx)
      - Tries ONNX if tf2onnx is importable in THIS env
    Returns: (file_size_mb, onnx_path_or_None, primary_artifact_path)
    """
    print("Exporting models...")

    # Ensure output paths
    keras_path = os.path.join(output_dir, "model.keras")
    saved_model_dir = os.path.join(output_dir, "saved_model")
    onnx_path = os.path.join(output_dir, "model.onnx")

    # 1) Save native Keras
    model.save(keras_path)
    print(f"Keras model saved to {keras_path}")

    # 2) Export SavedModel dir
    model.export(saved_model_dir)  # Keras 3 API for SavedModel
    print(f"SavedModel exported to {saved_model_dir}/")

    # 3) Try ONNX export IF tf2onnx is available (won't be in tf-env)
    onnx_file_size_mb = 0.0
    onnx_out = None
    try:
        import tf2onnx
        print("tf2onnx detected; converting to ONNX...")
        spec = (tf.TensorSpec([1, img_size, img_size, 3], tf.float32, name="input"),)
        onnx_model, _ = tf2onnx.convert.from_keras(model, input_signature=spec, opset=17)
        with open(onnx_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        onnx_file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
        print(f"ONNX model saved to {onnx_path} ({onnx_file_size_mb:.2f} MB)")
        onnx_out = onnx_path
        primary = onnx_path
    except ImportError:
        print("tf2onnx not available in this environment. Skipping ONNX export.")
        primary = saved_model_dir

    return onnx_file_size_mb, onnx_out, primary

# ---------------------------
# Metadata
# ---------------------------

def save_metadata(primary_artifact_path: str, test_accuracy: float, onnx_size_mb: float, output_dir: str, img_size: int) -> dict:
    """Save model metadata to meta.json."""
    print("Saving model metadata...")

    model_hash = hash_file_or_dir(primary_artifact_path)
    if model_hash == "unknown":
        print("Warning: could not compute model hash (path missing).")

    # If primary is SavedModel dir and ONNX exists, include both sizes
    sizes = {}
    if os.path.isdir(primary_artifact_path):
        sizes["saved_model_mb"] = dir_size_mb(primary_artifact_path)
        onnx_path = os.path.join(output_dir, "model.onnx")
        if os.path.isfile(onnx_path):
            sizes["onnx_mb"] = os.path.getsize(onnx_path) / (1024 * 1024)
    else:
        sizes["file_mb"] = os.path.getsize(primary_artifact_path) / (1024 * 1024)

    metadata = {
        "input_shape": [img_size, img_size, 3],
        "input_type": "float32",
        "output_shape": [1],
        "output_type": "float32",
        "model_id": f"0x{model_hash}",
        "training_accuracy": float(test_accuracy),
        "onnx_size_mb": float(onnx_size_mb),
        "sizes": sizes,
        "exported_at": datetime.now().isoformat(),
        "framework": "tensorflow",
        "tf_version": tf.__version__,
    }

    metadata_path = os.path.join(output_dir, "meta.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {metadata_path}")
    return metadata

# ---------------------------
# Export
# ---------------------------

def export_models(model: keras.Model, output_dir: str, img_size: int, export_onnx: bool = False):
    """
    Export artifacts:
      - Always saves ./models/model.keras
      - Always exports ./models/saved_model/ (for tf2onnx conversion)
      - If export_onnx=True: try ONNX export in this env (may fail if numpy/tf2onnx mismatch)
    Returns: (file_size_mb, onnx_path_or_None, primary_artifact_path)
    """
    print("Exporting models...")

    keras_path = os.path.join(output_dir, "model.keras")
    saved_model_dir = os.path.join(output_dir, "saved_model")
    onnx_path = os.path.join(output_dir, "model.onnx")

    # 1) Save native Keras
    model.save(keras_path)
    print(f"Keras model saved to {keras_path}")

    # 2) Export SavedModel
    model.export(saved_model_dir)
    print(f"SavedModel exported to {saved_model_dir}/")

    # 3) Optional: ONNX export
    onnx_file_size_mb = 0.0
    onnx_out = None
    primary = saved_model_dir

    if export_onnx:
        try:
            import tf2onnx
            print("tf2onnx detected; converting to ONNX...")
            spec = (tf.TensorSpec([1, img_size, img_size, 3], tf.float32, name="input"),)
            onnx_model, _ = tf2onnx.convert.from_keras(model, input_signature=spec, opset=17)
            with open(onnx_path, "wb") as f:
                f.write(onnx_model.SerializeToString())
            onnx_file_size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
            print(f"ONNX model saved to {onnx_path} ({onnx_file_size_mb:.2f} MB)")
            onnx_out = onnx_path
            primary = onnx_path
        except Exception as e:
            print("⚠️  Skipping ONNX export in this environment.")
            print(f"    Reason: {type(e).__name__}: {e}")
            print("    Tip: run conversion separately in convert-env.")

    return onnx_file_size_mb, onnx_out, primary

# ---------------------------
# Utilities
# ---------------------------

def dir_size_mb(path: str) -> float:
    total = 0
    for root, _, files in os.walk(path):
        for f in files:
            fp = os.path.join(root, f)
            if os.path.isfile(fp):
                total += os.path.getsize(fp)
    return total / (1024 * 1024)

# ---------------------------
# Main
# ---------------------------

def main():
    parser = argparse.ArgumentParser(description="Train VeriChain ML model")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--samples", type=int, default=1000, help="Number of training samples")
    parser.add_argument("--output-dir", default="./models", help="Output directory for model files")
    parser.add_argument("--img-size", type=int, default=224, help="Image size for training")
    # NEW: only try ONNX export in this env if you explicitly ask for it
    parser.add_argument("--export-onnx", action="store_true",
                        help="Attempt ONNX export in this environment (usually False in tf-env)")
    args = parser.parse_args()

    # Ensure output dir exists
    os.makedirs(args.output_dir, exist_ok=True)

    print("🚀 Starting VeriChain ML Training")
    print(f"Epochs: {args.epochs}")
    print(f"Samples: {args.samples}")
    print(f"Image size: {args.img_size}x{args.img_size}")
    print(f"Output directory: {args.output_dir}\n")

    # Dataset
    X, y = create_synthetic_dataset(args.samples, args.img_size)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training set: {X_train.shape}")
    print(f"Test set: {X_test.shape}\n")

    # Train
    model, history, test_accuracy = train_model(
        X_train, y_train, X_test, y_test,
        epochs=args.epochs,
        img_size=args.img_size
    )

    # Create inference model without data augmentation
    print("\nCreating inference model (without data augmentation)...")
    inference_model = create_model(img_size=args.img_size, include_augmentation=False)
    
    # Copy weights from trained model to inference model
    inference_model.set_weights(model.get_weights())
    
    # Export artifacts (Keras + SavedModel always; ONNX only if --export-onnx)
    onnx_size_mb, onnx_path, primary_path = export_models(
        inference_model, args.output_dir, args.img_size, export_onnx=args.export_onnx
    )

    # Metadata (expects: path_to_primary_artifact, accuracy, size_mb, out_dir, img_size)
    metadata = save_metadata(primary_path, test_accuracy, onnx_size_mb, args.output_dir, args.img_size)

    # Results
    print("\n📊 Training Results:")
    print(f"Test accuracy: {test_accuracy:.2%}")
    print(f"Accuracy >= 70%: {'✅' if test_accuracy >= 0.7 else '❌'}")

    if onnx_path:
        print(f"ONNX size: {onnx_size_mb:.2f} MB (target < 50MB: {'✅' if onnx_size_mb < 50 else '❌'})")
    else:
        print("ONNX: not produced in this environment (expected if tf2onnx not installed)")
        print(f"SavedModel size: {dir_size_mb(os.path.join(args.output_dir, 'saved_model')):.2f} MB")

    if metadata.get("model_id", "unknown") != "unknown":
        print(f"Model ID: ✅ ({metadata['model_id'][:10]}...)")
    else:
        print("Model ID: ❌")

    print("\n🎉 Training complete!")
    print("Next steps:")
    if onnx_path:
        print(f"1. Copy {onnx_path} to apps/inference/models/")
    else:
        print("1. In convert-env, run tf2onnx against ./models/saved_model to produce ./models/model.onnx")
    print("2. Update MODEL_PATH in inference service")
    print("3. Test inference endpoint")

    print("\n=== Acceptance Criteria Check ===")
    print(f"Local eval accuracy: {test_accuracy:.2%}")
    print(f"Accuracy >= 70%: {'✅' if test_accuracy >= 0.7 else '❌'}")
    if onnx_path:
        print(f"Model size: {onnx_size_mb:.2f} MB")
        print(f"Size < 50MB: {'✅' if onnx_size_mb < 50 else '❌'}")
    print(f"Model ID generated: {'✅' if metadata.get('model_id') != 'unknown' else '❌'}")


if __name__ == "__main__":
    main()

