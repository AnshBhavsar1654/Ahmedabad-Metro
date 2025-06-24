import os
import pandas as pd
from math import radians, sin, cos, sqrt, atan2

FILE_PATH = os.path.join(os.path.dirname(__file__), "Location.xlsx")
stations_df = pd.read_excel(FILE_PATH)

station_coords = {}
for _, row in stations_df.iterrows():
    station_name = row['Station'].strip()
    station_coords[station_name] = {
        'name': station_name,
        'lat': row['Latitude'],
        'lon': row['Longitude']
    }

line1 = ["APMC", "Jivraj Park", "Rajivnagar", "Shreyas", "Paldi", "Gandhigram", "Old High Court", "Usmanpura", "Vijaynagar", "Vadaj", "Ranip", "Sabarmati Railway Station", "AEC", "Sabarmati", "Motera Stadium"]
line2 = ["Thaltej Gam", "Thaltej", "Doordarshan Kendra", "Gurukul Road", "Gujarat University", "Commerce Six Road", "SP Stadium", "Old High Court", "Shahpur", "Ghee Kanta", "Kalupur Railway Station", "Kankaria East", "Apparel Park", "Amraivadi", "Rabari Colony", "Vastral", "Nirant Cross Road", "Vastral Gam"]
line3 = ["Motera Stadium", "Koteshwar Road", "Vishvakarma College", "Tapovan Circle", "Narmada Canal", "Koba Circle", "Juna Koba", "Koba Gam", "GNLU", "Raysan", "Randesan", "Dholakuva Circle", "Infocity", "Sector-1", "Sector-10A", "Sachivalaya", "Akshardham", "Juna Sachivalaya", "Sector-16", "Sector-24", "Mahatma Mandir"]
line4 = ["GNLU", "PDEU", "GIFT City"]

station_map = {}
for line_num, line in enumerate([line1, line2, line3, line4], 1):
    for station in line:
        station_map[station] = {
            'name': station,
            'line': line_num,
            'index': line.index(station)
        }

interchange_map = {
    (1, 2): ["Old High Court"],
    (1, 3): ["Motera Stadium"],
    (1, 4): ["Motera Stadium", "GNLU"],
    (2, 1): ["Old High Court"],
    (2, 3): ["Old High Court", "Motera Stadium"],
    (2, 4): ["Old High Court", "Motera Stadium", "GNLU"],
    (3, 1): ["Motera Stadium"],
    (3, 2): ["Motera Stadium", "Old High Court"],
    (3, 4): ["GNLU"],
    (4, 1): ["GNLU", "Motera Stadium"],
    (4, 2): ["GNLU", "Motera Stadium", "Old High Court"],
    (4, 3): ["GNLU"]
}

def haversine_distance(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a)) 
    r = 6371
    return c*r

def get_station_coords(station_name):
    if station_name in station_coords:
        return station_coords[station_name]
    return None

def calculate_segment_distance(route_segment):
    total_distance = 0.0
    if len(route_segment) < 2:
        return total_distance
    
    for i in range(len(route_segment)-1):
        station1 = route_segment[i]
        station2 = route_segment[i+1]
        coords1 = get_station_coords(station1)
        coords2 = get_station_coords(station2)
            
        if not coords1 or not coords2:
            continue
            
        distance = haversine_distance(
            coords1['lat'], coords1['lon'],
            coords2['lat'], coords2['lon']
        )
        total_distance += distance
    
    return total_distance

def get_all_stations():
    all_stations = list(set(line1 + line2 + line3 + line4))
    return sorted(all_stations)

def find_station(station_name):
    if station_name in station_map:
        return station_map[station_name]['name']
    return None

def get_line_number(station):
    if station in station_map:
        return station_map[station]['line']
    raise ValueError(f"Station {station} not found")

def get_route_same_line(line, source, destination):
    lines = [line1, line2, line3, line4]
    line_index = line - 1
    current_line = lines[line_index]
    
    start = current_line.index(source)
    end = current_line.index(destination)
    
    step = -1 if start > end else 1
    return current_line[start:end+step:step] if step > 0 else current_line[end:start+1][::-1]

def find_route_logic(source, destination):
    src_line = get_line_number(source)
    dest_line = get_line_number(destination)
    
    if src_line == dest_line:
        return get_route_same_line(src_line, source, destination), []

    interchange_key = (src_line, dest_line)
    interchange_path = interchange_map.get(interchange_key, [])
    
    if not interchange_path:
        return [], []
    
    full_route = []
    current_line = src_line
    current_station = source
    interchanges_used = []
    
    for interchange in interchange_path:
        segment = get_route_same_line(current_line, current_station, interchange)
        full_route.extend(segment[:-1] if segment else [])
        
        lines = [line1, line2, line3, line4]
        next_line = None
        
        for i, line in enumerate(lines, 1):
            if i != current_line and interchange in line:
                next_line = i
                break        
        if next_line is None:
            raise ValueError(f"Cannot find next line for interchange {interchange}")
        
        interchanges_used.append(interchange)
        current_line = next_line
        current_station = interchange
    
    final_segment = get_route_same_line(current_line, current_station, destination)
    full_route.extend(final_segment if final_segment else [])
    return full_route, interchanges_used

def calculate_route_details(source, destination):
    actual_source = find_station(source.strip())
    actual_destination = find_station(destination.strip())
    
    if not actual_source:
        return {
            "route": [],
            "interchanges": [],
            "distance": 0,
            "error": f"Station '{source}' not found"
        }
    
    if not actual_destination:
        return {
            "route": [],
            "interchanges": [],
            "distance": 0,
            "error": f"Station '{destination}' not found"
        }
    
    try:
        route, interchanges = find_route_logic(actual_source, actual_destination)
        filtered_interchanges = [
            ic for ic in interchanges 
            if ic != actual_source and ic != actual_destination
        ]
        total_distance = calculate_segment_distance(route)
        return {
            "route": route,
            "interchanges": filtered_interchanges,
            "distance": round(total_distance, 2),
            "error": None
        }
    except Exception as e:
        return {
            "route": [],
            "interchanges": [],
            "distance": 0,
            "error": f"Route error: {str(e)}"
        }
