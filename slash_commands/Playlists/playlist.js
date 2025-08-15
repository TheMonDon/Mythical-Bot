const { EmbedBuilder, SlashCommandBuilder, InteractionContextType } = require('discord.js');
const { stripIndents } = require('common-tags');
const { v4: uuidv4 } = require('uuid');
require('moment-duration-format');
const moment = require('moment');

exports.conf = {
  permLevel: 'User',
};

exports.commandData = new SlashCommandBuilder()
  .setName('playlist')
  .setDescription('Save, load, or view your playlists')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('The playlist you want to delete')
      .addStringOption((option) =>
        option
          .setName('playlist')
          .setDescription('The playlist you want to load')
          .setRequired(true)
          .setAutocomplete(true),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('list')
      .setDescription('Lists your playlists')
      .addIntegerOption((option) => option.setName('page').setDescription('The page to view')),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('load')
      .setDescription('Load a playlist')
      .addStringOption((option) =>
        option
          .setName('playlist')
          .setDescription('The playlist you want to load')
          .setRequired(true)
          .setAutocomplete(true)
          .setMinLength(1)
          .setMaxLength(50),
      )
      .addBooleanOption((option) =>
        option.setName('shuffle').setDescription('Shuffle the playlist before adding to queue'),
      ),
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('save')
      .setDescription('Save the queue to a playlist')
      .addStringOption((option) =>
        option
          .setName('playlist')
          .setDescription('The name of the playlist you want to save')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(50),
      ),
  );

