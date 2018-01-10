

from flask import Flask 

app = Flask(__name__)

@app.route("/")
def root():
    return "The most basic ass server rn"
