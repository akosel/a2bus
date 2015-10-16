# a2bus

### Background on the problem
I love Ann Arbor. As with any thing in existence, it's got its flaws, but overall it does a lot of things well for a midsize, Midwestern town. As a specific example, the Ann Arbor bus system is great. I remember riding it home after my seventh hour during my freshmen year at Huron High School. I remember taking it to and from work over the Summer. Technology has changed, and the buses have been able to provide better data. The Ann Arbor Transit Authority (AATA) has done a nice job of making that data available, but I've always wanted to make it easier to use. This is to make it easier to use.

### The Solution
As a part of [Hack the Block](http://hacktheblock.devpost.com/) I went ahead and developed a solution. A central part of the problem is that there are (broadly) two types of users: experts and novices. Experts (typically) know exactly what bus they want to take. On the other hand, novices don't know a lot about the routes that are available. This app specifically caters to the novice, but also offers benefits to the experts. 

The novice wants to know how to get form point A to point B at a certain point in time. This can be accomplished without filling out forms. A user can open the Ann Arbus page--very easily if they save the site to their home screen--and get directions by dragging the destination marker to wherever they want to go. Simple directions will be displayed directly on the map, and more verbose directions are available "behind" the map (views toggled via a quick button push).


### How it works
Ann Arbus uses ObjectRocket's Redis service. Specifically, Redis' ZSET is used to store latitude's and longitude's by converting them to a single value using the Geohash algorithm. (Technically, this will be available in the GeoRedis commands, but those are still on the unstable branch). From that point, it's fast to look up the stops near a user based on their current location (provided through the HTML5 Geolocation API). Knowing the bus stops near the user makes it easy to bootstrap the page with information about the most-likely-to-be-relevant buses. Additionally, information about nearby bus stops can be improving by hooking into the location updates the AATA provides. This is largely beneficial in letting users know when their bus is late. That information can be especially useful on cold, winter mornings when time spent waiting outside for a bus can get uncomfortable.

Additionally, Ann Arbus leverages the Google Maps API. Using this, it's easy to plot the nearby stops on the map as well as providing a simple interface into Google's directions API. Google's directions API provides transit specific directions. Dragging the origin or destination markers will trigger a directions query that is displayed to the user in short order. Additionally, once the user plots a route, any buses that are associated with that route are plotted on the map. Users can then see exactly where their bus is, as well as how far ahead of (or behind) schedule a bus is.

### How to set it up

First off, this uses Python (2.7.6), node(0.10.25), and gulp (3.9.0). Additionally, if you want any of the redis-based data to work, you will need to run that locally or provide a remote url in a config file.

With those prerequisites met, run `make`, and that should take care of bootstrapping the development environment. A development environment can then be run with `npm start`, which will start a local server on port 8000. This will spin up a GeventWebSocketWorker to handle the websockets connection.
