const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class Movie extends Command {
  constructor (client) {
    super(client, {
      name: 'movie',
      description: 'View information on a movie from TMDb',
      usage: 'movie <movie>',
      category: 'Search',
      aliases: ['tmdb-movie']
    });
  }

  async run (msg, text) {
    const p = msg.settings.prefix;
    const query = text.join(' ');

    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${p}movie <movie search>`);

    try {
      const search = await fetch
        .get('http://api.themoviedb.org/3/search/movie')
        .query({
          api_key: this.client.config.TMDb,
          include_adult: msg.channel.nsfw || false,
          query
        });

      if (!search.body.results.length) return msg.say('Could not find any results.');
      const find = search.body.results.find(m => m.title.toLowerCase() === query.toLowerCase()) || search.body.results[0];

      const { body } = await fetch
        .get(`https://api.themoviedb.org/3/movie/${find.id}`)
        .query({ api_key: this.client.config.TMDb });

      const embed = new DiscordJS.MessageEmbed()
        .setColor('0099CC')
        .setTitle(body.title)
        .setURL(`https://www.themoviedb.org/movie/${body.id}`)
        .setAuthor({ name: 'TMDb', iconURL: 'https://i.imgur.com/3K3QMv9.png', url: 'https://www.themoviedb.org/' })
        .setDescription(body.overview ? body.overview.slice(0, 2048) : 'No description available.')
        .setThumbnail(body.poster_path ? `https://image.tmdb.org/t/p/w500${body.poster_path}` : null)
        .addField('Runtime', body.runtime ? `${body.runtime} mins.` : '???', true)
        .addField('Release Date', body.release_date || '???', true)
        .addField('Genres', body.genres.length ? body.genres.map(genre => genre.name).join(', ') : '???')
        .addField('Production Companies', body.production_companies.length ? body.production_companies.map(c => c.name).join(', ') : '???');

      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      return msg.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
    }
  }
}
module.exports = Movie;
