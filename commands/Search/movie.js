const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const fetch = require('node-superfetch');

class Movie extends Command {
  constructor(client) {
    super(client, {
      name: 'movie',
      description: 'View information about a movie from TMDb',
      usage: 'movie <Movie>',
      category: 'Search',
      requiredArgs: 1,
    });
  }

  async run(msg, args) {
    const query = args.join(' ');

    try {
      const search = await fetch.get('http://api.themoviedb.org/3/search/movie').query({
        api_key: this.client.config.TMDb,
        include_adult: msg.channel.nsfw || false,
        query,
      });

      if (!search.body.results.length) return msg.channel.send('Could not find any results.');
      const find =
        search.body.results.find((m) => m.title.toLowerCase() === query.toLowerCase()) || search.body.results[0];

      const { body } = await fetch
        .get(`https://api.themoviedb.org/3/movie/${find.id}`)
        .query({ api_key: this.client.config.TMDb });

      const embed = new EmbedBuilder()
        .setColor(msg.settings.embedColor)
        .setTitle(body.title)
        .setURL(`https://www.themoviedb.org/movie/${body.id}`)
        .setAuthor({ name: 'TMDb', iconURL: 'https://i.imgur.com/3K3QMv9.png', url: 'https://www.themoviedb.org/' })
        .setDescription(body.overview ? this.client.util.limitStringLength(body.overview) : 'No description available.')
        .setThumbnail(body.poster_path ? `https://image.tmdb.org/t/p/w500${body.poster_path}` : null)
        .addFields([
          { name: '❯ Runtime', value: body.runtime ? `${body.runtime} mins.` : '???', inline: true },
          { name: '❯ Release Date', value: body.release_date || '???', inline: true },
          { name: '❯ Budget', value: body.budget ? `$${body.budget.toLocaleString()}` : '???', inline: true },
          { name: '❯ Revenue', value: body.revenue ? `$${body.revenue.toLocaleString()}` : '???', inline: true },
          {
            name: '❯ Genres',
            value: body.genres.length ? body.genres.map((genre) => genre.name).join(', ') : '???',
            inline: true,
          },
          { name: '❯ Popularity', value: body.popularity ? body.popularity.toFixed(2) : '???', inline: true },
          {
            name: '❯ Production Companies',
            value: body.production_companies.length ? body.production_companies.map((c) => c.name).join(', ') : '???',
            inline: true,
          },
        ]);

      return msg.channel.send({ embeds: [embed] });
    } catch (err) {
      return msg.channel.send(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
    }
  }
}
module.exports = Movie;
