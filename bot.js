const Discord = require('discord.js');
const { YoutubeDataAPI } = require("youtube-v3-api")
const {
	prefix,
	token,
} = require('./config.json');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
const queue = new Map();
const youtube = new YoutubeDataAPI(process.env.YT_API_KEY);

client.once('ready', () => {
	console.log('Ready!');
});

client.once('reconnecting', () => {
	console.log('Reconnecting!');
});

client.once('disconnect', () => {
	console.log('Disconnect!');
});

client.on('message', async message => {
	if (message.author.bot) return;
	if (!message.content.startsWith(prefix)) return;

	const serverQueue = queue.get(message.guild.id);

	if (message.content.startsWith(`${prefix}play`)) {
		execute(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	} else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
		return;
	} if (message.content.startsWith(`${prefix}search`)) {
		search(message, serverQueue);
		return;
	} else {
		message.channel.send('You need to enter a valid command!')
	}
});

async function execute(message, serverQueue) {
	var args = null;
	if(message.content)
		args = message.content.split(' ');
	else if(typeof message === 'string')
		args = message.split(' ');

	const voiceChannel = message.member.voiceChannel;
	if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
		return message.channel.send('I need the permissions to join and speak in your voice channel!');
	}

	const songInfo = await ytdl.getInfo(args[1]);
	const song = {
		title: songInfo.title,
		url: songInfo.video_url,
	};

	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 3,
			playing: true,
		};

		queue.set(message.guild.id, queueContruct);

		queueContruct.songs.push(song);

		try {
			var connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	} else {
		serverQueue.songs.push(song);
		console.log(serverQueue.songs);
		return message.channel.send(`*${song.title}* has been added to the queue!`);
	}
}

async function search(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to search the music!');
	var args = message.content.split(' ');
	args.splice(0, 1);
	const query = args.join(" ");
	youtube.searchAll(query, 1, {type: 'video'}).then((data) => {
		if(data.items[0]) {
			console.log("Found video: " + data.items[0].id.videoId);
			message.content = "!play https://www.youtube.com/watch?v=" + data.items[0].id.videoId;
			execute(message, serverQueue);
		} else
			return message.channel.send(`No video found.`);
	},(err) => {
		console.error(err);
	})
}

function skip(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
	if (!serverQueue) return message.channel.send('There is no song that I could skip!');
	serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
	if (!message.member.voiceChannel) return message.channel.send('You have to be in a voice channel to stop the music!');
	serverQueue.songs = [];
	serverQueue.connection.dispatcher.end();
}

async function play(guild, song) {
    const serverQueue = await queue.get(guild.id);

    if (!song) {
        await serverQueue.voiceChannel.leave();
        await queue.delete(guild.id);
        return;
    }

    const stream = await ytdl(song.url, {
        filter: 'audioonly'
    });
    const dispatcher = await serverQueue.connection.playStream(stream)
        .on('end', async reason => {
            if (reason === 'Stream is not generating quickly enough.')
            serverQueue.songs.shift('Stream is not generating quickly enough');
            await play(guild, serverQueue.songs[0]);
        })
        .on('error', error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

client.login(process.env.BOT_TOKEN);
