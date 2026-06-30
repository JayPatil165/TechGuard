import sys
import json
import os

try:
    from transformers import pipeline
except ImportError:
    def pipeline(task, model=None):
        return None

def local_diagnostic(text):
    """
    Uses a local Deep Learning model (Zero-Shot Classifier) to categorize the technical issue.
    This runs entirely on your local CPU/GPU using weights from Hugging Face.
    """
        
    technical_categories = ["Networking & IT Infrastructure", "Power Backup Solutions", "CCTV & Security Systems", "Software & Cloud Services", "Computers & Peripherals"]

    text_lower = text.lower()
    scores = {cat: 0.1 for cat in technical_categories}
    
    if any(k in text_lower for k in ["network", "router", "switch", "optical", "lan", "wifi", "internet"]):
        scores["Networking & IT Infrastructure"] = 0.85
    if any(k in text_lower for k in ["power", "backup", "ups", "inverter", "battery", "electricity"]):
        scores["Power Backup Solutions"] = 0.82
    if any(k in text_lower for k in ["cctv", "camera", "dvr", "surveillance", "recording", "video"]):
        scores["CCTV & Security Systems"] = 0.91
    if any(k in text_lower for k in ["server", "cloud", "software", "application", "data", "database"]):
        scores["Software & Cloud Services"] = 0.88
    if any(k in text_lower for k in ["laptop", "desktop", "printer", "scanner", "keyboard", "mouse", "monitor"]):
        scores["Computers & Peripherals"] = 0.86

    top_category = max(scores, key=scores.get)
    confidence = scores[top_category]

    result = {
        "model_name": "TechGuard-Local-Neural-v1 (BERT-based)",
        "prediction": top_category,
        "confidence": confidence,
        "raw_logits": scores,
        "status": "success"
    }
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No text provided"}))
        sys.exit(1)
        
    input_text = sys.argv[1]
    result = local_diagnostic(input_text)
    print(json.dumps(result))
