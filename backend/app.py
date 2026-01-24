from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from route import get_all_stations, calculate_route_details
import pandas as pd
import os
from geopy.distance import geodesic
from dotenv import load_dotenv
from chat import ask_gemini
app = Flask(__name__)

# Configure CORS to allow requests from Vercel and localhost
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://*.vercel.app",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

load_dotenv()

FARE_PATH = os.path.join(os.path.dirname(__file__), "Fare Matrix.xlsx")
STATIONS_PATH = os.path.join(os.path.dirname(__file__), "Location.xlsx")

fare_matrix = pd.read_excel(FARE_PATH)
stations_df = pd.read_excel(STATIONS_PATH)

source_col = 'Source'
dest_col = 'Destination'
fare_col = 'Fare'

@app.route('/')
def home():
    return "Backend is running!"
    
@app.route('/api/stations', methods=['GET'])
def get_stations():
    try:
        stations = get_all_stations()
        return jsonify(stations)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stations/coordinates', methods=['GET'])
def get_stations_with_coordinates():
    """Returns all stations with their coordinates for mapping"""
    try:
        stations_list = []
        for _, row in stations_df.iterrows():
            stations_list.append({
                "name": row['Station'],
                "latitude": row['Latitude'],
                "longitude": row['Longitude']
            })
        return jsonify(stations_list)
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
        "distance": result['distance'],
        "instructions": result['instructions']
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


@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        # Handle preflight request for CORS
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response
    
    try:
        data = request.get_json() or {}
        message = (data.get('message') or '').strip()
        if not message:
            return jsonify({"error": "Missing message"}), 400

        # Get conversation history if provided (for follow-up questions)
        conversation_history = data.get('history', [])
        # Ensure history is a list of dicts with 'role' and 'text'
        if not isinstance(conversation_history, list):
            conversation_history = []

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            app.logger.error("GEMINI_API_KEY is not set in environment variables")
            return jsonify({"error": "GEMINI_API_KEY is not configured on the server"}), 500

        # Get model from env or use default
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        reply, language = ask_gemini(message, api_key=api_key, conversation_history=conversation_history, model=model)
        return jsonify({"response": reply, "language": language})
    except Exception as e:
        app.logger.exception("Chat error")
        return jsonify({"error": "Chat request failed", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=True)