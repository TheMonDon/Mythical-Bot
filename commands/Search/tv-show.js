const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const fetch = require('node-superfetch');

class TVShow extends Command {
  constructor (client) {
    super(client, {
      name: 'tv-show',
      description: 'View information on a tv-show from TMDb',
      usage: 'tv-show <show>',
      category: 'Search',
      aliases: ['tvshow', 'tv']
    });
  }

  async run (msg, text) {
    const p = msg.settings.prefix;
    const query = text.join(' ');

    if (!query || query.length < 1) return msg.channel.send(`Incorrect Usage: ${p}tv-show <show>`);

    try {
      const search = await fetch
        .get('http://api.themoviedb.org/3/search/tv')
        .query({
          api_key: this.client.config.TMDb,
          include_adult: msg.channel.nsfw || false,
          query
        });

      if (!search.body.results.length) return msg.say('Could not find any results.');
      const find = search.body.results.find(m => m.name.toLowerCase() === query.toLowerCase()) || search.body.results[0];

      const { body } = await fetch
        .get(`https://api.themoviedb.org/3/tv/${find.id}`)
        .query({ api_key: this.client.config.TMDb });

      const embed = new DiscordJS.EmbedBuilder()
        .setColor('0099CC')
        .setTitle(body.name)
        .setURL(`https://www.themoviedb.org/tv/${body.id}`)
        .setAuthor({ name: 'TMDb', iconURL: 'https://i.imgur.com/3K3QMv9.png', url: 'https://www.themoviedb.org/' })
        .setDescription(body.overview ? body.overview.slice(0, 2048) : 'No description available.')
        .setThumbnail(body.poster_path ? `https://image.tmdb.org/t/p/w500${body.poster_path}` : null)
        .addField('❯ First Air Date', body.first_air_date || '???', true)
        .addField('❯ Last Air Date', body.last_air_date || '???', true)
        .addField('❯ Seasons', body.number_of_seasons ? body.number_of_seasons.toLocaleString() : '???', true)
        .addField('❯ Episodes', body.number_of_episodes ? body.number_of_episodes.toLocaleString() : '???', true)
        .addField('❯ Genres', body.genres.length ? body.genres.map(genre => genre.name).join(', ') : '???')
        .addField('❯ Production Companies', body.production_companies.length ? body.production_companies.map(c => c.name).join(', ') : '???');

      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      return msg.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
    }
  }
}
module.exports = TVShow;
