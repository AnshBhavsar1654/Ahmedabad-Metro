# Ahmedabad Metro

Transforming Urban Transit with Seamless Innovation

---

### Built With

This project utilizes the following tools and technologies:

* **Languages & Frameworks**: 
  <img src="https://img.icons8.com/color/48/000000/javascript.png" alt="JavaScript" width="20"/> JavaScript, 
  <img src="https://img.icons8.com/color/48/000000/python.png" alt="Python" width="20"/> Python, 
  <img src="https://img.icons8.com/color/48/000000/flask.png" alt="Flask" width="20"/> Flask, 
  <img src="https://img.icons8.com/color/48/000000/react-native.png" alt="React" width="20"/> React
* **Libraries**: 
  <img src="https://img.icons8.com/?size=48&id=O6F7vCrV9m8N&format=png" alt="Leaflet" width="20"/> Leaflet, 
  <img src="https://img.icons8.com/?size=48&id=xV1WiP0QvAp0&format=png" alt="Pandas" width="20"/> Pandas, 
  <img src="https://img.icons8.com/?size=48&id=9Kvi1p1F0tKO&format=png" alt="Axios" width="20"/> Axios
* **Build Tools**: 
  <img src="https://img.icons8.com/color/48/000000/npm.png" alt="npm" width="20"/> npm, 
  <img src="https://img.icons8.com/?size=48&id=77288&format=png" alt="Autoprefixer" width="20"/> Autoprefixer, 
  <img src="https://img.icons8.com/?size=48&id=39948&format=png" alt="PostCSS" width="20"/> PostCSS
* **Deployment**: 
  <img src="https://img.icons8.com/?size=48&id=22815&format=png" alt="Gunicorn" width="20"/> Gunicorn
* **Data Formats**: 
  <img src="https://img.icons8.com/color/48/000000/json.png" alt="JSON" width="20"/> JSON, 
  <img src="https://img.icons8.com/color/48/000000/markdown.png" alt="Markdown" width="20"/> Markdown, 
  <img src="https://img.icons8.com/color/48/000000/microsoft-excel.png" alt="xlsx" width="20"/> xlsx

---

### Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Getting Started](#getting-started)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Usage](#usage)
* [Testing](#testing)
* [Project Structure](#project-structure)
* [License](#license)

---

### Overview

**Ahmedabad-Metro** is an open-source developer toolkit designed to facilitate the creation of intelligent urban transit systems. It combines a robust backend API with an interactive frontend, enabling seamless data management, route planning, and user engagement.

---

### Features

* 🧭 **Route Finder**: Find the most efficient route from one station to another.
* 📍 **Nearby Stations**: Discover the 3 nearest metro stations based on your current location.
* 🏢 **Facilities Info**: Access detailed information about amenities and facilities available at all operational stations.
* 🗨️ **AI Chatbot**: A multilingual chatbot built using Botpress to answer metro-related queries with support for Gujarati language.
* 🗺️ **Metro Maps & Guides**: View and download official metro maps and route guides directly from the interface.
* 🕒 **Metro Schedule**: Real-time and static schedule viewing for all metro lines.
* ☎️ **Contact Page**: Easily reach out to metro support via the contact form or view available communication channels.
* 🔧 **Modular API**: RESTful endpoints for fare estimation, station info, and connectivity.

---

### Getting Started

Follow the steps below to get Ahmedabad-Metro up and running on your local machine.

#### Prerequisites

Make sure you have the following installed:

* <img src="https://img.icons8.com/color/48/000000/python.png" alt="Python" width="20"/> Python 3.7+
* <img src="https://img.icons8.com/color/48/000000/pip.png" alt="pip" width="20"/> pip
* <img src="https://img.icons8.com/color/48/000000/nodejs.png" alt="Node.js" width="20"/> Node.js (v14 or newer)
* <img src="https://img.icons8.com/color/48/000000/npm.png" alt="npm" width="20"/> npm or yarn

---

### Installation

#### Clone the Repository

```bash
git clone https://github.com/AnshBhavsar1654/Ahmedabad-Metro
cd Ahmedabad-Metro
```

#### Install Backend Dependencies (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Install Frontend Dependencies (React)

```bash
cd ../frontend
npm install
```

---

### Usage

#### Run the Backend Server

```bash
cd backend
python app.py  # or use Gunicorn for production
```

#### Run the Frontend App

```bash
cd frontend
npm start
```

---

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
