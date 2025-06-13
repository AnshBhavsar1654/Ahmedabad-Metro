from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import os
import re

app = Flask(__name__)

# Configuration
MODEL_PATH = "./exported_model"
MAX_TOKENS = 256
TEMPERATURE = 0.7
OFFLOAD_DIR = "./model_offload"

def load_chatbot():
    try:
        os.makedirs(OFFLOAD_DIR, exist_ok=True)
        
        tokenizer = AutoTokenizer.from_pretrained(
            MODEL_PATH,
            use_fast=False
        )
        
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_PATH,
            torch_dtype=torch.float32,
            device_map="cpu",
            offload_folder=OFFLOAD_DIR,
            low_cpu_mem_usage=True
        )
        
        model = model.float().to('cpu')
        model.eval()
        
        return model, tokenizer
        
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        raise

try:
    model, tokenizer = load_chatbot()
    print("Chatbot initialized successfully!")
except Exception as e:
    print(f"Critical initialization error: {str(e)}")
    model = None
    tokenizer = None

def clean_response(response_text, original_prompt):
    try:
        if original_prompt in response_text:
            answer = response_text.replace(original_prompt, "").strip()
        else:
            answer = response_text
        
        # Method 1: Split by "### answer:" and take the last part
        if "### answer:" in answer.lower():
            parts = re.split(r'### answer:\s*', answer, flags=re.IGNORECASE)
            if len(parts) > 1:
                answer = parts[-1].strip()
        
        # Method 2: Split by "answer:" and take the last part
        elif "answer:" in answer.lower():
            parts = re.split(r'answer:\s*', answer, flags=re.IGNORECASE)
            if len(parts) > 1:
                answer = parts[-1].strip()
        
        # Method 3: Remove question part if present
        if "### question:" in answer.lower():
            answer = re.sub(r'.*### question:.*?### answer:\s*', '', answer, flags=re.IGNORECASE | re.DOTALL)
        
        answer = re.sub(r'^###\s*', '', answer)
        answer = re.sub(r'\s*###.*$', '', answer)
        answer = answer.strip()
        answer = re.sub(r'<\|.*?\|>', '', answer)
        answer = answer.strip()
        
        if not answer or len(answer) < 5:
            return "I'm sorry, I couldn't generate a proper response to your question."
        
        return answer
        
    except Exception as e:
        print(f"Error cleaning response: {str(e)}")
        return "Sorry, I encountered an error processing the response."

def generate_response(prompt):
    if not model or not tokenizer:
        return "Chatbot is currently unavailable"
        
    try:
        formatted_prompt = f"### Question: {prompt}\n### Answer:"
        inputs = tokenizer(
            formatted_prompt,
            return_tensors="pt",
            max_length=256,
            truncation=True,
            padding=True
        )
        
        # Ensure tensors are on CPU
        inputs = {k: v.to('cpu') for k, v in inputs.items()}
        
        # Generate response
        with torch.no_grad():
            outputs = model.generate(
                inputs['input_ids'],
                attention_mask=inputs['attention_mask'],
                max_new_tokens=MAX_TOKENS,
                temperature=TEMPERATURE,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
                early_stopping=True
            )
        
        # Decode the full response
        full_response = tokenizer.decode(
            outputs[0],
            skip_special_tokens=True
        )
        
        clean_answer = clean_response(full_response, formatted_prompt)
        return clean_answer
        
    except Exception as e:
        print(f"Generation error: {str(e)}")
        return "Sorry, I encountered an error processing your request."

@app.route('/chat', methods=['POST'])
def handle_chat():
    try:
        if not model or not tokenizer:
            return jsonify({"response": "Chat service is currently unavailable"}), 503
     
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({"error": "Invalid request format. Please provide 'message' field."}), 400
            
        user_message = data['message'].strip()
        if not user_message:
            return jsonify({"error": "Message cannot be empty"}), 400
            
        response = generate_response(user_message)    
        return jsonify({
            "response": response,
            "status": "success"
        })
        
    except Exception as e:
        print(f"Chat handler error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ready" if model and tokenizer else "unavailable",
        "device": "cpu",
        "model_path": MODEL_PATH
    })

@app.route('/test', methods=['GET'])
def test_endpoint():
    try:
        test_question = "What is the metro system?"
        response = generate_response(test_question)
        return jsonify({
            "test_question": test_question,
            "response": response,
            "status": "success"
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

if __name__ == '__main__':
    print(f"Status: {'Ready' if model and tokenizer else 'Error'}")
    app.run(host='0.0.0.0', port=5000, debug=False)