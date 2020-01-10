const { YoutubeDataAPI } = require("youtube-v3-api")
const youtube = new YoutubeDataAPI("AIzaSyB7h7UOce2GxI3JD6_wB4TQVeFIhpMbnDY");

	var args = "!search mahmood barrio".split(' ');
	args.splice(0, 1);
	const query = args.join(" ");
	console.log(query);
	youtube.searchAll(query, 1, {type: 'video'}).then((data) => {
		if(data.items[0])
		console.log(data.items[0].id.videoId);
	},(err) => {
		console.error(err);
	})