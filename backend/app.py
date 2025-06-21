from flask import Flask, jsonify, request, make_response
from flask_cors import CORS
from chatbot import handle_chat, rag_chatbot
from route import get_all_stations, calculate_route_details
from guj_chatbot import handle_guj_chat
import pandas as pd
import os
from geopy.distance import geodesic
app = Flask(__name__)
CORS(app)

FARE_PATH = os.path.join(os.path.dirname(__file__), "Fare Matrix.xlsx")
STATIONS_PATH = os.path.join(os.path.dirname(__file__), "Location.xlsx")

fare_matrix = pd.read_excel(FARE_PATH)
stations_df = pd.read_excel(STATIONS_PATH)

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

@app.route('/chat_guj', methods=['POST'])
@app.route('/api/chat_guj', methods=['POST'])
def guj_chat():
    return handle_guj_chat()

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
