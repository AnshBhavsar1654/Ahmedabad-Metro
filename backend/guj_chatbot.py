import json
import os
import re
from typing import List, Dict, Any
import warnings
warnings.filterwarnings("ignore")
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

os.path.join(os.path.dirname(__file__), "metro_qa_guj.json")

QA_DATA_PATH = os.path.join(os.path.dirname(__file__), "metro_qa_guj.json")
CONTEXT_TEXT_PATH = os.path.join(os.path.dirname(__file__), "metro_guj.txt")
CONFIDENCE_THRESHOLD = 0.12
MAX_RESPONSE_LENGTH = 256

# Enhanced stopwords and synonyms
STOPWORDS = {
    'એક', 'અને', 'છે', 'હે', 'હતો', 'હતી', 'હતું', 'હતાં', 'હશે', 'હવે',
    'હમણાં', 'તો', 'કે', 'આ', 'એ', 'તે', 'તમે', 'તારું', 'તમારું', 'મારું',
    'મારે', 'મને', 'મારાથી', 'તેને', 'તેમણે', 'એમને', 'માટે', 'સાથે', 'પર',
    'માં', 'થી', 'વચ્ચે', 'ની', 'નુ', 'નાં', 'પરંતુ', 'કેવી રીતે', 'શા માટે',
    'શું', 'ક્યારે', 'ક્યાં', 'કોણ', 'કયો', 'કઈ', 'કઈ રીતે', 'કેટલો', 'બધા',
    'કોઈ', 'બે', 'ત્રણ', 'ઘણાં', 'અન્ય', 'ખૂબ', 'જ', 'એટલે', 'તો પણ', 'અથવા',
    'પછી', 'પહેલા', 'નીચે', 'ઉપર', 'ફરી', 'બીજું', 'જ્યારે', 'હંમેશા', 'ત્યાં',
    'અહીં', 'હવે', 'ચાલો', 'જોઈએ', 'સકે', 'શકે', 'જોઇએ', 'ચાહે', 'માટે', 'કારણ કે',
    'કેવી', 'કેમ', 'કરવા માટે', 'રાહે', 'દ્વારા', 'વિશે', 'વિગતે', 'માથે', 'વગેરે',
    'નહીં', 'હોજો', 'છોડી', 'થઈ', 'થાય', 'થયો', 'થઇ', 'થઇને', 'હસે', 'અહીં સુધી',
}

