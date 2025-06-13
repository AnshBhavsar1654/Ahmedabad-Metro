import os
import warnings
from typing import Dict, Any
from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings("ignore")

class GujaratiTranslationChatbot:
    def __init__(self, main_rag_system=None):
        self.main_rag_system = main_rag_system
        self.translation_ready = False
        self.guj_to_eng_pipeline = None
        self.eng_to_guj_pipeline = None
        self.model = None
        self.tokenizer = None
        self.initialize_translation_models()
    
    def initialize_translation_models(self):
        try:
            print("Initializing translation models...")
            MODEL_NAME = "facebook/nllb-200-distilled-600M"
            self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
            
            self.guj_to_eng_pipeline = pipeline(
                "translation", 
                model=self.model, 
                tokenizer=self.tokenizer, 
                src_lang="guj_Gujr", 
                tgt_lang="eng_Latn"
            )
            self.eng_to_guj_pipeline = pipeline(
                "translation", 
                model=self.model, 
                tokenizer=self.tokenizer, 
                src_lang="eng_Latn", 
                tgt_lang="guj_Gujr"
            )
            self.translation_ready = True
            print("Translation models initialized successfully!")
            
        except Exception as e:
            print(f"Error initializing translation models: {str(e)}")
            self.translation_ready = False
    
    def translate_gujarati_to_english(self, gujarati_text: str) -> str:
        if not self.translation_ready:
            raise Exception("Translation models not available")
        
        try:
            gujarati_text = gujarati_text.strip()
            if not gujarati_text:
                return ""
            result = self.guj_to_eng_pipeline(gujarati_text, max_length=100)
            return result[0]['translation_text'].strip()

        except Exception as e:
            print(f"Error translating Gujarati to English: {str(e)}")
            raise Exception(f"Translation failed: {str(e)}")
    
    def translate_english_to_gujarati(self, english_text: str) -> str:
        if not self.translation_ready:
            raise Exception("Translation models not available")
        
        try:
            english_text = english_text.strip()
            if not english_text:
                return ""
            result = self.eng_to_guj_pipeline(english_text, max_length=100)
            return result[0]['translation_text'].strip()
            
        except Exception as e:
            print(f"Error translating English to Gujarati: {str(e)}")
            raise Exception(f"Translation failed: {str(e)}")
    
    def process_gujarati_query(self, gujarati_query: str) -> Dict[str, Any]:
        if not self.translation_ready:
            return {
                'response': "ક્ષમા કરશો, ગુજરાતી અનુવાદ સેવા હાલમાં ઉપલબ્ધ નથી.",
                'confidence': 0.0,
                'status': 'translation_unavailable',
                'original_query': gujarati_query
            }
        
        if not self.main_rag_system:
            return {
                'response': "ક્ષમા કરશો, ચેટબોટ સેવા હાલમાં ઉપલબ્ધ નથી.",
                'confidence': 0.0,
                'status': 'rag_unavailable',
                'original_query': gujarati_query
            }
        
        try:
            print(f"Processing Gujarati query: {gujarati_query}")
            english_query = self.translate_gujarati_to_english(gujarati_query)
            if not english_query:
                return {
                    'response': "ક્ષમા કરશો, તમારો પ્રશ્ન સમજાવવામાં મુશ્કેલી આવી રહી છે. કૃપા કરીને ફરીથી પ્રયાસ કરો.",
                    'confidence': 0.0,
                    'status': 'translation_failed',
                    'original_query': gujarati_query
                }
            
            print(f"Getting response from RAG system for: {english_query}")
            rag_result = self.main_rag_system.generate_response(english_query)
            if not rag_result or rag_result.get('status') == 'error':
                return {
                    'response': "ક્ષમા કરશો, મને તમારા પ્રશ્નનો જવાબ આપવામાં મુશ્કેલી આવી રહી છે.",
                    'confidence': 0.0,
                    'status': 'rag_failed',
                    'original_query': gujarati_query,
                    'english_query': english_query
                }
            english_response = rag_result.get('response', '')
            
            print(f"Translating response to Gujarati: {english_response}")
            gujarati_response = self.translate_english_to_gujarati(english_response)
            if not gujarati_response:
                gujarati_response = f"[English] {english_response}"
            
            return {
                'response': gujarati_response,
                'confidence': rag_result.get('confidence', 0.0),
                'status': 'success',
                'original_query': gujarati_query,
                'english_query': english_query,
                'english_response': english_response,
                'translation_used': True
            }
            
        except Exception as e:
            print(f"Error processing Gujarati query: {str(e)}")
            return {
                'response': "ક્ષમા કરશો, તમારા પ્રશ્નનો જવાબ આપવામાં ભૂલ આવી છે. કૃપા કરીને પછીથી પ્રયાસ કરો.",
                'confidence': 0.0,
                'status': 'processing_error',
                'original_query': gujarati_query,
                'error': str(e)
            }
    
    def is_gujarati_text(self, text: str) -> bool:
        if not text:
            return False
        gujarati_chars = 0
        total_chars = 0
        
        for char in text:
            if char.isalpha():
                total_chars += 1
                if '\u0A80' <= char <= '\u0AFF':
                    gujarati_chars += 1
        if total_chars == 0:
            return False
        
        return (gujarati_chars / total_chars) > 0.5
    
    def get_status(self) -> Dict[str, Any]:
        return {
            'translation_ready': self.translation_ready,
            'rag_system_available': self.main_rag_system is not None,
            'model_loaded': self.model is not None,
            'tokenizer_loaded': self.tokenizer is not None,
            'pipelines_ready': self.guj_to_eng_pipeline is not None and self.eng_to_guj_pipeline is not None
        }

# Test function for standalone testing
def test_gujarati_translation():
    print("Testing Gujarati Translation Chatbot...")
    guj_chatbot = GujaratiTranslationChatbot()
    if not guj_chatbot.translation_ready:
        print("Translation models not ready. Cannot test.")
        return
    
    test_gujarati = "મેટ્રોની પ્રથમ ટ્રેન કેટલા વાગ્યે આવે છે?"
    try:
        english_result = guj_chatbot.translate_gujarati_to_english(test_gujarati)
        print(f"Gujarati: {test_gujarati}")
        print(f"English: {english_result}")
        
        gujarati_result = guj_chatbot.translate_english_to_gujarati(english_result)
        print(f"Back to Gujarati: {gujarati_result}")
        
    except Exception as e:
        print(f"Translation test failed: {str(e)}")

if __name__ == "__main__":
    test_gujarati_translation()