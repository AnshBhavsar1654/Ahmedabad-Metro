import json
import os
import re
from typing import List, Dict, Any
import warnings
warnings.filterwarnings("ignore")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

QA_DATA_PATH = os.path.join(os.path.dirname(__file__), "metro_qa.json")
CONTEXT_TEXT_PATH = os.path.join(os.path.dirname(__file__), "metro.txt")
CONFIDENCE_THRESHOLD = 0.08
MAX_RESPONSE_LENGTH = 256

# Enhanced stopwords and synonyms
STOPWORDS = {'a', 'an', 'the', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'what', 
             'which', 'how', 'when', 'where', 'why', 'of', 'in', 'on', 'at', 'to', 'for', 
             'with', 'by', 'about', 'as', 'into', 'through', 'during', 'before', 'after', 
             'above', 'below', 'from', 'up', 'down', 'over', 'under', 'again', 'further', 
             'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 
             'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 
             'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'}

SYNONYM_MAP = {
    'run': ['operate', 'function', 'work', 'running', 'operates'],
    'operate': ['run', 'function', 'running', 'operates'],
    'day': ['days', 'daily'],
    'time': ['timing', 'schedule', 'hours'],
    'fare': ['ticket', 'price', 'cost', 'fee'],
    'route': ['line', 'path', 'routes'],
    'station': ['stop', 'stations'],
    'week': ['weekly'],
    'service': ['operation', 'running', 'services'],
    'metro': ['train', 'subway', 'transit'],
    'first': ['earliest', 'starting'],
    'last': ['final', 'ending'],
    'open': ['start', 'begin'],
    'close': ['end', 'finish']
}

