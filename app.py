#----------------------------------------------------------------------------#
# Imports
#----------------------------------------------------------------------------#

from flask import Flask, render_template, request
from flask_sockets import Sockets
# from flask.ext.sqlalchemy import SQLAlchemy
import logging
from logging import Formatter, FileHandler
import json
import os
import redis
import api
import gevent
import s3
import time

#----------------------------------------------------------------------------#
# App Config.
#----------------------------------------------------------------------------#

app = Flask(__name__)
sockets = Sockets(app)
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
try:
    r = redis.from_url(redis_url)
    r.ping()
    print 'Connected to redis'
except redis.ConnectionError as e:
    print 'ERROR', e
    r = None 


REDIS_CHAN = 'chat'

class ChatBackend(object):
    """Interface for registering and updating WebSocket clients."""

    def __init__(self):
        self.clients = list()
        self.pubsub = r.pubsub()
        self.pubsub.subscribe(REDIS_CHAN)

    def __iter_data(self):
        for message in self.pubsub.listen():
            data = message.get('data')
            if message['type'] == 'message':
                app.logger.info(u'Sending message: {}'.format(data))
                yield data

    def register(self, client):
        """Register a WebSocket connection for Redis updates."""
        print 'Registering new client', client
        self.clients.append(client)

    def send(self, client, data):
        """Send given data to the registered client.
        Automatically discards invalid connections."""
        try:
            client.send(data)
        except Exception:
            self.clients.remove(client)

    def update(self):
        while True:
            location_data = api.get_bus_locations()
            print 'Updating', location_data
            for client in self.clients:
                gevent.spawn(self.send, client, json.dumps(location_data))

            if location_data:
                s3.update_list('locations', location_data)
                s3.save_list('locations.{0}'.format(time.strftime('%Y%m%dT%H%M%S')), location_data)
                api.set_last_locations(location_data)
            time.sleep(1)

    def run(self):
        """Listens for new messages in Redis, and sends them to clients."""
        for data in self.__iter_data():
            for client in self.clients:
                gevent.spawn(self.send, client, data)

    def start(self):
        """Maintains Redis subscription in the background."""
        gevent.spawn(self.run)
        gevent.spawn(self.update)

chats = ChatBackend()
chats.start()

#----------------------------------------------------------------------------#
# Controllers.
#----------------------------------------------------------------------------#

@app.route('/')
def home():
    return render_template('pages/home.html')

@app.route('/api/v1.0/routenames')
def get_route_names():
    return json.dumps(api.get_route_names())

@app.route('/api/v1.0/nearbystops')
def get_nearby_stops():
    pieces = [request.args.get('lng', ''), request.args.get('lat', ''), request.args.get('radius', 100), request.args.get('units', 'm')]
    stops = api.get_nearest_stops('locations', *pieces)
    return json.dumps(stops)

@app.route('/api/v1.0/lastlocations')
def get_last_locations():
    return json.dumps(api.get_last_locations())

@app.route('/api/v1.0/location')
def get_bus_locations():
    return json.dumps(api.get_bus_locations())

@app.route('/api/v1.0/location/<route>')
def get_bus_location(route):
    return json.dumps(api.get_bus_location(route))

@sockets.route('/send')
def inbox(ws):
    """Receives incoming chat messages, inserts them into Redis."""
    while True:
        # Sleep to prevent *contstant* context-switches.
        gevent.sleep(0.1)
        message = ws.receive()

        if message:
            app.logger.info(u'Inserting message: {}'.format(message))
            r.publish(REDIS_CHAN, message)

@sockets.route('/receive')
def outbox(ws):
    """Sends outgoing chat messages, via `ChatBackend`."""
    chats.register(ws)

    while True:
        # Context switch while `ChatBackend.start` is running in the background.
        gevent.sleep()

# Error handlers.


#@app.errorhandler(500)
#def internal_error(error):
#    #db_session.rollback()
#    return {}#render_template('errors/500.html'), 500
#
#
#@app.errorhandler(404)
#def not_found_error(error):
#    return {}#render_template('errors/404.html'), 404

if not app.debug:
    file_handler = FileHandler('error.log')
    file_handler.setFormatter(
        Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
    )
    app.logger.setLevel(logging.INFO)
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.info('errors')

#----------------------------------------------------------------------------#
# Launch.
#----------------------------------------------------------------------------#

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    socketio.run(host='0.0.0.0', port=port)
