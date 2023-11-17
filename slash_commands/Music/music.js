const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { lyricsExtractor } = require('@discord-player/extractor');
const { useHistory, useQueue } = require('discord-player');
const { stripIndents } = require('common-tags');
const lyricsFinder = lyricsExtractor();

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Control the music')
  .setDMPermission(false)
  .addSubcommand((subcommand) => subcommand.setName('back').setDescription('Go back to the last song.'))
  .addSubcommand((subcommand) => subcommand.setName('clear-queue').setDescription('Clears all songs from the queue'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('lyrics')
      .setDescription('Get the lyrics of the current song, or another song')
      .addStringOption((option) => option.setName('song').setDescription('The song to get lyrics to')),
  )
  .addSubcommand((subcommand) => subcommand.setName('now-playing').setDescription('Shows what is currently playing'))
  .addSubcommand((subcommand) => subcommand.setName('pause').setDescription('Pause the music'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('play')
      .setDescription('Play something amazing')
      .addStringOption((option) => option.setName('song').setDescription('The song or link to play').setRequired(true)),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('queue')
      .setDescription('See what songs are in the queue')
      .addIntegerOption((option) => option.setName('page').setDescription('The page of the queue to show')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('remove')
      .setDescription('Remove a track from the queue')
      .addIntegerOption((option) =>
        option.setName('track').setDescription('The track number to remove').setRequired(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('repeat')
      .setDescription('Repeats the current track, queue, or enables autoplay.')
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('The type of autoplay')
          .setRequired(true)
          .addChoices(
            { name: 'Off', value: 'off' },
            { name: 'Track', value: 'track' },
            { name: 'Queue', value: 'queue' },
            { name: 'Autoplay', value: 'autoplay' },
          ),
      ),
  )
  .addSubcommand((subcommand) => subcommand.setName('resume').setDescription('Resume the music'))
  .addSubcommand((subcommand) => subcommand.setName('shuffle').setDescription('Shuffle the queue'))
  .addSubcommand((subcommand) => subcommand.setName('skip').setDescription('Skip the current song'))
  .addSubcommand((subcommand) => subcommand.setName('stop').setDescription('Stop playing and clear the queue'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('volume')
      .setDescription('Change the music volume')
      .addIntegerOption((option) =>
        option
          .setName('level')
          .setDescription('The level of the volume')
          .setMinValue(1)
          .setMaxValue(100)
          .setRequired(true),
      ),
  );

exports.run = async (interaction) => {
  await interaction.deferReply();
  const queue = useQueue(interaction.guild.id);
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'back': {
      const history = useHistory(interaction.guild.id);
      const queue = useQueue(interaction.guild.id);

      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to skip music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');
      if (!queue.node.isPlaying()) return interaction.editReply('There is nothing playing.');

      await history.previous();
      const song = queue.currentTrack;

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .addFields([{ name: 'Now Playing', value: song.title }]);

      return interaction.editReply({ embeds: [em] });
    }

    case 'clear-queue': {
      const queue = interaction.client.player.nodes.get(interaction.guild.id);

      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to clear the queue.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');
      if (!queue) return interaction.editReply('There is nothing in the queue.');

      queue.delete(false);

      const em = new EmbedBuilder().setDescription(':recycle: The music queue has been cleared!');
      return interaction.editReply({ embeds: [em] });
    }

    case 'lyrics': {
      let song = interaction.options.get('song')?.value;

      if (!song) {
        if (!interaction.guild)
          return interaction.client.util.errorEmbed(interaction, "I can't get the lyrics of nothing.");
        const playing = queue?.currentTrack;
        song = `${playing?.author} ${playing?.title}`;
        if (!playing || song === ' ')
          return interaction.client.util.errorEmbed(
            interaction,
            'Nothing is playing, please try again with a song name.',
          );
      }

      const lyrics = await lyricsFinder.search(song).catch(() => null);
      if (!lyrics) return interaction.editReply(`No lyrics found for: ${song}`);
      const trimmedLyrics = lyrics.lyrics.substring(0, 3097);

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setAuthor({ name: lyrics.artist.name, iconURL: lyrics.artist.image, url: lyrics.artist.url })
        .setTitle(lyrics.title)
        .setURL(lyrics.url)
        .setThumbnail(lyrics.thumbnail)
        .setDescription(trimmedLyrics.length === 3090 ? `${trimmedLyrics}...` : trimmedLyrics);
      return interaction.editReply({ embeds: [em] });
    }

    case 'now-playing': {
      const song = queue?.currentTrack;

      if (!song) return interaction.editReply('There is nothing playing.');

      const em = new EmbedBuilder()
        .setDescription(
          stripIndents`
            Currently ${queue.node.isPlaying() ? 'Playing' : 'Paused'} ♪: [${song.title}](${song.url})
  
            ${queue.node.createProgressBar({ timecodes: true })}
  
            Requested By: ${song.requestedBy}
          `,
        )
        .setColor(interaction.settings.embedColor)
        .setThumbnail(song.thumbnail)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() });
      return interaction.editReply({ embeds: [em] });
    }

    case 'pause': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to pause music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');

      queue.node.setPaused(!queue.node.isPaused());

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Music has been ${queue.node.isPaused() ? 'paused' : 'resumed'}`);

      return interaction.editReply({ embeds: [em] });
    }

    case 'play': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to play music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You have to be in the same voice channel as the bot to play music');

      const query = interaction.options.get('song').value;

      try {
        const searchResult = await interaction.client.player.search(query, { requestedBy: interaction.user });

        if (!searchResult) return interaction.editReply('I could not find that song.');
        if (!searchResult.hasTracks()) {
          // If player didn't find any songs for this query
          return interaction.editReply(`We couldn't find any tracks for ${query}!`);
        }

        await interaction.client.player.play(interaction.member.voice.channel, searchResult, {
          nodeOptions: {
            metadata: interaction,
            selfDead: true,
            leaveOnStop: true,
            leaveOnEnd: false,
            leaveOnEmpty: false,
          },
        });

        const interactionMessage = await interaction.editReply('Music Started');
        return interactionMessage.delete().catch(() => {});
      } catch (e) {
        return interaction.editReply(`Something went wrong: ${e}`);
      }
    }

    case 'queue': {
      let page = interaction.options.get('page')?.value;
      page = parseInt(page, 10);

      if (!queue || queue.tracks.size < 1) return interaction.editReply('There are no more songs in the queue.');
      if (!page) page = 1;
      if (isNaN(page)) return interaction.editReply('Please input a valid number.');

      let realPage = page;
      let maxPages = page;
      let q = queue.tracks.map((track, i) => {
        return `${i + 1}. ${track.title} : ${track.author}`;
      });
      let temp = q.slice(Math.floor((page - 1) * 25), Math.ceil(page * 25));

      if (temp.length > 0) {
        realPage = page;
        maxPages = Math.ceil((q.length + 1) / 25);
        q = temp;
      } else {
        for (let i = 1; i <= page; i++) {
          temp = q.slice(Math.floor((i - 1) * 25), Math.ceil(i * 25));
          if (temp.length < 1) {
            realPage = i - 1;
            maxPages = Math.ceil(q.length / 25);
            q = q.slice(Math.floor((i - 1 - 1) * 25), Math.ceil((i - 1) * 25));
            break;
          }
        }
      }

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setTitle(`${interaction.guild.name}'s Queue`)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(q.join('\n'))
        .setFooter({ text: `Page ${realPage} / ${maxPages}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    case 'remove': {
      const track = interaction.options.get('track').value;

      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to modify the queue.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');

      if (!queue) return interaction.editReply('The queue is empty.');
      if (!queue.isPlaying()) return interaction.editReply('There is nothing playing.');

      const num = parseInt(track, 10) - 1;
      if (isNaN(num)) return interaction.editReply('Please supply a valid number.');

      const ql = queue.tracks.size;
      if (num > ql) return interaction.editReply("You can't remove something that is not in the queue.");

      const tracks = queue.tracks.toArray();
      const song = tracks[num];
      queue.removeTrack(num);

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`\`${song.title}\` has been removed from the queue.`);

      return interaction.editReply({ embeds: [em] });
    }

    case 'repeat': {
      const type = interaction.options.get('type').value;

      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to loop music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');
      if (!queue) return interaction.editReply('There is nothing in the queue.');

      switch (type) {
        case 'off': {
          queue.setRepeatMode(0);
          return interaction.editReply('Stopped repeat mode.');
        }

        case 'track': {
          queue.setRepeatMode(1);
          const song = queue.currentTrack;
          return interaction.editReply(`Now Repeating: ${song.title}`);
        }

        case 'queue': {
          queue.setRepeatMode(2);
          return interaction.editReply('Now repeating whole queue.');
        }

        case 'autoplay': {
          queue.setRepeatMode(3);
          return interaction.editReply('Turned on autoplay.');
        }
      }
      break;
    }

    case 'resume': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to resume music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');

      queue.node.setPaused(!queue.node.isPaused());

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Music has been ${queue.node.isPaused() ? 'paused' : 'resumed'}`);

      return interaction.editReply({ embeds: [em] });
    }

    case 'shuffle': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to shuffle the queue.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');

      if (!queue) return interaction.editReply('There is nothing in the queue.');

      queue.tracks.shuffle();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription('The queue has been shuffled.');

      return interaction.editReply({ embeds: [em] });
    }

    case 'skip': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to skip music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');
      if (!queue) return interaction.editReply('There is nothing playing.');

      const song = queue.currentTrack;
      queue.node.skip();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() });
      if (song) em.addFields([{ name: 'Skipped Song', value: song.title, inline: false }]);

      return interaction.editReply({ embeds: [em] });
    }

    case 'stop': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to stop music.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');

      if (!queue) return interaction.editReply('There was nothing playing.');

      queue.delete();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription('All music has been stopped.');

      return interaction.editReply({ embeds: [em] });
    }

    case 'volume': {
      if (!interaction.member.voice.channel)
        return interaction.editReply('You must be in a voice channel to change the volume.');
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      )
        return interaction.editReply('You must be in the same voice channel as the bot.');
      if (!queue.node.isPlaying()) return interaction.editReply('There is nothing playing.');

      const volume = interaction.options.get('level').value;
      queue.node.setVolume(volume);

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`The volume has been set to: ${volume}`);

      return interaction.editReply({ embeds: [em] });
    }
  }
};