class MetroRAG:
    def __init__(self):
        self.qa_pairs = []
        self.context_paragraphs = []
        self.all_documents = []
        self.is_loaded = False
        
    def load_qa_data(self, json_file_path: str):
        try:
            if not os.path.exists(json_file_path):
                print(f"Warning: QA data file not found at {json_file_path}")
                return False
            with open(json_file_path, 'r', encoding='utf-8') as f:
                qa_data = json.load(f)
            
            self.qa_pairs = qa_data.get('qa_pairs', [])
            print(f"Loaded {len(self.qa_pairs)} QA pairs")
            return True

        except Exception as e:
            print(f"Error loading QA data: {str(e)}")
            return False
    
    def load_context_text(self, txt_file_path: str):
        try:
            if not os.path.exists(txt_file_path):
                print(f"Warning: Context text file not found at {txt_file_path}")
                return False
            with open(txt_file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            paragraphs = []
            raw_paragraphs = content.split('\n\n')
            
            for para in raw_paragraphs:
                para = para.strip()
                if para and len(para) > 20:
                    paragraphs.append(para)
            
            # If no double newlines found, split by single newlines
            if len(paragraphs) < 2:
                paragraphs = []
                lines = content.split('\n')
                current_para = ""
                for line in lines:
                    line = line.strip()
                    if line:
                        current_para += line + " "
                    else:
                        if current_para.strip() and len(current_para.strip()) > 20:
                            paragraphs.append(current_para.strip())
                        current_para = ""
                
                if current_para.strip() and len(current_para.strip()) > 20:
                    paragraphs.append(current_para.strip())
            
            self.context_paragraphs = paragraphs
            print(f"Loaded {len(self.context_paragraphs)} context paragraphs")
            return True
            
        except Exception as e:
            print(f"Error loading context text: {str(e)}")
            return False
    
    def create_combined_documents(self):
        self.all_documents = []
        
        for i, pair in enumerate(self.qa_pairs):
            question = pair.get('question', '')
            answer = pair.get('answer', '')
            
            qa_doc = {
                'content': f"{question} {answer}",
                'type': 'qa_pair',
                'question': question,
                'answer': answer,
                'index': i,
                'source': 'qa_data'
            }
            self.all_documents.append(qa_doc)
            
            q_doc = {
                'content': question,
                'type': 'question',
                'question': question,
                'answer': answer,
                'index': i,
                'source': 'qa_data'
            }
            self.all_documents.append(q_doc)
            
            a_doc = {
                'content': answer,
                'type': 'answer',
                'question': question,
                'answer': answer,
                'index': i,
                'source': 'qa_data'
            }
            self.all_documents.append(a_doc)
        
        for i, paragraph in enumerate(self.context_paragraphs):
            context_doc = {
                'content': paragraph,
                'type': 'context',
                'paragraph_index': i,
                'source': 'context_text'
            }
            self.all_documents.append(context_doc)
        
        print(f"Created {len(self.all_documents)} total documents for search")
        self.is_loaded = True
    
    def load_all_data(self, qa_path: str, context_path: str):
        qa_loaded = self.load_qa_data(qa_path)
        context_loaded = self.load_context_text(context_path)
        if qa_loaded or context_loaded:
            self.create_combined_documents()
            return True
        return False
    
    def preprocess_text(self, text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text
    
    def expand_query_terms(self, query: str) -> List[str]:
        """Expand query with synonyms and related terms"""
        terms = set()
        words = self.preprocess_text(query).split()
        
        for word in words:
            if word in STOPWORDS:
                continue
            terms.add(word)
            if word in SYNONYM_MAP:
                terms.update(SYNONYM_MAP[word])
        
        # Add special handling for numeric queries
        if any(keyword in query.lower() for keyword in ['how many', 'number of', 'count of']):
            terms.update(['number', 'count', 'quantity', 'how many'])
        
        return list(terms)
    
    def calculate_word_overlap_score(self, query: str, text: str) -> float:
        """Calculate simple word overlap score"""
        query_words = set(self.preprocess_text(query).split())
        text_words = set(self.preprocess_text(text).split())
        
        # Remove stopwords
        query_words = {word for word in query_words if word not in STOPWORDS}
        text_words = {word for word in text_words if word not in STOPWORDS}
        
        if not query_words:
            return 0.0
        
        # Calculate overlap
        overlap = query_words.intersection(text_words)
        return len(overlap) / len(query_words)
    
    def calculate_similarity(self, query: str, text: str) -> float:
        """Calculate enhanced similarity with multiple scoring methods"""
        # Method 1: Word overlap
        word_overlap = self.calculate_word_overlap_score(query, text)
        
        # Method 2: Expanded terms matching
        query_terms = set(self.expand_query_terms(query))
        text_processed = self.preprocess_text(text)
        text_terms = set(text_processed.split())
        text_terms = {term for term in text_terms if term not in STOPWORDS}
        
        if query_terms:
            expanded_overlap = len(query_terms.intersection(text_terms)) / len(query_terms)
        else:
            expanded_overlap = 0.0
        
        # Method 3: Substring matching
        query_lower = query.lower()
        text_lower = text.lower()
        substring_score = 0.0
        
        query_words = [word for word in query_lower.split() if word not in STOPWORDS and len(word) > 2]
        for word in query_words:
            if word in text_lower:
                substring_score += 1
        
        if query_words:
            substring_score = substring_score / len(query_words)
        
        # Combine scores with weights
        final_score = (word_overlap * 0.4) + (expanded_overlap * 0.4) + (substring_score * 0.2)
        return final_score

    def find_best_matches(self, query: str, top_k: int = 8) -> List[Dict[str, Any]]:
        if not self.is_loaded:
            return []
        
        scored_documents = []
        query_lower = query.lower()
        
        for doc in self.all_documents:
            content = doc['content']
            content_lower = content.lower()
            similarity = self.calculate_similarity(query, content)
            
            # Base score is similarity
            score = similarity
            
            # Apply type-specific scoring adjustments
            if doc['type'] == 'qa_pair':
                score *= 1.5
            elif doc['type'] == 'question':
                score *= 2.0
            elif doc['type'] == 'answer':
                score *= 1.3
            elif doc['type'] == 'context':
                score *= 1.0
            
            # Boost for numeric answers when asking counting questions
            if doc['type'] in ['qa_pair', 'answer']:
                if any(char.isdigit() for char in doc.get('answer', '')):
                    if any(keyword in query_lower for keyword in ['how many', 'number', 'count']):
                        score *= 1.5
            
            # Boost for exact phrase matches
            if query_lower in content_lower:
                score += 0.3
            
            # Boost for Metro-related terms
            metro_terms = ['metro', 'train', 'station', 'fare', 'ticket', 'timing', 
                          'schedule', 'route', 'line', 'platform', 'ahmedabad', 'subway']
            query_terms = set(self.preprocess_text(query).split())
            content_terms = set(self.preprocess_text(content).split())
            
            common_metro_terms = query_terms.intersection(metro_terms).intersection(content_terms)
            if common_metro_terms:
                score += len(common_metro_terms) * 0.1
            
            # Always add matches with any score > 0
            if score > 0:
                scored_documents.append({
                    'score': score,
                    'content': content,
                    'document': doc,
                    'similarity': similarity
                })
        
        scored_documents.sort(key=lambda x: x['score'], reverse=True)
        
        # Debug: Print top matches
        if scored_documents:
            print(f"Top match score: {scored_documents[0]['score']:.4f}")
            print(f"Query: {query}")
            print(f"Best match: {scored_documents[0]['content'][:100]}...")
        
        return scored_documents[:top_k]
    
    def generate_contextual_response(self, query: str, matches: List[Dict[str, Any]]) -> str:
        if not matches:
            return None
        
        direct_answers = []
        context_info = []
        
        for match in matches:
            doc = match['document']    
            if doc['type'] in ['qa_pair', 'answer'] and 'answer' in doc:
                direct_answers.append({
                    'answer': doc['answer'],
                    'question': doc.get('question', ''),
                    'score': match['score']
                })
            elif doc['type'] == 'context':
                context_info.append({
                    'content': doc['content'],
                    'score': match['score']
                })
        
        if direct_answers:
            best_answer = direct_answers[0]['answer']
            
            # Enhance with context if available and relevant
            if context_info and len(best_answer) < 100:
                relevant_context = context_info[0]['content']
                query_terms = set(self.expand_query_terms(query))
                context_terms = set(self.preprocess_text(relevant_context).split())
                
                if query_terms.intersection(context_terms):
                    context_sentences = relevant_context.split('.')
                    relevant_sentences = []
                    for sentence in context_sentences:
                        sentence_text = sentence.strip()
                        if sentence_text and any(term in sentence_text.lower() for term in query_terms):
                            relevant_sentences.append(sentence_text)
                    
                    if relevant_sentences:
                        additional_info = '. '.join(relevant_sentences[:2])
                        if len(additional_info) > 20 and additional_info.lower() not in best_answer.lower():
                            best_answer += f" {additional_info}"
            
            return best_answer
        
        # If no direct QA answers, use context information
        elif context_info:
            relevant_context = context_info[0]['content']
            sentences = relevant_context.split('.')
            query_terms = set(self.expand_query_terms(query))
            relevant_sentences = []
            
            for sentence in sentences:
                sentence_text = sentence.strip()
                if sentence_text and any(term in sentence_text.lower() for term in query_terms):
                    relevant_sentences.append(sentence_text)
            
            if relevant_sentences:
                response = '. '.join(relevant_sentences[:2])
                if not response.endswith('.'):
                    response += '.'
                return response
            else:
                return relevant_context[:200] + '...' if len(relevant_context) > 200 else relevant_context
        
        return None
    
    def generate_response(self, query: str) -> Dict[str, Any]:
        if not self.is_loaded:
            return {
                'response': "I'm sorry, the knowledge base is not available. Please try again later.",
                'confidence': 0.0,
                'status': 'error'
            }
        
        matches = self.find_best_matches(query)
        
        # Handle greetings and thanks (only if they are standalone or at the beginning)
        query_lower = query.lower().strip()
        
        # Check for standalone greetings
        if query_lower in ['hello', 'hi', 'hey'] or query_lower.startswith(('hello', 'hi there', 'hey there', 'good morning', 'good afternoon', 'good evening')):
            return {
                'response': "Hello! I'm here to help you with Ahmedabad Metro information. Ask me about routes, timings, fares, or any other metro-related queries.",
                'confidence': 0.9,
                'status': 'success'
            }
        
        # Check for thank you messages (more specific)
        if query_lower in ['thank you', 'thanks', 'thank'] or 'thank you' in query_lower and len(query_lower.split()) <= 3:
            return {
                'response': "You're welcome! Feel free to ask if you have any more questions about Ahmedabad Metro.",
                'confidence': 0.9,
                'status': 'success'
            }
        
        # Handle case where we have matches but low confidence
        if matches:
            best_score = matches[0]['score']
            
            # If we have any reasonable match, try to generate a response
            if best_score >= CONFIDENCE_THRESHOLD:
                response_text = self.generate_contextual_response(query, matches)
                
                if response_text:
                    cleaned_response = self.clean_answer(response_text)
                    confidence = min(best_score * 2, 0.95)  # Boost confidence
                    
                    return {
                        'response': cleaned_response,
                        'confidence': confidence,
                        'status': 'success'
                    }
            
            # Even for low confidence, try to provide some information
            elif best_score > 0.03:  # Very low threshold for partial matches
                response_text = self.generate_contextual_response(query, matches)
                
                if response_text:
                    cleaned_response = self.clean_answer(response_text)
                    return {
                        'response': f"Based on available information: {cleaned_response}",
                        'confidence': min(best_score + 0.2, 0.8),
                        'status': 'partial_success'
                    }
        
        # Check if we found some matches but couldn't generate a good response
        if matches and matches[0]['score'] > 0.01:
            return {
                'response': "I found some related information but couldn't generate a specific answer. Please try rephrasing your question.",
                'confidence': 0.3,
                'status': 'partial'
            }
        
        # Final fallback
        return {
            'response': "I don't have specific information about that. Please ask me about Ahmedabad Metro services, routes, timings, fares, or station information.",
            'confidence': 0.2,
            'status': 'partial'
        }
    
    def clean_answer(self, answer: str) -> str:
        cleaned = answer.strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        if cleaned and not cleaned.endswith(('.', '!', '?')):
            cleaned += '.'
        if len(cleaned) > MAX_RESPONSE_LENGTH:
            sentences = cleaned.split('.')
            truncated = ''
            for sentence in sentences:
                if len(truncated + sentence + '.') <= MAX_RESPONSE_LENGTH:
                    truncated += sentence + '.'
                else:
                    break
            
            if truncated:
                cleaned = truncated
            else:
                cleaned = cleaned[:MAX_RESPONSE_LENGTH] + '...'
        
        return cleaned

def load_chatbot():
    try:
        rag_system = MetroRAG()
        qa_loaded = False
        context_loaded = False
        
        qa_loaded = rag_system.load_qa_data(QA_DATA_PATH)
        context_loaded = rag_system.load_context_text(CONTEXT_TEXT_PATH)
        if qa_loaded or context_loaded:
            rag_system.create_combined_documents()
            print(f"RAG system initialized")
            return rag_system
        
        # If no data files found, create minimal fallback
        print("No data files found. Creating minimal fallback system.")
        rag_system.qa_pairs = [
            {
                "question": "What is Ahmedabad Metro?",
                "answer": "Ahmedabad Metro is a rapid transit system serving the city of Ahmedabad, Gujarat, India."
            },
            {
                "question": "How can I get more information?",
                "answer": "Please contact the metro authorities or visit the official website for detailed information."
            }
        ]
        rag_system.context_paragraphs = [
            "Ahmedabad Metro Rail is a modern transportation system designed to provide efficient and comfortable travel within the city. The metro system connects various important locations and helps reduce traffic congestion."
        ]
        rag_system.create_combined_documents()
        return rag_system
        
    except Exception as e:
        print(f"Error initializing Enhanced RAG system: {str(e)}")
        return None

try:
    rag_chatbot = load_chatbot()
    print("RAG Chatbot initialized successfully" if rag_chatbot and rag_chatbot.is_loaded else "RAG Chatbot initialization failed")
except Exception as e:
    print(f"Chatbot initialization error: {str(e)}")
    rag_chatbot = None

def generate_response(prompt):
    if not rag_chatbot or not rag_chatbot.is_loaded:
        return "Chatbot is currently unavailable"
    try:
        result = rag_chatbot.generate_response(prompt)
        return result.get('response', 'Sorry, I could not generate a response.')
    except Exception as e:
        print(f"Generation error: {str(e)}")
        return "Sorry, I encountered an error processing your request."

def clean_response(response_text, original_prompt):
    try:
        if not response_text or len(response_text.strip()) < 3:
            return "I'm sorry, I couldn't generate a proper response to your question."
        
        cleaned = response_text.strip()
        cleaned = re.sub(r'<\|.*?\|>', '', cleaned)
        cleaned = re.sub(r'^###\s*', '', cleaned)
        return cleaned
        
    except Exception as e:
        print(f"Error cleaning response: {str(e)}")
        return "Sorry, I encountered an error processing the response."

def handle_chat():
    from flask import request, jsonify    
    try:
        if not rag_chatbot or not rag_chatbot.is_loaded:
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
