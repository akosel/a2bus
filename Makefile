CFLAGS=-std=c99

all: node_modules venv

node_modules: package.json
	npm install

venv: requirements.txt
	virtualenv venv
	venv/bin/pip install -r requirements.txt
