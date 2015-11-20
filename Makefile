# Requires node, python, virtualenv, and gulp (globally installed via npm)
# Should add targets for those at some point
TOP := $(dir $(lastword $(MAKEFILE_LIST)))

all: node_modules venv dist

node_modules: package.json
	npm install

venv: requirements.txt
	virtualenv venv
	CFLAGS="-std=c99" venv/bin/pip install -r requirements.txt
	venv/bin/pip install python-geohash

dist: gulpfile.js
	mkdir -p $(TOP)dist/icons
	mkdir -p $(TOP)dist/fonts
	cp $(TOP)project/client/icons/* $(TOP)dist/icons
	cp $(TOP)project/client/fonts/* $(TOP)dist/fonts
	gulp build

install: dist/bundle.js dist/stylesheet.css
	cp -r $(TOP) /var/local

clean:
	rm -rf venv
	rm -rf node_modules
