"""The metro itself: network and fares, timetable, nearby stations, visit counter, keep-alive."""
from pathlib import Path

# Data files: the Excel sources, the network built from them, the timetable and the chatbot's knowledge base.
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
