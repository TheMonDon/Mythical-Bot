const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { stripIndents } = require('common-tags');
require('moment-duration-format');
const moment = require('moment');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('music')
  .setDescription('Control the music')
  .setContexts(InteractionContextType.Guild)
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
      .addStringOption((option) =>
        option.setName('song').setDescription('The song or link to play').setRequired(true).setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('play-next')
      .setDescription('Play something next in the queue')
      .addStringOption((option) =>
        option.setName('song').setDescription('The song or link to play').setRequired(true).setAutocomplete(true),
      ),
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
      .setDescription('Repeats the current track, queue, or disable repeat mode.')
      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('The type of repeat mode to set')
          .setRequired(true)
          .addChoices(
            { name: 'Off', value: 'off' },
            { name: 'Track', value: 'track' },
            { name: 'Queue', value: 'queue' },
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

exports.autoComplete = async (interaction) => {
  try {
    const song = interaction.options.getString('song');
    if (!song || song.trim().length === 0) {
      return interaction.respond([]).catch(() => {});
    }

    if (!interaction.member.voice.channel) {
      return interaction.respond([]).catch(() => {});
    }

    let player = interaction.client.lavalink.getPlayer(interaction.guild.id);

    if (!player) {
      player = interaction.client.lavalink.createPlayer({
        guildId: interaction.guild.id,
        voiceChannelId: interaction.member.voice.channel.id,
        textChannelId: interaction.channel.id,
        selfDeaf: true,
        selfMute: false,
      });
    }

    // Search for tracks
    const data = await player.search(
      {
        query: song,
        source: 'ytsearch',
      },
      interaction.author,
    );

    if (!data.tracks || data.tracks.length === 0) {
      return interaction.respond([]).catch(() => {});
    }

    const results = data.tracks
      .filter((track) => track.info.uri.length < 100)
      .slice(0, 10)
      .map((track) => ({
        name: track.info.title.slice(0, 100),
        value: track.info.uri,
      }));

    return interaction.respond(results).catch(() => {});
  } catch (error) {
    return interaction.respond([]).catch(() => {});
  }
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  if (!interaction.member.voice.channel) {
    return interaction.client.util.errorEmbed(interaction, 'You must be in a voice channel to use this command.');
  }

  let player = interaction.client.lavalink.getPlayer(interaction.guild.id);
  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'back': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }

      if (!player || !player.playing) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing playing.');
      }

      // Get previous track from history
      const previousTrack = await player.queue.shiftPrevious();
      if (!previousTrack) {
        return interaction.client.util.errorEmbed(interaction, 'There is no previous song in history.');
      }

      await player.play({ clientTrack: previousTrack });

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .addFields([{ name: 'Now Playing', value: previousTrack.info.title }]);

      return interaction.editReply({ embeds: [em] });
    }

    case 'clear-queue': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing in the queue.');
      }

      player.queue.tracks.splice(0);

      const em = new EmbedBuilder().setDescription(':recycle: The music queue has been cleared!');
      return interaction.editReply({ embeds: [em] });
    }

    case 'lyrics': {
      let song = interaction.options.get('song')?.value;

      if (!song) {
        if (!interaction.guild) {
          return interaction.client.util.errorEmbed(interaction, "I can't get the lyrics of nothing.");
        }
        const playing = player?.queue.current;
        song = `${playing?.info.author} ${playing?.info.title}`;
        if (!playing || song === ' ') {
          return interaction.client.util.errorEmbed(
            interaction,
            'Nothing is playing, please try again with a song name.',
          );
        }
      }

      const Genius = require('genius-lyrics');
      const Client = new Genius.Client();

      const searches = await Client.songs.search(song);
      const firstSong = searches[0];
      const lyrics = await firstSong.lyrics();

      if (!lyrics) {
        return interaction.client.util.errorEmbed(interaction, `No lyrics found for: \`${song}\``);
      }
      function cleanLyrics(rawText) {
        return rawText.replace(/^[\s\S]*?Read More\s*/i, '');
      }

      const trimmedLyrics = interaction.client.util.limitStringLength(cleanLyrics(lyrics), 0, 4096);

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setTitle(firstSong.fullTitle)
        .setURL(firstSong.url)
        .setDescription(trimmedLyrics);

      return interaction.editReply({ embeds: [em] });
    }

    case 'now-playing': {
      const song = player?.queue.current;

      if (!song) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing playing.');
      }

      // Create a simple progress bar
      const position = player.position;
      const duration = song.info.duration;
      const progress = Math.round((position / duration) * 20);
      const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);

      // Format time
      const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

      const em = new EmbedBuilder()
        .setDescription(
          stripIndents`
            Currently ${player.playing ? 'Playing' : 'Paused'} ♪: [${song.info.title}](${song.info.uri})
  
            ${progressBar} [${formatTime(position)}/${formatTime(duration)}]
  
            Requested By: ${this.client.users.cache.get(song.requester.id)}
        `,
        )
        .setColor(interaction.settings.embedColor)
        .setThumbnail(song.info.artworkUrl)
        .setFooter({ text: `Repeat Mode: ${interaction.client.util.toProperCase(player.repeatMode)}` })
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() });

      return interaction.editReply({ embeds: [em] });
    }

    case 'pause': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player || !player.queue.current) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing playing.');
      }
      if (player.paused) {
        return interaction.client.util.errorEmbed(interaction, 'The music is already paused.');
      }

      await player.pause();
      player.autoPaused = false;

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Music has been paused.`);

      return interaction.editReply({ embeds: [em] });
    }

    case 'play': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }

      const query = interaction.options.get('song').value;

      try {
        if (!player) {
          player = interaction.client.lavalink.createPlayer({
            guildId: interaction.guild.id,
            voiceChannelId: interaction.member.voice.channel.id,
            textChannelId: interaction.channel.id,
            selfDeaf: true,
            selfMute: false,
          });
        }

        if (!player.connected) {
          await player.connect();
        }

        // Search for tracks
        const result = await player.search(
          {
            query,
            source: 'ytsearch',
          },
          interaction.author,
        );

        if (!result || !result.tracks || result.tracks.length === 0) {
          return interaction.client.util.errorEmbed(interaction, 'No tracks found for that query.');
        }

        // Add track(s) to queue
        if (result.loadType === 'playlist') {
          await player.queue.add(result.tracks);
          const totalDuration = result.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);
          const durationString = moment
            .duration(totalDuration)
            .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');

          const em = new EmbedBuilder()
            .setTitle('✅ Playlist Added to Queue')
            .setDescription(
              stripIndents`**${result.tracks.length} tracks** from **${
                result.playlist?.name || 'Unknown Playlist'
              }** have been added

                **Total Duration:** ${durationString}
                **Requested By:** ${interaction.user}
                **Queue Length:** ${player.queue.tracks.length} tracks`,
            )
            .setColor(interaction.settings.embedColor)
            .setTimestamp();

          if (result.tracks[0].info.artworkUrl) {
            em.setThumbnail(result.tracks[0].info.artworkUrl);
          }

          await interaction.editReply({ embeds: [em] });
        } else {
          await player.queue.add(result.tracks[0]);

          const queuePosition = player.queue.tracks.length;
          let calculateEstimatedTime = player.queue.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);
          if (player?.queue?.current) {
            calculateEstimatedTime += player.queue.current.info.duration || 0;
          }
          const timeLeft = moment
            .duration(calculateEstimatedTime)
            .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');
          const durationString = moment
            .duration(result.tracks[0].info.duration || 0)
            .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');

          const em = new EmbedBuilder()
            .setTitle('✅ Track Added to Queue')
            .setDescription(
              stripIndents`**[${result.tracks[0].info.title}](${result.tracks[0].info.uri})**

                  **Duration:** ${durationString}
                  **Requested By:** ${interaction.user}
                  **Queue Position:** ${queuePosition}
                  **Estimated Time Until Playing:** ${timeLeft}`,
            )
            .setColor(interaction.settings.embedColor)
            .setTimestamp();

          if (result.tracks[0].info.artworkUrl) {
            em.setThumbnail(result.tracks[0].info.artworkUrl);
          }

          await interaction.editReply({ embeds: [em] });
        }

        // Start playing if not already playing
        if (!player.playing && !player.paused) {
          await player.play();
        }
      } catch (e) {
        return interaction.editReply(`Something went wrong: \`${e}\``);
      }
      break;
    }

    case 'play-next': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }

      const query = interaction.options.get('song').value;

      try {
        if (!player) {
          player = interaction.client.lavalink.createPlayer({
            guildId: interaction.guild.id,
            voiceChannelId: interaction.member.voice.channel.id,
            textChannelId: interaction.channel.id,
            selfDeaf: true,
            selfMute: false,
          });
        }

        if (!player.connected) {
          await player.connect();
        }

        // Search for tracks
        const result = await player.search(
          {
            query,
            source: 'ytsearch',
          },
          interaction.author,
        );

        if (!result || !result.tracks || result.tracks.length === 0) {
          return interaction.client.util.errorEmbed(interaction, 'No tracks found for that query.');
        }

        // Add track(s) to queue
        if (result.loadType === 'playlist') {
          await player.queue.add(result.tracks, 0);
          const totalDuration = result.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);
          const durationStr = totalDuration
            ? `\`${Math.floor(totalDuration / 60000)}:${String(Math.floor((totalDuration % 60000) / 1000)).padStart(
                2,
                '0',
              )}\``
            : '`Unknown`';

          const em = new EmbedBuilder()
            .setTitle('✅ Playlist Added to Queue')
            .setDescription(
              stripIndents`**${result.tracks.length} tracks** from **${
                result.playlist?.name || 'Unknown Playlist'
              }** have been added

                **Total Duration:** ${durationStr}
                **Requested By:** ${interaction.user}
                **Queue Length:** ${player.queue.tracks.length} tracks`,
            )
            .setColor(interaction.settings.embedColor)
            .setTimestamp();

          if (result.tracks[0].info.artworkUrl) {
            em.setThumbnail(result.tracks[0].info.artworkUrl);
          }

          await interaction.editReply({ embeds: [em] });
        } else {
          await player.queue.add(result.tracks[0], 0);

          const duration = result.tracks[0].info.duration
            ? `\`${Math.floor(result.tracks[0].info.duration / 60000)}:${String(
                Math.floor((result.tracks[0].info.duration % 60000) / 1000),
              ).padStart(2, '0')}\``
            : '`Unknown`';

          const em = new EmbedBuilder()
            .setTitle('✅ Track Added to Queue')
            .setDescription(
              stripIndents`**[${result.tracks[0].info.title}](${result.tracks[0].info.uri})**

                **Duration:** ${duration}
                **Requested By:** ${interaction.user}`,
            )
            .setColor(interaction.settings.embedColor)
            .setTimestamp();

          if (result.tracks[0].info.artworkUrl) {
            em.setThumbnail(result.tracks[0].info.artworkUrl);
          }

          await interaction.editReply({ embeds: [em] });
        }

        // Start playing if not already playing
        if (!player.playing && !player.paused) {
          await player.play();
        }
      } catch (e) {
        return interaction.editReply(`Something went wrong: \`${e}\``);
      }
      break;
    }

    case 'queue': {
      let page = interaction.options.get('page')?.value;
      page = parseInt(page, 10);

      if (!player || player.queue.tracks.length < 1) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing in the queue.');
      }
      if (!page) page = 1;
      if (isNaN(page)) {
        return interaction.client.util.errorEmbed(interaction, 'Please input a valid number.');
      }

      let realPage = page;
      let maxPages = page;
      let q = player.queue.tracks.map((track, i) => {
        return `**${i + 1}.** ${track.info.title} - ${track.info.author}`;
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

      const totalMilliseconds = player.queue.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);

      const timeLeft = moment
        .duration(totalMilliseconds)
        .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][, and] s[ seconds]');

      const embed = new EmbedBuilder()
        .setColor(interaction.settings.embedColor)
        .setTitle(`${interaction.guild.name}'s Queue`)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(q.join('\n'))
        .addFields([
          {
            name: 'Estimated Time Remaining',
            value: timeLeft,
            inline: false,
          },
        ])
        .setFooter({ text: `Page ${realPage} / ${maxPages}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    case 'remove': {
      const track = interaction.options.get('track').value;

      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player || !player.playing) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing currently playing.');
      }

      const num = parseInt(track, 10) - 1;
      if (isNaN(num)) {
        return interaction.client.util.errorEmbed(interaction, 'Please supply a valid number.');
      }

      const ql = player.queue.tracks.length;
      if (num > ql || num < 0) return interaction.editReply("You can't remove something that is not in the queue.");

      const song = player.queue.tracks[num];
      await player.queue.remove(num);

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`\`${song.info.title}\` has been removed from the queue.`);

      return interaction.editReply({ embeds: [em] });
    }

    case 'repeat': {
      const type = interaction.options.get('type').value;

      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing currently playing.');
      }

      switch (type) {
        case 'off': {
          if (player.repeatMode === 'off') {
            return interaction.client.util.errorEmbed(interaction, 'Repeat mode is already off.');
          }

          player.setRepeatMode('off');
          return interaction.editReply('Stopped repeat mode.');
        }

        case 'track': {
          const song = player.queue.current;
          if (player.repeatMode === 'track') {
            return interaction.client.util.errorEmbed(
              interaction,
              `The song \`${song.info.title}\` is already repeating.`,
            );
          }

          player.setRepeatMode('track');
          return interaction.editReply(`Now Repeating: ${song.info.title}`);
        }

        case 'queue': {
          if (player.repeatMode === 'queue') {
            return interaction.client.util.errorEmbed(interaction, 'The queue is already repeating.');
          }

          player.setRepeatMode('queue');
          return interaction.editReply('Now repeating the whole queue.');
        }
      }
      break;
    }

    case 'resume': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player || !player.queue.current) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing currently playing.');
      }
      if (!player.paused) {
        return interaction.client.util.errorEmbed(interaction, 'The music is not paused.');
      }

      await player.resume();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`Music has been resumed`);

      return interaction.editReply({ embeds: [em] });
    }

    case 'shuffle': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }

      if (!player || player.queue.tracks.length === 0) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing in the queue to shuffle.');
      }
      await player.queue.shuffle();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription('The queue has been shuffled.');

      return interaction.editReply({ embeds: [em] });
    }

    case 'skip': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player || !player.queue.current) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing currently playing.');
      }
      if (player.queue.tracks.length < 1) {
        return interaction.client.util.errorEmbed(interaction, 'There are no more songs in the queue.');
      }

      const song = player.queue.current;
      await player.skip();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() });
      if (song) em.addFields([{ name: 'Skipped Song', value: song.title, inline: false }]);

      return interaction.editReply({ embeds: [em] });
    }

    case 'stop': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }

      if (!player) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing playing.');
      }

      await player.destroy();

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription('All music has been stopped.');

      return interaction.editReply({ embeds: [em] });
    }

    case 'volume': {
      if (
        interaction.guild.members.me.voice.channel &&
        interaction.member.voice.channel.id !== interaction.guild.members.me.voice.channel.id
      ) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in the same voice channel as the bot.');
      }
      if (!player || !player.playing) {
        return interaction.client.util.errorEmbed(interaction, 'There is nothing currently playing.');
      }

      const volume = interaction.options.get('level').value;
      await player.setVolume(volume);

      const em = new EmbedBuilder()
        .setColor(interaction.settings.embedSuccessColor)
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`The volume has been set to: ${volume}`);

      return interaction.editReply({ embeds: [em] });
    }
  }
};