exports.autoComplete = async (interaction) => {
  const connection = await interaction.client.db.getConnection();

  try {
    const input = interaction.options.getString('playlist') || ''; // Get user input

    const [playlistRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          user_playlists
        WHERE
          user_id = ?
      `,
      [interaction.user.id],
    );
    connection.release();

    let userPlaylists = [];
    if (playlistRows.length) {
      userPlaylists = JSON.parse(playlistRows[0].playlists);
    }

    if (!userPlaylists || userPlaylists.length === 0) {
      // No playlists found, respond with an empty array
      return interaction.respond([]).catch(() => {});
    }

    // Filter playlists based on user input
    const results = userPlaylists
      .filter((playlist) => playlist.name.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 25) // Limit results to 25 to comply with Discord API
      .map((playlist) => ({
        name: playlist.name,
        value: playlist.name, // Use the playlist name as the value
      }));

    // Respond with filtered results
    return interaction.respond(results).catch(() => {});
  } catch (error) {
    connection.release();

    console.error('Error in playlist autocomplete:', error);
    return interaction.respond([]).catch(() => {});
  }
};

exports.run = async (interaction) => {
  await interaction.deferReply();
  const connection = await interaction.client.db.getConnection();

  const subcommand = interaction.options.getSubcommand();
  const playlistName = interaction.options.getString('playlist');

  const [playlistRows] = await connection.execute(
    /* sql */ `
      SELECT
        *
      FROM
        user_playlists
      WHERE
        user_id = ?
    `,
    [interaction.user.id],
  );

  let playlists = [];
  if (playlistRows.length) {
    playlists = JSON.parse(playlistRows[0].playlists);
  }

  switch (subcommand) {
    case 'delete': {
      if (!playlistName) {
        return interaction.client.util.errorEmbed(interaction, 'Please specify the name of the playlist to delete.');
      }

      if (!playlists || playlists.length === 0) {
        return interaction.client.util.errorEmbed(interaction, "You don't currently have any saved playlists.");
      }

      // Find the playlist by name
      const playlistIndex = playlists.findIndex((p) => p.name.toLowerCase() === playlistName.toLowerCase());

      if (playlistIndex === -1) {
        return interaction.client.util.errorEmbed(interaction, `No playlist found with the name \`${playlistName}\`.`);
      }

      // Remove the playlist
      playlists.splice(playlistIndex, 1);

      // Save the updated playlist array
      await connection.execute(
        /* sql */
        `
          INSERT INTO
            user_playlists (user_id, playlists)
          VALUES
            (?, ?) ON DUPLICATE KEY
          UPDATE playlists =
          VALUES
            (playlists)
        `,
        [interaction.user.id, JSON.stringify(playlists)],
      );
      connection.release();

      return interaction.editReply(`The playlist \`${playlistName}\` has been deleted.`);
    }

    case 'list': {
      connection.release();

      if (!playlists || playlists.length === 0) {
        return interaction.client.util.errorEmbed(interaction, "You don't currently have any saved playlists.");
      }

      const itemsPerPage = 10;
      const maxPages = Math.ceil(playlists.length / itemsPerPage);

      let page = interaction.options.getInteger('page');

      // Ensure page is within valid range
      page = Math.max(1, Math.min(page, maxPages));

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedPlaylists = playlists.slice(start, end);

      // Create the embed
      const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
        .setTitle('Your Playlists')
        .setDescription(
          paginatedPlaylists
            .map(
              (playlist, index) =>
                `**${start + index + 1}.** ${playlist.name}\n` +
                `*Created on:* ${new Date(playlist.createdAt).toLocaleDateString()} | *Tracks:* ${
                  playlist.tracks.length
                }`,
            )
            .join('\n\n'),
        )
        .setFooter({ text: `Page ${page}/${maxPages}` })
        .setColor(interaction.settings.embedColor);

      return interaction.editReply({ embeds: [embed] });
    }

    case 'load': {
      connection.release();

      // Find the playlist by name
      let userPlaylist = playlists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());

      if (!userPlaylist) {
        return interaction.client.util.errorEmbed(interaction, `You don't have a playlist named \`${playlistName}\`.`);
      }

      if (!interaction.member.voice?.channel) {
        return interaction.client.util.errorEmbed(interaction, 'You must be in a voice channel to load a playlist.');
      }

      try {
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

        if (!player.connected) {
          await player.connect();
        }

        const shuffle = interaction.options.getBoolean('shuffle');
        if (shuffle) {
          function shufflePlaylist(playlist) {
            const shuffledTracks = [...playlist.tracks];

            for (let i = shuffledTracks.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledTracks[i], shuffledTracks[j]] = [shuffledTracks[j], shuffledTracks[i]];
            }

            return {
              ...playlist,
              tracks: shuffledTracks,
            };
          }

          userPlaylist = shufflePlaylist(userPlaylist);

          player.queue.add(userPlaylist.tracks);
        } else {
          player.queue.add(userPlaylist.tracks);
        }

        const tracksDuration = userPlaylist.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);
        const totalDuration = moment
          .duration(tracksDuration)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');

        const em = new EmbedBuilder()
          .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
          .setTitle('✅ Playlist Added to Queue')
          .setDescription(
            stripIndents`**${userPlaylist.tracks.length} tracks** from **${playlistName}** have been added to the queue
        
              **Total Duration:** ${totalDuration}
              **Queue Length:** ${player.queue.tracks.length} tracks`,
          )
          .setColor(interaction.settings.embedColor)
          .setTimestamp();

        if (userPlaylist.tracks[0].info.artworkUrl) {
          em.setThumbnail(userPlaylist.tracks[0].info.artworkUrl);
        }

        if (!player.playing && !player.paused) {
          await player.play();
        }

        return interaction.editReply({ embeds: [em] });
      } catch (error) {
        console.error('Load Playlist Error:', error);
        return interaction.editReply(`An error occurred while loading the playlist: ${error.message}`);
      }
    }

    case 'save': {
      const player = interaction.client.lavalink.getPlayer(interaction.guild.id);

      if (!player || player.queue.tracks.length < 1) {
        connection.release();
        return interaction.client.util.errorEmbed(
          interaction,
          'There are no tracks in the queue to save to a playlist.',
        );
      }

      if (playlists.some((p) => p.name === playlistName)) {
        connection.release();
        return interaction.client.util.errorEmbed(
          interaction,
          `You already have a playlist named \`${playlistName}\`.`,
        );
      }

      if (playlists.length >= 20) {
        connection.release();
        return interaction.client.util.errorEmbed(
          interaction,
          'You have reached the maximum number of playlists allowed (20).',
        );
      }

      const newPlaylist = {
        id: uuidv4(),
        name: playlistName,
        createdAt: new Date().toISOString(),
        tracks: player.queue.tracks,
      };

      try {
        playlists.push(newPlaylist);
        await connection.execute(
          /* sql */
          `
            INSERT INTO
              user_playlists (user_id, playlists)
            VALUES
              (?, ?) ON DUPLICATE KEY
            UPDATE playlists =
            VALUES
              (playlists)
          `,
          [interaction.user.id, JSON.stringify(playlists)],
        );

        connection.release();
        return interaction.editReply(
          `I have successfully created the playlist \`${playlistName}\` with ${player.queue.tracks.length} tracks. You can play it using the \`/playlist load\` command. (${playlists.length}/20)`,
        );
      } catch (error) {
        connection.release();

        console.error('Save Playlist Error:', error);
        return interaction.editReply(`An error occurred while saving your playlist: ${error.message}`);
      }
    }
  }
};