SYNONYM_MAP = {
    'દોડે': ['ચાલે', 'ઓપરેટ કરે', 'ફંકશન કરે', 'દોડવું', 'ચાલે છે'],
    'ચાલે': ['દોડે', 'ફંકશન કરે', 'ઓપરેટ કરે', 'દોડે છે'],
    'દિવસ': ['દિવસો', 'દૈનિક', 'રોજ'],
    'સમય': ['ટાઈમ', 'અવધિ', 'ટાઈમિંગ', 'અવર', 'શેડ્યૂલ'],
    'કિંમત': ['ટિકિટ', 'ફી', 'ભાડું', 'કિંમતો', 'ચાર્જ'],
    'માર્ગ': ['રસ્તો', 'લાઇન', 'પાથ', 'માર્ગો'],
    'સ્ટેશન': ['સ્ટોપ', 'સ્ટેશનો'],
    'અઠવાડિયું': ['અઠવાડિક', 'સાપ્તાહિક'],
    'સેવા': ['ઓપરેશન', 'સેવાનો', 'સેવાનું', 'ચાલવું', 'રનિંગ'],
    'મેટ્રો': ['ટ્રેન', 'ટ્રાન્સિટ', 'સબવે'],
    'પ્રથમ': ['સૌપ્રથમ', 'શરુઆત', 'શરૂઆતનો'],
    'અંતિમ': ['છેલ્લો', 'એન્ડિંગ', 'અંત'],
    'ખુલશે': ['શરૂ', 'શરૂઆત', 'શરુઆત થશે'],
    'બંધ': ['અંત', 'પુરું', 'ફિનિશ'],
    'રસ્તો': ['માર્ગ', 'પાથ', 'રૂટ', 'દિશા'],
    'જવું': ['પહોંચવું', 'જવાનો', 'જવાનું'],
    'સાયન્સ સિટી': ['વિજ્ઞાન નગર', 'સાયન્સ સેન્ટર'],
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
            question = pair.get('પ્રશ્ન', '')
            answer = pair.get('જવાબ', '')
            
            qa_doc = {
                'content': f"{question} {answer}",
                'type': 'qa_pair',
                'પ્રશ્ન': question,
                'જવાબ': answer,
                'index': i,
                'source': 'qa_data'
            }
            self.all_documents.append(qa_doc)
            
            q_doc = {
                'content': question,
                'type': 'question',
                'પ્રશ્ન': question,
                'જવાબ': answer,
                'index': i,
                'source': 'qa_data'
            }
            self.all_documents.append(q_doc)
            
            a_doc = {
                'content': answer,
                'type': 'answer',
                'પ્રશ્ન': question,
                'જવાબ': answer,
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

    def check_answer_relevance(self, query: str, answer: str, question: str = "") -> float:
        """Check if an answer is relevant to the query by comparing key terms"""
        query_terms = set(self.expand_query_terms(query))
        answer_terms = set(self.expand_query_terms(answer))
        question_terms = set(self.expand_query_terms(question)) if question else set()
        
        # Calculate relevance based on term overlap
        answer_relevance = len(query_terms.intersection(answer_terms)) / len(query_terms) if query_terms else 0
        question_relevance = len(query_terms.intersection(question_terms)) / len(query_terms) if query_terms and question_terms else 0
        
        # Combined relevance score
        combined_relevance = max(answer_relevance, question_relevance * 0.8)
        
        # Additional checks for specific cases
        query_lower = query.lower()
        answer_lower = answer.lower()
        
        # Check for location-specific queries
        if any(location in query_lower for location in ['સાયન્સ સિટી', 'એરપોર્ટ', 'રેલવે સ્ટેશન', 'બસ સ્ટેન્ડ']):
            if not any(location in answer_lower for location in ['સાયન્સ સિટી', 'એરપોર્ટ', 'રેલવે સ્ટેશન', 'બસ સ્ટેન્ડ']):
                # If query is location-specific but answer doesn't mention locations, reduce relevance
                combined_relevance *= 0.5
        
        # Check for route/direction queries
        if any(term in query_lower for term in ['રસ્તો', 'માર્ગ', 'જવું', 'પહોંચવું', 'કેવી રીતે']):
            if not any(term in answer_lower for term in ['રસ્તો', 'માર્ગ', 'જવું', 'પહોંચવું', 'કેવી રીતે', 'લાઇન', 'સ્ટેશન']):
                combined_relevance *= 0.6
        
        return combined_relevance

    def find_best_matches(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
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
            
            # Apply type-specific scoring adjustments - but more conservative
            if doc['type'] == 'qa_pair':
                # Check relevance before boosting
                answer_relevance = self.check_answer_relevance(query, doc.get('જવાબ', ''), doc.get('પ્રશ્ન', ''))
                if answer_relevance > 0.3:  # Only boost if reasonably relevant
                    score *= 1.3
                else:
                    score *= 0.8  # Reduce score for irrelevant QA pairs
            elif doc['type'] == 'question':
                question_relevance = self.check_answer_relevance(query, doc.get('પ્રશ્ન', ''))
                if question_relevance > 0.3:
                    score *= 1.5
                else:
                    score *= 0.9
            elif doc['type'] == 'answer':
                answer_relevance = self.check_answer_relevance(query, doc.get('જવાબ', ''), doc.get('પ્રશ્ન', ''))
                if answer_relevance > 0.3:
                    score *= 1.2
                else:
                    score *= 0.7  # Significantly reduce score for irrelevant answers
            elif doc['type'] == 'context':
                score *= 1.0
            
            # Boost for numeric answers when asking counting questions
            if doc['type'] in ['qa_pair', 'answer']:
                if any(char.isdigit() for char in doc.get('જવાબ', '')):
                    if any(keyword in query_lower for keyword in ['how many', 'number', 'count', 'કેટલા', 'કેટલી']):
                        score *= 1.2
            
            # Boost for exact phrase matches
            if query_lower in content_lower:
                score += 0.2
            
            # Boost for Metro-related terms
            metro_terms = ['મેટ્રો', 'ટ્રેન', 'સ્ટેશન', 'કિંમત', 'ટિકિટ', 'સમય', 'શેડ્યૂલ', 'માર્ગ', 'લાઇન', 'પ્લેટફોર્મ', 'અમદાવાદ', 'સબવે'] 
            query_terms = set(self.preprocess_text(query).split())
            content_terms = set(self.preprocess_text(content).split())
            
            common_metro_terms = query_terms.intersection(metro_terms).intersection(content_terms)
            if common_metro_terms:
                score += len(common_metro_terms) * 0.05
            
            # Always add matches with any score > 0
            if score > 0:
                scored_documents.append({
                    'score': score,
                    'content': content,
                    'document': doc,
                    'similarity': similarity,
                    'relevance': self.check_answer_relevance(query, content) if doc['type'] in ['answer', 'qa_pair'] else similarity
                })
        
        scored_documents.sort(key=lambda x: x['score'], reverse=True)
        
        # Debug: Print top matches
        if scored_documents:
            print(f"Top 3 matches:")
            for i, match in enumerate(scored_documents[:3]):
                print(f"{i+1}. Score: {match['score']:.4f}, Relevance: {match.get('relevance', 0):.4f}")
                print(f"   Content: {match['content'][:100]}...")
                print(f"   Type: {match['document']['type']}")
        
        return scored_documents[:top_k]
    
    def generate_contextual_response(self, query: str, matches: List[Dict[str, Any]]) -> str:
        if not matches:
            return None
        
        direct_answers = []
        context_info = []
        
        for match in matches:
            doc = match['document']    
            if doc['type'] in ['qa_pair', 'answer'] and 'જવાબ' in doc:
                # Check relevance before adding to direct answers
                relevance = self.check_answer_relevance(query, doc['જવાબ'], doc.get('પ્રશ્ન', ''))
                direct_answers.append({
                    'answer': doc['જવાબ'],
                    'question': doc.get('પ્રશ્ન', ''),
                    'score': match['score'],
                    'relevance': relevance
                })
            elif doc['type'] == 'context':
                context_info.append({
                    'content': doc['content'],
                    'score': match['score']
                })
        
        # Sort direct answers by relevance first, then by score
        direct_answers.sort(key=lambda x: (x['relevance'], x['score']), reverse=True)
        
        # Only use answers with reasonable relevance
        relevant_answers = [ans for ans in direct_answers if ans['relevance'] > 0.25]
        
        if relevant_answers:
            best_answer = relevant_answers[0]['answer']
            
            print(f"Selected answer relevance: {relevant_answers[0]['relevance']:.4f}")
            print(f"Selected answer: {best_answer[:100]}...")
            
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
        
        # If no relevant direct QA answers, use context information
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
        
        query_lower = query.lower().strip()
        
        # Check for standalone greetings in Gujarati
        if query_lower in ['નમસ્તે', 'હાય', 'હેલો'] or query_lower.startswith(
            ('નમસ્તે', 'હાય', 'હેલો', 'સુપ્રભાત', 'શુભ બપોર', 'શુભ સંધ્યા')):
            return {
                'response': "નમસ્તે! હું અમદાવાદ મેટ્રો વિશે માહિતી આપવા માટે અહીં છું. રુટ, સમય, ભાડું કે અન્ય મેટ્રો સંબંધિત પ્રશ્નો પૂછો.",
                'confidence': 0.9,
                'status': 'success'
            }

        # Check for thank you messages in Gujarati
        if query_lower in ['આભાર', 'ધન્યવાદ'] or 'આભાર' in query_lower and len(query_lower.split()) <= 3:
            return {
                'response': "સ્વાગત છે! જો તમારે અમદાવાદ મેટ્રો અંગે વધુ પ્રશ્નો હોય તો અવશ્ય પૂછો.",
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
                    confidence = min(best_score * 1.5, 0.95)  # Moderate confidence boost
                    
                    return {
                        'response': cleaned_response,
                        'confidence': confidence,
                        'status': 'success'
                    }
            
            # Even for low confidence, try to provide some information
            elif best_score > 0.05:  # Slightly higher threshold for partial matches
                response_text = self.generate_contextual_response(query, matches)
                
                if response_text:
                    cleaned_response = self.clean_answer(response_text)
                    return {
                        'response': f"આ વિષય પર ઉપલબ્ધ માહિતી: {cleaned_response}",
                        'confidence': min(best_score + 0.15, 0.8),
                        'status': 'partial_success'
                    }
        
        # Check if we found some matches but couldn't generate a good response
        if matches and matches[0]['score'] > 0.02:
            return {
                'response': "મને સંબંધિત માહિતી મળી, પણ ચોક્કસ જવાબ જનરેટ કરી શક્યો નહીં. કૃપા કરીને તમારું પ્રશ્ન ફરીથી પૂછો અથવા અલગ રીતે પૂછો.",
                'confidence': 0.3,
                'status': 'partial'
            }

        # Final fallback
        return {
            'response': "માફ કરશો, આ વિષય પર મારી પાસે ચોક્કસ માહિતી નથી. તમે અમદાવાદ મેટ્રોની સેવાઓ, રૂટ, સમયસૂચિ, ભાડું અથવા સ્ટેશન અંગે પૂછો.",
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
                "પ્રશ્ન": "અમદાવાદ મેટ્રો શું છે?",
                "જવાબ": "અમદાવાદ મેટ્રો એ એક ઝડપી ટ્રાન્ઝિટ સિસ્ટમ છે, જે ગુજરાત રાજ્યના અમદાવાદ શહેરને સેવા આપે છે."
            },
            {
                "પ્રશ્ન": "મને વધુ માહિતી કેવી રીતે મળી શકે?",
                "જવાબ": "કૃપા કરીને મેટ્રો અધિકારીઓનો સંપર્ક કરો અથવા વિગતવાર માહિતી માટે અધિકૃત વેબસાઇટ પર મુલાકાત લો."
            }
        ]
        rag_system.context_paragraphs = [
            "અમદાવાદ મેટ્રો રેલ એ એક આધુનિક પરિવહન પ્રણાલી છે, જે શહેરમાં અસરકારક અને આરામદાયક મુસાફરી માટે રચાયેલ છે. મેટ્રો સિસ્ટમ વિવિધ મહત્વપૂર્ણ સ્થળોને જોડે છે અને ટ્રાફિકની ભીડ ઘટાડવામાં મદદ કરે છે."
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

def handle_guj_chat():
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
