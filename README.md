# Ahmedabad Metro

Transforming Urban Transit with Seamless Innovation

---

### Built With

This project utilizes the following tools and technologies:

* **Languages & Frameworks**: JavaScript, Python, Flask, React
* **Libraries**: Leaflet, Pandas, Axios
* **Build Tools**: npm, Autoprefixer, PostCSS
* **Deployment**: Gunicorn
* **Data Formats**: JSON, Markdown, xlsx

---

### Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Live Demo](#live-demo)
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

### Live Demo

The project is live at [https://ahmedabad-metro-frontend.vercel.app/](https://ahmedabad-metro-frontend.vercel.app/).

---

### Getting Started

Follow the steps below to get Ahmedabad-Metro up and running on your local machine.

#### Prerequisites

Make sure you have the following installed:

* Python 3.7+
* pip
* Node.js (v14 or newer)
* npm or yarn

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
