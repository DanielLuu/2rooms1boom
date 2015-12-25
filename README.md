# Meteor 2 Rooms 1 Boom

2 Rooms 1 Boom on your mobile device!

This is the code that currently runs [http://2Rooms1Boom.meteor.com](http://2 Rooms1Boom.meteor.com). It's a simple site I've built as a learning project, so definitely don't use it as an example of Meteor best practices. Pull requests welcome!

## Disclaimer

[Two Rooms and a Boom](http://tuesdayknightgames.com/tworoomsandaboom/' target='_blank'>Two Rooms and a Boom) is a party game designed by  Alan Gerding. This is an unofficial fan project designed to complement the physical game, and is not endorsed in any way by the designer or publisher.

## Running your own instance with custom locations

[Install meteor](https://www.meteor.com/install)

Clone the repository:

	git clone https://github.com/DanielLuu/2rooms1boom ./2Rooms1Boom

Enter the 2Rooms1Boom directory:

	cd 2Rooms1Boom/2Rooms1Boom

Edit the locations file as required:

	nano lib/locations.js

Run the meteor server to test locally:

	meteor --settings settings/example.json

Make a production settings file:

	cp settings/example.json settings/production.json
	nano settings/production.json  # Edit as required

Deploy to meteor:

	meteor deploy myurl.meteor.com --settings settings/production.json