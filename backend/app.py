from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from chatbot import handle_chat, rag_chatbot
from route import get_all_stations, calculate_route_details
from guj_chatbot import GujaratiTranslationChatbot
import pandas as pd
import os
from geopy.distance import geodesic
app = Flask(__name__)
CORS(app)

fare_matrix = pd.read_excel("Fare Matrix.xlsx")
stations_df = pd.read_excel("Location.xlsx")

gujarati_chatbot = None
try:
    gujarati_chatbot = GujaratiTranslationChatbot(main_rag_system=rag_chatbot)
    print("Gujarati chatbot initialized successfully!")
except Exception as e:
    print(f"Failed to initialize Gujarati chatbot: {str(e)}")

source_col = 'Source'
dest_col = 'Destination'
fare_col = 'Fare'

@app.route('/api/stations', methods=['GET'])
def get_stations():
    try:
        stations = get_all_stations()
        return jsonify(stations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/route', methods=['POST'])
def get_route():
    data = request.get_json()
    source = data.get('source', '')
    destination = data.get('destination', '')
    
    if not source or not destination:
        return jsonify({"error": "Missing source or destination"}), 400
    result = calculate_route_details(source, destination)
    
    if result['error']:
        return jsonify({"error": result['error']}), 400
    
    return jsonify({
        "route": result['route'],
        "interchanges": result['interchanges'],
        "distance": result['distance']
    })

@app.route('/api/fare', methods=['POST'])
def get_fare():
    data = request.get_json()
    source = data.get('source', '')
    destination = data.get('destination', '')
    if not source or not destination:
        return jsonify({"error": "Missing source or destination"}), 400
    
    try:
        matching_fare = fare_matrix[(fare_matrix[source_col] == source) & (fare_matrix[dest_col] == destination)]
        if len(matching_fare) > 0:
            fare_value = int(matching_fare[fare_col].iloc[0])
        return jsonify({"fare": fare_value})
    except Exception as e:
        import traceback
        print(f"Fare calculation error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": f"Fare calculation failed: {str(e)}"}), 400

@app.route('/chat', methods=['POST'])
@app.route('/api/chat', methods=['POST'])
def chat():
    return handle_chat()

@app.route('/api/gujarati/status', methods=['GET'])
def gujarati_status():
    if not gujarati_chatbot:
        return jsonify({
            'available': False,
            'error': 'Gujarati chatbot not initialized'
        }), 503
    return jsonify({
        'available': gujarati_chatbot.translation_ready,
        'status': gujarati_chatbot.get_status()
    })

@app.route('/api/gujarati/chat', methods=['POST'])
def gujarati_chat():
    if not gujarati_chatbot:
        return jsonify({
            'error': 'Gujarati chatbot not available',
            'response': 'ક્ષમા કરશો, ગુજરાતી ચેટબોટ હાલમાં ઉપલબ્ધ નથી.'
        }), 503
    
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({
                'error': 'Missing message in request',
                'response': 'કૃપા કરીને તમારો સંદેશ મોકલો.'
            }), 400
        gujarati_query = data['message'].strip()
        if not gujarati_query:
            return jsonify({
                'error': 'Empty message',
                'response': 'કૃપા કરીને કોઈ સંદેશ લખો.'
            }), 400
        
        result = gujarati_chatbot.process_gujarati_query(gujarati_query)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in Gujarati chat: {str(e)}")
        return jsonify({
            'error': str(e),
            'response': 'ક્ષમા કરશો, કોઈ ભૂલ આવી છે. કૃપા કરીને પછીથી પ્રયાસ કરો.'
        }), 500

@app.route('/api/gujarati/translate', methods=['POST'])
def gujarati_translate():
    if not gujarati_chatbot or not gujarati_chatbot.translation_ready:
        return jsonify({
            'error': 'Translation service not available'
        }), 503
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing text in request'}), 400
        
        text = data['text'].strip()
        direction = data.get('direction', 'auto')  # 'guj_to_eng', 'eng_to_guj', or 'auto'
        if not text:
            return jsonify({'error': 'Empty text'}), 400
        
        if direction == 'auto':
            if gujarati_chatbot.is_gujarati_text(text):
                direction = 'guj_to_eng'
            else:
                direction = 'eng_to_guj'
        
        if direction == 'guj_to_eng':
            translated = gujarati_chatbot.translate_gujarati_to_english(text)
            return jsonify({
                'original': text,
                'translated': translated,
                'direction': 'gujarati_to_english'
            })
        elif direction == 'eng_to_guj':
            translated = gujarati_chatbot.translate_english_to_gujarati(text)
            return jsonify({
                'original': text,
                'translated': translated,
                'direction': 'english_to_gujarati'
            })
        else:
            return jsonify({'error': 'Invalid direction parameter'}), 400
            
    except Exception as e:
        print(f"Error in translation: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stations/nearby', methods=['GET'])
def get_nearby_stations():
    try:
        user_lat = request.args.get('lat', type=float)
        user_lng = request.args.get('lng', type=float)
        if None in [user_lat, user_lng]:
            return jsonify({"error": "Missing latitude/longitude parameters"}), 400
        if not (-90 <= user_lat <= 90) or not (-180 <= user_lng <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400

        stations = []
        for _, row in stations_df.iterrows():
            station_coords = (row['Latitude'], row['Longitude'])
            user_coords = (user_lat, user_lng)    
            distance = geodesic(user_coords, station_coords).kilometers
            
            stations.append({
                "name": row['Station'],
                "latitude": row['Latitude'],
                "longitude": row['Longitude'],
                "distance": round(distance, 2)
            })

        nearest_stations = sorted(stations, key=lambda x: x['distance'])[:3]
        return jsonify(nearest_stations)

    except Exception as e:
        app.logger.error(f"Error in nearby stations: {str(e)}")
        return jsonify({"error": "Failed to find nearby stations"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=True)