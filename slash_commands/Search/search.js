const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const trev = require('trev-reborn');
const fetch = require('node-superfetch');

exports.conf = {
  permLevel: 'User',
  guildOnly: true,
};

exports.commandData = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search for something')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('reddit')
      .setDescription('Sends a random image from a subreddit of your choice.')
      .addStringOption((option) =>
        option.setName('subreddit').setDescription('The subreddit to search in').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('movie')
      .setDescription('View information about a movie from TMDb')
      .addStringOption((option) => option.setName('movie').setDescription('The movie to search for').setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('steam')
      .setDescription('View information about a steam game or application')
      .addStringOption((option) =>
        option.setName('game').setDescription('The game or application to search for').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('tv-show')
      .setDescription('View information about a tv-show from TMDb')
      .addStringOption((option) =>
        option.setName('tv-show').setDescription('The tv-show to search for').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('github')
      .setDescription('View information about a steam game or application')
      .addStringOption((option) => option.setName('user').setDescription('Github username').setRequired(true))
      .addStringOption((option) => option.setName('repo').setDescription('Github repo').setRequired(false)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('npm')
      .setDescription('View information about a NPM package')
      .addStringOption((option) =>
        option.setName('package').setDescription('The package to search for').setRequired(true),
      ),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'reddit': {
      const subreddit = interaction.options.get('subreddit').value;

      const post = await trev.getCustomSubreddit(subreddit);
      if (!post)
        return interaction.client.util.errorEmbed(interaction, 'Failed to fetch a post from reddit. Please try again');

      const authorName = interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag;
      const text = post.text?.length > 4000 ? post.text.slice(0, 4000) + '\nRead more on reddit.' : post.text;
      const embed = new EmbedBuilder()
        .setAuthor({ name: authorName, iconURL: interaction.user.displayAvatarURL() })
        .setTitle(post.title)
        .setColor(interaction.settings.embedColor)
        .setURL(post.permalink)
        .setImage(post.media)
        .setTimestamp();
      if (text) embed.setDescription(text);

      if (post.over_18 && interaction.channel.nsfw === false) {
        return interaction.editReply('The post from that subreddit is NSFW and could not be sent in this channel.');
      }

      if (trev.isRedGifsLink(post.media)) {
        return interaction.editReply(post.media);
      } else {
        return interaction.editReply({ embeds: [embed] });
      }
    }
    case 'movie': {
      const query = interaction.options.get('movie').value;

      const search = await fetch.get('http://api.themoviedb.org/3/search/movie').query({
        api_key: interaction.client.config.TMDb,
        include_adult: interaction.channel.nsfw || false,
        query,
      });

      if (!search.body.results.length)
        return interaction.client.util.errorEmbed(interaction, 'No movie with that name was found.');
      const find =
        search.body.results.find((m) => m.title.toLowerCase() === query.toLowerCase()) || search.body.results[0];

      const { body } = await fetch
        .get(`https://api.themoviedb.org/3/movie/${find.id}`)
        .query({ api_key: interaction.client.config.TMDb });

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setTitle(body.title)
        .setURL(`https://www.themoviedb.org/movie/${body.id}`)
        .setAuthor({ name: 'TMDb', iconURL: 'https://i.imgur.com/3K3QMv9.png', url: 'https://www.themoviedb.org/' })
        .setDescription(body.overview ? body.overview.slice(0, 2048) : 'No description available.')
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

      return interaction.editReply({ embeds: [embed] });
    }
    case 'tv-show': {
      const query = interaction.options.get('tv-show').value;
      const search = await fetch.get('http://api.themoviedb.org/3/search/tv').query({
        api_key: interaction.client.config.TMDb,
        include_adult: interaction.channel.nsfw || false,
        query,
      });

      if (!search.body.results.length)
        return interaction.client.util.errorEmbed(interaction, 'No tv-show with that name was found.');
      const find =
        search.body.results.find((m) => m.name.toLowerCase() === query.toLowerCase()) || search.body.results[0];

      const { body } = await fetch
        .get(`https://api.themoviedb.org/3/tv/${find.id}`)
        .query({ api_key: interaction.client.config.TMDb });

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setTitle(body.name)
        .setURL(`https://www.themoviedb.org/tv/${body.id}`)
        .setAuthor({ name: 'TMDb', iconURL: 'https://i.imgur.com/3K3QMv9.png', url: 'https://www.themoviedb.org/' })
        .setDescription(body.overview ? body.overview.slice(0, 2048) : 'No description available.')
        .setThumbnail(body.poster_path ? `https://image.tmdb.org/t/p/w500${body.poster_path}` : null)
        .addFields([
          { name: '❯ First Air Date', value: body.first_air_date || '???', inline: true },
          { name: '❯ Last Air Date', value: body.last_air_date || '???', inline: true },
          {
            name: '❯ Seasons',
            value: body.number_of_seasons ? body.number_of_seasons.toLocaleString() : '???',
            inline: true,
          },
          {
            name: '❯ Episodes',
            value: body.number_of_episodes ? body.number_of_episodes.toLocaleString() : '???',
            inline: true,
          },
          {
            name: '❯ Genres',
            value: body.genres.length ? body.genres.map((genre) => genre.name).join(', ') : '???',
            inline: true,
          },
          {
            name: '❯ Production Companies',
            value: body.production_companies.length ? body.production_companies.map((c) => c.name).join(', ') : '???',
            inline: true,
          },
        ]);

      return interaction.editReply({ embeds: [embed] });
    }
    case 'steam': {
      const game = interaction.options.get('game').value;
      const query = await interaction.client.util.clean(interaction.client, game);

      const search = await fetch.get('https://store.steampowered.com/api/storesearch').query({
        cc: 'us',
        l: 'en',
        term: query,
      });

      if (!search.body.items.length)
        return interaction.client.util.errorEmbed(interaction, `No results found for **${query}**!`);

      const { id } = search.body.items[0];

      const { body } = await fetch.get('https://store.steampowered.com/api/appdetails').query({
        appids: id,
      });

      const { data } = body[id.toString()];

      const final = data.price_overview?.final_formatted || '$0';
      const initial = data.price_overview?.initial_formatted || '$0';

      const price =
        initial !== '$0' ? `~~${initial}~~ ${final} ${data.price_overview?.discount_percent || 0}% off` : final;

      const platforms = [];
      if (data.platforms?.windows) platforms.push('Windows');
      if (data.platforms?.mac) platforms.push('Mac');
      if (data.platforms?.linux) platforms.push('Linux');

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: 'Steam', iconURL: 'https://i.imgur.com/xxr2UBZ.png', url: 'http://store.steampowered.com/' })
        .setTitle(data.name)
        .setURL(`http://store.steampowered.com/app/${data.steam_appid}`)
        .setImage(data.header_image)
        .addFields([
          { name: '❯ Price', value: `•\u2000 ${price}`, inline: true },
          {
            name: '❯ Metascore',
            value: `•\u2000 ${data.metacritic ? data.metacritic.score : 'Unknown'}`,
            inline: true,
          },
          {
            name: '❯ Recommendations',
            value: `•\u2000 ${data.recommendations ? data.recommendations.total : 'Unknown'}`,
            inline: true,
          },
          { name: '❯ Platforms', value: `•\u2000 ${platforms.join(', ') || 'None'}`, inline: true },
          {
            name: '❯ Release Date',
            value: `•\u2000 ${data.release_date ? data.release_date.date : 'Unknown'}`,
            inline: true,
          },
          { name: '❯ DLC Count', value: `•\u2000 ${data.dlc ? data.dlc.length : 0}`, inline: true },
          { name: '❯ Developers', value: `•\u2000 ${data.developers?.join(', ') || 'Unknown'}`, inline: true },
          { name: '❯ Publishers', value: `•\u2000 ${data.publishers?.join(', ') || 'Unknown'}`, inline: true },
        ]);

      return interaction.editReply({ embeds: [embed] });
    }
    case 'github': {
      const user = interaction.options.get('user').value;
      const repo = interaction.options.get('repo')?.value;

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: 'GitHub', iconURL: 'https://i.imgur.com/e4HunUm.png', url: 'https://github.com/' });

      if (user && repo) {
        try {
          const { body } = await fetch
            .get(`https://api.github.com/repos/${user.toLowerCase()}/${repo.toLowerCase()}`)
            .set({ Authorization: `token ${interaction.client.config.github}` });

          const createdAt = new Date(body.created_at).getTime() / 1000;
          const updatedAt = new Date(body.updated_at).getTime() / 1000;

          embed
            .setTitle(body.full_name)
            .setURL(body.html_url)
            .setDescription(body.description ? body.description.slice(0, 4000) : 'No description.')
            .setColor(interaction.settings.embedColor)
            .setThumbnail(body.owner.avatar_url)
            .addFields([
              { name: 'Stars', value: body.stargazers_count.toLocaleString(), inline: true },
              { name: 'Forks', value: body.forks.toLocaleString(), inline: true },
              { name: 'Issues', value: body.open_issues.toLocaleString(), inline: true },
              { name: 'Language', value: body.language || 'Unknown', inline: true },
              { name: 'License', value: body.license ? body.license.name : 'None', inline: true },
              { name: 'Archived', value: body.archived ? 'Yes' : 'No', inline: true },
              { name: 'Size', value: `${(body.size / 1000).toLocaleString()} MB`, inline: true },
              { name: 'Creation Date', value: `<t:${createdAt}:f>`, inline: true },
              {
                name: 'Modification Date',
                value: `<t:${updatedAt}:f>`,
                inline: true,
              },
            ]);

          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          if (err.status === 404)
            return interaction.client.util.errorEmbed(interaction, 'No results were found for that repository.');
          return interaction.editReply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
        }
      }

      try {
        const { body } = await fetch
          .get(`https://api.github.com/users/${user.toLowerCase()}`)
          .set({ Authorization: `token ${interaction.client.config.github}` });

        const createdAt = new Date(body.created_at).getTime() / 1000;
        const updatedAt = new Date(body.updated_at).getTime() / 1000;

        embed
          .setTitle(body.login)
          .setURL(body.html_url)
          .setColor(interaction.settings.embedColor)
          .setThumbnail(body.avatar_url)
          .addFields([
            { name: 'Name', value: body.login, inline: true },
            { name: 'Company', value: body.company || 'None', inline: true },
            { name: 'Public Repositories', value: body.public_repos?.toString() || '0', inline: true },
            { name: 'Private Repositories', value: body.total_private_repos?.toString() || '0', inline: true },
            { name: 'Creation Date', value: `<t:${createdAt}:f>`, inline: true },
            { name: 'Modification Date', value: `<t:${updatedAt}:f>`, inline: true },
            { name: 'Location', value: body.location, inline: true },
            { name: 'Following', value: body.following.toString(), inline: true },
            { name: 'Followers', value: body.followers.toString(), inline: true },
            { name: 'Bio', value: body.bio || 'No Bio', inline: false },
          ]);

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        if (err.status === 404)
          return interaction.client.util.errorEmbed(interaction, 'No results were found for that user.');
        return interaction.editReply(`Oh no, an error occured: \`${err.message}\`. Try again later!`);
      }
    }
    case 'npm': {
      const packageName = interaction.options.get('package').value;

      try {
        const { body } = await fetch.get(`https://registry.npmjs.com/${packageName.toLowerCase()}`);

        const maintainers = body.author?.name || body.maintainers?.map(({ name }) => name).join(', ');
        const lastPublish = Math.floor(new Date(body.time[body['dist-tags'].latest]).getTime() / 1000);

        const embed = new EmbedBuilder()
          .setTitle(`${body.name} Package Information`)
          .setColor(interaction.settings.embedColor)
          .addFields([
            { name: 'Version', value: body['dist-tags'].latest, inline: true },
            { name: 'Description', value: body.description, inline: true },
            { name: 'License', value: body.license, inline: true },
            { name: 'Maintainers', value: maintainers, inline: true },
            { name: 'Keywords', value: body.keywords?.join(', ') || 'None', inline: true },
            { name: 'Versions', value: Object.keys(body.versions).length.toString(), inline: true },
            { name: 'Homepage', value: body.homepage || 'None', inline: true },
            { name: 'Bugs', value: body.bugs?.url || 'None', inline: true },
            { name: 'Last Publish', value: `<t:${lastPublish}:f>`, inline: true },
          ]);

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        if (err.status === 404)
          return interaction.client.util.errorEmbed(interaction, 'No results were found for that package.');
        return interaction.editReply(`Oh no, an error occured: \`${err.message}\`. Try again later!`);
      }
    }
  }
};
