import geohash
import arrow
import datetime
import json
import os
import redis
import requests
import s3
import yaml
import time
import config
import googlemaps

BASE_URL = 'http://microapi.theride.org'

LNG_KEY = 'longitude'
LAT_KEY = 'lattitude' # (sic)
LAT_KEY_NEW = 'lat'

redis_url = config.REDIS_URL or 'redis://localhost:6379'
gmaps = googlemaps.Client(key=config.GMAPS_API_KEY)
try:
    api_redis = redis.from_url(redis_url)
    api_redis.ping()
    print 'Connected to redis in API'
except redis.ConnectionError as e:
    print 'ERROR', e
    api_redis = None

def get_stops_on_routes():
    r = requests.get('{0}/StopsOnRoute'.format(BASE_URL))
    return r.json()

def get_stops_on_route(route):
    r = requests.get('{0}/StopsOnRoute/{1}'.format(BASE_URL, route))
    return r.json()

def get_bus_locations():
    r = requests.get('{0}/Location'.format(BASE_URL))
    locations = r.json()
    for location in locations:
        raw_lat = location.get(LAT_KEY) or location.get(LAT_KEY_NEW)
        raw_lng = location.get(LNG_KEY)
        location['lat'] = get_parsed_coordinate(raw_lat)
        location['lng'] = get_parsed_coordinate(raw_lng)
    return r.json()

def get_bus_location(route):
    r = requests.get('{0}/Location/{1}'.format(BASE_URL, route))
    return r.json()

def get_route_names():
    r = requests.get('{0}/RouteNames'.format(BASE_URL))
    return r.json()

# Dumb parser for their format without a dot. Note, this works because of the
# predictable range of latitudes and longitudes in Ann Arbor, but would fail for
# lower numbers
def get_parsed_coordinate(coordinate):
    if type(coordinate) == int:
        coordinate = str(coordinate)
    dot_idx = 2
    if coordinate.startswith('-'):
        dot_idx = 3

    return float(coordinate[:dot_idx] + '.' + coordinate[dot_idx:])

def get_expected_crossing_time(crossing_time, offset, as_arrow=True):
    crossing_time_format = 'H:mm A'
    new_time = arrow.get(crossing_time, crossing_time_format) + datetime.timedelta(minutes=offset)
    if not as_arrow:
        return new_time.format(crossing_time_format)
    return new_time

def get_parsed_key(key):
    key_list = key.split('.')
    return { 'abbreviation': key_list[0], 'stopID': key_list[1], 'directionID': int(key_list[2]), 'sequence': int(key_list[3]) }

def get_stop_from_timepoint(timepoint):
    prefix = '{0}.{1}*'.format(timepoint['routeAbbr'], timepoint['timePointStopID'])
    key_list = api_redis.keys(prefix)
    if len(key_list) > 1:
        for key in key_list:
            stop = yaml.safe_load(api_redis.get(key))
            if stop['directionName'] == timepoint['routeDirection']:
                return key
    return key_list[0]

def get_ordered_stops(route, direction):
    glob = '{}.*.{}.*'.format(route, direction)
    keys = api_redis.keys(glob)

    sorted_keys = sorted(keys, key=lambda key: get_parsed_key(key)['sequence'])

    stop_keys = []
    for key in sorted_keys:
        stop_keys.append(yaml.safe_load(api_redis.get(key)))
    return stop_keys

def get_coordinates_tuple(stop):
    return (stop['lat'], stop['lng'])

def get_chunk_obj(chunk_list):
    if len(chunk_list) == 1:
        return None
    elif len(chunk_list) >= 3:
        waypoints = [get_coordinates_tuple(stop) for stop in chunk_list[1:-1]]
    elif len(chunk_list) == 2:
        waypoints = []

    assert len(waypoints) <= 8, 'Too many waypoints {} {}'.format(len(waypoints), waypoints)
    return { 'origin': get_coordinates_tuple(chunk_list[0]), 'waypoints': waypoints, 'destination': get_coordinates_tuple(chunk_list[-1]) }

def get_chunk_list(chunk_list):
    pivot = len(chunk_list) / 2

    # +1 is necessary to fill in for times we are not given
    halves = [chunk_list[:pivot + 1], chunk_list[pivot:]]

    return [get_chunk_obj(half) for half in halves]


def get_directions(waypoint_chunks):
    direction_list = []
    for chunk in waypoint_chunks:
        directions = gmaps.directions(chunk.get('origin'), chunk.get('destination'), waypoints=chunk.get('waypoints'))
        direction_list.append(directions)
    return direction_list

def get_waypoint_chunks(stops):
    waypoints = []
    chunk = []
    for stop in stops:
        if stop.get('isTimePoint'):
            if chunk:
                if len(chunk) > 8:
                    chunk_list = get_chunk_list(chunk)
                    waypoints.extend(chunk_list)
                else:
                    chunk_obj = get_chunk_obj(chunk)
                    if chunk_obj:
                        waypoints.append(chunk_obj)
            chunk = []
        chunk.append(stop)
    return waypoints

def get_last_locations():
    return yaml.safe_load(api_redis.get('locations.last'))

# Debugging tool
def replay_period():
    start = arrow.Arrow(year=2015, month=9, day=25, hour=9)
    end = arrow.Arrow(year=2015, month=9, day=25, hour=10)
    for r in arrow.Arrow.range('minute', start, end):
        locations = get_historical_data(year=r.year, month=r.month, day=r.day, hour=r.hour, minute=r.minute)
        set_last_locations(locations)
        yield locations
        time.sleep(60)



