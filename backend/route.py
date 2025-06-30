import os
import pandas as pd
from math import radians, sin, cos, sqrt, atan2

# Load station data
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

# Define metro lines
line1 = ["APMC", "Jivraj Park", "Rajivnagar", "Shreyas", "Paldi", "Gandhigram", "Old High Court", "Usmanpura", "Vijaynagar", "Vadaj", "Ranip", "Sabarmati Railway Station", "AEC", "Sabarmati", "Motera Stadium"]
line2 = ["Thaltej Gam", "Thaltej", "Doordarshan Kendra", "Gurukul Road", "Gujarat University", "Commerce Six Road", "SP Stadium", "Old High Court", "Shahpur", "Ghee Kanta", "Kalupur Railway Station", "Kankaria East", "Apparel Park", "Amraivadi", "Rabari Colony", "Vastral", "Nirant Cross Road", "Vastral Gam"]
line3 = ["Motera Stadium", "Koteshwar Road", "Vishvakarma College", "Tapovan Circle", "Narmada Canal", "Koba Circle", "Juna Koba", "Koba Gam", "GNLU", "Raysan", "Randesan", "Dholakuva Circle", "Infocity", "Sector-1", "Sector-10A", "Sachivalaya", "Akshardham", "Juna Sachivalaya", "Sector-16", "Sector-24", "Mahatma Mandir"]
line4 = ["GNLU", "PDEU", "GIFT City"]

lines = [line1, line2, line3, line4]
colors = ["Red Line", "Blue Line", "Yellow Line", "Violet Line"]

# Create station mapping with all lines each station belongs to
station_map = {}
for line_num, line in enumerate([line1, line2, line3, line4], 1):
    for station in line:
        if station not in station_map:
            station_map[station] = {
                'name': station,
                'lines': set()
            }
        station_map[station]['lines'].add(line_num)

# Define interchange stations between lines
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
    """Calculate distance between two points using Haversine formula"""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a)) 
    r = 6371  # Earth radius in km
    return c * r

def get_station_coords(station_name):
    """Get coordinates of a station"""
    if station_name in station_coords:
        return station_coords[station_name]
    return None

def calculate_segment_distance(route_segment):
    """Calculate total distance for a route segment"""
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

def get_line_number(station):
    """Get primary line number for a station (for routing)"""
    if station in station_map:
        # Return first line found (for routing purposes)
        return next(iter(station_map[station]['lines']))
    raise ValueError(f"Station {station} not found")

def get_route_same_line(line, source, destination):
    """Get route when source and destination are on the same line"""
    lines_list = [line1, line2, line3, line4]
    line_index = line - 1
    current_line = lines_list[line_index]
    
    start = current_line.index(source)
    end = current_line.index(destination)
    
    if start <= end:
        return current_line[start:end+1]
    else:
        return current_line[end:start+1][::-1]

def find_route_logic(source, destination):
    """Main routing logic"""
    src_line = get_line_number(source)
    dest_line = get_line_number(destination)
    
    # If same line, simple case
    if src_line == dest_line:
        return get_route_same_line(src_line, source, destination), []

    # Find interchange stations between lines
    interchange_key = (src_line, dest_line)
    interchange_path = interchange_map.get(interchange_key, [])
    
    if not interchange_path:
        return [], []
    
    full_route = []
    current_line = src_line
    current_station = source
    interchanges_used = []
    
    # Build route through interchanges
    for interchange in interchange_path:
        segment = get_route_same_line(current_line, current_station, interchange)
        # Don't include last station (interchange) to avoid duplication
        full_route.extend(segment[:-1])
        
        # Find next line
        next_line = None
        for i, line in enumerate([line1, line2, line3, line4], 1):
            if i != current_line and interchange in line:
                next_line = i
                break
        
        if next_line is None:
            raise ValueError(f"Cannot find next line for interchange {interchange}")
        
        interchanges_used.append(interchange)
        current_line = next_line
        current_station = interchange
    
    # Add final segment
    final_segment = get_route_same_line(current_line, current_station, destination)
    full_route.extend(final_segment)
    return full_route, interchanges_used

def get_common_line(stationA, stationB):
    """Find the common line between two consecutive stations"""
    if stationA not in station_map or stationB not in station_map:
        return None
        
    # Find lines that both stations share
    common_lines = station_map[stationA]['lines'] & station_map[stationB]['lines']
    if not common_lines:
        return None
        
    # Check if stations are consecutive in any common line
    for line_num in common_lines:
        line = [line1, line2, line3, line4][line_num-1]
        try:
            idxA = line.index(stationA)
            idxB = line.index(stationB)
            if abs(idxA - idxB) == 1:
                return line_num
        except ValueError:
            continue
    return None

def generate_route_instructions(route):
    """Generate route instructions with line colors at source and interchanges"""
    if not route:
        return []
    
    instructions = []
    
    # Determine line for each station segment
    line_for_station = []
    
    if len(route) == 1:
        # Only one station - use any line it belongs to
        line_for_station.append(next(iter(station_map[route[0]]['lines'])))
    else:
        # For first station, use the line shared with next station
        first_line = get_common_line(route[0], route[1])
        if first_line is None:
            first_line = next(iter(station_map[route[0]]['lines']))
        line_for_station.append(first_line)
        
        # For middle stations, use the line shared with next station
        for i in range(1, len(route)-1):
            line_num = get_common_line(route[i], route[i+1])
            if line_num is None:
                # If no common line with next, use current line
                line_num = line_for_station[-1]
            line_for_station.append(line_num)
        
        # For last station, use the same line as previous
        line_for_station.append(line_for_station[-1])
    
    # Generate instructions
    for i, station in enumerate(route):
        station_line = line_for_station[i]
        
        if i == 0:
            # Starting station
            instruction = f"Start at {station} (Take {colors[station_line-1]})"
            instructions.append(instruction)
        else:
            prev_line = line_for_station[i-1]
            if station_line != prev_line:
                # Line change at interchange station
                instruction = f"{station} (Change from {colors[prev_line-1]} to {colors[station_line-1]})"
                instructions.append(instruction)
            else:
                # Regular station
                instructions.append(station)
    
    return instructions

def get_all_stations():
    """Get list of all stations"""
    all_stations = list(set(line1 + line2 + line3 + line4))
    return sorted(all_stations)

def calculate_route_details(source, destination):
    """Calculate complete route details"""
    actual_source = source.strip()
    actual_destination = destination.strip()
    
    if actual_source not in station_map:
        return {
            "route": [],
            "interchanges": [],
            "distance": 0,
            "instructions": [],
            "error": f"Station '{source}' not found"
        }
    
    if actual_destination not in station_map:
        return {
            "route": [],
            "interchanges": [],
            "distance": 0,
            "instructions": [],
            "error": f"Station '{destination}' not found"
        }
    
    try:
        route, interchanges = find_route_logic(actual_source, actual_destination)
        filtered_interchanges = [
            ic for ic in interchanges 
            if ic != actual_source and ic != actual_destination
        ]
        total_distance = calculate_segment_distance(route)
        instructions = generate_route_instructions(route)
        
        return {
            "route": route,
            "interchanges": filtered_interchanges,
            "distance": round(total_distance, 2),
            "instructions": instructions,
            "error": None
        }
    except Exception as e:
        return {
            "route": [],
            "interchanges": [],
            "distance": 0,
            "instructions": [],
            "error": f"Route error: {str(e)}"
        }