def get_historical_data(year='2015', month='09', day='25', hour='09', minute='', second='', modulo=6):
    if type(day) == int:
        day = str(day).zfill(2)

    if type(hour) == int:
        hour = str(hour).zfill(2)

    if type(month) == int:
        month = str(month).zfill(2)

    if type(minute) == int:
        minute = str(minute).zfill(2)

    if type(second) == int:
        second = str(second).zfill(2)

    prefix = 'locations.{0}{1}{2}T{3}{4}{5}'.format(year, month, day, hour, minute, second)

    key_list = s3.get_list_of_keys(prefix)
    location_dict = {}
    idx = 0
    for key in key_list:
        if idx % modulo == 0:
            location_dict[key.key] = key.get_contents_as_string()
        idx += 1
    location_values = [v for location_list in location_dict.values() for v in yaml.safe_load(location_list)]
    return location_values

def get_stop_details(stops):
    pipe = api_redis.pipeline(transaction=False)
    for stop in stops:
        pipe.get(stop)

    stops = pipe.execute()
    return [yaml.safe_load(stop) for stop in stops]

def get_nearest_stops(key, lng, lat, radius=150, units='m', with_dist=False, with_coord=False, with_hash=False, sort=None):
    if not api_redis.exists('locations'):
        set_cache_stops()
    pieces = [key, lng, lat, radius, units]

    # XXX Can modify precision based on user radius. Default to 36 (~150m)
    ranges = geohash.expand_uint64(geohash.encode_uint64(float(lat), float(lng)), precision=36)

    # XXX This has no affect at this time
    if with_dist:
        pieces.append('WITHDIST')
    if with_coord:
        pieces.append('WITHCOORD')
    if with_hash:
        pieces.append('WITHHASH')
    if sort:
        pieces.append(sort)

    # TODO Some day this can be done with the Geo Redis commands
    pipe = api_redis.pipeline(transaction=False)
    for r in ranges:
        pipe.zrangebyscore(key, r[0], r[1])

    # TODO This will require some intermediate steps if scores are returned
    stops = [stop for stop_list in pipe.execute() for stop in stop_list]
    # TODO Implement filtering by radius and units
    return get_stop_details(stops)

def set_expected_crossing_time(timepoint, pipeline=None):
    stop_key = get_stop_from_timepoint(timepoint)
    stop = yaml.safe_load(api_redis.get(stop_key))
    expected_crossing_time = get_expected_crossing_time(timepoint['crossingTime'], timepoint['adherence'])
    if 'expectedCrossingMinutes' not in stop:
        stop['expectedCrossingMinutes'] = []

    time = expected_crossing_time.format('H:mm')
    if time not in stop['expectedCrossingMinutes']:
        stop['expectedCrossingMinutes'].append(time)

    if pipeline:
        pipeline.set(stop_key, yaml.safe_dump(stop))
    else:
        api_redis.set(stop_key, yaml.safe_dump(stop))


def set_expected_crossing_times(locations):
    pipe = api_redis.pipeline(transaction=False)
    for location in locations:
        set_expected_crossing_time(location, pipeline=pipe)

    pipe.execute()

def set_interpolated_crossing_times():
    route_names = [route['routeAbbr'] for route in get_route_names()]

    for route in route_names:
        set_interpolated_crossing_time(route, 0)
        set_interpolated_crossing_time(route, 1)

# XXX This is very flimsy. Much room for improvement, but works for now
def set_interpolated_crossing_time(route, direction):
    crossing_time_format = 'H:mm'
    stops = get_ordered_stops(route, direction)
    chunks = get_waypoint_chunks(stops)
    directions = get_directions(chunks)
    direction_times = [direction['duration']['value'] for dl in directions for direction in dl[0]['legs']]
    direction_idx = 0

    pipe = api_redis.pipeline(transaction=False)

    for stop in stops:
        key_format = '{0}.{1}.{2}.{3}'
        key = key_format.format(stop['abbreviation'], stop['stopID'], stop['directionID'], stop['sequence'])

        if stop.get('isTimePoint'):
            base_times = stop.get('expectedCrossingMinutes', [])
            seconds = 0
        else:
            seconds += direction_times[direction_idx]
            offset = datetime.timedelta(seconds=seconds)
            stop['expectedCrossingMinutes'] = [(arrow.get(time, crossing_time_format) + offset).format(crossing_time_format) for time in base_times]
            direction_idx += 1
        pipe.set(key, stop)

    # Given how frail this is, bail if there is a mismatch
    assert len(direction_times) == direction_idx, 'Direction times do not match up (route {})'.format(route)
    pipe.execute()


def set_last_locations(locations):
    set_expected_crossing_times(locations)
    api_redis.setex('locations.last', yaml.safe_dump(locations), 300)

def set_cache_stops():
    stops = get_stops_on_routes()
    key = '{0}.{1}.{2}.{3}'
    pipe = api_redis.pipeline(transaction=False)
    for stop in stops:
        stop['lat'], stop['lng'] = get_parsed_coordinate(stop[LAT_KEY]), get_parsed_coordinate(stop[LNG_KEY])
        pipe.set(key.format(stop['abbreviation'], stop['stopID'], stop['directionID'], stop['sequence']), yaml.safe_dump(stop))
        # TODO Some day this can be done with the Geo Redis commands
        pipe.zadd('locations', key.format(stop['abbreviation'], stop['stopID'], stop['directionID'], stop['sequence']), geohash.encode_uint64(stop['lat'], stop['lng']))
    pipe.execute()
